import { Response } from "express";
import { AuthenticatedRequest } from "./auth";
import { getServerDb } from "./db";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { 
  toPaystackSubunits, 
  fromPaystackSubunits, 
  isValidPaystackEmail, 
  getPaystackMode, 
  generateFikoPaymentReference,
  PaystackTransaction
} from "../src/lib/paystack";
import { verifyPaystackWebhookSignature } from "./webhook-verify";

/**
 * Returns configuration status of Paystack gateway without exposing secret key
 */
export function getPaystackConfigStatus(_req: any, res: Response) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const publicKey = process.env.PAYSTACK_PUBLIC_KEY;
  const isConfigured = !!(secretKey && secretKey.trim().length > 0);
  const mode = getPaystackMode(secretKey);

  res.json({
    isConfigured,
    mode,
    currency: "XOF",
    publicKey: publicKey || null
  });
}

/**
 * Initializes a Paystack transaction on behalf of a merchant
 */
export async function initializePaystackPayment(req: AuthenticatedRequest, res: Response) {
  const { leadId, customerEmail, customerName, customerPhone, amountCommercial, description } = req.body;
  const companyId = req.user?.companyId || "default-company";

  // 1. Validation
  if (!amountCommercial || typeof amountCommercial !== 'number' || amountCommercial <= 0) {
    return res.status(400).json({
      error: "INVALID_AMOUNT",
      message: "Le montant commercial en FCFA doit être un nombre strictement positif."
    });
  }

  if (!customerEmail || !isValidPaystackEmail(customerEmail)) {
    return res.status(400).json({
      error: "INVALID_EMAIL",
      message: "Une adresse email client valide est requise par la passerelle Paystack."
    });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return res.status(503).json({
      error: "GATEWAY_UNCONFIGURED",
      message: "La passerelle Paystack est à configurer (variable PAYSTACK_SECRET_KEY absente)."
    });
  }

  const mode = getPaystackMode(secretKey);
  const amountSubunits = toPaystackSubunits(amountCommercial);
  const reference = generateFikoPaymentReference(companyId);

  const db = await getServerDb();
  const txRef = doc(db, "transactions", reference);

  // Check if reference already exists to prevent duplicate
  const existingSnap = await getDoc(txRef);
  if (existingSnap.exists()) {
    return res.status(409).json({
      error: "REFERENCE_COLLISION",
      message: "Référence de transaction déjà existante. Veuillez réessayer."
    });
  }

  try {
    // 2. Call Paystack API
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: customerEmail.trim().toLowerCase(),
        amount: amountSubunits,
        currency: "XOF",
        reference,
        callback_url: `${appUrl}/?paystack_ref=${reference}`,
        metadata: {
          companyId,
          leadId: leadId ? String(leadId) : null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          amountCommercial,
          description: description || "Paiement commercial Fiko OS"
        }
      })
    });

    const paystackData: any = await paystackRes.json();

    if (!paystackRes.ok || !paystackData.status) {
      console.error("[Paystack Init Error]", paystackData);
      return res.status(502).json({
        error: "PAYSTACK_INITIALIZATION_FAILED",
        message: paystackData.message || "Échec de l'initialisation de la transaction auprès de Paystack."
      });
    }

    const authUrl = paystackData.data.authorization_url;
    const accessCode = paystackData.data.access_code;

    // 3. Persist pending transaction record in Firestore
    const txRecord: PaystackTransaction = {
      reference,
      companyId,
      leadId: leadId ? String(leadId) : undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      customerEmail: customerEmail.trim().toLowerCase(),
      amountCommercial,
      amountPaystackSubunits: amountSubunits,
      currency: "XOF",
      mode,
      status: "PENDING",
      authorizationUrl: authUrl,
      accessCode,
      createdAt: new Date().toISOString()
    };

    await setDoc(txRef, txRecord);

    return res.json({
      status: "success",
      reference,
      authorizationUrl: authUrl,
      accessCode,
      amountCommercial,
      currency: "XOF",
      mode
    });
  } catch (err: any) {
    console.error("[Paystack Exception]", err);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Erreur interne lors de la création du lien Paystack : " + err.message
    });
  }
}

/**
 * Handles Paystack incoming Webhooks with HMAC SHA512 signature validation
 */
