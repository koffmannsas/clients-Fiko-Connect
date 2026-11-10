import { Response } from "express";
import { AuthenticatedRequest } from "./auth";
import { getServerDb } from "./db";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";

const VALID_STAGES = ["Nouveau", "Qualifié", "Proposition", "Négociation", "Payé"] as const;

/**
 * Server-side lead stage update endpoint with strict payment validation.
 * The stage "Payé" CANNOT be manually set unless a server-confirmed Paystack transaction exists!
 */
export async function updateLeadStage(req: AuthenticatedRequest, res: Response) {
  const { leadId, newStatus } = req.body;

  if (!leadId) {
    return res.status(400).json({ error: "MISSING_LEAD_ID", message: "Identifiant leadId requis." });
  }

  if (!VALID_STAGES.includes(newStatus)) {
    return res.status(400).json({ 
      error: "INVALID_STAGE", 
      message: `Étape invalide. Étapes valides : ${VALID_STAGES.join(', ')}` 
    });
  }

  const db = await getServerDb();
  const leadRef = doc(db, "leads", String(leadId));
  const leadSnap = await getDoc(leadRef);

  if (!leadSnap.exists()) {
    return res.status(404).json({ error: "LEAD_NOT_FOUND", message: "Prospect introuvable dans la base." });
  }

  const leadData = leadSnap.data();

  // Multi-tenant check
  if (req.user && leadData.companyId && req.user.companyId && leadData.companyId !== req.user.companyId && req.user.companyId !== "default-company") {
    return res.status(403).json({ error: "FORBIDDEN", message: "Accès refusé aux prospects d'une autre entreprise." });
  }

  // CRITICAL RULE: "Payé" requires a confirmed Paystack transaction!
  if (newStatus === "Payé") {
    // Check if lead already has a confirmed transaction reference
    const hasExistingPaidRef = !!leadData.paidTransactionReference;

    // Check transactions collection for confirmed transaction for this lead or phone
    const txQuery = query(
      collection(db, "transactions"),
      where("leadId", "==", String(leadId)),
      where("status", "==", "SUCCESS")
    );
    const txSnap = await getDocs(txQuery);

    if (!hasExistingPaidRef && txSnap.empty) {
      return res.status(400).json({
        error: "PAYMENT_NOT_CONFIRMED",
        message: "Action refusée : le statut 'Payé' nécessite obligatoirement un paiement Paystack vérifié. Envoyez un lien Paystack au client pour qu'il procède au règlement."
      });
    }
  }

  try {
    await updateDoc(leadRef, {
      status: newStatus,
      lastActivity: `Étape modifiée : ${newStatus}`,
      updatedAt: new Date().toISOString()
    });

    return res.json({
      status: "success",
      leadId,
      newStatus,
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "UPDATE_FAILED",
      message: "Échec de l'enregistrement de l'étape : " + err.message
    });
  }
}
