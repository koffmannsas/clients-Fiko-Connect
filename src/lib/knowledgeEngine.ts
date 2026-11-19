import {
  BusinessIdentity,
  GuardEvaluationResult,
  HumanApprovalRequest,
  KnowledgeCategory,
  KnowledgeConflict,
  KnowledgeItem,
  LearningSuggestion,
  SalesAuthorityPolicy,
  TrainingRule,
  TruthLevel,
} from '../types/knowledge';

export function normalizeText(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'les', 'des', 'une', 'pour', 'avec', 'dans', 'sur', 'par', 'est', 'sont',
    'votre', 'notre', 'vous', 'nous', 'que', 'qui', 'quoi', 'comment', 'combien',
    'bonjour', 'salut', 'merci', 'pouvez', 'peut', 'avoir', 'faire', 'plus', 'tout',
  ]);
  const tokens = normalizeText(text)
    .split(' ')
    .filter((t) => t.length >= 3 && !stopWords.has(t));
  return Array.from(new Set(tokens)).slice(0, 14);
}

/**
 * Engine 02: Knowledge Ingestion & Conflict/Duplicate Detection (Deterministic)
 */
export function detectKnowledgeConflicts(
  candidate: { title: string; content: string; category: KnowledgeCategory; approvedPriceFCFA?: number },
  existingItems: KnowledgeItem[]
): KnowledgeConflict | null {
  const normCandidateTitle = normalizeText(candidate.title);
  const normCandidateContent = normalizeText(candidate.content);
  const candidateTokens = new Set(extractKeywords(`${candidate.title} ${candidate.content}`));

  for (const item of existingItems) {
    if (item.status === 'rejected') continue;

    const normExistingTitle = normalizeText(item.title);
    const normExistingContent = normalizeText(item.content);

    // Exact or near-exact duplicate check
    if (normCandidateTitle === normExistingTitle || normCandidateContent === normExistingContent) {
      return {
        existingItemId: item.id,
        existingTitle: item.title,
        type: 'duplicate',
        reason: `Contenu identique déjà présent dans "${item.title}".`,
      };
    }

    // Token overlap for semantic collision on same topic
    const existingTokens = extractKeywords(`${item.title} ${item.content}`);
    const overlap = existingTokens.filter((t) => candidateTokens.has(t));
    const overlapRatio = existingTokens.length > 0 ? overlap.length / existingTokens.length : 0;

    // Price contradiction check on same category/topic
    if (
      typeof candidate.approvedPriceFCFA === 'number' &&
      typeof item.approvedPriceFCFA === 'number' &&
      candidate.approvedPriceFCFA !== item.approvedPriceFCFA &&
      (overlapRatio >= 0.4 || item.category === candidate.category)
    ) {
      if (overlap.length >= 2 || normCandidateTitle.includes(normExistingTitle) || normExistingTitle.includes(normCandidateTitle)) {
        return {
          existingItemId: item.id,
          existingTitle: item.title,
          type: 'contradiction',
          reason: `Conflit tarifaire détecté : ${candidate.approvedPriceFCFA.toLocaleString('fr-FR')} FCFA vs ${item.approvedPriceFCFA.toLocaleString('fr-FR')} FCFA dans "${item.title}".`,
        };
      }
    }

    // High overlap in same category -> flag potential duplicate/update
    if (overlapRatio >= 0.72 && overlap.length >= 3) {
      return {
        existingItemId: item.id,
        existingTitle: item.title,
        type: 'duplicate',
        reason: `Chevauchement élevé (${Math.round(overlapRatio * 100)}%) avec "${item.title}".`,
      };
    }
  }

  return null;
}

/**
 * Parse raw pasted text, FAQ, or CSV lines into candidate knowledge items (always marked pending_verification)
 */
export function parseRawKnowledgeText(
  rawText: string,
  companyId: string,
  sourceName: string,
  sourceType: KnowledgeItem['sourceType'],
  responsible: string
): Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt'>[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5);

  const validUntil = new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0];

  return lines.slice(0, 25).map((line, idx) => {
    // Support CSV "Title;Content;Price" or "Question : Answer"
    const sepMatch = line.split(/\s*[;|]\s*/);
    const title = sepMatch.length >= 2 ? sepMatch[0].slice(0, 90) : line.slice(0, 72);
    const content = sepMatch.length >= 2 ? sepMatch.slice(1).join(' — ') : line;

    const priceMatch = line.match(/(\d[\d\s]{2,})\s*(?:fcfa|xof)/i);
    const parsedPrice = priceMatch ? parseInt(priceMatch[1].replace(/\s+/g, ''), 10) : undefined;

    const norm = normalizeText(line);
    let category: KnowledgeCategory = 'faq';
    if (parsedPrice || norm.includes('tarif') || norm.includes('prix') || norm.includes('cout')) {
      category = 'tarif';
    } else if (norm.includes('livraison') || norm.includes('zone') || norm.includes('commune') || norm.includes('ville')) {
      category = 'zone';
    } else if (norm.includes('delai') || norm.includes('heure') || norm.includes('horaire')) {
      category = 'delai';
    } else if (norm.includes('garantie') || norm.includes('remboursement')) {
      category = 'garantie';
    } else if (norm.includes('remise') || norm.includes('politique') || norm.includes('acompte')) {
      category = 'politique';
    } else if (norm.includes('produit') || norm.includes('catalogue') || norm.includes('pack')) {
      category = 'catalogue';
    }

    return {
      companyId,
      title: title || `Entrée importée #${idx + 1}`,
      category,
      content,
      approvedPriceFCFA: Number.isFinite(parsedPrice) ? parsedPrice : undefined,
      status: 'pending_verification',
      source: sourceName,
      sourceType,
      validUntil,
      responsible: responsible || 'Direction Commerciale',
      scope: 'Clients WhatsApp & Devis',
      keywords: extractKeywords(`${title} ${content}`),
    };
  });
}

/**
 * Engine 05: Verified RAG Engine — Strictly retrieves ONLY validated items for the company
 */
