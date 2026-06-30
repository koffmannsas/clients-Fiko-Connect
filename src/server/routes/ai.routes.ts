import express from 'express';
import { AIService } from '../services/ai.service';

const router = express.Router();

router.post("/generic", async (req, res) => {
    const { companyId, prompt, context } = req.body;
    if (!companyId || !prompt) return res.status(400).json({ error: "Missing companyId or prompt" });

    try {
        const { brain } = await import("../../ai/brain");
        const response = await brain.generateGeneric(companyId, "admin", prompt, context || "Administrative Assistance");

        // Attempt to parse if it looks like JSON
        try {
            if (typeof response === 'string' && (response.trim().startsWith('{') || response.trim().startsWith('```json'))) {
                const cleaned = response.replace(/```json|```/g, '').trim();
                return res.json(JSON.parse(cleaned));
            }
        } catch (pe) {}

        res.json({ response });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/chat", async (req, res) => {
    const { companyId, leadId, message, history } = req.body;
    if (!companyId || !leadId) return res.status(400).json({ error: "Missing fields" });

    try {
        if (history) {
            // High-level analysis
            const { brain } = await import("../../ai/brain");
            const prompt = `Analyses cette conversation. JSON uniquement: { "summary": "...", "sentiment": "positive"|"neutral"|"negative", "objections": ["..."], "recommendedAction": "..." } History: ${JSON.stringify(history)}`;
            const raw = await brain.generateGeneric(companyId, leadId, prompt, "Conversation Analyst");
            const cleaned = raw.replace(/```json|```/g, '').trim();
            return res.json(JSON.parse(cleaned));
        }

        const response = await AIService.generateResponse(companyId, leadId, message);
        res.json({ response });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
