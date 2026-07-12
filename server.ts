import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini client (Lazy initialization / check for key)
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  // API route for Gemini Summary - supporting both root and base-prefixed paths for subpath/mobile routing
  app.post(["/api/gemini/synopsis", "/Mosaic-Tracker/api/gemini/synopsis"], async (req, res) => {
    try {
      const { title, type } = req.body;
      if (!title) {
        res.status(400).json({ error: "Title is required" });
        return;
      }

      const ai = getGeminiClient();
      // Prompt specification:
      // "[Genre 1] | [Genre 2]
      // [A sharp, highly compact, and elegant 2-3 sentence plot summary focusing on thematic core elements.]"
      // Rules:
      // "no markdown code blocks (```), no introductory phrases, and no bolding labels"
      const systemInstruction = `You are a professional metadata analyzer and film critic. 
Analyze the requested media item and output exactly in the requested format.
Do not use markdown code blocks (such as \`\`\`), do not include introductory phrases, do not use bold labels.
`;

      const prompt = `Provide the genres and a synopsis for the ${type || 'movie'} titled "${title}".
Format the output EXACTLY like this:
[Genre 1] | [Genre 2] | [Genre 3]
[A sharp, highly compact, and elegant 2-3 sentence plot summary focusing on thematic core elements.]

For example:
Sci-Fi | Drama | Mystery
A disgraced astronaut discovers an anomalous gravitational shifting point in deep space. As he monitors the distortion, he realizes it mirrors his own fragmented domestic memories on Earth.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
        }
      });

      const text = response.text || "";
      res.json({ synopsis: text.trim() });
    } catch (error: any) {
      console.error("Gemini synopsis error:", error);
      res.status(500).json({ error: error.message || "Failed to generate synopsis" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