export function retrieveVerifiedKnowledge(
  query: string,
  items: KnowledgeItem[],
  companyId?: string,
  limit = 4
): KnowledgeItem[] {
  const queryTokens = extractKeywords(query);
  const normQuery = normalizeText(query);

  const validated = items.filter(
    (item) =>
      item.status === 'validated' &&
      (!companyId || item.companyId === companyId)
  );

  const scored = validated
    .map((item) => {
      const hay = normalizeText(`${item.title} ${item.content} ${item.keywords.join(' ')} ${item.category}`);
      let score = 0;
      for (const token of queryTokens) {
        if (hay.includes(token)) score += 2;
      }
      if (hay.includes(normQuery) && normQuery.length > 4) score += 5;
      // Boost category intent matches
      if ((normQuery.includes('prix') || normQuery.includes('cout') || normQuery.includes('tarif')) && item.category === 'tarif') {
        score += 3;
      }
      if ((normQuery.includes('zone') || normQuery.includes('livr') || normQuery.includes('ou ')) && item.category === 'zone') {
        score += 3;
      }
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Engine 03 + Engine 06: Deterministic Truth & Promise Guard + Sales Authority Engine
 * Guarantee: An AI model can NEVER grant itself permission.
 */
export function evaluateTruthAndPromiseGuard(params: {
  customerMessage: string;
  identity: BusinessIdentity;
  knowledgeItems: KnowledgeItem[];
  policy: SalesAuthorityPolicy;
  trainingRules?: TrainingRule[];
}): GuardEvaluationResult {
  const { customerMessage, identity, knowledgeItems, policy, trainingRules = [] } = params;
  const normMsg = normalizeText(customerMessage);
  const verifiedMatches = retrieveVerifiedKnowledge(customerMessage, knowledgeItems, identity.companyId, 4);

  const citedSources = verifiedMatches.map((m) => ({
    id: m.id,
    title: m.title,
    source: m.source,
    responsible: m.responsible,
    validUntil: m.validUntil,
    scope: m.scope,
  }));

  // Helper to check if a city/zone mentioned is covered or explicitly unknown
  const knownUnmentionedCities = ['korhogo', 'bouake', 'yamoussoukro', 'san pedro', 'san-pedro', 'daloa', 'man', 'bingerville', 'dabou', 'bassam', 'grand-bassam', 'abengourou', 'gagnoa', 'odienne'];
  const coveredNorm = normalizeText(identity.coveredZones.join(' '));
  const mentionedZones = knownUnmentionedCities.filter((z) => normMsg.includes(z));
  const uncoveredZones = mentionedZones.filter((z) => !coveredNorm.includes(z));

  // Detect dynamic availability / time-slot requests ("aujourd'hui", "14 h", "14h", "disponible", "en stock", "maintenant")
  const asksAvailabilityOrSlot =
    /(aujourd|maintenant|tout de suite|disponible|dispo|en stock|creneau|passage a |\b\d{1,2}\s*h\b|cet apres|demain matin|intervenir)/.test(
      normMsg
    );

  // Detect absolute result guarantees (Action interdite)
  const asksForbiddenGuarantee =
    /(garanti|garantissez|promettez|100\s*%|a coup sur|certain qu|sera repare|reparee sans|sans faute|remboursement integral sans)/.test(
      normMsg
    );

  // Detect discount / custom commercial terms
  const discountMatch = normMsg.match(/(\d{1,2})\s*%/);
  const requestedDiscountPercent = discountMatch ? parseInt(discountMatch[1], 10) : undefined;

  // Special combined / critical case: Dynamic slot or uncovered zone + Forbidden guarantee (e.g., Bingerville 14h + garantir réparation)
  if (asksForbiddenGuarantee && (asksAvailabilityOrSlot || uncoveredZones.length > 0)) {
    const targetZone = uncoveredZones[0]
      ? uncoveredZones[0].charAt(0).toUpperCase() + uncoveredZones[0].slice(1)
      : mentionedZones[0]
      ? mentionedZones[0].charAt(0).toUpperCase() + mentionedZones[0].slice(1)
      : 'votre secteur';

    return {
      truthLevel: 'forbidden_action',
      truthLabel: 'Action interdite & Vérification requise',
      allowedToPromise: false,
      requiresHumanApproval: true,
      blockedClaims: [
        'Garantie de résultat avant diagnostic technique',
        ...(asksAvailabilityOrSlot ? ['Promesse de créneau horaire sans vérification planning'] : []),
        ...(uncoveredZones.length > 0 ? [`Couverture de la zone "${targetZone}" non confirmée`] : []),
      ],
      guardReason:
        'Le moteur Truth & Promise Guard bloque toute garantie de résultat sans diagnostic et empêche de promettre un créneau ou une zone non vérifiée.',
      safeReply: `Bonjour ! Nous pouvons étudier votre demande d'intervention${targetZone !== 'votre secteur' ? ` à ${targetZone}` : ''}. Pour confirmer un passage à l'horaire souhaité, je dois d'abord vérifier la disponibilité de notre équipe. Le diagnostic permettra également de déterminer la réparation nécessaire sans pouvoir la garantir à l'avance. Souhaitez-vous que je lance la vérification ?`,
      citedSources,
      suggestedEscalationAction: `Vérifier planning équipe & couverture ${targetZone}`,
    };
  }

  // 1. Forbidden action check (Action interdite)
  if (asksForbiddenGuarantee) {
    return {
      truthLevel: 'forbidden_action',
      truthLabel: 'Action interdite',
      allowedToPromise: false,
      requiresHumanApproval: true,
      blockedClaims: ['Garantie de résultat certain non autorisée par la politique entreprise'],
      guardReason:
        'Sales Authority Engine verrouille canGuaranteeOutcome=false : Fiko ne peut jamais promettre un résultat garanti sans diagnostic ou validation.',
      safeReply:
        "Je comprends votre besoin de sérénité. En revanche, je ne peux pas vous garantir un résultat certain avant que notre équipe technique n'ait effectué une évaluation complète. Je peux vous présenter nos engagements de prise en charge et faire confirmer les modalités exactes par un responsable. Souhaitez-vous que je transmette votre demande ?",
      citedSources,
      suggestedEscalationAction: 'Demande de garantie contractuelle exceptionnelle',
    };
  }

  // 2. Discount / Commercial exception check (Engagement soumis à autorisation)
  if (requestedDiscountPercent !== undefined) {
    if (!policy.canNegotiateDiscount || requestedDiscountPercent > policy.maxAutonomousDiscountPercent) {
      return {
        truthLevel: 'approval_required',
        truthLabel: 'Engagement soumis à autorisation',
        allowedToPromise: false,
        requiresHumanApproval: true,
        detectedDiscountPercent: requestedDiscountPercent,
        blockedClaims: [
          `Remise demandée (${requestedDiscountPercent}%) supérieure au plafond autorisé (${policy.canNegotiateDiscount ? policy.maxAutonomousDiscountPercent : 0}%)`,
        ],
        guardReason: `Sales Authority Engine limite l'autonomie de négociation à ${policy.canNegotiateDiscount ? policy.maxAutonomousDiscountPercent : 0}%. Une remise de ${requestedDiscountPercent}% exige l'approbation d'un responsable.`,
        safeReply: `Merci pour votre intérêt ! Je ne suis pas autorisé à accorder directement une remise de ${requestedDiscountPercent}%${policy.canNegotiateDiscount && policy.maxAutonomousDiscountPercent > 0 ? ` (mon plafond autonome est de ${policy.maxAutonomousDiscountPercent}%)` : ''}. Je vais soumettre immédiatement votre demande à notre direction commerciale pour confirmation. Souhaitez-vous que je l'envoie avec vos coordonnées ?`,
        citedSources,
        suggestedEscalationAction: `Valider ou refuser la remise exceptionnelle de ${requestedDiscountPercent}%`,
      };
    }

    return {
      truthLevel: 'validated_info',
      truthLabel: 'Remise dans la limite autorisée',
      allowedToPromise: true,
      requiresHumanApproval: false,
      blockedClaims: [],
      detectedDiscountPercent: requestedDiscountPercent,
      guardReason: `Remise de ${requestedDiscountPercent}% conforme au plafond autonome configuré (${policy.maxAutonomousDiscountPercent}%).`,
      safeReply: `Bonne nouvelle : dans le cadre de notre politique commerciale validée, je peux appliquer une remise de ${requestedDiscountPercent}% sur votre commande (dans la limite autorisée de ${policy.maxAutonomousDiscountPercent}%). Souhaitez-vous que je prépare votre devis ou votre lien de paiement Paystack ?`,
      citedSources,
    };
  }

  // 3. Unknown geographic zone or uncovered claim (Information inconnue)
  if (uncoveredZones.length > 0) {
    const zoneName = uncoveredZones[0].charAt(0).toUpperCase() + uncoveredZones[0].slice(1);
    return {
      truthLevel: 'unknown_info',
      truthLabel: 'Information inconnue',
      allowedToPromise: false,
      requiresHumanApproval: true,
      blockedClaims: [`La zone "${zoneName}" ne figure pas dans les zones couvertes validées (${identity.coveredZones.join(', ')})`],
      guardReason:
        'La zone demandée est absente des zones validées de Business Identity Engine™. Fiko ne suppose rien et demande confirmation humaine.',
      safeReply: `Merci pour votre message ! Nos zones habituelles validées couvrent actuellement ${identity.coveredZones.join(', ')}. Pour une prise en charge ou livraison vers ${zoneName}, je ne veux rien vous promettre sans certitude : je vais faire confirmer cette information et les modalités par notre équipe. Souhaitez-vous que je lance cette vérification ?`,
      citedSources,
      suggestedEscalationAction: `Confirmer faisabilité & frais pour la zone ${zoneName}`,
    };
  }

  // 4. Dynamic availability / real-time stock / slot check (Information dynamique)
  if (asksAvailabilityOrSlot) {
    return {
      truthLevel: 'dynamic_info',
      truthLabel: 'Information dynamique',
      allowedToPromise: false,
      requiresHumanApproval: !policy.canPromiseSameDaySlot,
      blockedClaims: ['Disponibilité stock / créneau en temps réel non vérifiée'],
      guardReason:
        'Une disponibilité immédiate ou un créneau horaire constitue une donnée dynamique temps réel qui ne peut pas être confirmée à partir d’un texte statique.',
      safeReply:
        "Je vérifie tout de suite auprès de notre planning et de notre stock en temps réel afin de vous confirmer la disponibilité exacte. Pouvez-vous me préciser votre commune et le créneau souhaité pour que notre équipe valide la prise en charge ?",
      citedSources,
      suggestedEscalationAction: 'Vérifier stock / créneau planning en temps réel',
    };
  }

  // 5. Check active Training Academy rules first if a rule matches
  const activeRule = trainingRules.find(
    (r) =>
      r.isActive &&
      extractKeywords(r.customerTrigger).some((kw) => normMsg.includes(kw))
  );

  // 6. Validated Knowledge Base RAG match (Information validée)
  if (verifiedMatches.length > 0) {
    const primary = verifiedMatches[0];
    const priceClause =
      typeof primary.approvedPriceFCFA === 'number'
        ? ` Le tarif validé est de ${primary.approvedPriceFCFA.toLocaleString('fr-FR')} FCFA.`
        : '';

    const ruleHint = activeRule ? ` ${activeRule.expectedBehavior}` : '';

    return {
      truthLevel: 'validated_info',
      truthLabel: 'Information validée',
      allowedToPromise: true,
      requiresHumanApproval: false,
      blockedClaims: [],
      guardReason: `Réponse fondée sur ${verifiedMatches.length} source(s) officielle(s) validée(s) (${primary.source}).`,
      safeReply: `${primary.content}${priceClause}${ruleHint} Souhaitez-vous avancer sur cette base ou recevoir un lien de règlement sécurisé ?`.trim(),
      citedSources,
    };
  }

  // 7. Fallback for unknown information not present in validated RAG
  return {
    truthLevel: 'unknown_info',
    truthLabel: 'Information inconnue',
    allowedToPromise: false,
    requiresHumanApproval: true,
    blockedClaims: ['Aucune source validée ne couvre cette demande précise dans la base de l’entreprise'],
    guardReason:
      'Verified RAG Engine™ n’a trouvé aucun document validé couvrant cette question. Conformément à la doctrine Fiko, aucune réponse n’est inventée.',
    safeReply:
      "Merci pour votre question ! Pour vous répondre avec exactitude et sans approximation, je vais faire confirmer cette information par notre équipe. Souhaitez-vous que je vous recontacte dès que j'ai leur validation ?",
    citedSources: [],
    suggestedEscalationAction: 'Question non couverte à valider et ajouter à la base',
  };
}

/**
 * Computes real Business Mastery % (Maîtrise métier de Fiko)
 */
export function computeKnowledgeMastery(params: {
  identity: BusinessIdentity;
  items: KnowledgeItem[];
  trainingRules: TrainingRule[];
  policy: SalesAuthorityPolicy;
}): number {
  const { identity, items, trainingRules, policy } = params;
  if (items.length === 0 && !identity.description && trainingRules.length === 0) {
    return 0;
  }

  // 1. Identity completeness (25 pts)
  let identityScore = 0;
  if (identity.companyName.trim()) identityScore += 5;
  if (identity.sector.trim()) identityScore += 5;
  if (identity.services.length > 0) identityScore += 5;
  if (identity.coveredZones.length > 0) identityScore += 5;
  if (identity.workingHours.trim()) identityScore += 5;

  // 2. Knowledge validation ratio & volume (45 pts)
  const validatedCount = items.filter((i) => i.status === 'validated').length;
  const validationRatio = items.length > 0 ? validatedCount / items.length : 0;
  const volumeFactor = Math.min(1, validatedCount / 18);
  const knowledgeScore = Math.round(validationRatio * 25 + volumeFactor * 20);

  // 3. Training Academy coverage (15 pts)
  const activeTestedRules = trainingRules.filter((r) => r.isActive && r.testedBeforeActivation).length;
  const trainingScore = Math.min(15, activeTestedRules * 5);

  // 4. Sales Authority & Guard configured (15 pts)
  let authorityScore = 10;
  if (policy.forbiddenPromises.length >= 2) authorityScore += 5;

  return Math.min(100, identityScore + knowledgeScore + trainingScore + authorityScore);
}

/**
 * Explicit Demo / Conceptual Preview Dataset (strictly separated from real accounts)
 * Matches prompt Section 1: 24 Connaissances, 18 Validées, 6 À vérifier, 75 % Maîtrise
 */
export function createDemoKnowledgeState(companyId = 'sandbox_demo_reviewer_68'): {
  identity: BusinessIdentity;
  items: KnowledgeItem[];
  policy: SalesAuthorityPolicy;
  trainingRules: TrainingRule[];
  approvals: HumanApprovalRequest[];
  learningSuggestions: LearningSuggestion[];
} {
  const now = '2026-11-19T10:00:00.000Z';

  const identity: BusinessIdentity = {
    companyId,
    companyName: 'Froid & Confort Abidjan (Démo)',
    sector: 'Climatisation, Froid Industriel & Maintenance Technique',
    description:
      'Installation, entretien préventif et dépannage de systèmes de climatisation résidentiels et professionnels dans le Grand Abidjan.',
    services: [
      'Entretien simple split (nettoyage filtres & unité)',
      'Installation climatiseur split & inverter',
      'Diagnostic panne & recharge gaz R410A / R32',
      'Contrat maintenance PME trimestriel',
    ],
    targetAudience: 'Particuliers exigeants, PME, bureaux, cliniques et commerces à Abidjan',
    coveredZones: ['Cocody', 'Plateau', 'Marcory', 'Zone 4', 'Yopougon', 'Treichville'],
    workingHours: 'Lun - Sam : 08h00 à 18h30',
    positioning: 'Intervention propre, technicien certifié, transparence tarifaire sans promesse abusive',
    commercialTone: 'Professionnel & Rassurant',
    primaryObjectives: [
      'Qualifier le type de climatiseur et la commune avant déplacement',
      'Encaisser l’acompte diagnostic via Paystack XOF',
      'Ne jamais promettre de délai ou de réparation avant vérification équipe',
    ],
    updatedAt: now,
  };

  const validatedEntries: Array<Omit<KnowledgeItem, 'companyId' | 'status' | 'createdAt' | 'updatedAt'>> = [
    {
      id: 'k_01',
      title: 'Tarif entretien simple climatiseur split',
      category: 'tarif',
      content: "L'entretien complet d'un climatiseur split (nettoyage haute pression, filtres, contrôle pression) coûte 10 000 FCFA par unité.",
      approvedPriceFCFA: 10000,
      source: 'Grille Tarifaire Officielle 2026.pdf',
      sourceType: 'pdf',
      validUntil: '2026-12-31',
      responsible: 'Direction Technique',
      scope: 'Abidjan zones couvertes',
      approvedBy: 'M. Koffi (Directeur)',
      approvedAt: '2026-10-15',
      keywords: ['entretien', 'climatiseur', 'climatisation', 'split', 'nettoyage', '10000', 'prix', 'cout', 'tarif'],
    },
    {
      id: 'k_02',
      title: 'Tarif diagnostic technique sur site',
      category: 'tarif',
      content: 'Le déplacement avec diagnostic technique complet à Abidjan est facturé 15 000 FCFA (déduit si devis de réparation accepté sous 7 jours).',
      approvedPriceFCFA: 15000,
      source: 'Grille Tarifaire Officielle 2026.pdf',
      sourceType: 'pdf',
      validUntil: '2026-12-31',
      responsible: 'Direction Technique',
      scope: 'Abidjan zones couvertes',
      approvedBy: 'M. Koffi (Directeur)',
      approvedAt: '2026-10-15',
      keywords: ['diagnostic', 'panne', 'deplacement', 'reparation', '15000', 'prix'],
    },
    {
      id: 'k_03',
      title: 'Zones d’intervention confirmées sans surcoût',
      category: 'zone',
      content: 'Nos équipes interviennent du lundi au samedi à Cocody, Plateau, Marcory, Zone 4, Treichville et Yopougon.',
      source: 'Charte Logistique Q4.docx',
      sourceType: 'word',
      validUntil: '2026-12-31',
      responsible: 'Chef d’Exploitation',
      scope: 'Grand Abidjan',
      approvedBy: 'Direction Générale',
      approvedAt: '2026-10-20',
      keywords: ['zone', 'cocody', 'plateau', 'marcory', 'yopougon', 'abidjan', 'intervention'],
    },
    {
      id: 'k_04',
      title: 'Recharge gaz réfrigérant R410A / R32',
      category: 'tarif',
      content: 'La recharge complète en gaz R410A ou R32 après recherche de fuite est proposée à 25 000 FCFA.',
      approvedPriceFCFA: 25000,
      source: 'Grille Tarifaire Officielle 2026.pdf',
      sourceType: 'pdf',
      validUntil: '2026-12-31',
      responsible: 'Direction Technique',
      scope: 'Tous clients',
      approvedBy: 'M. Koffi (Directeur)',
      approvedAt: '2026-10-15',
      keywords: ['gaz', 'recharge', 'r410a', 'r32', 'fuite', '25000'],
    },
    {
      id: 'k_05',
      title: 'Installation climatiseur split neuf',
      category: 'service',
      content: "La pose standard d'un climatiseur split (jusqu'à 3m de liaison cuivre fournie) est facturée 35 000 FCFA.",
      approvedPriceFCFA: 35000,
      source: 'Catalogue Services.pdf',
      sourceType: 'pdf',
      validUntil: '2026-12-31',
      responsible: 'Direction Technique',
      scope: 'Particuliers & PME',
      approvedBy: 'M. Koffi (Directeur)',
      approvedAt: '2026-10-18',
      keywords: ['installation', 'pose', 'climatiseur', 'neuf', '35000'],
    },
    {
      id: 'k_06',
      title: 'Pack Entretien Entreprise (5 unités)',
      category: 'catalogue',
      content: 'Le pack entretien trimestriel pour 5 climatiseurs de bureau est facturé 45 000 FCFA TTC.',
      approvedPriceFCFA: 45000,
      source: 'Offre B2B 2026.csv',
      sourceType: 'csv',
      validUntil: '2026-12-31',
      responsible: 'Responsable Grands Comptes',
      scope: 'Entreprises & Bureaux',
      approvedBy: 'Direction Commerciale',
      approvedAt: '2026-11-01',
      keywords: ['pack', 'entreprise', 'bureau', 'b2b', '45000', '5 unites'],
    },
    {
      id: 'k_07',
      title: 'Garantie main d’œuvre sur pose neuve',
      category: 'garantie',
      content: "Toute installation neuve bénéficie d'une garantie main d'œuvre de 6 mois sur l'étanchéité et le raccordement.",
      source: 'CGV Officielles.pdf',
      sourceType: 'pdf',
      validUntil: '2027-06-30',
      responsible: 'Service Juridique',
      scope: 'Installations neuves',
      approvedBy: 'Direction Générale',
      approvedAt: '2026-10-10',
      keywords: ['garantie', 'installation', '6 mois', 'main oeuvre'],
    },
    {
      id: 'k_08',
      title: 'Acompte de réservation intervention via Paystack',
      category: 'politique',
      content: 'La réservation d’un créneau confirmé nécessite un acompte de 5 000 FCFA réglé par lien Paystack sécurisé (Wave, Orange Money, MTN MoMo, Carte).',
      approvedPriceFCFA: 5000,
      source: 'Procédure Encaissement Fiko.docx',
      sourceType: 'manual',
      validUntil: '2026-12-31',
      responsible: 'Finance',
      scope: 'Toutes réservations',
      approvedBy: 'Direction Financière',
      approvedAt: '2026-11-02',
      keywords: ['acompte', 'paiement', 'paystack', 'wave', 'reservation', '5000'],
    },
    {
      id: 'k_09',
      title: 'Horaires d’ouverture du support et des équipes',
      category: 'delai',
      content: 'Nos équipes opèrent du lundi au samedi de 08h00 à 18h30. Toute demande après 18h30 est planifiée le jour ouvré suivant après confirmation.',
      source: 'https://froidconfort.ci/horaires',
      sourceType: 'url',
      validUntil: '2026-12-31',
      responsible: 'Chef d’Exploitation',
      scope: 'Support Client',
      approvedBy: 'Direction Générale',
      approvedAt: '2026-10-12',
      keywords: ['horaires', 'ouverture', 'samedi', 'lundi', 'heures'],
    },
    {
      id: 'k_10',
      title: 'Politique de remise commerciale autonome',
      category: 'politique',
      content: "Une remise commerciale jusqu'à 10 % maximum est autorisée à partir de 3 unités entretenues simultanément sur le même site.",
      discountMaxPercent: 10,
      source: 'Politique Commerciale Q4.pdf',
      sourceType: 'pdf',
      validUntil: '2026-12-31',
      responsible: 'Direction Commerciale',
      scope: 'Multi-unités',
      approvedBy: 'Directeur Commercial',
      approvedAt: '2026-11-04',
      keywords: ['remise', 'reduction', 'rabais', '10%', '3 unites'],
    },
    {
      id: 'k_11',
      title: 'Contrat de maintenance annuel Cliniques & Hôtels',
      category: 'service',
      content: 'Contrat annuel avec 4 passages préventifs/an sur devis sur mesure après audit technique préalable.',
      source: 'Offre B2B 2026.csv',
      sourceType: 'csv',
      validUntil: '2026-12-31',
      responsible: 'Responsable Grands Comptes',
      scope: 'Hôtels & Santé',
      approvedBy: 'Direction Commerciale',
      approvedAt: '2026-11-01',
      keywords: ['contrat', 'annuel', 'hotel', 'clinique', 'maintenance'],
    },
    {
      id: 'k_12',
      title: 'Facturation normalisée DGI incluse',
      category: 'politique',
      content: 'Une facture normalisée ou reçu électronique est délivré automatiquement après confirmation du règlement.',
      source: 'Procédure Facturation.pdf',
      sourceType: 'pdf',
      validUntil: '2027-01-31',
      responsible: 'Comptabilité',
      scope: 'Tous clients',
      approvedBy: 'Direction Financière',
      approvedAt: '2026-10-25',
      keywords: ['facture', 'recu', 'dgi', 'tva'],
    },
    {
      id: 'k_13',
      title: 'Climatiseur Inverter 1.5 CV (Fourniture + Pose)',
      category: 'catalogue',
      content: 'Pack Climatiseur Inverter 1.5 CV basse consommation avec pose standard incluse à 285 000 FCFA.',
      approvedPriceFCFA: 285000,
      source: 'Catalogue Produits 2026.csv',
      sourceType: 'csv',
      validUntil: '2026-12-15',
      responsible: 'Direction Commerciale',
      scope: 'Sous réserve de stock',
      approvedBy: 'Direction Générale',
      approvedAt: '2026-11-03',
      keywords: ['climatiseur', 'inverter', '1.5', 'achat', '285000'],
    },
    {
      id: 'k_14',
      title: 'Climatiseur Inverter 2 CV (Fourniture + Pose)',
      category: 'catalogue',
      content: 'Pack Climatiseur Inverter 2 CV haute performance avec pose standard incluse à 365 000 FCFA.',
      approvedPriceFCFA: 365000,
      source: 'Catalogue Produits 2026.csv',
      sourceType: 'csv',
      validUntil: '2026-12-15',
      responsible: 'Direction Commerciale',
      scope: 'Sous réserve de stock',
      approvedBy: 'Direction Générale',
      approvedAt: '2026-11-03',
      keywords: ['climatiseur', 'inverter', '2 cv', 'achat', '365000'],
    },
    {
      id: 'k_15',
      title: 'Nettoyage bac à condensats & débouchage',
      category: 'service',
      content: "Intervention ciblée contre fuite d'eau intérieure et débouchage d'évacuation au tarif validé de 12 000 FCFA.",
      approvedPriceFCFA: 12000,
      source: 'Grille Tarifaire Officielle 2026.pdf',
      sourceType: 'pdf',
      validUntil: '2026-12-31',
      responsible: 'Direction Technique',
      scope: 'Abidjan',
      approvedBy: 'M. Koffi (Directeur)',
      approvedAt: '2026-10-15',
      keywords: ['fuite', 'eau', 'coule', 'debouchage', '12000'],
    },
    {
      id: 'k_16',
      title: 'Délai moyen de réponse devis B2B',
      category: 'delai',
      content: 'Tout devis B2B multi-sites est transmis sous 24 heures ouvrées après visite ou réception des plans.',
      source: 'Charte Qualité.docx',
      sourceType: 'word',
      validUntil: '2026-12-31',
      responsible: 'Responsable Grands Comptes',
      scope: 'B2B',
      approvedBy: 'Direction Commerciale',
      approvedAt: '2026-10-28',
      keywords: ['devis', 'b2b', '24h', 'delai'],
    },
    {
      id: 'k_17',
      title: 'Modes de paiement acceptés',
      category: 'politique',
      content: 'Paiements acceptés via lien Paystack sécurisé (Wave, Orange Money, MTN MoMo, Moov Money, Visa/Mastercard) en FCFA.',
      source: 'Procédure Encaissement Fiko.docx',
      sourceType: 'manual',
      validUntil: '2027-12-31',
      responsible: 'Finance',
      scope: 'Tous canaux',
      approvedBy: 'Direction Financière',
      approvedAt: '2026-11-05',
      keywords: ['paiement', 'wave', 'orange money', 'mtn', 'carte', 'paystack'],
    },
    {
      id: 'k_18',
      title: 'Clause de non-garantie avant diagnostic',
      category: 'garantie',
      content: 'Aucune garantie de réparation immédiate ne peut être formulée avant inspection physique du compresseur et de la carte électronique.',
      source: 'CGV Officielles.pdf',
      sourceType: 'pdf',
      validUntil: '2027-06-30',
      responsible: 'Service Juridique',
      scope: 'Dépannage',
      approvedBy: 'Direction Générale',
      approvedAt: '2026-10-10',
      keywords: ['garantie', 'reparation', 'diagnostic', 'compresseur'],
    },
  ];

  const pendingEntries: Array<Omit<KnowledgeItem, 'companyId' | 'createdAt' | 'updatedAt'>> = [
    {
      id: 'k_19',
      title: 'Tarif promo entretien fin d’année (8 500 FCFA)',
      category: 'tarif',
      content: 'Brouillon importé proposant un tarif entretien à 8 500 FCFA — en conflit avec la grille validée à 10 000 FCFA.',
      approvedPriceFCFA: 8500,
      status: 'conflict',
      conflictWithId: 'k_01',
      conflictReason: 'Conflit tarifaire détecté : 8 500 FCFA vs 10 000 FCFA dans "Tarif entretien simple climatiseur split".',
      source: 'Brouillon Promo Nov.csv',
      sourceType: 'csv',
      validUntil: '2026-12-31',
      responsible: 'Marketing',
      scope: 'À valider par Direction',
      keywords: ['promo', 'entretien', '8500', 'tarif'],
    },
    {
      id: 'k_20',
      title: 'Extension zone Bingerville & Grand-Bassam',
      category: 'zone',
      content: 'Possibilité de desservir Bingerville avec supplément déplacement de 5 000 FCFA (en attente d’approbation logistique).',
      approvedPriceFCFA: 5000,
      status: 'pending_verification',
      source: 'Note Interne Logistique.docx',
      sourceType: 'word',
      validUntil: '2026-12-31',
      responsible: 'Chef d’Exploitation',
      scope: 'Périphérie Abidjan',
      keywords: ['bingerville', 'bassam', 'zone', 'supplement'],
    },
    {
      id: 'k_21',
      title: 'Pack Armoire Climatisation 5 CV Industrielle',
      category: 'catalogue',
      content: 'Fourniture et installation armoire 5 CV — tarif fournisseur à confirmer avant activation.',
      status: 'pending_verification',
      source: 'https://froidconfort.ci/pro',
      sourceType: 'url',
      validUntil: '2026-12-31',
      responsible: 'Achats',
      scope: 'Industrie',
      keywords: ['armoire', '5 cv', 'industriel'],
    },
    {
      id: 'k_22',
      title: 'Intervention urgence nuit / dimanche',
      category: 'delai',
      content: 'Astriendre week-end & urgence après 19h — majoration de 50 % à confirmer par la direction.',
      status: 'pending_verification',
      source: 'FAQ Brouillon.txt',
      sourceType: 'manual',
      validUntil: '2026-12-31',
      responsible: 'Direction Technique',
      scope: 'Urgences',
      keywords: ['urgence', 'dimanche', 'nuit'],
    },
    {
      id: 'k_23',
      title: 'Remise associations et ONG (-15%)',
      category: 'politique',
      content: 'Proposition de remise de 15 % pour les ONG enregistrées — soumise à validation commerciale.',
      discountMaxPercent: 15,
      status: 'pending_verification',
      source: 'Email Direction Commerciale',
      sourceType: 'manual',
      validUntil: '2026-12-31',
      responsible: 'Direction Commerciale',
      scope: 'ONG & Associations',
      keywords: ['ong', 'remise', '15%'],
    },
    {
      id: 'k_24',
      title: 'Pièces détachées carte inverter Samsung/LG',
      category: 'catalogue',
      content: 'Délai d’approvisionnement pièces électroniques sous 48h à 72h selon stock fournisseur.',
      status: 'pending_verification',
      source: 'Catalogue Fournisseur.pdf',
      sourceType: 'pdf',
      validUntil: '2026-12-31',
      responsible: 'Magasin & Stock',
      scope: 'SAV',
      keywords: ['pieces', 'carte', 'samsung', 'lg', 'stock'],
    },
  ];

  const items: KnowledgeItem[] = [
    ...validatedEntries.map((e) => ({
      ...e,
      companyId,
      status: 'validated' as const,
      createdAt: now,
      updatedAt: now,
    })),
    ...pendingEntries.map((e) => ({
      ...e,
      companyId,
      createdAt: now,
      updatedAt: now,
    })),
  ];

  const policy: SalesAuthorityPolicy = {
    companyId,
    canPresentOffers: true,
    canAdvise: true,
    canQualifyLeads: true,
    canSendQuote: true,
    maxAutonomousQuoteFCFA: 250000,
    canNegotiateDiscount: true,
    maxAutonomousDiscountPercent: 10,
    canCreatePaystackLink: true,
    canPromiseSameDaySlot: false,
    canGuaranteeOutcome: false,
    forbiddenPromises: [
      'Garantir une réparation ou un résultat sans diagnostic préalable',
      'Accorder une remise supérieure à 10 % sans approbation humaine',
      'Promettre un passage le jour même ou hors zone validée sans vérification équipe',
    ],
    escalationChannel: 'WhatsApp Direction & File d’approbation Fiko',
    updatedAt: now,
  };

  const trainingRules: TrainingRule[] = [
    {
      id: 'tr_01',
      companyId,
      title: 'Qualification avant déplacement',
      scenarioType: 'sales_script',
      customerTrigger: 'Mon climatiseur ne refroidit plus',
      expectedBehavior:
        'Toujours demander la commune, le type d’appareil (split/armoire) et proposer le diagnostic validé à 15 000 FCFA.',
      testedBeforeActivation: true,
      isActive: true,
      lastTestedAt: now,
      createdAt: now,
    },
    {
      id: 'tr_02',
      companyId,
      title: 'Refus poli de garantie avant diagnostic',
      scenarioType: 'correction',
      customerTrigger: 'Pouvez-vous garantir que ce sera réparé aujourd’hui ?',
      expectedBehavior:
        'Ne jamais garantir la réparation avant le passage du technicien. Proposer de lancer la vérification de disponibilité.',
      testedBeforeActivation: true,
      isActive: true,
      lastTestedAt: now,
      createdAt: now,
    },
    {
      id: 'tr_03',
      companyId,
      title: 'Vente croisée Pack 5 unités',
      scenarioType: 'instruction',
      customerTrigger: 'Nous avons plusieurs climatiseurs au bureau',
      expectedBehavior:
        'Proposer le Pack Entretien Entreprise (5 unités) à 45 000 FCFA plutôt que le tarif unitaire.',
      testedBeforeActivation: false,
      isActive: false,
      createdAt: now,
    },
  ];

  const approvals: HumanApprovalRequest[] = [
    {
      id: 'apr_01',
      companyId,
      customerName: 'Jean-Marc Kouadio',
      customerPhone: '+225 07 84 12 09 44',
      customerMessage: "Bonjour, pouvez-vous venir à Bingerville aujourd'hui à 14 h et me garantir que ma climatisation sera réparée ?",
      requestedAction: 'Vérifier disponibilité équipe à 14h à Bingerville + Refus garantie sans diagnostic',
      truthLevel: 'forbidden_action',
      proposedSafeReply:
        "Bonjour ! Nous pouvons étudier votre demande d'intervention à Bingerville. Pour confirmer un passage à 14 h, je dois d'abord vérifier la disponibilité de notre équipe. Le diagnostic permettra également de déterminer la réparation nécessaire. Souhaitez-vous que je lance la vérification ?",
      status: 'pending',
      createdAt: now,
    },
    {
      id: 'apr_02',
      companyId,
      customerName: 'Clinique Espoir Plateau',
      customerPhone: '+225 05 44 21 90 12',
      customerMessage: 'Nous souhaitons 30 % de remise sur l’entretien de 12 unités.',
      requestedAction: 'Exception tarifaire : remise 30 % demandée (plafond autonome : 10 %)',
      truthLevel: 'approval_required',
      proposedSafeReply:
        "Je transmets votre demande de remise exceptionnelle de 30 % pour 12 unités à notre direction commerciale pour validation rapide.",
      status: 'pending',
      createdAt: now,
    },
  ];

  const learningSuggestions: LearningSuggestion[] = [
    {
      id: 'lrn_01',
      companyId,
      unansweredQuestion: 'Livrez-vous et installez-vous à Korhogo ?',
      frequency: 4,
      detectedGap: 'Zone géographique "Korhogo" absente des zones couvertes validées.',
      proposedTitle: 'Politique d’intervention villes de l’intérieur (Korhogo / Bouaké)',
      proposedContent: 'Préciser les frais de mission technicien ou indiquer que le service est limité au Grand Abidjan.',
      proposedCategory: 'zone',
      status: 'suggested',
      lastAskedAt: now,
    },
    {
      id: 'lrn_02',
      companyId,
      unansweredQuestion: 'Acceptez-vous le paiement par chèque entreprise pour les contrats annuels ?',
      frequency: 3,
      detectedGap: 'Règle chèque B2B absente des modes de paiement validés.',
      proposedTitle: 'Conditions chèque & virement B2B',
      proposedContent: 'Virement ou chèque certifié accepté uniquement pour les factures B2B >= 150 000 FCFA avec acompte de 50 %.',
      proposedCategory: 'politique',
      status: 'suggested',
      lastAskedAt: now,
    },
  ];

  return { identity, items, policy, trainingRules, approvals, learningSuggestions };
}

/**
 * Empty starting template for real authenticated companies (zero mock business metrics)
 */
export function createEmptyCompanyKnowledgeState(
  companyId: string,
  companyName: string,
  sector: string
): {
  identity: BusinessIdentity;
  items: KnowledgeItem[];
  policy: SalesAuthorityPolicy;
  trainingRules: TrainingRule[];
  approvals: HumanApprovalRequest[];
  learningSuggestions: LearningSuggestion[];
} {
  const now = new Date().toISOString();
  return {
    identity: {
      companyId,
      companyName: companyName || 'Mon Entreprise',
      sector: sector || 'À renseigner',
      description: '',
      services: [],
      targetAudience: '',
      coveredZones: [],
      workingHours: '08h00 - 18h00',
      positioning: '',
      commercialTone: 'Professionnel & Rassurant',
      primaryObjectives: ['Qualifier les demandes WhatsApp', 'Ne jamais inventer un tarif ou un délai'],
      updatedAt: now,
    },
    items: [],
    policy: {
      companyId,
      canPresentOffers: true,
      canAdvise: true,
      canQualifyLeads: true,
      canSendQuote: true,
      maxAutonomousQuoteFCFA: 100000,
      canNegotiateDiscount: false,
      maxAutonomousDiscountPercent: 0,
      canCreatePaystackLink: true,
      canPromiseSameDaySlot: false,
      canGuaranteeOutcome: false,
      forbiddenPromises: [
        'Garantir un résultat ou un délai sans validation humaine',
        'Proposer une remise non approuvée',
      ],
      escalationChannel: 'Tableau de bord Fiko (Approbations Humaines)',
      updatedAt: now,
    },
    trainingRules: [],
    approvals: [],
    learningSuggestions: [],
  };
}

// ============================================================================
// FIKO KNOWLEDGE CENTER™ V3.0 — LEARNING LIVE, AUDIT & VERSIONING
// ============================================================================

export const LEARNING_STEPS = [
  { step: 1, key: 'activity', label: 'Activité & Offre' },
  { step: 2, key: 'pricing', label: 'Produits & Tarifs FCFA' },
  { step: 3, key: 'zones', label: 'Zones & Délais' },
  { step: 4, key: 'authority', label: 'Remises & Plafonds' },
  { step: 5, key: 'forbidden', label: 'Garanties & Limites' },
  { step: 6, key: 'escalation', label: 'Escalade Humaine' },
  { step: 7, key: 'audit', label: 'Audit de Maîtrise' },
] as const;

/**
 * Deterministic fact extractor from a business leader's conversational answer
 */
export function extractStructuredFactsFromLeaderReply(
  leaderMessage: string,
  stepNumber: number
): {
  facts: Array<{
    id: string;
    title: string;
    category: KnowledgeCategory;
    content: string;
    approvedPriceFCFA?: number;
  }>;
  detectedZones: string[];
  detectedDiscountLimit?: number;
  detectedHours?: string;
} {
  const facts: Array<{
    id: string;
    title: string;
    category: KnowledgeCategory;
    content: string;
    approvedPriceFCFA?: number;
  }> = [];

  const trimmed = leaderMessage.trim();
  const norm = normalizeText(trimmed);

  // Extract explicit FCFA prices
  const priceRegex = /([^.!?\n]{4,60}?)\s*(?:a|au prix de|coute|tarif|pour|:|-)?\s*(\d[\d\s]{2,})\s*(?:fcfa|xof|f\b)/gi;
  let match: RegExpExecArray | null;
  while ((match = priceRegex.exec(trimmed)) !== null) {
    const rawNum = parseInt(match[2].replace(/\s+/g, ''), 10);
    if (Number.isFinite(rawNum) && rawNum > 0) {
      const label = match[1].trim().replace(/^[,;:\-\s]+/, '') || 'Tarif confirmé';
      facts.push({
        id: `fact_${Date.now().toString(36)}_${facts.length}`,
        title: label.slice(0, 75),
        category: 'tarif',
        content: `${label} : tarif officiel confirmé à ${rawNum.toLocaleString('fr-FR')} FCFA.`,
        approvedPriceFCFA: rawNum,
      });
    }
  }

  // Extract zones mentioned
  const cityPool = [
    'Cocody', 'Plateau', 'Marcory', 'Zone 4', 'Yopougon', 'Treichville', 'Abobo',
    'Koumassi', 'Port-Bouët', 'Bingerville', 'Grand-Bassam', 'Abidjan',
    'Bouaké', 'Yamoussoukro', 'Korhogo', 'San-Pedro', 'Dakar', 'Douala', 'Yaoundé', 'Lomé', 'Cotonou',
  ];
  const detectedZones = cityPool.filter((city) => norm.includes(normalizeText(city)));
  if (detectedZones.length > 0) {
    facts.push({
      id: `fact_zone_${Date.now().toString(36)}`,
      title: `Zones d'intervention validées (${detectedZones.join(', ')})`,
      category: 'zone',
      content: `Zones officiellement couvertes confirmées par le dirigeant : ${detectedZones.join(', ')}.`,
    });
  }

  // Extract discount ceiling if mentioned
  const discMatch = norm.match(/(?:remise|reduction|rabais)[^0-9]{0,25}(\d{1,2})\s*%/);
  const detectedDiscountLimit = discMatch ? parseInt(discMatch[1], 10) : undefined;
  if (detectedDiscountLimit !== undefined) {
    facts.push({
      id: `fact_disc_${Date.now().toString(36)}`,
      title: `Plafond de remise autonome (${detectedDiscountLimit} %)`,
      category: 'politique',
      content: `Marge commerciale maximale autorisée sans validation hiérarchique : ${detectedDiscountLimit} %.`,
    });
  }

  // Extract working hours if mentioned
  const hoursMatch = trimmed.match(/(\d{1,2}\s*h(?:\d{2})?\s*(?:à|-|a)\s*\d{1,2}\s*h(?:\d{2})?)/i);
  const detectedHours = hoursMatch ? hoursMatch[1] : undefined;
  if (detectedHours) {
    facts.push({
      id: `fact_hrs_${Date.now().toString(36)}`,
      title: `Horaires confirmés (${detectedHours})`,
      category: 'delai',
      content: `Horaires officiels de service : ${detectedHours}.`,
    });
  }

  // Step-specific fallback fact if user wrote substantive prose without explicit regex match
  if (facts.length === 0 && trimmed.length >= 12) {
    const stepCategoryMap: Record<number, { title: string; category: KnowledgeCategory }> = {
      1: { title: 'Positionnement & Activité principale', category: 'service' },
      2: { title: 'Précision offre & tarification', category: 'catalogue' },
      3: { title: 'Conditions d’intervention & délais', category: 'delai' },
      4: { title: 'Politique de négociation commerciale', category: 'politique' },
      5: { title: 'Engagements & garanties autorisées', category: 'garantie' },
      6: { title: 'Règle d’escalade humaine', category: 'politique' },
      7: { title: 'Complément de formation dirigeant', category: 'faq' },
    };
    const meta = stepCategoryMap[stepNumber] || { title: 'Règle métier confirmée', category: 'faq' as KnowledgeCategory };
    facts.push({
      id: `fact_gen_${Date.now().toString(36)}`,
      title: meta.title,
      category: meta.category,
      content: trimmed,
    });
  }

  return { facts, detectedZones, detectedDiscountLimit, detectedHours };
}

/**
 * Conducts one intelligent Sales Director training turn in Fiko Learning Live™
 */
export function conductFikoLearningTurn(params: {
  leaderMessage: string;
  currentStep: number;
  identity: BusinessIdentity;
  knowledgeItems: KnowledgeItem[];
  policy: SalesAuthorityPolicy;
  pendingClarifications: string[];
}): {
  fikoReply: string;
  nextStep: number;
  stepLabel: string;
  extractedFacts: Array<{
    id: string;
    title: string;
    category: KnowledgeCategory;
    content: string;
    approvedPriceFCFA?: number;
  }>;
  detectedZones: string[];
  detectedDiscountLimit?: number;
  detectedHours?: string;
  remainingClarifications: string[];
} {
  const { leaderMessage, currentStep, identity, knowledgeItems, policy, pendingClarifications } = params;
  const extracted = extractStructuredFactsFromLeaderReply(leaderMessage, currentStep);
  const nextStep = Math.min(7, currentStep + 1);
  const stepMeta = LEARNING_STEPS.find((s) => s.step === nextStep) || LEARNING_STEPS[6];

  const remainingClarifications = [...pendingClarifications];
  const nextClarification = remainingClarifications.shift();

  const pendingItemsCount = knowledgeItems.filter(
    (i) => i.status === 'pending_verification' || i.status === 'conflict'
  ).length;
  const validatedCount = knowledgeItems.filter((i) => i.status === 'validated').length;

  let ack = 'Bien noté, j’enregistre ces éléments dans votre base de connaissances à valider.';
  if (extracted.facts.length > 0) {
    const first = extracted.facts[0];
    ack = first.approvedPriceFCFA
      ? `Parfait, je retiens le tarif de ${first.approvedPriceFCFA.toLocaleString('fr-FR')} FCFA pour « ${first.title} ».`
      : `Compris ! J’ai structuré « ${first.title} » comme règle métier candidate.`;
  }

  let nextPrompt = '';
  if (nextClarification) {
    nextPrompt = `Par rapport à l’analyse Deep Scan récente, j’ai besoin d’une clarification importante : ${nextClarification}`;
  } else {
    switch (nextStep) {
      case 2:
        nextPrompt = `Quels sont vos 2 ou 3 produits/services principaux et leurs tarifs exacts en FCFA que je suis autorisé à communiquer aux prospects ?`;
        break;
      case 3:
        nextPrompt = `Quelles villes ou communes couvrez-vous exactement (actuellement : ${identity.coveredZones.join(', ') || 'aucune'}), et quels sont vos délais réalistes d’intervention ou de livraison ?`;
        break;
      case 4:
        nextPrompt = `Sur le plan commercial, ai-je le droit d’accorder une remise autonome (actuellement : ${policy.canNegotiateDiscount ? `${policy.maxAutonomousDiscountPercent} %` : '0 %'}) et jusqu’à quel montant de devis en FCFA ?`;
        break;
      case 5:
        nextPrompt = `Quelles promesses ou garanties me sont strictement interdites sans diagnostic ou accord préalable (ex : garantie de résultat, passage le jour même) ?`;
        break;
      case 6:
        nextPrompt = `Lorsqu’un client demande une exception ou pose une question absente de nos ${validatedCount} sources validées (${pendingItemsCount} en attente), à quel canal ou responsable dois-je escalader ?`;
        break;
      default: {
        const audit = buildMasteryAuditReport(identity, knowledgeItems, policy);
        nextPrompt = `Formation structurée terminée ! Actuellement, je maîtrise ${audit.knownFactsCount} connaissance(s) validée(s), j’identifie ${audit.unknownGaps.length} point(s) encore à clarifier et je suis prêt à être testé dans le simulateur WhatsApp.`;
        break;
      }
    }
  }

  return {
    fikoReply: `${ack} ${nextPrompt}`.trim(),
    nextStep,
    stepLabel: stepMeta.label,
    extractedFacts: extracted.facts,
    detectedZones: extracted.detectedZones,
    detectedDiscountLimit: extracted.detectedDiscountLimit,
    detectedHours: extracted.detectedHours,
    remainingClarifications,
  };
}

/**
 * Critère de réussite: explains precisely what Fiko knows (with sources), what it ignores, and what it is authorized to do
 */
export function buildMasteryAuditReport(
  identity: BusinessIdentity,
  knowledgeItems: KnowledgeItem[],
  policy: SalesAuthorityPolicy
) {
  const validated = knowledgeItems.filter((i) => i.status === 'validated');
  const pendingOrConflict = knowledgeItems.filter(
    (i) => i.status === 'pending_verification' || i.status === 'conflict'
  );

  const knownFacts = validated.map((item) => ({
    title: item.title,
    source: item.source,
    category: item.category,
    priceFCFA: item.approvedPriceFCFA,
  }));

  const unknownGaps: string[] = [];
  if (identity.coveredZones.length === 0) {
    unknownGaps.push('Aucune zone géographique couverte n’est encore validée.');
  }
  if (!validated.some((v) => v.category === 'tarif')) {
    unknownGaps.push('Aucun tarif approuvé n’est encore actif dans Verified RAG Engine™.');
  }
  if (pendingOrConflict.length > 0) {
    unknownGaps.push(
      `${pendingOrConflict.length} connaissance(s) importée(s) restent en attente de validation ou en conflit (non utilisées face aux clients).`
    );
  }

  const authorizedCapabilities: string[] = [];
  if (policy.canPresentOffers) authorizedCapabilities.push('Présenter les offres et tarifs validés avec citation de source');
  if (policy.canQualifyLeads) authorizedCapabilities.push('Qualifier les prospects WhatsApp et créer les leads CRM');
  if (policy.canSendQuote) {
    authorizedCapabilities.push(
      `Proposer un pré-devis jusqu’à ${policy.maxAutonomousQuoteFCFA.toLocaleString('fr-FR')} FCFA`
    );
  }
  if (policy.canNegotiateDiscount && policy.maxAutonomousDiscountPercent > 0) {
    authorizedCapabilities.push(`Accorder une remise autonome jusqu’à ${policy.maxAutonomousDiscountPercent} %`);
  }
  if (policy.canCreatePaystackLink) authorizedCapabilities.push('Générer un lien de paiement Paystack (XOF)');

  const blockedCapabilities = [
    'Garantir un résultat certain ou une réparation avant diagnostic (verrouillé)',
    ...(!policy.canPromiseSameDaySlot
      ? ['Promettre un créneau le jour même sans vérification équipe/stock']
      : []),
    ...(!policy.canNegotiateDiscount
      ? ['Accorder toute remise commerciale sans validation humaine']
      : [`Accorder une remise supérieure à ${policy.maxAutonomousDiscountPercent} % sans approbation`]),
    ...policy.forbiddenPromises,
  ];

  return {
    knownFactsCount: knownFacts.length,
    knownFacts,
    unknownGaps,
    authorizedCapabilities,
    blockedCapabilities,
  };
}

/**
 * Extracts clean text + candidate knowledge items from raw HTML (for server-side Deep Scan)
 */
export function extractTextAndTitleFromHtml(html: string): {
  title: string;
  headings: string[];
  cleanText: string;
} {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Page Web';

  const headings: string[] = [];
  const hRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let hm: RegExpExecArray | null;
  while ((hm = hRegex.exec(html)) !== null && headings.length < 25) {
    const cleanH = hm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanH.length > 2) headings.push(cleanH);
  }

  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&euro;/gi, '€')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  return { title, headings, cleanText: stripped };
}

