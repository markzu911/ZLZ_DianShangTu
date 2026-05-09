import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // CORS and Iframe permissions
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

  // AI Generation with Gemini (Server-side to keep API Key secure)
  app.post("/api/generate", async (req, res) => {
    const { prompt, image, mimeType, model, config } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
    }

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      // @ts-ignore - Using experimental image generation model
      const result = await genAI.models.generateContent({
        model: model || 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } },
            { text: prompt },
          ],
        },
        config: config
      });

      res.json(result);
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  // Analysis endpoint (optional, if needed by App.tsx)
  app.post("/api/analyze", async (req, res) => {
    const { prompt, image, mimeType } = req.body;
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "API Key missing" });

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
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
    } catch (error: any) {
      console.error("Analysis failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // SaaS Proxy Logic
  const axios = (await import('axios')).default;
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
      console.error(`Proxy failed for ${targetPath}:`, error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "代理转发失败" });
    }
  };

  app.post("/api/tool/launch", (req, res) => proxyRequest(req, res, "/api/tool/launch"));
  app.post("/api/tool/verify", (req, res) => proxyRequest(req, res, "/api/tool/verify"));
  app.post("/api/tool/consume", (req, res) => proxyRequest(req, res, "/api/tool/consume"));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
