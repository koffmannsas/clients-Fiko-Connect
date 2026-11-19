import { Response } from "express";
import dns from "node:dns/promises";
import net from "node:net";
import { GoogleGenAI, Type } from "@google/genai";
import { AuthenticatedRequest } from "./auth";
import {
  conductFikoLearningTurn,
  extractKeywords,
  extractTextAndTitleFromHtml,
  parseRawKnowledgeText,
} from "../src/lib/knowledgeEngine";
import {
  BusinessIdentity,
  DeepScanPageInfo,
  DeepScanProgressEvent,
  KnowledgeItem,
  SalesAuthorityPolicy,
} from "../src/types/knowledge";

const MAX_PAGE_BYTES = 1_500_000;
const MAX_CRAWL_PAGES = 5;
const MAX_DOC_CHARS = 80_000;

let deepScanAiClient: GoogleGenAI | null = null;
function getDeepScanAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!deepScanAiClient) {
    deepScanAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return deepScanAiClient;
}

/**
 * Checks whether an IPv4 or IPv6 address is private, loopback, link-local, or reserved.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const cleaned = ip.replace(/^::ffff:/i, "");
  if (net.isIPv4(cleaned)) {
    const parts = cleaned.split(".").map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true; // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8
    if (a === 169 && b === 254) return true; // Cloud metadata / link-local 169.254.0.0/16
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a >= 224) return true; // Multicast / reserved
    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (
      lower === "::1" ||
      lower === "::" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe80")
    ) {
      return true;
    }
    return false;
  }

  return true;
}

/**
 * SSRF protection: validates URL scheme, hostname, and resolved DNS IP addresses.
 */
export async function validateSafeExternalUrl(
  rawInput: string,
  skipDnsLookup = false
): Promise<{ ok: true; url: URL } | { ok: false; reason: string }> {
  const trimmed = (rawInput || "").trim();
  if (!trimmed) {
    return { ok: false, reason: "URL manquante." };
  }

  const isHostPort = /^[a-z0-9.-]+:\d{1,5}(\/|$)/i.test(trimmed);
  const hasExplicitScheme = !isHostPort && /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  const withScheme = hasExplicitScheme ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, reason: "Format d'URL invalide." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: `Protocole non autorisé (${parsed.protocol}). Utilisez http:// ou https://.` };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    return { ok: false, reason: `Accès refusé (protection SSRF) : hôte interne "${host}" bloqué.` };
  }

  if (net.isIP(host) && isPrivateOrReservedIp(host)) {
    return { ok: false, reason: `Accès refusé (protection SSRF) : adresse IP privée ou réservée (${host}).` };
  }

  if (!skipDnsLookup && !net.isIP(host)) {
    try {
      const addresses = await dns.lookup(host, { all: true });
      if (!addresses || addresses.length === 0) {
        return { ok: false, reason: `Impossible de résoudre le nom de domaine "${host}".` };
      }
      for (const addr of addresses) {
        if (isPrivateOrReservedIp(addr.address)) {
          return {
            ok: false,
            reason: `Accès refusé (protection SSRF) : "${host}" pointe vers une IP interne (${addr.address}).`,
          };
        }
      }
    } catch (dnsErr: any) {
      return {
        ok: false,
        reason: `Erreur DNS pour "${host}" : ${dnsErr?.code || dnsErr?.message || "domaine introuvable"}.`,
      };
    }
  }

  return { ok: true, url: parsed };
}

