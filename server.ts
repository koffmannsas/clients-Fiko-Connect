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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- INFRASTRUCTURE: SINGLE SOURCE OF TRUTH ---
const PORT = process.env.PORT || 4000;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "krypton-ai-490214";

if (!getApps().length) {
    console.log(`[INIT] Booting Fiko Engine (${IS_PRODUCTION ? 'PRODUCTION' : 'STAGING'}) on project: ${PROJECT_ID}`);
    initializeApp({
        credential: applicationDefault(),
        projectId: PROJECT_ID
    });
}
const db = getFirestore();
const auth = getAuth();

const app = express();

// --- STATUS & OBSERVABILITY ---
app.get("/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV, port: PORT, timestamp: new Date().toISOString() });
});

app.get("/firebase-status", async (req, res) => {
    try {
        const collections = await db.listCollections();
        res.json({ projectId: PROJECT_ID, firestore: "connected", collections: collections.map(c => c.id) });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- INDUSTRIAL OTP AUTHENTICATION ---
app.post("/api/auth/send-otp", express.json(), async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: "Missing phone number" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = crypto.randomUUID();

    try {
        await db.collection('otp_sessions').doc(phoneNumber).set({
            otp,
            sessionId,
            attempts: 0,
            expiresAt: Timestamp.fromMillis(Date.now() + 5 * 60 * 1000)
        });

        console.log(`[AUTH] OTP for ${phoneNumber}: ${otp}`);

        const token = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        if (token && phoneId) {
            await axios.post(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
                messaging_product: "whatsapp",
                to: phoneNumber,
                type: "template",
                template: {
                    name: "fiko_otp",
                    language: { code: "fr" },
                    components: [{ type: "body", parameters: [{ type: "text", text: otp }] }]
                }
            }, { headers: { Authorization: `Bearer ${token}` } }).catch(e => console.error("OTP Send failed", e.response?.data));
        }

        res.json({ success: true, sessionId });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/auth/verify-otp", express.json(), async (req, res) => {
    const { phoneNumber, otp } = req.body;
    const docRef = db.collection('otp_sessions').doc(phoneNumber);
    const snap = await docRef.get();

    if (!snap.exists) return res.status(404).json({ error: "No session found" });
    const data = snap.data();

    if (data?.otp === otp) {
        const companyId = `fiko_org_${phoneNumber.replace(/[^0-9]/g, '')}`;

        await db.collection('companies').doc(companyId).set({
            id: companyId,
            whatsappNumber: phoneNumber,
            createdAt: FieldValue.serverTimestamp(),
            status: 'active'
        }, { merge: true });

        await db.collection('subscriptions').doc(companyId).set({
            plan: 'premium',
            trialActive: true,
            trialStartedAt: FieldValue.serverTimestamp(),
            trialExpiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
            messagesSent: 0,
            aiMessagesSent: 0,
            maxMessages: 10000
        }, { merge: true });

        const customToken = await auth.createCustomToken(companyId, { phoneNumber });
        await docRef.delete();
        res.json({ success: true, companyId, token: customToken });
    } else {
        await docRef.update({ attempts: FieldValue.increment(1) });
        res.status(401).json({ error: "Invalid OTP" });
    }
});

// --- INDUSTRIAL QR PAIRING ---
app.post("/api/auth/pairing/create", express.json(), async (req, res) => {
    const { phoneNumber } = req.body;
    const pairingCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    await db.collection('pairing_sessions').doc(phoneNumber).set({
        code: pairingCode,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp()
    });

    res.json({ success: true, pairingCode });
});

app.get("/api/auth/pairing/status/:phone", async (req, res) => {
    const snap = await db.collection('pairing_sessions').doc(req.params.phone).get();
    res.json(snap.exists ? snap.data() : { status: 'none' });
});

// --- WHATSAPP CORE ---
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";

function verifySignature(req: express.Request, res: express.Response, buf: Buffer) {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) return false;
    const hash = "sha256=" + crypto.createHmac('sha256', WHATSAPP_APP_SECRET).update(buf).digest('hex');
    return (signature === hash);
}

async function isDuplicate(messageId: string) {
    const docRef = db.collection('processed_messages').doc(messageId);
    try {
        await docRef.create({ processedAt: FieldValue.serverTimestamp(), messageId });
        return false;
    } catch (e: any) {
        return true;
    }
}

app.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    if (WHATSAPP_APP_SECRET && !verifySignature(req, res, req.body)) return res.sendStatus(401);

    let bodyObj;
    try { bodyObj = JSON.parse(req.body.toString()); } catch (e) { return res.sendStatus(400); }

    const message = bodyObj.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    if (await isDuplicate(message.id)) return res.sendStatus(200);

    const from = message.from;
    const text = message.text?.body || "";
    const recipient = bodyObj.entry[0].changes[0].value.metadata?.display_phone_number;

    const q = await db.collection('companies').where('whatsappNumber', '==', recipient).limit(1).get();
    const companyId = !q.empty ? q.docs[0].id : "fiko_global_prod";

    await db.collection('leads').doc(`${companyId}_${from}`).set({
        companyId,
        phone: from,
        lastMessage: text,
        updatedAt: FieldValue.serverTimestamp(),
        status: 'Lead'
    }, { merge: true });

    console.log(`[WHATSAPP] Received from ${from} to ${recipient}: ${text}`);
    res.sendStatus(200);
});

// --- SERVING ---
if (IS_PRODUCTION) {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
}

app.listen(PORT, async () => {
    console.log(`🚀 Fiko Engine Active on project: ${PROJECT_ID}`);
});