export async function handlePaystackWebhook(req: AuthenticatedRequest, res: Response) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.warn("[Paystack Webhook] Received webhook but PAYSTACK_SECRET_KEY is not configured.");
    return res.status(503).send("Gateway unconfigured.");
  }

  const signature = req.headers["x-paystack-signature"] as string | undefined;
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

  // 1. Signature Verification
  const isValid = verifyPaystackWebhookSignature(rawBody, signature, secretKey);
  if (!isValid) {
    console.error("[Paystack Webhook] Invalid HMAC SHA512 signature rejected.");
    return res.status(401).send("Invalid signature.");
  }

  const eventPayload = req.body;
  const event = eventPayload?.event;
  const data = eventPayload?.data;

  // We are interested in charge.success
  if (event === "charge.success" && data) {
    const reference = data.reference;
    const paidAmountSubunits = data.amount;
    const currency = data.currency;

    if (!reference) {
      return res.status(400).send("Missing reference in event data.");
    }

    const db = await getServerDb();
    const txRef = doc(db, "transactions", reference);
    const txSnap = await getDoc(txRef);

    if (!txSnap.exists()) {
      console.warn(`[Paystack Webhook] Transaction not found for ref ${reference}. Creating recovery entry.`);
      // Store recovery record
      await setDoc(txRef, {
        reference,
        amountPaystackSubunits: paidAmountSubunits,
        amountCommercial: fromPaystackSubunits(paidAmountSubunits),
        currency: currency || "XOF",
        status: "TO_VERIFY",
        customerEmail: data.customer?.email || "unknown",
        paystackId: data.id,
        createdAt: new Date().toISOString(),
        notes: "Webhook reçu pour une transaction non pré-enregistrée."
      });
      return res.sendStatus(200);
    }

    const txData = txSnap.data() as PaystackTransaction;

    // 2. Idempotency Check: Avoid double-counting!
    if (txData.status === "SUCCESS") {
      console.log(`[Paystack Webhook] Reference ${reference} already confirmed. Acknowledging.`);
      return res.sendStatus(200);
    }

    // 3. Amount & Currency Verification
    if (currency !== "XOF" || paidAmountSubunits !== txData.amountPaystackSubunits) {
      console.error(`[Paystack Webhook] Amount/currency mismatch for ${reference}. Expected ${txData.amountPaystackSubunits} XOF, got ${paidAmountSubunits} ${currency}.`);
      await updateDoc(txRef, {
        status: "FAILED",
        failureReason: `Incohérence montant/devise : Reçu ${paidAmountSubunits} ${currency} vs Attendu ${txData.amountPaystackSubunits} XOF`
      });
      return res.sendStatus(200);
    }

    // 4. Update Transaction Record to SUCCESS
    const nowIso = new Date().toISOString();
    await updateDoc(txRef, {
      status: "SUCCESS",
      paystackId: data.id,
      paidAt: data.paid_at || nowIso,
      paymentMethod: data.channel || "card",
      gatewayResponse: data.gateway_response || "Successful",
      verifiedAt: nowIso
    });

    console.log(`[Paystack Webhook] Transaction ${reference} confirmed. Amount: ${txData.amountCommercial} FCFA.`);

    // 5. Update Associated Lead in CRM to "Payé"
    if (txData.leadId) {
      try {
        const leadRef = doc(db, "leads", String(txData.leadId));
        const leadSnap = await getDoc(leadRef);
        if (leadSnap.exists()) {
          await updateDoc(leadRef, {
            status: "Payé",
            paidTransactionReference: reference,
            paidAmount: txData.amountCommercial,
            paidAt: nowIso,
            isTestPayment: txData.mode === "test",
            lastActivity: "Paiement Paystack confirmé"
          });
          console.log(`[Paystack Webhook] Lead ${txData.leadId} moved to 'Payé'.`);
        }
      } catch (leadErr: any) {
        console.error("[Paystack Webhook] Failed to update lead status:", leadErr.message);
      }
    }

    // 6. Record System Confirmation Message in WhatsApp Conversation
    if (txData.customerPhone) {
      try {
        await addDoc(collection(db, "messages"), {
          conversationId: txData.customerPhone,
          companyId: txData.companyId,
          sender: "ai",
          content: `✅ Paiement confirmé ! Réf: ${reference} - Montant: ${txData.amountCommercial.toLocaleString()} FCFA reçu via Paystack. Votre commande est validée.`,
          timestamp: serverTimestamp(),
          direction: "outbound",
          deliveryStatus: "delivered"
        });
      } catch (msgErr: any) {
        console.warn("[Paystack Webhook] Failed to record payment receipt message:", msgErr.message);
      }
    }
  }

  return res.sendStatus(200);
}

/**
 * Manually verifies a transaction with Paystack API and reconciles Firestore state
 */
export async function verifyPaystackPayment(req: AuthenticatedRequest, res: Response) {
  const { reference } = req.params;
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    return res.status(503).json({
      error: "GATEWAY_UNCONFIGURED",
      message: "Clé PAYSTACK_SECRET_KEY absente."
    });
  }

  if (!reference) {
    return res.status(400).json({ error: "MISSING_REFERENCE", message: "Référence requise." });
  }

  try {
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        "Authorization": `Bearer ${secretKey}`
      }
    });

    const result: any = await paystackRes.json();
    if (!paystackRes.ok || !result.status) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: result.message || "Transaction introuvable auprès de Paystack."
      });
    }

    const data = result.data;
    const isSuccess = data.status === "success";
    const paidAmountSubunits = data.amount;
    const currency = data.currency;

    const db = await getServerDb();
    const txRef = doc(db, "transactions", reference);
    const txSnap = await getDoc(txRef);

    if (txSnap.exists()) {
      const txData = txSnap.data() as PaystackTransaction;
      if (isSuccess && txData.status !== "SUCCESS") {
        // Reconcile and update
        const nowIso = new Date().toISOString();
        await updateDoc(txRef, {
          status: "SUCCESS",
          paystackId: data.id,
          paidAt: data.paid_at || nowIso,
          paymentMethod: data.channel,
          verifiedAt: nowIso
        });

        if (txData.leadId) {
          try {
            const leadRef = doc(db, "leads", String(txData.leadId));
            await updateDoc(leadRef, {
              status: "Payé",
              paidTransactionReference: reference,
              paidAmount: txData.amountCommercial,
              paidAt: nowIso,
              isTestPayment: txData.mode === "test"
            });
          } catch {}
        }
      }
    }

    return res.json({
      status: "success",
      reference,
      gatewayStatus: data.status,
      isPaid: isSuccess,
      amountCommercial: fromPaystackSubunits(paidAmountSubunits),
      currency,
      paidAt: data.paid_at,
      channel: data.channel
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "VERIFICATION_ERROR",
      message: "Erreur lors de la vérification : " + err.message
    });
  }
}