function sendSseEvent(res: Response, event: DeepScanProgressEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function fetchPageWithLimits(targetUrl: string): Promise<{ html: string; finalUrl: string; bytes: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);

  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "FikoDeepScan/3.0 (+https://fiko.io; Knowledge Verification Crawler)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} sur ${targetUrl}`);
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (
      contentType &&
      !contentType.includes("text/") &&
      !contentType.includes("xhtml") &&
      !contentType.includes("json") &&
      !contentType.includes("xml")
    ) {
      throw new Error(`Type de contenu non textuel non pris en charge (${contentType}).`);
    }

    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.byteLength > MAX_PAGE_BYTES) {
      return {
        html: buf.subarray(0, MAX_PAGE_BYTES).toString("utf8"),
        finalUrl: response.url || targetUrl,
        bytes: MAX_PAGE_BYTES,
      };
    }

    return {
      html: buf.toString("utf8"),
      finalUrl: response.url || targetUrl,
      bytes: buf.byteLength,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function discoverSameOriginLinks(html: string, baseUrl: URL): string[] {
  const found = new Set<string>();
  const hrefRegex = /href\s*=\s*["']([^"'#]+)["']/gi;
  const priorityKeywords = ["tarif", "prix", "service", "offre", "produit", "catalogue", "faq", "contact", "apropos", "about"];

  let m: RegExpExecArray | null;
  const prioritized: string[] = [];
  const regular: string[] = [];

  while ((m = hrefRegex.exec(html)) !== null) {
    const rawHref = m[1].trim();
    if (!rawHref || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:") || rawHref.startsWith("javascript:")) {
      continue;
    }
    try {
      const resolved = new URL(rawHref, baseUrl);
      if (resolved.origin !== baseUrl.origin) continue;
      if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|woff2?|pdf|zip|mp4)$/i.test(resolved.pathname)) continue;
      const cleanStr = `${resolved.origin}${resolved.pathname}`;
      if (cleanStr === `${baseUrl.origin}${baseUrl.pathname}` || found.has(cleanStr)) continue;
      found.add(cleanStr);

      const lowerPath = resolved.pathname.toLowerCase();
      if (priorityKeywords.some((k) => lowerPath.includes(k))) {
        prioritized.push(cleanStr);
      } else {
        regular.push(cleanStr);
      }
    } catch {
      // Ignore malformed relative href
    }
  }

  return [...prioritized, ...regular].slice(0, MAX_CRAWL_PAGES - 1);
}

async function structureExtractedContent(params: {
  companyId: string;
  sourceLabel: string;
  sourceType: KnowledgeItem["sourceType"];
  combinedText: string;
  responsible: string;
}): Promise<{
  candidates: Array<Omit<KnowledgeItem, "id" | "createdAt" | "updatedAt">>;
  clarificationQuestions: string[];
  aiUsed: boolean;
  aiNote: string;
}> {
  const { companyId, sourceLabel, sourceType, combinedText, responsible } = params;
  const validUntil = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split("T")[0];
  const ai = getDeepScanAIClient();

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Analyse ce contenu réel extrait de "${sourceLabel}" et structure :
1. Les connaissances métier factuelles (tarifs en FCFA si écrits, services, zones géographiques, horaires, garanties, FAQ). N'invente AUCUN chiffre absent du texte.
2. 3 questions de clarification prioritaires que le directeur commercial Fiko doit poser au dirigeant dans Fiko Learning Live™ (ex : tarifs manquants, zones non précisées, remises autorisées, délais réels).

Contenu extrait :
"""
${combinedText.slice(0, 14000)}
"""`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    content: { type: Type.STRING },
                    approvedPriceFCFA: { type: Type.INTEGER },
                    scope: { type: Type.STRING },
                  },
                },
              },
              clarificationQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
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

      const candidates = (Array.isArray(parsed.items) ? parsed.items : []).slice(0, 20).map((entry: any) => ({
        companyId,
        title: String(entry.title || "Connaissance extraite").slice(0, 120),
        category: (allowedCategories.has(entry.category) ? entry.category : "service") as KnowledgeItem["category"],
        content: String(entry.content || "").slice(0, 1000),
        approvedPriceFCFA:
          typeof entry.approvedPriceFCFA === "number" && entry.approvedPriceFCFA > 0
            ? Math.round(entry.approvedPriceFCFA)
            : undefined,
        status: "pending_verification" as const,
        reviewState: "pending_review" as const,
        version: 1,
        source: sourceLabel,
        sourceType,
        validUntil,
        responsible: responsible || "Direction Commerciale",
        scope: String(entry.scope || "Clients WhatsApp & Devis"),
        keywords: extractKeywords(`${entry.title || ""} ${entry.content || ""}`),
      }));

      const clarificationQuestions: string[] = Array.isArray(parsed.clarificationQuestions)
        ? parsed.clarificationQuestions.map((q: any) => String(q)).filter(Boolean).slice(0, 4)
        : [];

      if (candidates.length > 0) {
        return {
          candidates,
          clarificationQuestions,
          aiUsed: true,
          aiNote: "Structuration effectuée via Gemini 4 Hydrogen à partir du contenu réel extrait.",
        };
      }
    } catch (aiErr: any) {
      console.warn("[DeepScan] Gemini structuration fallback to deterministic parser:", aiErr?.message);
    }
  }

  // Deterministic HTML/Text Structuration (honest non-AI extraction)
  const deterministic = parseRawKnowledgeText(
    combinedText,
    companyId,
    sourceLabel,
    sourceType,
    responsible
  ).map((c) => ({
    ...c,
    reviewState: "pending_review" as const,
    version: 1,
  }));

  const hasPrice = deterministic.some((d) => typeof d.approvedPriceFCFA === "number");
  const hasZone = deterministic.some((d) => d.category === "zone");

  const clarificationQuestions: string[] = [];
  if (!hasPrice) {
    clarificationQuestions.push(
      `Aucun tarif explicite en FCFA n'a été trouvé dans ${sourceLabel}. Quels prix officiels Fiko doit-il annoncer ?`
    );
  }
  if (!hasZone) {
    clarificationQuestions.push(
      `Quelles villes ou communes exactes sont couvertes pour les offres détectées dans ${sourceLabel} ?`
    );
  }
  clarificationQuestions.push(
    "Quelle marge de remise autonome maximum puis-je proposer sans demander votre validation ?"
  );

  return {
    candidates: deterministic,
    clarificationQuestions,
    aiUsed: false,
    aiNote: "Extraction structurelle déterministe effectuée sur le contenu textuel réel.",
  };
}

