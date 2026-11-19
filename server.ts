import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { requireAuth } from "./server/auth";
import { 
  initializePaystackPayment, 
  handlePaystackWebhook, 
  verifyPaystackPayment, 
  getPaystackConfigStatus 
} from "./server/paystack";
import { 
  handleWhatsAppWebhookGet, 
  handleWhatsAppWebhookPost, 
  sendWhatsAppMessage, 
  getWhatsAppConfigStatus 
} from "./server/whatsapp";
import { updateLeadStage } from "./server/leads";
import {
  simulateKnowledgeResponse,
  ingestKnowledgeWithAI,
} from "./server/knowledge";
import {
  streamDeepScanUrl,
  streamDeepScanDocument,
  handleLearningLiveChat,
} from "./server/deepScan";

// Initialize Gemini AI (Lazy initialization)
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY environment variable is required');
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();

  // Preserve rawBody for HMAC webhook verification (Meta X-Hub-Signature & Paystack signature)
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));

  // --- HEALTH CHECK ---
  app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

  // --- WHATSAPP CLOUD API ROUTES ---
  app.get("/api/webhook", handleWhatsAppWebhookGet);
  app.post("/api/webhook", handleWhatsAppWebhookPost);
  app.post("/api/whatsapp/send", requireAuth as any, sendWhatsAppMessage as any);
  app.get("/api/whatsapp/status", getWhatsAppConfigStatus);

  // --- PAYSTACK GATEWAY ROUTES ---
  app.post("/api/paystack/initialize", requireAuth as any, initializePaystackPayment as any);
  app.post("/api/paystack/webhook", handlePaystackWebhook as any);
  app.get("/api/paystack/verify/:reference", requireAuth as any, verifyPaystackPayment as any);
  app.get("/api/paystack/status", getPaystackConfigStatus);

  // --- CRM LEADS STAGES ---
  app.post("/api/leads/update-stage", requireAuth as any, updateLeadStage as any);

  // --- FIKO KNOWLEDGE ENGINE V3.0 ---
  app.post("/api/knowledge/simulate", requireAuth as any, simulateKnowledgeResponse as any);
  app.post("/api/knowledge/ingest", requireAuth as any, ingestKnowledgeWithAI as any);
  app.post("/api/knowledge/deep-scan/stream", requireAuth as any, streamDeepScanUrl as any);
  app.post("/api/knowledge/deep-scan/document", requireAuth as any, streamDeepScanDocument as any);
  app.post("/api/knowledge/learning-chat", requireAuth as any, handleLearningLiveChat as any);

  // --- AI CAMPAIGN ASSISTANT ROUTES ---
  app.post("/api/campaigns/generate", async (req, res) => {
    try {
      const { objective, audience, tone } = req.body;
      const prompt = `You are an expert WhatsApp marketing copywriter. Generate a high-converting WhatsApp campaign message.
Objective: ${objective}
Audience: ${audience}
Tone: ${tone}

Requirements:
- Short version and long version
- Use emojis appropriately
- Include clear CTA
- Include variables like {{name}} where appropriate, enclosed in double curly braces.

Format your response as a JSON array where each object has:
- version: "short" | "long"
- content: "the message text"`;

      const result = await getAIClient().models.generateContent({ 
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const text = result.text;
      res.json(JSON.parse(text || "[]"));
    } catch (e: any) {
      console.error("AI Generation Error:", e);
      res.status(500).json({ error: "Generation failed", details: e.message });
    }
  });

  app.post("/api/campaigns/analyze", async (req, res) => {
    try {
      const { message } = req.body;
      const prompt = `SYSTEM MODE: CAMPAIGN PERFORMANCE ANALYZER

OBJECTIF :
Analyser une campagne WhatsApp marketing et prédire son potentiel de conversion.

Évaluer :
1. puissance du hook
2. qualité CTA
3. personnalisation
4. émotion
5. lisibilité
6. urgence
7. potentiel réponse

Retourner :
- score global /100
- scores détaillés (hookScore /25, ctaScore /20, emotionalScore /20, personalizationScore /15, readabilityScore /20)
- suggestions amélioration
- taux ouverture estimé
- taux réponse estimé

STYLE :
- précis
- stratégique
- orienté conversion

Message à analyser : "${message}"

OUTPUT JSON STRICT :
{
  "score": 0,
  "hookScore": 0,
  "ctaScore": 0,
  "emotionalScore": 0,
  "personalizationScore": 0,
  "readabilityScore": 0,
  "predictedOpenRate": 0,
  "predictedReplyRate": 0,
  "suggestions": []
}`;

      const result = await getAIClient().models.generateContent({ 
        model: "gemini-1.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const text = result.text;
      res.json(JSON.parse(text || "{}"));
    } catch (e: any) {
      console.error("AI Analysis Error:", e);
      res.status(500).json({ error: "Analysis failed", details: e.message });
    }
  });

  app.post("/api/campaigns/optimize", async (req, res) => {
    try {
      const { message, suggestions } = req.body;
      const prompt = `SYSTEM MODE: AI CAMPAIGN OPTIMIZATION ENGINE

OBJECTIF :
Prendre un brouillon de message WhatsApp marketing et l'optimiser pour maximiser la conversion.

MESSAGE ORIGINAL :
"${message}"

SUGGESTIONS D'AMÉLIORATION IDENTIFIÉES :
${suggestions ? suggestions.map((s: string) => '- ' + s).join('\n') : 'Aucune'}

TÂCHE :
Réécrire complètement ce message pour :
1. Avoir un Hook explosif 
2. Augmenter le FOMO / l'urgence
3. Avoir un CTA hyper clair et actionnable
4. Garder les variables {{name}} et {{company}} si présentes ou utiles.

Retourne uniquement le texte du nouveau message, sans introduction ni format JSON, juste le texte prêt à envoyer. Le message doit paraître naturel, pas trop formel (c'est WhatsApp), utiliser des emojis avec parcimonie.`;

      const result = await getAIClient().models.generateContent({ 
        model: "gemini-1.5-flash",
        contents: prompt
      });
      
      res.json({ optimizedMessage: result.text || "" });
    } catch (e: any) {
      console.error("AI Optimization Error:", e);
      res.status(500).json({ error: "Optimization failed", details: e.message });
    }
  });

  app.post("/api/campaigns/send", async (req, res) => {
    try {
      const { campaignId, contactCount } = req.body;
      console.log(`Queued campaign ${campaignId} for ${contactCount} contacts.`);
      res.json({ status: "queued", queuedAt: new Date().toISOString() });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to queue campaign" });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(3000, "0.0.0.0", () => console.log(`[Fiko OS Server] Running on http://localhost:3000`));
}

startServer();
