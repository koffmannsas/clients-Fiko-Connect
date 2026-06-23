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

// --- INDUSTRIAL OTP & AUTH ENGINE V2 ---
app.post("/api/auth/send-otp", express.json(), async (req, res) => {
    const { phoneNumber, type, password, firstName, lastName, activity } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: "Missing phone number" });

    if (type === 'login') {
        const companySnap = await db.collection('companies').where('whatsappNumber', '==', phoneNumber).limit(1).get();
        if (companySnap.empty) return res.status(404).json({ error: "Compte inexistant" });

        const companyData = companySnap.docs[0].data();
        if (password && companyData.passwordHash) {
            const match = await bcrypt.compare(password, companyData.passwordHash);
            if (!match) return res.status(401).json({ error: "Mot de passe incorrect" });
        }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = crypto.randomUUID();

    try {
        const signupData = type === 'signup' ? {
            pendingFirstName: firstName,
            pendingLastName: lastName,
            pendingActivity: activity,
            pendingPasswordHash: await bcrypt.hash(password, 10)
        } : {};

        await db.collection('otp_sessions').doc(phoneNumber).set({
            otp,
            sessionId,
            type,
            ...signupData,
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

        if (data.type === 'signup') {
            await db.collection('companies').doc(companyId).set({
                id: companyId,
                whatsappNumber: phoneNumber,
                firstName: data.pendingFirstName,
                lastName: data.pendingLastName,
                industry: data.pendingActivity,
                passwordHash: data.pendingPasswordHash,
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
        }

        const customToken = await auth.createCustomToken(companyId, { phoneNumber });
        await docRef.delete();
        res.json({ success: true, companyId, token: customToken });
    } else {
        await docRef.update({ attempts: FieldValue.increment(1) });
        res.status(401).json({ error: "Invalid OTP" });
    }
});

// --- V3.1: BRAIN TRAINER ENGINE (FIKO SALES DNA™) ---
app.post("/api/ai/train", express.json(), async (req, res) => {
    const { companyId, message } = req.body;
    if (!companyId || !message) return res.status(400).json({ error: "Missing data" });

    try {
        const trainingPrompt = `Tu es Fiko Knowledge Engine. Un client t'explique son business.
        Tu dois :
        1. Analyser et extraire les informations clés.
        2. Catégoriser l'information dans une de ces catégories : 'products', 'pricing', 'objections', 'competitors', 'faq'.
        3. Répondre intelligemment en confirmant ce que tu as appris.
        4. Poser une question de suivi stratégique.

        IMPORTANT: Ta réponse doit être au format JSON:
        {
          "category": "la catégorie détectée",
          "fact": "le fait extrait",
          "response": "ton message au client"
        }

        Message du client: "${message}"`;

        const rawResponse = await brain.generateGeneric(companyId, "trainer", trainingPrompt, "Training Session");
        let parsed;
        try {
            parsed = JSON.parse(rawResponse.replace(/```json|```/g, ''));
        } catch (e) {
            parsed = { category: 'general', fact: message, response: rawResponse };
        }

        // Persist Knowledge (Fiko Sales DNA™)
        const batch = db.batch();
        const knowledgeRef = db.collection('fiko_memory').doc(companyId).collection('knowledge_base').doc();
        batch.set(knowledgeRef, {
            rawInput: message,
            category: parsed.category,
            fact: parsed.fact,
            timestamp: FieldValue.serverTimestamp()
        });

        // Specific DNA Collections
        if (['products', 'pricing', 'objections', 'competitors', 'faq'].includes(parsed.category)) {
            const dnaRef = db.collection(parsed.category).doc(`${companyId}_${crypto.randomBytes(4).toString('hex')}`);
            batch.set(dnaRef, {
                companyId,
                content: parsed.fact,
                createdAt: FieldValue.serverTimestamp()
            });
        }

        // Update Knowledge Score
        const memRef = db.collection('fiko_memory').doc(companyId);
        batch.set(memRef, {
            knowledgeScore: FieldValue.increment(2),
            lastUpdate: FieldValue.serverTimestamp()
        }, { merge: true });

        await batch.commit();

        const memSnap = await memRef.get();
        const currentScore = memSnap.data()?.knowledgeScore || 0;

        res.json({ response: parsed.response, newScore: currentScore, category: parsed.category });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/api/ai/generate-playbook", express.json(), async (req, res) => {
    const { companyId } = req.body;
    try {
        const knowledgeSnap = await db.collection('fiko_memory').doc(companyId).collection('knowledge_base').get();
        const facts = knowledgeSnap.docs.map(d => d.data().fact).join("\n- ");

        const playbookPrompt = `En te basant sur ces faits : \n- ${facts}\nGénère un Playbook Commercial complet (Scripts WhatsApp, Relances, Traitement des objections).`;

        const playbook = await brain.generateGeneric(companyId, "playbook_gen", playbookPrompt, "Playbook Generation");

        await db.collection('sales_playbooks').doc(companyId).set({
            content: playbook,
            updatedAt: FieldValue.serverTimestamp()
        });

        res.json({ success: true, playbook });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- OMEGA AI PROXY ---
app.post("/api/ai/generic", express.json(), async (req, res) => {
    try {
        const { companyId, leadId, prompt, context } = req.body;
        const response = await brain.generateGeneric(companyId, leadId, prompt, context);
        res.json({ response });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
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

// --- V3.1 EXTENSION: DNA ASSETS GENERATOR ---
app.post("/api/ai/dna/generate-assets", express.json(), async (req, res) => {
    const { companyId, category } = req.body;
    try {
        const dnaSnap = await db.collection(category).where('companyId', '==', companyId).get();
        const rawDNA = dnaSnap.docs.map(d => d.data().content).join("\n- ");

        const assetPrompt = `Tu es Fiko DNA Architect. Basé sur ces informations : \n- ${rawDNA}\nGénère 5 scripts WhatsApp de haute performance pour la catégorie ${category}. Format JSON: {"scripts": ["..."]}`;

        const response = await brain.generateGeneric(companyId, "dna_assets", assetPrompt, "Asset Generation");
        let parsed = JSON.parse(response.replace(/```json|```/g, ''));

        const assetsRef = db.collection('fiko_dna_assets').doc(`${companyId}_${category}`);
        await assetsRef.set({
            category,
            scripts: parsed.scripts,
            updatedAt: FieldValue.serverTimestamp()
        });

        res.json({ success: true, scripts: parsed.scripts });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- V3.2: VOICE INTELLIGENCE™ PIPELINE (SKELETON) ---
app.post("/api/ai/voice-trainer", express.json(), async (req, res) => {
    const { companyId, audioUrl } = req.body;
    try {
        // Pipeline Simulation: Audio -> Transcription -> DNA Extraction
        console.log(`[VOICE] Processing commercial audio for ${companyId}: ${audioUrl}`);

        const transcription = "Simulated Transcription: 'Nos prix commencent à 50 000 F et nous offrons une remise de 10% pour tout paiement par Wave.'";

        const extractionPrompt = `Extrais l'ADN commercial de cette transcription : "${transcription}". Catégorise et formate en JSON.`;
        const dna = await brain.generateGeneric(companyId, "voice_extraction", extractionPrompt, "Voice Training");

        await db.collection('fiko_memory').doc(companyId).collection('voice_sessions').add({
            audioUrl,
            transcription,
            extractedDNA: dna,
            timestamp: FieldValue.serverTimestamp()
        });

        res.json({ success: true, transcription, dna });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// --- V3.3: FIKO AUTOPILOT™ ENGINE ---
app.post("/api/whatsapp/autopilot/status", express.json(), async (req, res) => {
    const { companyId } = req.body;
    try {
        const memSnap = await db.collection('fiko_memory').doc(companyId).get();
        const score = memSnap.data()?.knowledgeScore || 0;
        const isAutopilotReady = score >= 90;

        res.json({
            score,
            isAutopilotReady,
            status: isAutopilotReady ? 'ACTIVE' : 'LEARNING',
            missingDNA: score < 90 ? ['Concurrents', 'Scripts de Relance'] : []
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});