/**
 * POST /api/knowledge/deep-scan/stream
 * Streams real SSE events as Fiko Deep Scan™ connects, crawls (SSRF-safe), extracts & structures a website.
 */
export async function streamDeepScanUrl(req: AuthenticatedRequest, res: Response) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  const companyId = req.user?.companyId || "default-company";
  const rawUrl = String(req.body?.url || "").trim();

  try {
    // Stage 1: Connexion & SSRF check
    sendSseEvent(res, {
      stage: "connexion",
      progress: 15,
      message: `Vérification DNS & protection SSRF sur "${rawUrl}"...`,
    });

    const validation = await validateSafeExternalUrl(rawUrl, false);
    if (validation.ok === false) {
      sendSseEvent(res, {
        stage: "error",
        progress: 15,
        message: validation.reason,
        error: validation.reason,
      });
      return res.end();
    }

    const entryUrl = validation.url;
    sendSseEvent(res, {
      stage: "connexion",
      progress: 28,
      message: `Connexion TLS établie avec ${entryUrl.hostname}. Récupération de la page principale...`,
    });

    // Stage 2: Extraction (Main page + discovered internal links)
    const firstPage = await fetchPageWithLimits(entryUrl.toString());
    const parsedFirst = extractTextAndTitleFromHtml(firstPage.html);

    const pagesScanned: DeepScanPageInfo[] = [
      {
        url: firstPage.finalUrl,
        title: parsedFirst.title,
        bytes: firstPage.bytes,
        headingsCount: parsedFirst.headings.length,
      },
    ];

    sendSseEvent(res, {
      stage: "extraction",
      progress: 42,
      message: `Page analysée : "${parsedFirst.title}" (${Math.round(firstPage.bytes / 1024)} Ko)`,
      page: pagesScanned[0],
    });

    const subLinks = discoverSameOriginLinks(firstPage.html, entryUrl);
    const allTexts: string[] = [
      `=== ${parsedFirst.title} (${firstPage.finalUrl}) ===`,
      ...parsedFirst.headings,
      parsedFirst.cleanText,
    ];

    for (let i = 0; i < subLinks.length; i++) {
      const subUrl = subLinks[i];
      const subSafe = await validateSafeExternalUrl(subUrl, false);
      if (!subSafe.ok) continue;
      try {
        const subFetch = await fetchPageWithLimits(subSafe.url.toString());
        const parsedSub = extractTextAndTitleFromHtml(subFetch.html);
        const pageInfo: DeepScanPageInfo = {
          url: subFetch.finalUrl,
          title: parsedSub.title,
          bytes: subFetch.bytes,
          headingsCount: parsedSub.headings.length,
        };
        pagesScanned.push(pageInfo);
        allTexts.push(`=== ${parsedSub.title} (${subFetch.finalUrl}) ===`, ...parsedSub.headings, parsedSub.cleanText);

        sendSseEvent(res, {
          stage: "extraction",
          progress: 45 + Math.round(((i + 1) / Math.max(1, subLinks.length)) * 20),
          message: `Sous-page extraite (${pagesScanned.length}/${MAX_CRAWL_PAGES}) : ${parsedSub.title}`,
          page: pageInfo,
        });
      } catch {
        // Skip individual subpage timeout/404 without aborting valid main crawl
      }
    }

    // Stage 3: Structuration
    sendSseEvent(res, {
      stage: "structuration",
      progress: 78,
      message: `Structuration des ${pagesScanned.length} page(s) extraite(s) en connaissances vérifiables...`,
    });

    const structured = await structureExtractedContent({
      companyId,
      sourceLabel: entryUrl.hostname,
      sourceType: "url",
      combinedText: allTexts.join("\n"),
      responsible: req.user?.email || "Direction Commerciale",
    });

    // Stage 4: Validation gate (pending_review, never auto-approved)
    sendSseEvent(res, {
      stage: "validation",
      progress: 92,
      message: `${structured.candidates.length} connaissance(s) extraite(s) et placée(s) en file de validation dirigeant.`,
    });

    sendSseEvent(res, {
      stage: "done",
      progress: 100,
      message: `Analyse terminée sur ${entryUrl.hostname} : ${pagesScanned.length} page(s), ${structured.candidates.length} proposition(s) prêtes.`,
      candidatesCount: structured.candidates.length,
      candidates: structured.candidates,
      clarificationQuestions: structured.clarificationQuestions,
      aiUsed: structured.aiUsed,
      aiNote: structured.aiNote,
    });
    return res.end();
  } catch (err: any) {
    const errMsg = err?.name === "TimeoutError" || err?.name === "AbortError"
      ? `Délai d'attente dépassé lors de la connexion à "${rawUrl}".`
      : err?.message || "Erreur réseau lors de l'analyse de l'URL.";

    sendSseEvent(res, {
      stage: "error",
      progress: 100,
      message: errMsg,
      error: errMsg,
    });
    return res.end();
  }
}

