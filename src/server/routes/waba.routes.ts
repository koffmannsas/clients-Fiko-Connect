import express from 'express';
import { FirestoreRepo } from '../repositories/firestore.repo';
import { FieldValue } from 'firebase-admin/firestore';

const router = express.Router();

router.post("/connect", async (req, res) => {
    const { companyId, accessToken, phoneNumberId, businessAccountId } = req.body;
    try {
        await FirestoreRepo.db().collection('companies').doc(companyId).set({
            waba: { phoneNumberId, businessAccountId, status: 'CONNECTED', connectedAt: FieldValue.serverTimestamp() }
        }, { merge: true });
        await FirestoreRepo.db().collection('vault').doc(companyId).set({
            wabaToken: accessToken, updatedAt: FieldValue.serverTimestamp()
        });
        res.json({ success: true, status: "CONNECTED" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
