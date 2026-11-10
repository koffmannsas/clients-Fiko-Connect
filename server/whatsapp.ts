import { Request, Response } from "express";
import { AuthenticatedRequest } from "./auth";
import { getServerDb } from "./db";
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { verifyMetaWebhookSignature } from "./webhook-verify";
import { checkWhatsAppServiceWindow } from "../src/lib/whatsapp";

// In-memory set for fast deduplication within current process lifecycle
const processedMessageIds = new Set<string>();

/**
 * Meta Webhook Challenge Verification (GET)
 */
export function handleWhatsAppWebhookGet(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token && expectedToken && token === expectedToken) {
    console.log("[WhatsApp Webhook] Verification successful for Meta challenge.");
    return res.status(200).send(challenge);
  } else {
    console.warn("[WhatsApp Webhook] Verification failed. Token mismatch or missing.");
    return res.sendStatus(403);
  }
}

/**
 * Meta Webhook Ingestion (POST)
 * Handles incoming messages and message delivery status updates
 */
export async function handleWhatsAppWebhookPost(req: AuthenticatedRequest, res: Response) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

  // 1. Signature Verification if app secret is configured
  if (appSecret) {
    const isValid = verifyMetaWebhookSignature(rawBody, signature, appSecret);
    if (!isValid) {
      console.error("[WhatsApp Webhook] Invalid X-Hub-Signature-256 signature.");
      return res.status(401).send("Invalid signature.");
    }
  }

  const body = req.body;
  if (!body?.entry || !Array.isArray(body.entry)) {
    return res.sendStatus(200);
  }

  const db = await getServerDb();

  for (const entry of body.entry) {
    const changes = entry.changes || [];
    for (const change of changes) {
      const value = change.value;
      if (!value) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      const contacts = value.contacts || [];
      const messages = value.messages || [];
      const statuses = value.statuses || [];

      // A. Process Incoming Messages
      for (const msg of messages) {
        const msgId = msg.id;
        if (!msgId) continue;

        // 2. Deduplication check
        if (processedMessageIds.has(msgId)) {
          console.log(`[WhatsApp Webhook] Duplicate message ${msgId} skipped.`);
          continue;
        }
        processedMessageIds.add(msgId);
        // Bound cache size
        if (processedMessageIds.size > 5000) {
          const first = processedMessageIds.values().next().value;
          if (first) processedMessageIds.delete(first);
        }

        const phone = msg.from;
        const contactInfo = contacts.find((c: any) => c.wa_id === phone);
        const contactName = contactInfo?.profile?.name || phone;
        const msgText = msg.text?.body || (msg.type ? `[Message ${msg.type}]` : "[Message sans texte]");
        const timestampMs = msg.timestamp ? parseInt(msg.timestamp, 10) * 1000 : Date.now();

        console.log(`[WhatsApp Webhook] Inbound message from ${contactName} (${phone}): ${msgText}`);

        // 3. Upsert Lead in Firestore
        try {
          const leadRef = doc(db, "leads", phone);
          const leadSnap = await getDoc(leadRef);

          if (!leadSnap.exists()) {
            // New Lead creation
            await setDoc(leadRef, {
              id: phone,
              phone,
              name: contactName,
              companyId: "default-company",
              status: "Nouveau",
              dealValue: 0,
              provider: "Paystack",
              score: 70,
              lastMessage: msgText,
              lastActivity: "Message WhatsApp reçu",
              lastClientMessageTimestamp: timestampMs,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            console.log(`[WhatsApp Webhook] Created new Lead for phone ${phone}`);
          } else {
            // Update existing lead with latest message and reset the 24h service window!
            await updateDoc(leadRef, {
              lastMessage: msgText,
              lastActivity: "Nouveau message WhatsApp",
              lastClientMessageTimestamp: timestampMs,
              updatedAt: new Date().toISOString()
            });
          }
        } catch (leadErr: any) {
          console.error("[WhatsApp Webhook] Error saving lead:", leadErr.message);
        }

        // 4. Save Message in Firestore
        try {
          await addDoc(collection(db, "messages"), {
            whatsappMessageId: msgId,
            conversationId: phone,
            sender: "client",
            content: msgText,
            timestamp: serverTimestamp(),
            direction: "inbound",
            deliveryStatus: "received",
            phoneNumberId: phoneNumberId || null
          });
        } catch (msgErr: any) {
          console.error("[WhatsApp Webhook] Error saving message:", msgErr.message);
        }
      }

      // B. Process Message Delivery Statuses (sent, delivered, read, failed)
      for (const st of statuses) {
        const msgId = st.id;
        const newStatus = st.status; // sent, delivered, read, failed
        if (!msgId || !newStatus) continue;

        try {
          const q = query(collection(db, "messages"), where("whatsappMessageId", "==", msgId));
          const querySnap = await getDocs(q);
          for (const docSnap of querySnap.docs) {
            await updateDoc(docSnap.ref, {
              deliveryStatus: newStatus,
              updatedAt: serverTimestamp()
            });
          }
        } catch (stErr: any) {
          console.warn("[WhatsApp Webhook] Error updating status:", stErr.message);
        }
      }
    }
  }

  return res.sendStatus(200);
}

/**
 * Send an outbound WhatsApp message with 24-hour service window check
 */
export async function sendWhatsAppMessage(req: AuthenticatedRequest, res: Response) {
  const { phone, text, leadId } = req.body;

  if (!phone || !text || !text.trim()) {
    return res.status(400).json({
      error: "MISSING_PARAMS",
      message: "Numéro de téléphone et texte du message requis."
    });
  }

  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  const db = await getServerDb();

  // 1. Verify 24-Hour Customer Care Service Window
  try {
    const leadRef = doc(db, "leads", cleanPhone);
    const leadSnap = await getDoc(leadRef);

    if (leadSnap.exists()) {
      const leadData = leadSnap.data();
      const lastClientMsgAt = leadData?.lastClientMessageTimestamp;
      const windowCheck = checkWhatsAppServiceWindow(lastClientMsgAt);

      if (!windowCheck.isOpen) {
        return res.status(403).json({
          error: "WINDOW_EXPIRED",
          message: "La fenêtre de service WhatsApp de 24h est expirée. Le message libre ne peut pas être distribué. Veuillez utiliser un template Meta approuvé ou inviter le client à vous écrire."
        });
      }
    }
  } catch (err: any) {
    console.warn("[WhatsApp Send] Warning during window verification:", err.message);
  }

  // 2. Check Meta Cloud API Configuration
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return res.status(503).json({
      error: "WHATSAPP_UNCONFIGURED",
      message: "WhatsApp Cloud API non configurée sur le serveur (WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID manquants)."
    });
  }

  // 3. Dispatch to Meta Cloud API
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone.replace("+", ""),
        type: "text",
        text: { preview_url: true, body: text.trim() }
      })
    });

    const metaData: any = await metaRes.json();

    if (!metaRes.ok || metaData.error) {
      console.error("[WhatsApp Send Error from Meta]", metaData);
      return res.status(502).json({
        error: "META_DELIVERY_FAILED",
        message: metaData.error?.message || "Échec de l'envoi du message WhatsApp via Meta."
      });
    }

    const sentMessageId = metaData.messages?.[0]?.id;

    // 4. Save outbound message to Firestore
    await addDoc(collection(db, "messages"), {
      whatsappMessageId: sentMessageId || null,
      conversationId: cleanPhone,
      sender: "admin",
      content: text.trim(),
      timestamp: serverTimestamp(),
      direction: "outbound",
      deliveryStatus: "sent",
      phoneNumberId
    });

    return res.json({
      status: "success",
      messageId: sentMessageId,
      deliveryStatus: "sent"
    });
  } catch (sendErr: any) {
    console.error("[WhatsApp Send Exception]", sendErr);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Erreur lors de l'envoi WhatsApp : " + sendErr.message
    });
  }
}

/**
 * Returns WhatsApp connection status
 */
export function getWhatsAppConfigStatus(_req: any, res: Response) {
  const isConfigured = !!(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_VERIFY_TOKEN
  );

  res.json({
    isConfigured,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    hasVerifyToken: !!process.env.WHATSAPP_VERIFY_TOKEN
  });
}