/**
 * POST /api/knowledge/deep-scan/document
 * Streams real SSE progress while analyzing uploaded document content cleanly with size bounds.
 */
export async function streamDeepScanDocument(req: AuthenticatedRequest, res: Response) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  const companyId = req.user?.companyId || "default-company";
  const fileName = String(req.body?.fileName || "document.txt").slice(0, 140);
  const contentText = String(req.body?.contentText || "");

  try {
    sendSseEvent(res, {
      stage: "connexion",
      progress: 20,
      message: `Réception sécurisée du document "${fileName}" (${Math.max(1, Math.round(contentText.length / 1024))} Ko)...`,
    });

    if (!contentText.trim()) {
      const msg = `Le document "${fileName}" ne contient pas de texte exploitable (vérifiez l'encodage ou utilisez CSV/TXT/MD).`;
      sendSseEvent(res, { stage: "error", progress: 20, message: msg, error: msg });
      return res.end();
    }

    if (contentText.length > MAX_DOC_CHARS) {
      sendSseEvent(res, {
        stage: "extraction",
        progress: 45,
        message: `Document volumineux tronqué aux ${MAX_DOC_CHARS.toLocaleString("fr-FR")} premiers caractères pour garantir la précision.`,
      });
    } else {
      sendSseEvent(res, {
        stage: "extraction",
        progress: 50,
        message: `Extraction des lignes, tarifs et clauses depuis "${fileName}"...`,
      });
    }

    const lowerName = fileName.toLowerCase();
    const sourceType: KnowledgeItem["sourceType"] = lowerName.endsWith(".csv")
      ? "csv"
      : lowerName.endsWith(".pdf")
      ? "pdf"
      : lowerName.endsWith(".doc") || lowerName.endsWith(".docx")
      ? "word"
      : "manual";

    sendSseEvent(res, {
      stage: "structuration",
      progress: 75,
      message: `Identification des produits, tarifs FCFA, zones et règles métier...`,
    });

    const structured = await structureExtractedContent({
      companyId,
      sourceLabel: fileName,
      sourceType,
      combinedText: contentText.slice(0, MAX_DOC_CHARS),
      responsible: req.user?.email || "Direction Commerciale",
    });

    sendSseEvent(res, {
      stage: "validation",
      progress: 92,
      message: `${structured.candidates.length} règle(s) préparée(s) en statut « En attente de validation ».`,
    });

    sendSseEvent(res, {
      stage: "done",
      progress: 100,
      message: `Document "${fileName}" analysé avec succès : ${structured.candidates.length} élément(s) structuré(s).`,
      candidatesCount: structured.candidates.length,
      candidates: structured.candidates,
      clarificationQuestions: structured.clarificationQuestions,
      aiUsed: structured.aiUsed,
      aiNote: structured.aiNote,
    });
    return res.end();
  } catch (err: any) {
    const errMsg = err?.message || "Erreur lors de l'analyse du document.";
    sendSseEvent(res, { stage: "error", progress: 100, message: errMsg, error: errMsg });
    return res.end();
  }
}

