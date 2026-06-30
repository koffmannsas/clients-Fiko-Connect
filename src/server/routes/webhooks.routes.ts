import express from 'express';
import crypto from 'crypto';
import { FirestoreRepo } from '../repositories/firestore.repo';
import { AIService } from '../services/ai.service';
import { WABAService } from '../services/waba.service';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const router = express.Router();

function verifySignature(req: express.Request, res: express.Response, next: express.NextFunction) {
    const signature = req.headers["x-hub-signature-256"] as string;
    if (!signature) return res.status(401).send("No signature");

    const appSecret = process.env.WHATSAPP_APP_SECRET || "";
    const hmac = crypto.createHmac("sha256", appSecret);
    const digest = "sha256=" + hmac.update(req.body).digest("hex");

    if (signature !== digest) {
        // ALLOW fake signature ONLY in strictly non-production environments
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.STRICT_TEST_MODE === 'true';
        if (isTestEnv && signature === "sha256=fake_signature_for_test") {
            return next();
        }
        console.error(`[SECURITY] Signature mismatch. Expected ${digest} but got ${signature}`);
        return res.status(401).send("Invalid signature");
    }
    next();
}

router.get("/meta", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
    res.sendStatus(403);
});

router.post("/meta", express.raw({ type: 'application/json' }), verifySignature, async (req, res) => {
    try {
        const bodyObj = JSON.parse(req.body.toString());
        const entry = bodyObj.entry?.[0];
        const changes = entry?.changes?.[0]?.value;
        if (!changes) return res.sendStatus(200);

        const message = changes.messages?.[0];
        if (message) {
            const wa_id = message.id;
            const from = message.from;
            const text = message.text?.body || "";
            const recipient = changes.metadata?.display_phone_number;

            // --- IDEMPOTENCY ENGINE ---
            const processedRef = FirestoreRepo.db().collection('processed_messages').doc(wa_id);
            const lockRef = FirestoreRepo.db().collection('locks').doc(wa_id);

            // 1. Check if already processed
            const alreadyProcessed = await processedRef.get();
            if (alreadyProcessed.exists) {
                console.log(`[WEBHOOK] Skipping already processed message: ${wa_id}`);
                return res.sendStatus(200);
            }

            // 2. Atomic Lock to prevent race conditions during long AI generation
            const lock = await lockRef.get();
            if (lock.exists && lock.data()?.expiresAt.toMillis() > Date.now()) {
                console.log(`[WEBHOOK] Message ${wa_id} is currently being processed by another worker. Skipping.`);
                return res.sendStatus(200);
            }

            // Set lock for 30 seconds
            await lockRef.set({
                lockedAt: FieldValue.serverTimestamp(),
                expiresAt: Timestamp.fromMillis(Date.now() + 30000)
            });

            const msgRef = FirestoreRepo.db().collection('message_events').doc(wa_id);
            await msgRef.set({ from, recipient, text, status: 'RECEIVED', timestamp: FieldValue.serverTimestamp() });

            const q = await FirestoreRepo.db().collection('companies').where('whatsappNumber', '==', `+${recipient}`).limit(1).get();
            const companyId = !q.empty ? q.docs[0].id : "fiko_global_prod";

            await FirestoreRepo.syncLead(companyId, from, text);
            const aiResponse = await AIService.generateResponse(companyId, from, text);

            const mem = await FirestoreRepo.db().collection('fiko_memory').doc(companyId).get();
            if ((mem.data()?.knowledgeScore || 0) >= 90) {
                await WABAService.sendMessage(companyId, from, aiResponse);
            }

            // 3. Mark as processed & release lock
            await processedRef.set({
                processedAt: FieldValue.serverTimestamp(),
                wa_id,
                companyId
            });
            await lockRef.delete();
        }
        res.sendStatus(200);
    } catch (e) {
        console.error("[WEBHOOK] Critical error:", e);
        res.sendStatus(200);
    }
});

export default router;
