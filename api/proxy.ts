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

app.post("/api/tool/launch", (req, res) => proxyRequest(req, res, "/api/tool/launch"));
app.post("/api/tool/verify", (req, res) => proxyRequest(req, res, "/api/tool/verify"));
app.post("/api/tool/consume", (req, res) => proxyRequest(req, res, "/api/tool/consume"));

// Image Upload and Persistence Endpoints (Forwarded to SaaS Backend)
app.post("/api/upload/image", (req, res) => proxyRequest(req, res, "/api/upload/image"));
app.post("/api/upload/direct-token", (req, res) => proxyRequest(req, res, "/api/upload/direct-token"));
app.post("/api/upload/commit", (req, res) => proxyRequest(req, res, "/api/upload/commit"));

// Unified Gemini API Endpoint
app.post("/api/gemini", async (req, res) => {
  const { action, prompt, image, mimeType, config } = req.body;
  
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
      // Default to image generation (gemini-3.1-flash-image-preview)
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
      res.json(result);
    }
  } catch (error: any) {
    console.error("Gemini action failed:", error);
    res.status(500).json({ error: error.message || "AI Service Error" });
  }
});

export default app;
