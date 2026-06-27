import express from 'express';
import { AIService } from '../services/ai.service';
import { FirestoreRepo } from '../repositories/firestore.repo';
import { FieldValue } from 'firebase-admin/firestore';

const router = express.Router();

router.post("/analyze", async (req, res) => {
    const { companyId, message } = req.body;
    if (!companyId || !message) return res.status(400).json({ error: "Missing companyId or message" });
    try {
        const parsed = await AIService.trainDNA(companyId, message);
        try {
            await FirestoreRepo.db().collection('knowledge_base').add({ companyId, ...parsed, timestamp: FieldValue.serverTimestamp() });
            if (parsed.category.startsWith('dna_')) {
                await FirestoreRepo.db().collection(parsed.category).add({ companyId, content: parsed.fact, source: 'TRAINER', createdAt: FieldValue.serverTimestamp() });
            }
        } catch (dbErr) {
            console.warn("[DNA] DB write skipped (likely sandbox/missing-creds)");
        }
        res.json(parsed);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/stats/:companyId", async (req, res) => {
    const { companyId } = req.params;
    const stats: any = { dna_products: 0, dna_pricing: 0, dna_objections: 0, dna_competitors: 0, dna_faq: 0 };
    try {
        const cats = ['dna_products', 'dna_pricing', 'dna_objections', 'dna_competitors', 'dna_faq'];
        for (const c of cats) {
            try {
                const snap = await FirestoreRepo.db().collection(c).where('companyId', '==', companyId).get();
                stats[c] = snap.size;
            } catch (e) {
                stats[c] = 0;
            }
        }
    } catch (e) {}
    res.json(stats);
});

router.get("/score/:companyId", async (req, res) => {
    const { companyId } = req.params;
    let total = 0;
    try {
        const cats = ['dna_products', 'dna_pricing', 'dna_objections', 'dna_competitors', 'dna_faq'];
        for (const c of cats) {
            try {
                const snap = await FirestoreRepo.db().collection(c).where('companyId', '==', companyId).get();
                total += snap.size;
            } catch (e) {}
        }
    } catch (e) {}
    const score = Math.min(100, Math.round((total / 25) * 100));
    res.json({ score });
});

export default router;
