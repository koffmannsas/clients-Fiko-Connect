import { Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { AuthenticatedRequest } from "./auth";
import {
  evaluateTruthAndPromiseGuard,
  extractKeywords,
} from "../src/lib/knowledgeEngine";
import {
  BusinessIdentity,
  KnowledgeItem,
  SalesAuthorityPolicy,
  TrainingRule,
} from "../src/types/knowledge";

let knowledgeAiClient: GoogleGenAI | null = null;

function getKnowledgeAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  if (!knowledgeAiClient) {
    knowledgeAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return knowledgeAiClient;
}

/**
 * POST /api/knowledge/simulate
 * Runs deterministic Truth & Promise Guard first, then optionally formulates
 * a natural French commercial reply via Gemini 4 Hydrogen constrained by verified sources.
 */
export async function simulateKnowledgeResponse(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const {
      customerMessage,
      identity,
      knowledgeItems,
      policy,
      trainingRules,
      useAiEnhancement,
    } = req.body as {
      customerMessage: string;
      identity: BusinessIdentity;
      knowledgeItems: KnowledgeItem[];
      policy: SalesAuthorityPolicy;
      trainingRules?: TrainingRule[];
      useAiEnhancement?: boolean;
    };

    if (!customerMessage || !customerMessage.trim()) {
      return res.status(400).json({
        error: "MISSING_MESSAGE",
        message: "Le message client à simuler est requis.",
      });
    }

    const companyId = req.user?.companyId || identity?.companyId;
    const scopedItems = (knowledgeItems || []).filter(
      (item) => !companyId || item.companyId === companyId
    );

    // 1. Deterministic Guard runs BEFORE any LLM call
    const guardResult = evaluateTruthAndPromiseGuard({
      customerMessage: customerMessage.trim(),
      identity: { ...identity, companyId: companyId || identity.companyId },
      knowledgeItems: scopedItems,
      policy: { ...policy, companyId: companyId || policy.companyId },
      trainingRules: trainingRules || [],
    });

    // If deterministic mode only, return immediately
    if (!useAiEnhancement) {
      return res.json({
        ...guardResult,
        engineMode: "deterministic",
      });
    }

    // 2. Gemini formulation strictly bounded by deterministic verdict & verified sources
    const ai = getKnowledgeAIClient();
    const sourcesContext =
      guardResult.citedSources.length > 0
        ? guardResult.citedSources
            .map(
              (s, idx) =>
                `[Source ${idx + 1}] ${s.title} (${s.source} | Valide jusqu'au ${s.validUntil} | Responsable: ${s.responsible})`
            )
            .join("\n")
        : "Aucune source validée trouvée pour cette demande.";

    const systemInstruction = `Tu es le commercial IA de "${identity.companyName}" (${identity.sector}).
Ton ton commercial doit être : ${identity.commercialTone}.
DOCTRINE ABSOLUE (NON NÉGOCIABLE) :
- Tu ne dois JAMAIS inventer un prix, un délai, une disponibilité, une zone couverte ou une garantie.
- Un modèle IA ne peut JAMAIS s'accorder une permission lui-même.
- Décision déterministe du Truth & Promise Guard :
  * Niveau de vérité : ${guardResult.truthLevel} (${guardResult.truthLabel})
  * Promesse autonome autorisée : ${guardResult.allowedToPromise ? "OUI" : "NON"}
  * Approbation humaine requise : ${guardResult.requiresHumanApproval ? "OUI" : "NON"}
  * Éléments bloqués à NE JAMAIS promettre : ${guardResult.blockedClaims.join(" ; ") || "Aucun"}
  * Raison : ${guardResult.guardReason}
- Zones couvertes validées : ${identity.coveredZones.join(", ") || "Aucune zone validée"}
- Plafond remise autonome : ${policy.canNegotiateDiscount ? policy.maxAutonomousDiscountPercent : 0}%
- Sources vérifiées autorisées :
${sourcesContext}

Rédige une réponse WhatsApp courte (2 à 4 phrases maximum), chaleureuse, professionnelle et orientée conversion qui respecte strictement cette décision. Si une vérification ou approbation est requise, propose poliment de la lancer sans rien promettre d'avance.`;

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: `Message du client WhatsApp : "${customerMessage.trim()}"`,
      config: {
        systemInstruction,
      },
    });

    const aiText = (response.text || "").trim();

    // 3. Post-generation safety check: if the reply violates guard boundaries, fall back to deterministic safeReply
    const lowerAi = aiText.toLowerCase();
    const violatesForbidden =
      !guardResult.allowedToPromise &&
      /(nous garantissons|c'est garanti|100% certain|c'est disponible maintenant|remise accordée)/.test(
        lowerAi
      );

    return res.json({
      ...guardResult,
      safeReply: !aiText || violatesForbidden ? guardResult.safeReply : aiText,
      engineMode: "hybrid_gemini_4_hydrogen",
      postGuardOverride: violatesForbidden,
    });
  } catch (err: any) {
    console.error("[Fiko Knowledge Simulate Error]", err);
    return res.status(500).json({
      error: "KNOWLEDGE_SIMULATION_FAILED",
      message: err.message || "Échec de la simulation IA.",
    });
  }
}

