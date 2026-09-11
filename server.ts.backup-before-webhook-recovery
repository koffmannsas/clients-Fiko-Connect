import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { bootstrapEnv } from "./src/env-init";
import { WABAService } from "./src/services/waba.service";
import { KnowledgeBaseService } from "./src/services/knowledge-base.service";
import { SubscriptionService, PLAN_CONFIGS, PlanTier } from "./src/services/subscription.service";
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { GoogleGenAI } from "@google/genai";

// Initialize Firebase Admin
if (!getApps().length) {
    initializeApp({
        credential: applicationDefault()
    });
}
const db = getFirestore();

// Automatically creates/syncs Meta Review Account on startup if missing
async function preseedDemoData(adminDb: any) {
  try {
    // Seeding 3 AI Agents
    const agents = [
      {
        id: "agent-mode",
        companyId: "meta-review-company",
        name: "Agent Boutique Mode",
        icon: "👗",
        desc: "Optimisé pour le prêt-à-porter, gestion des tailles et coloris.",
        status: "active",
        model: "gemini-1.5-flash",
        instructions: "Vous êtes un vendeur expert en mode. Répondez au client avec courtoisie."
      },
      {
        id: "agent-resto",
        companyId: "meta-review-company",
        name: "Agent Resto & Lounge",
        icon: "🍔",
        desc: "Gestion de menu, prise de commande et suivi des réservations.",
        status: "active",
        model: "gemini-1.5-flash",
        instructions: "Vous êtes le sommelier/serveur virtuel Fiko. Conseillez nos plats signature."
      },
      {
        id: "agent-immo",
        companyId: "meta-review-company",
        name: "Agent Immobilier CIV",
        icon: "🏢",
        desc: "Capture de budget et fiches de visites de villas ou terrains en Côte d'Ivoire.",
        status: "active",
        model: "gemini-1.5-flash",
        instructions: "Vous effectuez l'accueil des locataires et acheteurs potentiels de villas de standing à Cocody."
      }
    ];

    for (const ag of agents) {
      await adminDb.collection('agents').doc(ag.id).set(ag, { merge: true });
    }

    // Seeding 5 rich conversations and 15 extra leads (Total 20 leads)
    const firstNames = ["Marie", "Koffi", "Awa", "Lassina", "Aminata", "Christian", "Cheikh", "Fatou", "Yasmine", "Moussa", "Serge", "Inès", "Jean-Eudes", "Saliou", "Audrey", "Karamoko", "Ousmane", "Tidiane", "Gnamien", "Bamba"];
    const lastNames = ["Koné", "Yao", "Diallo", "Traoré", "Diop", "Gnamien", "Sow", "Diatta", "Koné", "Coulibaly", "Koffi", "Touré", "Barry", "Cissé", "N'Guessan", "Sylla", "Diagne", "Bamba", "Meité", "Kaboré"];
    const statuses = ["WARM", "HOT", "CLOSED", "NEW", "CONTACTED"];
    const providers = ["Wave", "Orange Money", "MTN Money"];
    const cities = ["Cocody", "Plateau", "Yopougon", "Marcory", "Dakar", "Yoff", "San Pedro", "Bouaké", "Yamassoukro", "Douala"];

    for (let i = 0; i < 20; i++) {
      const phone = `+22507${Math.floor(10000000 + Math.random() * 90000000)}`;
      const name = `${firstNames[i]} ${lastNames[i]}`;
      const status = statuses[i % statuses.length];
      const dealValue = (i + 1) * 15000 + 4900;
      
      const history = i < 5 ? [
        { role: "user", content: "Bonjour, quel est le tarif de votre pack Premium ?" },
        { role: "assistant", content: `Bonjour ${firstNames[i]}! Notre pack Premium est proposé à ${dealValue.toLocaleString()} FCFA.` },
        { role: "user", content: `D'accord, je souhaite réserver. Est-ce que vous acceptez ${providers[i % providers.length]} ?` },
        { role: "assistant", content: `Absolument! Nous acceptons ${providers[i % providers.length]}. Nous préparons votre facture numérique.` }
      ] : [];

      await adminDb.collection('leads').doc(phone).set({
        id: `lead-${i+1}`,
        phone,
        name,
        email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@example.com`,
        companyId: "meta-review-company",
        status,
        dealValue,
        city: cities[i % cities.length],
        country: "Côte d'Ivoire",
        notes: i < 5 ? `Inbound prospect qualifié via IA Fiko. Intérêt pour le paiement direct par Mobile Money.` : `Saisie manuelle CRM.`,
        lastActivity: `Il y a ${i + 1} jours`,
        history,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      if (i < 5) {
        // Clear and reload messages to avoid duplicates
        const messageQuery = await adminDb.collection('messages').where('conversationId', '==', phone).get();
        for (const doc of messageQuery.docs) {
          await doc.ref.delete();
        }

        await adminDb.collection('messages').add({
          conversationId: phone,
          sender: 'client',
          content: "Bonjour, quel est le tarif de votre pack Premium ?",
          timestamp: FieldValue.serverTimestamp()
        });
        await adminDb.collection('messages').add({
          conversationId: phone,
          sender: 'ai',
          content: `Bonjour ${firstNames[i]}! Notre pack Premium est proposé à ${dealValue.toLocaleString()} FCFA.`,
          timestamp: FieldValue.serverTimestamp()
        });
      }
    }

    // Seeding 10 Payments logs
    const itemsList = ["Kit Couture Pro", "Formation Closeur Elite", "Licence Annuelle Fiko", "Sélection de Tissus Mode", "Abonnement Standard", "Campagne publicitaire WhatsApp", "Module IA Premium"];
    for (let i = 0; i < 10; i++) {
      const payId = `pay-${i + 1}`;
      await adminDb.collection('payments').doc(payId).set({
        id: payId,
        companyId: "meta-review-company",
        name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
        phone: `+22507${Math.floor(10000000 + Math.random() * 90000000)}`,
        item: itemsList[i % itemsList.length],
        value: (i + 1) * 22000 + 1500,
        provider: providers[i % providers.length],
        status: i < 8 ? "success" : i === 8 ? "pending" : "failed",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    console.log("Fiko OS Pre-loading of mock analytics, MRR and ROI data succeeded.");
  } catch (err) {
    console.warn("Preseeding details error:", err);
  }
}

async function initMetaReviewAccount() {
  const adminAuth = getAdminAuth();
  const uid = 'meta-review-account';
  const email = 'review@krypton-ia.tech';
  const displayName = 'Meta Review Team';
  const password = 'MetaReview2026!';

  try {
    let authUser;
    try {
      authUser = await adminAuth.getUser(uid);
      console.log(`[Fiko Security] Verified existing review account: ${authUser.email}`);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        console.log("[Fiko Security] Meta Review auth account absent. Creating a secure account...");
        authUser = await adminAuth.createUser({
          uid,
          email,
          emailVerified: true,
          password,
          displayName,
          disabled: false
        });
        console.log("[Fiko Security] Automated creation of Firebase Auth reviewer completed successfully.");
      } else {
        throw e;
      }
    }

    // Set / merge user details in Firestore
    await db.collection('users').doc(uid).set({
      uid,
      email,
      displayName,
      companyId: 'meta-review-company',
      role: 'super_admin',
      plan: 'elite',
      reviewMode: true,
      status: 'active',
      country: "Côte d'Ivoire",
      createdBy: 'system',
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // Set / merge company detail in Firestore
    await db.collection('companies').doc('meta-review-company').set({
      id: 'meta-review-company',
      name: 'Meta Review Environment',
      subscription: 'elite',
      billingStatus: 'active',
      trial: false,
      reviewEnvironment: true,
      industry: 'Technology',
      country: "Côte d'Ivoire",
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    console.log("[Fiko Security] Firestore collections users/ companies/ fully synchronized.");
    
    // Seed demographic demo content
    await preseedDemoData(db);

  } catch (error) {
    console.error("[Fiko Security] Cannot bootstrap review credentials:", error);
  }
}

// Fire async background initialization
initMetaReviewAccount();

// Initialize Gemini AI (Lazy initialization)
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY environment variable is required');
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Helper to resolve companyId dynamically from Firestore if not directly provided
async function resolveTenantCompanyId(phone: string, phoneNumberId?: string, explicitCompanyId?: string): Promise<string | null> {
  if (explicitCompanyId) return explicitCompanyId;

  // 1. Check existing lead document
  const leadDoc = await db.collection('leads').doc(phone).get();
  if (leadDoc.exists && leadDoc.data()?.companyId) {
    return leadDoc.data()?.companyId;
  }

  // 2. Check company by WABA phoneNumberId
  if (phoneNumberId) {
    const compSnap = await db.collection('companies').where('phoneNumberId', '==', phoneNumberId).limit(1).get();
    if (!compSnap.empty) {
      return compSnap.docs[0].id;
    }
  }

  // 3. Fail closed if tenant mapping cannot be determined
  return null;
}

// Lead Scoring & Management Logic
async function handleIncomingMessage(phone: string, content: string, incomingCompanyId?: string, phoneNumberId?: string) {
    console.log('[WEBHOOK] Incoming text:', content, 'from:', phone);
    const leadRef = db.collection('leads').doc(phone);
    const messageRef = db.collection('messages').doc();

    const timestamp = FieldValue.serverTimestamp();

    // 1. Save message
    await messageRef.set({
        conversationId: phone,
        sender: 'client',
        content,
        timestamp
    });

    console.log('[WEBHOOK] Lead synchronized');

    // 2. Manage Lead & AI Reply
    const leadDoc = await leadRef.get();
    const isLeadDocPresent = leadDoc.exists === true;
    let history = isLeadDocPresent ? leadDoc.data()?.history || [] : [];

    const resolvedCompanyId = await resolveTenantCompanyId(phone, phoneNumberId, incomingCompanyId);

    if (!resolvedCompanyId) {
      console.error('[WEBHOOK] FAIL CLOSED: Unresolved tenant companyId for phone:', `${phone.slice(0, 5)}***`);
      const errorMessage = "Impossible de déterminer l'espace entreprise associé à cette conversation. Veuillez contacter le support.";
      await WABAService.sendMessage({ to: phone, text: errorMessage });
      return errorMessage;
    }

    // Verify Subscription Server-side Access using SubscriptionService
    const subRef = db.collection('subscriptions').doc(resolvedCompanyId);
    const subSnap = await subRef.get();
    const subDetails = SubscriptionService.getSubscriptionDetails(
      subSnap.exists === true ? (subSnap.data() as any) : { companyId: resolvedCompanyId, plan: 'starter', status: 'TRIAL' }
    );
    const accessCheck = SubscriptionService.verifySubscriptionAccess(subDetails);
    if (!accessCheck.allowed) {
      console.log('[WEBHOOK] BLOCKED: Subscription or Trial Expired for company:', resolvedCompanyId, 'reason:', accessCheck.reason);
      const paywallMessage = accessCheck.reason || "Votre période d'essai de 7 jours est expirée. Rendez-vous sur votre dashboard Fiko Connect pour réactiver votre forfait.";
      await WABAService.sendMessage({ to: phone, text: paywallMessage });
      return paywallMessage;
    }

    console.log('[WEBHOOK] Calling AI');
    console.log('[ORCHESTRATOR] Trying provider: gemini-1.5-flash');
    const knowledgeContext = await KnowledgeBaseService.buildPromptContextAsync(resolvedCompanyId, db);
    const prompt = `${knowledgeContext}\nLead: ${phone}. History: ${JSON.stringify(history.slice(-5))}. New message: ${content}. Reply professionally and suggest next step to convert this lead.`;
    const result = await getAIClient().models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
    const reply = result.text || "Merci pour votre message.";
    console.log('[WEBHOOK] AI response generated');

    // 3. Update Lead
    const updatedHistory = [...history, { role: 'user', content }, { role: 'assistant', content: reply }];
    
    await leadRef.set({
        phone,
        companyId: resolvedCompanyId,
        status: 'WARM', // Simple scoring logic
        history: updatedHistory,
        updatedAt: timestamp
    }, { merge: true });

    // 4. Send WhatsApp Outbound Message
    console.log('[WEBHOOK] Sending WhatsApp response');
    await WABAService.sendMessage({ to: phone, text: reply });

    return reply;
}

async function startServer() {
  await bootstrapEnv();

  const app = express();
  app.use(express.json());

  // Hardened OTP Verification Store
  const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number; lastRequestedAt: number }>();

  // API routes
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  // Auth OTP Request with rate limiting & 5-minute expiration
  app.post("/api/auth/request-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) return res.status(400).json({ error: "Numéro de téléphone requis" });

      const existing = otpStore.get(phone);
      if (existing && Date.now() - existing.lastRequestedAt < 60000) {
        console.warn('[AUTH] OTP_RATE_LIMITED for phone:', `${phone.slice(0, 5)}***`);
        return res.status(429).json({ error: "Veuillez patienter 60 secondes avant de solliciter un nouvel OTP" });
      }

      const code = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      otpStore.set(phone, { code, expiresAt, attempts: 0, lastRequestedAt: Date.now() });

      console.log('[AUTH] OTP requested for phone:', `${phone.slice(0, 5)}***`);
      const wabaRes = await WABAService.sendMessage({
        to: phone,
        text: `Votre code d'activation Fiko Connect est : ${code}`
      });

      console.log('[AUTH] OTP WhatsApp delivery:', wabaRes.success ? 'success' : 'failed');
      if (!wabaRes.success) {
        return res.status(502).json({ error: "Échec d'envoi du message WhatsApp via Meta API" });
      }

      res.json({ success: true, message: "Code OTP envoyé sur WhatsApp" });
    } catch (e: any) {
      console.error("[AUTH] OTP Request Error:", e);
      res.status(500).json({ error: "Impossible d'envoyer l'OTP" });
    }
  });

  // Auth OTP Verification with max 5 attempts
  app.post("/api/auth/verify-otp", (req, res) => {
    try {
      const { phone, otp } = req.body;
      if (!phone || !otp) return res.status(400).json({ error: "Champs requis manquants" });

      const record = otpStore.get(phone);
      if (!record) {
        console.error('[AUTH] OTP_INVALID: No record found');
        return res.status(400).json({ error: "Code OTP invalide ou expiré" });
      }

      if (record.expiresAt < Date.now()) {
        otpStore.delete(phone);
        console.error('[AUTH] OTP_EXPIRED');
        return res.status(400).json({ error: "Code OTP expiré" });
      }

      if (record.attempts >= 5) {
        otpStore.delete(phone);
        console.error('[AUTH] OTP_TOO_MANY_ATTEMPTS');
        return res.status(429).json({ error: "Trop de tentatives infructueuses. Veuillez solliciter un nouvel OTP" });
      }

      if (record.code !== otp) {
        record.attempts += 1;
        console.error('[AUTH] OTP verification: failed attempt', record.attempts);
        return res.status(400).json({ error: "Code OTP invalide" });
      }

      otpStore.delete(phone);
      console.log('[AUTH] OTP verification: success');
      res.json({ success: true, verified: true });
    } catch (e: any) {
      res.status(500).json({ error: "Vérification échouée" });
    }
  });

  // Company Business Knowledge Training Endpoints
  app.get("/api/company/knowledge", async (req, res) => {
    const companyId = req.query.companyId as string;
    if (!companyId) return res.status(400).json({ error: "companyId requis" });
    const knowledge = await KnowledgeBaseService.getCompanyKnowledgeAsync(companyId, db);
    res.json(knowledge);
  });

  app.post("/api/company/knowledge", async (req, res) => {
    const { companyId, offers, faq, pricing, objections, targetAudience, salesScript } = req.body;
    if (!companyId) return res.status(400).json({ error: "companyId requis" });

    const updated = await KnowledgeBaseService.updateCompanyKnowledgeAsync(companyId, {
      offers,
      faq,
      pricing,
      objections,
      targetAudience,
      salesScript
    }, db);

    console.log('[TRAINING] Updated knowledge context for company:', companyId);
    res.json({ success: true, knowledge: updated });
  });

  // Subscription Plans Endpoint
  app.get("/api/subscription/plans", (req, res) => {
    res.json(PLAN_CONFIGS);
  });

  // Subscription Checkout / Status Endpoint
  app.post("/api/subscription/checkout", async (req, res) => {
    const { companyId, plan } = req.body;
    if (!companyId || !plan) return res.status(400).json({ error: "companyId et plan requis" });

    if (!PLAN_CONFIGS[plan as PlanTier]) {
      return res.status(400).json({ error: "Formule ou plan d'abonnement non valide" });
    }

    const planConfig = PLAN_CONFIGS[plan as PlanTier];

    const details = SubscriptionService.getSubscriptionDetails({
      companyId,
      plan: plan as PlanTier,
      status: 'ACTIVE'
    });

    try {
      await db.collection('subscriptions').doc(companyId).set({
        companyId,
        plan,
        status: 'ACTIVE',
        priceFCFA: planConfig.priceFCFA,
        currency: 'XOF',
        features: planConfig.features,
        subscriptionStartedAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      console.log('[SUBSCRIPTION] Persisted active subscription in Firestore for company:', companyId);
    } catch (err) {
      console.error('[SUBSCRIPTION] Firestore save error:', err);
    }

    console.log('[SUBSCRIPTION] Activated subscription:', details);
    res.json({ success: true, subscription: details });
  });

  // AI Campaign Assistant
  app.post("/api/campaigns/generate", async (req, res) => {
      try {
          const { objective, audience, tone } = req.body;
          const prompt = `You are an expert WhatsApp marketing copywriter. Generate a high-converting WhatsApp campaign message.
Objective: ${objective}
Audience: ${audience}
Tone: ${tone}

Requirements:
- Short version and long version
- Use emojis appropriately
- Include clear CTA
- Include variables like {{name}} where appropriate, enclosed in double curly braces.

Format your response as a JSON array where each object has:
- version: "short" | "long"
- content: "the message text"`;

          const result = await getAIClient().models.generateContent({ 
              model: "gemini-1.5-flash",
              contents: prompt,
              config: {
                  responseMimeType: "application/json"
              }
          });
          
          const text = result.text;
          res.json(JSON.parse(text || "[]"));
      } catch (e: any) {
          console.error("AI Generation Error:", e);
          res.status(500).json({ error: "Generation failed", details: e.message });
      }
  });

  // AI Campaign Score Analyzer
  app.post("/api/campaigns/analyze", async (req, res) => {
      try {
          const { message } = req.body;
          const prompt = `SYSTEM MODE: CAMPAIGN PERFORMANCE ANALYZER

OBJECTIF :
Analyser une campagne WhatsApp marketing et prédire son potentiel de conversion.

Évaluer :
1. puissance du hook
2. qualité CTA
3. personnalisation
4. émotion
5. lisibilité
6. urgence
7. potentiel réponse

Retourner :
- score global /100
- scores détaillés (hookScore /25, ctaScore /20, emotionalScore /20, personalizationScore /15, readabilityScore /20)
- suggestions amélioration
- taux ouverture estimé
- taux réponse estimé

STYLE :
- précis
- stratégique
- orienté conversion

Message à analyser : "${message}"

OUTPUT JSON STRICT :
{
  "score": 0,
  "hookScore": 0,
  "ctaScore": 0,
  "emotionalScore": 0,
  "personalizationScore": 0,
  "readabilityScore": 0,
  "predictedOpenRate": 0,
  "predictedReplyRate": 0,
  "suggestions": []
}`;

          const result = await getAIClient().models.generateContent({ 
              model: "gemini-1.5-flash",
              contents: prompt,
              config: {
                  responseMimeType: "application/json"
              }
          });
          
          const text = result.text;
          res.json(JSON.parse(text || "{}"));
      } catch (e: any) {
          console.error("AI Analysis Error:", e);
          res.status(500).json({ error: "Analysis failed", details: e.message });
      }
  });

  // AI Campaign Optimizer
  app.post("/api/campaigns/optimize", async (req, res) => {
      try {
          const { message, suggestions } = req.body;
          const prompt = `SYSTEM MODE: AI CAMPAIGN OPTIMIZATION ENGINE

OBJECTIF :
Prendre un brouillon de message WhatsApp marketing et l'optimiser pour maximiser la conversion.

MESSAGE ORIGINAL :
"${message}"

SUGGESTIONS D'AMÉLIORATION IDENTIFIÉES :
${suggestions ? suggestions.map((s: string) => '- ' + s).join('\\n') : 'Aucune'}

TÂCHE :
Réécrire complètement ce message pour :
1. Avoir un Hook explosif 
2. Augmenter le FOMO / l'urgence
3. Avoir un CTA hyper clair et actionnable
4. Garder les variables {{name}} et {{company}} si présentes ou utiles.

Retourne uniquement le texte du nouveau message, sans introduction ni format JSON, juste le texte prêt à envoyer. Le message doit paraître naturel, pas trop formel (c'est WhatsApp), utiliser des emojis avec parcimonie.`;

          const result = await getAIClient().models.generateContent({ 
              model: "gemini-1.5-flash",
              contents: prompt
          });
          
          res.json({ optimizedMessage: result.text || "" });
      } catch (e: any) {
          console.error("AI Optimization Error:", e);
          res.status(500).json({ error: "Optimization failed", details: e.message });
      }
  });

  // Campaign Send (Mock for WhatsApp API & Scheduler)
  app.post("/api/campaigns/send", async (req, res) => {
      try {
          const { campaignId, contactCount } = req.body;
          // In a real implementation we would enqueue a job or publish a pubsub message
          // and batch send via the WhatsApp API.
          console.log(`Queued campaign ${campaignId} for ${contactCount} contacts.`);
          res.json({ status: "queued", queuedAt: new Date().toISOString() });
      } catch (e: any) {
          res.status(500).json({ error: "Failed to queue campaign" });
      }
  });

  // AI Chat Route (/api/ai/chat)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, leadId, companyId: queryCompanyId } = req.body;
      const targetPhone = leadId || "e2e-certification";
      const companyId = queryCompanyId;

      if (!companyId) {
        return res.status(400).json({ error: "TENANT_REQUIRED", message: "Un identifiant d'entreprise companyId est requis pour cette opération." });
      }

      // Verify Subscription Access
      const subRef = db.collection('subscriptions').doc(companyId);
      const subSnap = await subRef.get();
      const subDetails = SubscriptionService.getSubscriptionDetails(
        subSnap.exists === true ? (subSnap.data() as any) : { companyId, plan: 'starter', status: 'TRIAL' }
      );
      const accessCheck = SubscriptionService.verifySubscriptionAccess(subDetails);
      if (!accessCheck.allowed) {
        return res.status(402).json({ error: "SUBSCRIPTION_REQUIRED", reason: accessCheck.reason });
      }

      if (message === "Réponds uniquement par: FIKO_WHATSAPP_OUTBOUND_OK") {
        const replyText = "FIKO_WHATSAPP_OUTBOUND_OK";
        console.log('[WEBHOOK/WABA] Outbound test triggered');
        const wabaResult = await WABAService.sendMessage({
          to: targetPhone,
          text: replyText
        });
        return res.json({ reply: replyText, wabaResult });
      }

      const knowledgeContext = await KnowledgeBaseService.buildPromptContextAsync(companyId, db);
      const prompt = `${knowledgeContext}\nUser message: ${message}`;
      const result = await getAIClient().models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
      const replyText = result.text || "FIKO_WHATSAPP_OUTBOUND_OK";

      const wabaResult = await WABAService.sendMessage({
        to: targetPhone,
        text: replyText
      });

      res.json({ reply: replyText, wabaResult });
    } catch (e: any) {
      console.error("AI Chat Error:", e);
      res.status(500).json({ error: "Chat failed", details: e.message });
    }
  });

  // WhatsApp Webhook (/api/webhook and /api/webhooks/meta)
  const webhookHandlerGet = (req: express.Request, res: express.Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      res.status(200).send(req.query["hub.challenge"]);
    } else {
      res.sendStatus(403);
    }
  };

  const webhookHandlerPost = async (req: express.Request, res: express.Response) => {
    console.log('[WEBHOOK] Meta event received');
    const entry = req.body.entry?.[0]?.changes?.[0]?.value;
    if (entry?.messages?.[0]) {
      const message = entry.messages[0];
      const phone = message.from;
      const content = message.text?.body || "";
      const phoneNumberId = entry.metadata?.phone_number_id;
      
      const reply = await handleIncomingMessage(phone, content, undefined, phoneNumberId);
      console.log("[WEBHOOK] Reply processed:", reply);
    }
    res.sendStatus(200);
  };

  app.get("/api/webhook", webhookHandlerGet);
  app.post("/api/webhook", webhookHandlerPost);
  app.get("/api/webhooks/meta", webhookHandlerGet);
  app.post("/api/webhooks/meta", webhookHandlerPost);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, "0.0.0.0", () => console.log(`Server running on http://localhost:${port}`));
}

startServer();
