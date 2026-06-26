import express from 'express';
import { AIService } from '../services/ai.service';

const router = express.Router();

router.post("/generic", async (req, res) => {
    const { companyId, prompt, context } = req.body;
    if (!companyId || !prompt) return res.status(400).json({ error: "Missing companyId or prompt" });

    try {
        const { brain } = await import("../../ai/brain");
        const response = await brain.generateGeneric(companyId, "admin", prompt, context || "Administrative Assistance");
        res.json({ response });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post("/chat", async (req, res) => {
    const { companyId, leadId, message } = req.body;
    if (!companyId || !leadId || !message) return res.status(400).json({ error: "Missing fields" });

    try {
        const response = await AIService.generateResponse(companyId, leadId, message);
        res.json({ response });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
