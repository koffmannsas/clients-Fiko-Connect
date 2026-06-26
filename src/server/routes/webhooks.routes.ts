import express from 'express';
import { FirestoreRepo } from '../repositories/firestore.repo';
import { AIService } from '../services/ai.service';
import { WABAService } from '../services/waba.service';
import { FieldValue } from 'firebase-admin/firestore';

const router = express.Router();

router.get("/meta", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
    res.sendStatus(403);
});

router.post("/meta", express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const bodyObj = JSON.parse(req.body.toString());
        const entry = bodyObj.entry?.[0];
        const changes = entry?.changes?.[0]?.value;
        if (!changes) return res.sendStatus(200);

        const message = changes.messages?.[0];
        if (message) {
            const wa_id = message.id; const from = message.from; const text = message.text?.body || "";
            const recipient = changes.metadata?.display_phone_number;

            const msgRef = FirestoreRepo.db().collection('message_events').doc(wa_id);
            if ((await msgRef.get()).exists) return res.sendStatus(200);
            await msgRef.set({ from, recipient, text, status: 'RECEIVED', timestamp: FieldValue.serverTimestamp() });

            // Robust multi-tenant resolution
            const q = await FirestoreRepo.db().collection('companies').where('whatsappNumber', '==', `+${recipient}`).limit(1).get();
            const companyId = !q.empty ? q.docs[0].id : "fiko_global_prod";

            await FirestoreRepo.syncLead(companyId, from, text);
            const aiResponse = await AIService.generateResponse(companyId, from, text);

            const mem = await FirestoreRepo.db().collection('fiko_memory').doc(companyId).get();
            if ((mem.data()?.knowledgeScore || 0) >= 90) {
                await WABAService.sendMessage(companyId, from, aiResponse);
            }
        }
        res.sendStatus(200);
    } catch (e) { res.sendStatus(200); }
});

export default router;
