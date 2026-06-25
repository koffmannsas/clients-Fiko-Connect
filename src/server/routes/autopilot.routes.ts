import express from 'express';
import { FirestoreRepo } from '../repositories/firestore.repo';

const router = express.Router();

router.get("/status/:companyId", async (req, res) => {
    const { companyId } = req.params;
    const targets: any = { dna_products: 5, dna_pricing: 2, dna_faq: 5, dna_objections: 5 };
    let autopilotEnabled = true;

    for (const [cat, target] of Object.entries(targets)) {
        const count = (await FirestoreRepo.db().collection(cat).where('companyId', '==', companyId).get()).size;
        if ((count / (target as number)) * 100 < 80) autopilotEnabled = false;
    }

    const mem = await FirestoreRepo.db().collection('fiko_memory').doc(companyId).get();
    if ((mem.data()?.knowledgeScore || 0) < 90) autopilotEnabled = false;

    res.json({ autopilotEnabled });
});

export default router;
