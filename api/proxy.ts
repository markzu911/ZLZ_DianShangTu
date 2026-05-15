import express from "express";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

// CORS and Security Headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  next();
});

// SaaS Proxy Logic
const proxyRequest = async (req: express.Request, res: express.Response, targetPath: string) => {
  const targetUrl = `http://aibigtree.com${targetPath}`;
  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: { 'Content-Type': 'application/json' }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error(`SaaS Proxy failed for ${targetPath}:`, error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: "代理转发失败" });
  }
};

// Internal SaaS call helper with timeout
const saasCall = async (method: string, path: string, data?: any) => {
  return await axios({
    method,
    url: `http://aibigtree.com${path}`,
    data,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000 // 15s timeout for SaaS metadata calls
  });
};

async function saveResultToSaas(userId: string, toolId: string, base64: string) {
  const buffer = Buffer.from(base64, 'base64');
  
  // 1. Consume
  try {
    await saasCall('POST', '/api/tool/consume', { userId, toolId });
  } catch (e: any) {
    console.warn("SaaS Consume failed:", e.message);
  }
  
  // 2. Apply for direct token
  const tokenRes = await saasCall('POST', '/api/upload/direct-token', {
    userId, toolId, source: 'result', mimeType: 'image/png', fileSize: buffer.length
  });
  
  if (!tokenRes.data.success) throw new Error(tokenRes.data.error || "Failed to get upload token");

  // 3. PUT to OSS (with longer timeout for large files)
  await axios.put(tokenRes.data.uploadUrl, buffer, {
    headers: { 'Content-Type': 'image/png' },
    timeout: 30000 // 30s timeout for raw image upload
  });

  // 4. Commit
  const commitRes = await saasCall('POST', '/api/upload/commit', {
    userId, toolId, source: 'result', objectKey: tokenRes.data.objectKey, fileSize: buffer.length
  });

  return commitRes.data;
}

app.post("/api/tool/launch", (req, res) => proxyRequest(req, res, "/api/tool/launch"));
app.post("/api/tool/verify", (req, res) => proxyRequest(req, res, "/api/tool/verify"));
app.post("/api/tool/consume", (req, res) => proxyRequest(req, res, "/api/tool/consume"));

// Image Upload and Persistence Endpoints (Forwarded to SaaS Backend)
app.post("/api/upload/image", (req, res) => proxyRequest(req, res, "/api/upload/image"));
app.post("/api/upload/direct-token", (req, res) => proxyRequest(req, res, "/api/upload/direct-token"));
app.post("/api/upload/commit", (req, res) => proxyRequest(req, res, "/api/upload/commit"));

// Unified Gemini API Endpoint
app.post("/api/gemini", async (req, res) => {
  const { action, prompt, image, mimeType, config, userId, toolId } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
  }

  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    if (action === 'analyze') {
      // Use gemini-3-flash-preview for analysis
      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } },
            { text: prompt }
          ]
        }
      });
      res.json({ text: result.text });
    } else {
      // Image generation (gemini-3.1-flash-image-preview)
      const result = await genAI.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } },
            { text: prompt },
          ],
        },
        config: config
      });

      // Extract result base64
      let b64 = null;
      const parts = result.candidates?.[0]?.content?.parts;
      if (parts) {
        for (const part of parts) {
          if (part.inlineData) {
            b64 = part.inlineData.data;
            break;
          }
        }
      }

      // Standard Result Preservation (if SaaS IDs are provided)
      if (b64 && userId && toolId && userId !== 'null' && toolId !== 'null') {
        try {
          const saasResult = await saveResultToSaas(userId, toolId, b64);
          // @ts-ignore
          result._saas = saasResult;
        } catch (saasErr) {
          console.error("Auto-saving to SaaS failed, but returning image anyway");
        }
      }

      res.json(result);
    }
  } catch (error: any) {
    console.error("Gemini action failed:", error);
    res.status(500).json({ error: error.message || "AI Service Error" });
  }
});

export default app;
