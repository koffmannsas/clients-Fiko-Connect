import express from 'express';
import { AIService } from '../services/ai.service';
import { FirestoreRepo } from '../repositories/firestore.repo';
import { FieldValue } from 'firebase-admin/firestore';

const router = express.Router();

router.post("/analyze", async (req, res) => {
    const { companyId, message } = req.body;
    try {
        const parsed = await AIService.trainDNA(companyId, message);
        await FirestoreRepo.db().collection('knowledge_base').add({ companyId, ...parsed, timestamp: FieldValue.serverTimestamp() });
        if (parsed.category.startsWith('dna_')) {
            await FirestoreRepo.db().collection(parsed.category).add({ companyId, content: parsed.fact, source: 'TRAINER', createdAt: FieldValue.serverTimestamp() });
        }
        res.json(parsed);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/stats/:companyId", async (req, res) => {
    const { companyId } = req.params;
    const stats: any = {};
    const cats = ['dna_products', 'dna_pricing', 'dna_objections', 'dna_competitors', 'dna_faq'];
    for (const c of cats) { stats[c] = (await FirestoreRepo.db().collection(c).where('companyId', '==', companyId).get()).size; }
    res.json(stats);
});

router.get("/score/:companyId", async (req, res) => {
    const { companyId } = req.params;
    try {
        const cats = ['dna_products', 'dna_pricing', 'dna_objections', 'dna_competitors', 'dna_faq'];
        let total = 0;
        for (const c of cats) {
            const count = (await FirestoreRepo.db().collection(c).where('companyId', '==', companyId).get()).size;
            total += count;
        }
        // Industrial logic: 25 facts = 100% score
        const score = Math.min(100, Math.round((total / 25) * 100));
        res.json({ score });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