/**
 * POST /api/knowledge/ingest
 * Uses Gemini 4 Hydrogen to extract structured knowledge candidates from raw document text/URL content.
 * Every extracted item is ALWAYS returned with status='pending_verification'.
 */
export async function ingestKnowledgeWithAI(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { rawText, sourceName, sourceType, responsible } = req.body as {
      rawText: string;
      sourceName: string;
      sourceType: KnowledgeItem["sourceType"];
      responsible?: string;
    };

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({
        error: "MISSING_CONTENT",
        message: "Le texte ou contenu à analyser est requis.",
      });
    }

    const companyId = req.user?.companyId || "default-company";
    const ai = getKnowledgeAIClient();

    const prompt = `Extrais les règles métier, tarifs, services, zones d'intervention, délais, garanties ou FAQ distincts à partir du contenu d'entreprise ci-dessous.
Ne devine aucun montant ni aucune condition non écrite.

Source : ${sourceName || "Document importé"}
Contenu :
"""
${rawText.slice(0, 12000)}
"""`;

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: {
                type: Type.STRING,
                description:
                  "One of: tarif, service, zone, delai, politique, garantie, faq, catalogue",
              },
              content: { type: Type.STRING },
              approvedPriceFCFA: {
                type: Type.INTEGER,
                description: "Price in FCFA if explicitly mentioned, otherwise 0",
              },
              scope: { type: Type.STRING },
            },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "[]").trim());
    const validUntil = new Date(Date.now() + 180 * 24 * 3600 * 1000)
      .toISOString()
      .split("T")[0];
    const allowedCategories = new Set([
      "tarif",
      "service",
      "zone",
      "delai",
      "politique",
      "garantie",
      "faq",
      "catalogue",
    ]);

    const candidates = (Array.isArray(parsed) ? parsed : [])
      .slice(0, 20)
      .map((entry: any) => ({
        companyId,
        title: String(entry.title || "Connaissance extraite").slice(0, 120),
        category: (allowedCategories.has(entry.category)
          ? entry.category
          : "faq") as KnowledgeItem["category"],
        content: String(entry.content || "").slice(0, 1000),
        approvedPriceFCFA:
          typeof entry.approvedPriceFCFA === "number" &&
          entry.approvedPriceFCFA > 0
            ? Math.round(entry.approvedPriceFCFA)
            : undefined,
        status: "pending_verification" as const,
        source: sourceName || "Extraction IA",
        sourceType: sourceType || "manual",
        validUntil,
        responsible: responsible || "Direction Commerciale",
        scope: String(entry.scope || "Clients WhatsApp & Devis"),
        keywords: extractKeywords(`${entry.title || ""} ${entry.content || ""}`),
      }));

    return res.json({ candidates });
  } catch (err: any) {
    console.error("[Fiko Knowledge Ingest Error]", err);
    return res.status(500).json({
      error: "KNOWLEDGE_INGEST_FAILED",
      message: err.message || "Échec de l'extraction IA du document.",
    });
  }
}
