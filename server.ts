import "./src/env-init";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { brain } from "./src/ai/brain";
import crypto from "crypto";
import axios from "axios";
import bcrypt from "bcrypt";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "krypton-ai-490214";

if (!getApps().length) {
    initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}
const db = getFirestore();
const auth = getAuth();
const app = express();

const sendMessage = async (companyId: string, to: string, text: string) => {
    try {
        const vaultSnap = await db.collection('vault').doc(companyId).get();
        const token = vaultSnap.data()?.wabaToken;
        const companySnap = await db.collection('companies').doc(companyId).get();
        const phoneId = companySnap.data()?.waba?.phoneNumberId;
        if (!token || !phoneId) return false;
        const res = await axios.post(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
            messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { body: text }
        }, { headers: { Authorization: `Bearer ${token}` } });
        await db.collection('messages').add({ companyId, to, text, direction: 'OUTBOUND', wa_id: res.data.messages[0].id, timestamp: FieldValue.serverTimestamp() });
        return true;
    } catch (e) { return false; }
};

// --- PHASE 6: SALES DNA LEARNING ENGINE™ ---
const enrichSalesDNA = async (companyId: string, message: string) => {
    try {
        const prompt = `Tu es Fiko Learning Engine. Extrais des informations commerciales clés (produits, prix, faq) de ce message client: "${message}". Réponds uniquement en JSON: {"extractedFacts": [{"cat": "dna_products", "fact": "..."}]}`;
        const raw = await brain.generateGeneric(companyId, "learning", prompt, "Passive Learning");
        const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

        for (const item of parsed.extractedFacts) {
            await db.collection(item.cat).add({
                companyId, content: item.fact,
                source: 'PASSIVE_LEARNING',
                createdAt: FieldValue.serverTimestamp()
            });
        }
    } catch (e) { console.warn("[DNA] Passive learning failed"); }
};

const ingestMessage = async (companyId: string, from: string, text: string, wa_id: string) => {
    const batch = db.batch();
    const convId = `${companyId}_${from}`;
    batch.set(db.collection('messages').doc(wa_id), { companyId, from, text, direction: 'INBOUND', timestamp: FieldValue.serverTimestamp() });
    batch.set(db.collection('conversations').doc(convId), { companyId, participant: from, lastMessage: text, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(db.collection('leads').doc(convId), { companyId, phone: from, lastMessage: text, updatedAt: FieldValue.serverTimestamp(), status: 'Lead' }, { merge: true });
    await batch.commit();

    const memSnap = await db.collection('fiko_memory').doc(companyId).get();
    const aiResponse = await brain.generateSmartResponse(companyId, from, text, memSnap.data()?.longTermContext || "Commercial Fiko");

    // Autopilot Readiness Logic
    if ((memSnap.data()?.knowledgeScore || 0) >= 90) {
        await sendMessage(companyId, from, aiResponse);
    }

    // Enrich DNA from conversation
    await enrichSalesDNA(companyId, text);
};

// --- PHASE 7: AUTOPILOT READINESS ENGINE™ ---
app.get("/api/autopilot/status/:companyId", async (req, res) => {
    const { companyId } = req.params;
    const cats = ['dna_products', 'dna_pricing', 'dna_faq', 'dna_objections', 'dna_competitors'];
    const targets: any = { dna_products: 5, dna_pricing: 2, dna_faq: 5, dna_objections: 5, dna_competitors: 3 };
    let autopilotEnabled = true;
    const stats: any = {};

    for (const c of cats) {
        const count = (await db.collection(c).where('companyId', '==', companyId).get()).size;
        const pct = Math.min((count / targets[c]) * 100, 100);
        stats[c] = pct;
        if (pct < 80) autopilotEnabled = false;
    }

    const mem = await db.collection('fiko_memory').doc(companyId).get();
    const score = mem.data()?.knowledgeScore || 0;
    if (score < 90) autopilotEnabled = false;

    res.json({ autopilotEnabled, score, stats });
});

// --- REST OF ENDPOINTS ---
app.post("/api/dna/analyze", express.json(), async (req, res) => {
    const { companyId, message } = req.body;
    const trainingPrompt = `Tu es Fiko Knowledge Engine. Analyser le savoir commercial. Répondre uniquement en JSON: { "category": "dna_products" | "dna_pricing" | "dna_objections" | "dna_competitors" | "dna_faq", "fact": "le fait extrait", "response": "ton message" } Message: "${message}"`;
    const raw = await brain.generateGeneric(companyId, "trainer", trainingPrompt, "DNA Extraction");
    let parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    await db.collection('knowledge_base').add({ companyId, ...parsed, timestamp: FieldValue.serverTimestamp() });
    if (parsed.category.startsWith('dna_')) await db.collection(parsed.category).add({ companyId, content: parsed.fact, source: 'TRAINER', createdAt: FieldValue.serverTimestamp() });
    res.json(parsed);
});

app.get("/api/knowledge/score/:companyId", async (req, res) => {
    const { companyId } = req.params;
    const cats = ['dna_products', 'dna_pricing', 'dna_objections', 'dna_competitors', 'dna_faq'];
    let score = 0; let totalFacts = 0;
    for (const c of cats) {
        const count = (await db.collection(c).where('companyId', '==', companyId).get()).size;
        score += Math.min(count * 5, 20); totalFacts += count;
    }
    const final = Math.round(score);
    await db.collection('fiko_memory').doc(companyId).set({ knowledgeScore: final }, { merge: true });
    res.json({ score: final, totalFacts });
});

app.get("/api/webhooks/meta", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) return res.status(200).send(challenge);
    res.sendStatus(403);
});

app.post("/api/webhooks/meta", express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const bodyObj = JSON.parse(req.body.toString());
        const entry = bodyObj.entry?.[0];
        const changes = entry?.changes?.[0]?.value;
        if (!changes) return res.sendStatus(200);
        const message = changes.messages?.[0];
        if (message) {
            const wa_id = message.id; const from = message.from; const text = message.text?.body || "";
            const recipient = changes.metadata?.display_phone_number;
            const msgRef = db.collection('message_events').doc(wa_id);
            const msgSnap = await msgRef.get(); if (msgSnap.exists) return res.sendStatus(200);
            await msgRef.set({ from, recipient, text, status: 'RECEIVED', timestamp: FieldValue.serverTimestamp() });
            const q = await db.collection('companies').where('whatsappNumber', '==', `+${recipient}`).limit(1).get();
            const companyId = !q.empty ? q.docs[0].id : "fiko_global_prod";
            await ingestMessage(companyId, from, text, wa_id);
        }
        res.sendStatus(200);
    } catch (e) { res.sendStatus(200); }
});

app.post("/api/waba/connect", express.json(), async (req, res) => {
    const { companyId, accessToken, phoneNumberId, businessAccountId } = req.body;
    await db.collection('companies').doc(companyId).set({ waba: { phoneNumberId, businessAccountId, status: 'CONNECTED', connectedAt: FieldValue.serverTimestamp() } }, { merge: true });
    await db.collection('vault').doc(companyId).set({ wabaToken: accessToken, updatedAt: FieldValue.serverTimestamp() });
    res.json({ success: true, status: "CONNECTED" });
});

app.listen(PORT, () => console.log(`🚀 Fiko V4.1 Certified on ${PORT}`));