/**
 * POST /api/knowledge/learning-chat
 * Real backend endpoint for Fiko Learning Live™ combining deterministic Sales Director curriculum + Gemini 4 Hydrogen
 */
export async function handleLearningLiveChat(req: AuthenticatedRequest, res: Response) {
  try {
    const {
      leaderMessage,
      currentStep,
      identity,
      knowledgeItems,
      policy,
      pendingClarifications,
    } = req.body as {
      leaderMessage: string;
      currentStep: number;
      identity: BusinessIdentity;
      knowledgeItems: KnowledgeItem[];
      policy: SalesAuthorityPolicy;
      pendingClarifications: string[];
    };

    if (!leaderMessage || !leaderMessage.trim()) {
      return res.status(400).json({
        error: "MISSING_MESSAGE",
        message: "Votre réponse de formation est requise.",
      });
    }

    const companyId = req.user?.companyId || identity?.companyId || "default-company";
    const scopedItems = (knowledgeItems || []).filter((i) => i.companyId === companyId);

    // 1. Deterministic turn evaluation & fact extraction
    const turn = conductFikoLearningTurn({
      leaderMessage: leaderMessage.trim(),
      currentStep: currentStep || 1,
      identity: { ...identity, companyId },
      knowledgeItems: scopedItems,
      policy: { ...policy, companyId },
      pendingClarifications: pendingClarifications || [],
    });

    // 2. If Gemini is available, formulate natural Sales Director phrasing while keeping extractedFacts deterministic
    const ai = getDeepScanAIClient();
    if (ai) {
      try {
        const pendingCount = scopedItems.filter(
          (i) => i.status === "pending_verification" || i.status === "conflict"
        ).length;
        const validatedCount = scopedItems.filter((i) => i.status === "validated").length;

        const aiResp = await ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: `Message du dirigeant : "${leaderMessage.trim()}"`,
          config: {
            systemInstruction: `Tu es Fiko, un futur collaborateur commercial IA expérimenté en entretien d'intégration (Étape ${turn.nextStep}/7 : ${turn.stepLabel}) avec le dirigeant de "${identity.companyName}".
Tu mènes l'entretien de formation comme un directeur commercial rigoureux :
- Montre que tu as compris ce que le dirigeant vient de dire (faits extraits : ${turn.extractedFacts.map((f) => f.title).join(", ") || "contexte général"}).
- Pose UNE seule question claire et précise correspondant à l'étape actuelle ou à cette clarification Deep Scan : "${turn.remainingClarifications[0] || turn.fikoReply}".
- Base actuelle : ${validatedCount} connaissance(s) validée(s), ${pendingCount} à vérifier.
- Reste concis (2 à 3 phrases en français), professionnel et orienté terrain. Ne promets jamais rien sans validation.`,
          },
        });

        const polished = (aiResp.text || "").trim();
        if (polished) {
          return res.json({
            ...turn,
            fikoReply: polished,
            engineMode: "hybrid_gemini_4_hydrogen",
          });
        }
      } catch (aiErr: any) {
        console.warn("[LearningLive] Gemini phrasing skipped, using deterministic director reply:", aiErr?.message);
      }
    }

    return res.json({
      ...turn,
      engineMode: "deterministic",
    });
  } catch (err: any) {
    console.error("[LearningLive Error]", err);
    return res.status(500).json({
      error: "LEARNING_CHAT_FAILED",
      message: err?.message || "Erreur lors de l'échange de formation.",
    });
  }
}
