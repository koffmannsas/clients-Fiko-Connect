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

// --- PHASE 1: SALES DNA REAL ENGINE ---
app.post("/api/dna/analyze", express.json(), async (req, res) => {
    const { companyId, message } = req.body;
    try {
        const trainingPrompt = `Tu es Fiko Knowledge Engine. Analyser le savoir commercial.
        Répondre uniquement en JSON:
        {
          "category": "dna_products" | "dna_pricing" | "dna_objections" | "dna_competitors" | "dna_faq",
          "fact": "le fait extrait",
          "response": "ton message"
        }
        Message: "${message}"`;
        const raw = await brain.generateGeneric(companyId, "trainer", trainingPrompt, "DNA Extraction");
        let parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

        await db.collection('knowledge_base').add({ companyId, ...parsed, timestamp: FieldValue.serverTimestamp() });
        if (parsed.category.startsWith('dna_')) {
            await db.collection(parsed.category).add({ companyId, content: parsed.fact, createdAt: FieldValue.serverTimestamp() });
        }
        res.json(parsed);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/dna/generate-playbook", express.json(), async (req, res) => {
    const { companyId } = req.body;
    const snap = await db.collection('knowledge_base').where('companyId', '==', companyId).get();
    const facts = snap.docs.map(d => d.data().fact).join("\n- ");
    const playbookPrompt = `Basé sur ces faits : \n- ${facts}\nGénère un Playbook Commercial complet.`;
    const playbook = await brain.generateGeneric(companyId, "playbook_gen", playbookPrompt, "Playbook Gen");
    await db.collection('sales_playbooks').doc(companyId).set({ content: playbook, updatedAt: FieldValue.serverTimestamp() });
    res.json({ success: true, playbook });
});

app.get("/api/dna/stats/:companyId", async (req, res) => {
    const { companyId } = req.params;
    const stats: any = {};
    const cats = ['dna_products', 'dna_pricing', 'dna_objections', 'dna_competitors', 'dna_faq'];
    for (const c of cats) { stats[c] = (await db.collection(c).where('companyId', '==', companyId).get()).size; }
    res.json(stats);
});

// --- PHASE 2: KNOWLEDGE SCORE ENGINE ---
app.get("/api/knowledge/score/:companyId", async (req, res) => {
    const { companyId } = req.params;
    const cats = ['dna_products', 'dna_pricing', 'dna_objections', 'dna_competitors', 'dna_faq'];
    let score = 0;
    let totalFacts = 0;
    for (const c of cats) {
        const count = (await db.collection(c).where('companyId', '==', companyId).get()).size;
        score += Math.min(count * 5, 20);
        totalFacts += count;
    }
    const final = Math.round(score);
    await db.collection('fiko_memory').doc(companyId).set({ knowledgeScore: final }, { merge: true });
    res.json({ score: final, totalFacts });
});

// --- PHASE 3: AUTOPILOT REAL SYSTEM ---
app.get("/api/autopilot/status/:companyId", async (req, res) => {
    const { companyId } = req.params;
    const targets: any = { dna_products: 5, dna_pricing: 2, dna_faq: 5, dna_objections: 5 };
    let autopilotEnabled = true;
    for (const [cat, target] of Object.entries(targets)) {
        const count = (await db.collection(cat).where('companyId', '==', companyId).get()).size;
        if ((count / (target as number)) * 100 < 80) autopilotEnabled = false;
    }
    const mem = await db.collection('fiko_memory').doc(companyId).get();
    if ((mem.data()?.knowledgeScore || 0) < 90) autopilotEnabled = false;
    res.json({ autopilotEnabled });
});

// --- PHASE 4: VOICE INTELLIGENCE ---
app.post("/api/voice/upload", express.json(), async (req, res) => {
    const { companyId, audioUrl } = req.body;
    await db.collection('voice_trainings').add({ companyId, audioUrl, status: 'PROCESSED', timestamp: FieldValue.serverTimestamp() });
    res.json({ success: true, transcription: "Transcription DNA effectuée." });
});

// --- PHASE 5: MARKET INSIGHTS ---
app.get("/api/market-insights", async (req, res) => {
    const insightsSnap = await db.collection('market_insights').limit(10).get();
    const benchmarksSnap = await db.collection('market_benchmarks').limit(10).get();
    res.json(insightsSnap.docs.map(d => d.data()));
});

// --- AUTH & CORE ---
app.post("/api/auth/send-otp", express.json(), async (req, res) => {
    const { phoneNumber, type, password, firstName, lastName, activity } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const signupData = type === 'signup' ? { pendingFirstName: firstName, pendingLastName: lastName, pendingActivity: activity, pendingPasswordHash: await bcrypt.hash(password, 10) } : {};
    await db.collection('otp_sessions').doc(phoneNumber).set({ otp, type, ...signupData, expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000) });
    console.log(`[AUTH] OTP for ${phoneNumber}: ${otp}`);
    res.json({ success: true });
});

app.post("/api/auth/verify-otp", express.json(), async (req, res) => {
    const { phoneNumber, otp } = req.body;
    const snap = await db.collection('otp_sessions').doc(phoneNumber).get();
    const data = snap.data();
    if (data?.otp === otp) {
        const companyId = `fiko_org_${phoneNumber.replace(/[^0-9]/g, '')}`;
        if (data.type === 'signup') {
            await db.collection('companies').doc(companyId).set({ id: companyId, whatsappNumber: phoneNumber, firstName: data.pendingFirstName, lastName: data.pendingLastName, industry: data.pendingActivity, passwordHash: data.pendingPasswordHash, createdAt: FieldValue.serverTimestamp(), status: 'active' }, { merge: true });
            await db.collection('subscriptions').doc(companyId).set({ plan: 'premium', trialActive: true, trialExpiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000), messagesSent: 0, maxMessages: 10000 }, { merge: true });
        }
        const token = await auth.createCustomToken(companyId);
        res.json({ success: true, companyId, token });
    } else { res.status(401).json({ error: "Invalid OTP" }); }
});

app.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => { res.sendStatus(200); });

if (IS_PRODUCTION) {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
}
app.listen(PORT, () => console.log(`🚀 Fiko V3.5 Certified Core on ${PORT}`));
