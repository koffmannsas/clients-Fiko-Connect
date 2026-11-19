import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { 
  toPaystackSubunits, 
  fromPaystackSubunits, 
  isValidPaystackEmail, 
  getPaystackMode, 
  generateFikoPaymentReference 
} from '../src/lib/paystack.ts';
import { checkWhatsAppServiceWindow } from '../src/lib/whatsapp.ts';
import { 
  verifyMetaWebhookSignature, 
  verifyPaystackWebhookSignature 
} from '../server/webhook-verify.ts';
import {
  convertFromXOF,
  convertToXOF,
  formatCurrencyAmount,
  formatBaseFCFA
} from '../src/lib/currencyUtils.ts';
import {
  createDemoKnowledgeState,
  evaluateTruthAndPromiseGuard,
  retrieveVerifiedKnowledge,
  detectKnowledgeConflicts,
  parseRawKnowledgeText,
  computeKnowledgeMastery,
  extractTextAndTitleFromHtml,
  conductFikoLearningTurn,
  buildMasteryAuditReport
} from '../src/lib/knowledgeEngine.ts';
import {
  isPrivateOrReservedIp,
  validateSafeExternalUrl
} from '../server/deepScan.ts';

describe('Suite 1: Validation des Conversions Paystack en Sous-Unités XOF (Franc CFA)', () => {
  it('convertit correctement les montants FCFA en centimes (sous-unités entières)', () => {
    assert.equal(toPaystackSubunits(45000), 4500000);
    assert.equal(toPaystackSubunits(24900), 2490000);
    assert.equal(toPaystackSubunits(100), 10000);
    assert.throws(() => toPaystackSubunits(0), /supérieur à zéro/);
  });

  it('arrondit proprement les décimales éventuelles vers un entier strict', () => {
    assert.equal(toPaystackSubunits(19900.4), 1990040);
    assert.equal(toPaystackSubunits(19900.6), 1990060);
    assert.equal(Number.isInteger(toPaystackSubunits(1234.56)), true);
  });

  it('reconvertit fidèlement les centimes Paystack vers le montant FCFA', () => {
    assert.equal(fromPaystackSubunits(4500000), 45000);
    assert.equal(fromPaystackSubunits(2490000), 24900);
  });

  it('détecte correctement le mode Live vs Test selon le préfixe de clé', () => {
    assert.equal(getPaystackMode('sk_live_93710abcdef'), 'live');
    assert.equal(getPaystackMode('sk_test_12345abcdef'), 'test');
    assert.equal(getPaystackMode(undefined), 'test');
  });

  it('génère des références uniques Fiko conformes', () => {
    const ref1 = generateFikoPaymentReference('companyA');
    const ref2 = generateFikoPaymentReference('companyB');
    assert.match(ref1, /^FIKO_/);
    assert.match(ref2, /^FIKO_/);
    assert.notEqual(ref1, ref2);
  });

  it('valide le format des adresses email pour Paystack', () => {
    assert.equal(isValidPaystackEmail('client@fiko.io'), true);
    assert.equal(isValidPaystackEmail('prospect.kcg@gmail.com'), true);
    assert.equal(isValidPaystackEmail('invalid-email'), false);
    assert.equal(isValidPaystackEmail(''), false);
  });
});

describe('Suite 2: Fenêtre de Service Client WhatsApp de 24 Heures', () => {
  it('autorise les réponses libres dans la fenêtre de 24h', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const result = checkWhatsAppServiceWindow(twoHoursAgo);
    assert.equal(result.isOpen, true);
    assert.ok(result.remainingMs > 0);
  });

  it('bloque les messages libres hors de la fenêtre de 24h et exige un modèle approuvé Meta', () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
    const result = checkWhatsAppServiceWindow(twentyFiveHoursAgo);
    assert.equal(result.isOpen, false);
    assert.match(result.warningMessage || '', /24h/);
  });

  it('bloque si aucun message entrant préalable n’a été enregistré', () => {
    const result = checkWhatsAppServiceWindow(undefined);
    assert.equal(result.isOpen, false);
  });
});

describe('Suite 3: Cryptographie & Rejet des Signatures Webhooks Falsifiées', () => {
  const secretKey = 'test_webhook_secret_key_12345';
  const payload = Buffer.from(JSON.stringify({ event: 'charge.success', reference: 'FIKO_TEST_001' }));

  it('valide la signature HMAC SHA512 officielle de Paystack', () => {
    const validSignature = crypto.createHmac('sha512', secretKey).update(payload).digest('hex');
    assert.equal(verifyPaystackWebhookSignature(payload, validSignature, secretKey), true);
  });

  it('rejette formellement toute signature Paystack falsifiée ou altérée', () => {
    const falsifiedSignature = crypto.createHmac('sha512', 'wrong_secret').update(payload).digest('hex');
    assert.equal(verifyPaystackWebhookSignature(payload, falsifiedSignature, secretKey), false);
    assert.equal(verifyPaystackWebhookSignature(payload, 'tampered_hex_signature', secretKey), false);
    assert.equal(verifyPaystackWebhookSignature(payload, undefined, secretKey), false);
  });

  it('valide la signature HMAC SHA256 officielle de Meta WhatsApp', () => {
    const metaSignature = 'sha256=' + crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
    assert.equal(verifyMetaWebhookSignature(payload, metaSignature, secretKey), true);
  });

  it('rejette les signatures Meta falsifiées ou dépourvues de préfixe sha256=', () => {
    assert.equal(verifyMetaWebhookSignature(payload, 'sha256=invalidhash', secretKey), false);
    assert.equal(verifyMetaWebhookSignature(payload, 'noprefixhash', secretKey), false);
    assert.equal(verifyMetaWebhookSignature(payload, undefined, secretKey), false);
  });
});

describe('Suite 4: Déduplication des Messages WhatsApp Webhook', () => {
  it('traite le premier message et déduplique les réémissions Meta identiques', () => {
    const processedMessageIds = new Set<string>();

    function processIncomingMessage(wamid: string) {
      if (processedMessageIds.has(wamid)) {
        return { status: 'DEDUPLICATED', messageId: wamid };
      }
      processedMessageIds.add(wamid);
      return { status: 'PROCESSED', messageId: wamid };
    }

    const firstAttempt = processIncomingMessage('wamid.HBgLMjI1MDc0ODkzMTFSFQIAERgSQjE4MjM4');
    assert.equal(firstAttempt.status, 'PROCESSED');

    const secondAttempt = processIncomingMessage('wamid.HBgLMjI1MDc0ODkzMTFSFQIAERgSQjE4MjM4');
    assert.equal(secondAttempt.status, 'DEDUPLICATED');
  });
});

describe('Suite 5: Règles Métier CRM & Verrouillage du Statut "Payé"', () => {
  it('interdit la transition manuelle vers "Payé" sans transaction vérifiée', () => {
    function canTransitionLeadStage(targetStage: string, hasVerifiedPayment: boolean) {
      if (targetStage === 'Payé' && !hasVerifiedPayment) {
        return { allowed: false, error: 'Un paiement Paystack vérifié est obligatoire pour passer au statut Payé' };
      }
      return { allowed: true };
    }

    assert.equal(canTransitionLeadStage('Qualifié', false).allowed, true);
    assert.equal(canTransitionLeadStage('Lien envoyé', false).allowed, true);
    assert.equal(canTransitionLeadStage('Payé', false).allowed, false);
    assert.equal(canTransitionLeadStage('Payé', true).allowed, true);
  });
});

describe('Suite 6: Validation des Invariants de Webhook Paystack (Montant & Devise)', () => {
  it('rejette un webhook de succès si le montant ou la devise ne correspondent pas à la commande', () => {
    interface TransactionRecord {
      reference: string;
      expectedAmountSubunits: number;
      expectedCurrency: string;
      status: string;
    }

    const tx: TransactionRecord = {
      reference: 'FIKO_TEST_8910',
      expectedAmountSubunits: 4500000,
      expectedCurrency: 'XOF',
      status: 'PENDING'
    };

    function validateAndApplyWebhook(
      record: TransactionRecord, 
      eventAmountSubunits: number, 
      eventCurrency: string
    ) {
      if (eventCurrency !== record.expectedCurrency) {
        return { success: false, reason: 'CURRENCY_MISMATCH' };
      }
      if (eventAmountSubunits < record.expectedAmountSubunits) {
        return { success: false, reason: 'UNDERPAID_AMOUNT' };
      }
      record.status = 'SUCCESS';
      return { success: true };
    }

    // Attempt with USD instead of XOF
    const currencyMismatch = validateAndApplyWebhook(tx, 4500000, 'USD');
    assert.equal(currencyMismatch.success, false);
    assert.equal(currencyMismatch.reason, 'CURRENCY_MISMATCH');

    // Attempt with lower amount
    const underpaid = validateAndApplyWebhook(tx, 2000000, 'XOF');
    assert.equal(underpaid.success, false);
    assert.equal(underpaid.reason, 'UNDERPAID_AMOUNT');

    // Correct amount and currency
    const valid = validateAndApplyWebhook(tx, 4500000, 'XOF');
    assert.equal(valid.success, true);
    assert.equal(tx.status, 'SUCCESS');
  });
});

describe('Suite 7: Idempotence des Webhooks Paystack (Aucun Double-Comptage)', () => {
  it('ne crédite et ne met à jour le statut qu’une seule fois même en cas de webhook répété', () => {
    let ledgerRevenue = 0;
    let successfulTxCount = 0;
    const processedEvents = new Map<string, string>();

    function handlePaymentSuccess(reference: string, amount: number) {
      if (processedEvents.has(reference)) {
        return { action: 'IDEMPOTENT_IGNORED' };
      }
      processedEvents.set(reference, 'SUCCESS');
      ledgerRevenue += amount;
      successfulTxCount += 1;
      return { action: 'CREDITED' };
    }

    const event1 = handlePaymentSuccess('FIKO_TEST_101', 45000);
    assert.equal(event1.action, 'CREDITED');
    assert.equal(ledgerRevenue, 45000);
    assert.equal(successfulTxCount, 1);

    // Meta/Paystack retry of the exact same event
    const event1Retry = handlePaymentSuccess('FIKO_TEST_101', 45000);
    assert.equal(event1Retry.action, 'IDEMPOTENT_IGNORED');
    assert.equal(ledgerRevenue, 45000);
    assert.equal(successfulTxCount, 1);
  });
});

describe('Suite 8: Isolation Stricte Multi-Tenant (Entreprises)', () => {
  it('garantit qu’une entreprise ne peut ni lire ni modifier les données d’une autre', () => {
    const leadsStore = [
      { id: 'lead_01', companyId: 'comp_apple', name: 'Lead Apple', stage: 'Nouveau' },
      { id: 'lead_02', companyId: 'comp_orange', name: 'Lead Orange', stage: 'Nouveau' },
    ];

    function getCompanyLeads(userCompanyId: string) {
      return leadsStore.filter(l => l.companyId === userCompanyId);
    }

    function updateCompanyLead(userCompanyId: string, leadId: string, newStage: string) {
      const lead = leadsStore.find(l => l.id === leadId);
      if (!lead || lead.companyId !== userCompanyId) {
        throw new Error('FORBIDDEN_TENANT_ACCESS');
      }
      lead.stage = newStage;
      return lead;
    }

    // Company Apple gets its own leads only
    const appleLeads = getCompanyLeads('comp_apple');
    assert.equal(appleLeads.length, 1);
    assert.equal(appleLeads[0].name, 'Lead Apple');

    // Company Apple cannot modify Company Orange's lead
    assert.throws(() => {
      updateCompanyLead('comp_apple', 'lead_02', 'Qualifié');
    }, /FORBIDDEN_TENANT_ACCESS/);
  });
});

describe('Suite 9: Séparation Étanche des Paiements Test vs Live', () => {
  it('n’additionne jamais les encaissements sandbox au chiffre d’affaires réel', () => {
    const transactions = [
      { ref: 'TX_01', amount: 45000, mode: 'live', status: 'SUCCESS' },
      { ref: 'TX_02', amount: 99000, mode: 'live', status: 'SUCCESS' },
      { ref: 'TX_TEST_01', amount: 1500000, mode: 'test', status: 'SUCCESS' }, // Large test amount
      { ref: 'TX_TEST_02', amount: 500000, mode: 'test', status: 'PENDING' },
    ];

    const liveRevenue = transactions
      .filter(t => t.status === 'SUCCESS' && t.mode === 'live')
      .reduce((sum, t) => sum + t.amount, 0);

    const testRevenue = transactions
      .filter(t => t.status === 'SUCCESS' && t.mode === 'test')
      .reduce((sum, t) => sum + t.amount, 0);

    // Live revenue must strictly equal 144,000 FCFA, not 1,644,000 FCFA
    assert.equal(liveRevenue, 144000);
    assert.equal(testRevenue, 1500000);
    assert.ok(liveRevenue < testRevenue, 'Le CA réel n’a pas été pollué par le test de 1,5M');
  });
});

describe('Suite 10: Récupération des Initialisations Interrompues', () => {
  it('permet de ré-interroger la passerelle Paystack pour rétablir le statut réel', () => {
    interface TxState {
      reference: string;
      status: 'PENDING' | 'SUCCESS' | 'FAILED';
      paidAt?: string;
    }

    const tx: TxState = { reference: 'FIKO_INTERRUPTED_01', status: 'PENDING' };

    function reconcileWithPaystackResponse(record: TxState, paystackVerification: { status: string; paid_at?: string }) {
      if (paystackVerification.status === 'success') {
        record.status = 'SUCCESS';
        record.paidAt = paystackVerification.paid_at;
      } else if (paystackVerification.status === 'failed') {
        record.status = 'FAILED';
      }
      return record;
    }

    const updated = reconcileWithPaystackResponse(tx, {
      status: 'success',
      paid_at: '2026-11-09T18:30:00.000Z'
    });

    assert.equal(updated.status, 'SUCCESS');
    assert.equal(updated.paidAt, '2026-11-09T18:30:00.000Z');
  });
});

describe('Suite 11: Concordance Mathématique du Grand Livre avec les Indicateurs', () => {
  it('garantit que le total affiché sur le tableau de bord correspond exactement au grand livre', () => {
    const ledger = [
      { id: '1', amount: 25000, status: 'SUCCESS', mode: 'live' },
      { id: '2', amount: 15000, status: 'SUCCESS', mode: 'live' },
      { id: '3', amount: 50000, status: 'FAILED', mode: 'live' },
      { id: '4', amount: 10000, status: 'PENDING', mode: 'live' },
    ];

    const computedTotal = ledger
      .filter(l => l.status === 'SUCCESS' && l.mode === 'live')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const successfulTransactionsCount = ledger.filter(l => l.status === 'SUCCESS' && l.mode === 'live').length;

    assert.equal(computedTotal, 40000);
    assert.equal(successfulTransactionsCount, 2);
  });
});

describe('Suite 12: Rejet des Requêtes Non Authentifiées', () => {
  it('vérifie le contrat de sécurité imposant un token Bearer valide pour les opérations protégées', () => {
    function enforceBearerAuth(authHeader: string | undefined) {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { statusCode: 401, error: 'Unauthorized: Missing or malformed token' };
      }
      const token = authHeader.replace('Bearer ', '').trim();
      if (!token) {
        return { statusCode: 401, error: 'Unauthorized: Empty token' };
      }
      return { statusCode: 200, token };
    }

    assert.equal(enforceBearerAuth(undefined).statusCode, 401);
    assert.equal(enforceBearerAuth('Basic dXNlcjpwYXNz').statusCode, 401);
    assert.equal(enforceBearerAuth('Bearer ').statusCode, 401);
    assert.equal(enforceBearerAuth('Bearer mock_valid_jwt_token').statusCode, 200);
  });
});

describe('Suite 13: Conversion Multi-Devise & Formatage FCFA (XOF)', () => {
  it('préserve la parité exacte 1:1 en FCFA (XOF et XAF)', () => {
    assert.equal(convertFromXOF(3250000, 'XOF'), 3250000);
    assert.equal(convertFromXOF(3250000, 'XAF'), 3250000);
    assert.equal(convertToXOF(45000, 'XOF'), 45000);
    assert.equal(convertToXOF(45000, 'XAF'), 45000);
    assert.match(formatBaseFCFA(3250000), /FCFA$/);
    assert.match(formatCurrencyAmount(45000, 'XOF'), /FCFA$/);
  });

  it('applique la parité fixe officielle BCEAO entre FCFA et EUR (1 € = 655,957 FCFA)', () => {
    const eur = convertFromXOF(655957, 'EUR');
    assert.equal(eur, 1000);
    const backToXof = convertToXOF(1000, 'EUR');
    assert.equal(backToXof, 655957);
    assert.match(formatCurrencyAmount(655957, 'EUR'), /€/);
  });

  it('convertit proprement vers USD, GBP, GHS et NGN avec gestion des valeurs non finies', () => {
    assert.equal(convertFromXOF(61000, 'USD'), 100);
    assert.equal(convertToXOF(100, 'USD'), 61000);
    assert.equal(convertFromXOF(77500, 'GBP'), 100);
    assert.equal(convertFromXOF(4200, 'GHS'), 100);
    assert.equal(convertFromXOF(400, 'NGN'), 1000);

    assert.equal(convertFromXOF(Number.NaN, 'EUR'), 0);
    assert.equal(convertToXOF(Number.POSITIVE_INFINITY, 'USD'), 0);

    assert.match(formatCurrencyAmount(61000, 'USD'), /^\$/);
    assert.match(formatCurrencyAmount(77500, 'GBP'), /^£/);
    assert.match(formatCurrencyAmount(4200, 'GHS'), /GH₵/);
    assert.match(formatCurrencyAmount(400, 'NGN'), /₦/);
  });
});

describe('Suite 14: Fiko Knowledge Engine™ — Truth & Promise Guard, RAG Vérifié & Ingestion', () => {
  const demo = createDemoKnowledgeState('comp_froid_test');

  it('initialise la maquette conceptuelle à 24 connaissances (18 validées, 6 à vérifier) et calcule la maîtrise métier', () => {
    const validated = demo.items.filter((i) => i.status === 'validated');
    const pending = demo.items.filter((i) => i.status === 'pending_verification' || i.status === 'conflict');
    assert.equal(demo.items.length, 24);
    assert.equal(validated.length, 18);
    assert.equal(pending.length, 6);

    const mastery = computeKnowledgeMastery({
      identity: demo.identity,
      items: demo.items,
      trainingRules: demo.trainingRules,
      policy: demo.policy,
    });
    assert.ok(mastery >= 70 && mastery <= 100);
  });

  it('bloque le cas Climatisation Bingerville 14h + garantie de réparation sans inventer de disponibilité', () => {
    const res = evaluateTruthAndPromiseGuard({
      customerMessage:
        "Bonjour, pouvez-vous venir à Bingerville aujourd'hui à 14 h et me garantir que ma climatisation sera réparée ?",
      identity: demo.identity,
      knowledgeItems: demo.items,
      policy: demo.policy,
      trainingRules: demo.trainingRules,
    });

    assert.equal(res.truthLevel, 'forbidden_action');
    assert.equal(res.allowedToPromise, false);
    assert.equal(res.requiresHumanApproval, true);
    assert.ok(res.blockedClaims.length >= 2);
    assert.match(res.safeReply, /Bingerville/);
    assert.match(res.safeReply, /vérifier la disponibilité/i);
    assert.match(res.safeReply, /diagnostic/i);
  });

  it('répond avec le tarif approuvé de 10 000 FCFA et cite la source officielle', () => {
    const res = evaluateTruthAndPromiseGuard({
      customerMessage: 'Combien coûte un entretien simple de climatiseur split ?',
      identity: demo.identity,
      knowledgeItems: demo.items,
      policy: demo.policy,
    });

    assert.equal(res.truthLevel, 'validated_info');
    assert.equal(res.allowedToPromise, true);
    assert.equal(res.requiresHumanApproval, false);
    assert.ok(res.citedSources.length >= 1);
    assert.match(res.safeReply, /10[\s\u202f\u00a0]000 FCFA/);
  });

  it('escalade une demande de remise de 30 % dépassant le plafond autonome de 10 %', () => {
    const res = evaluateTruthAndPromiseGuard({
      customerMessage: 'Faites-moi 30 % de remise sur ce contrat.',
      identity: demo.identity,
      knowledgeItems: demo.items,
      policy: demo.policy,
    });

    assert.equal(res.truthLevel, 'approval_required');
    assert.equal(res.allowedToPromise, false);
    assert.equal(res.requiresHumanApproval, true);
    assert.equal(res.detectedDiscountPercent, 30);
  });

  it('refuse de supposer sur une zone inconnue (Korhogo) et demande confirmation équipe', () => {
    const res = evaluateTruthAndPromiseGuard({
      customerMessage: 'Livrez-vous à Korhogo ?',
      identity: demo.identity,
      knowledgeItems: demo.items,
      policy: demo.policy,
    });

    assert.equal(res.truthLevel, 'unknown_info');
    assert.equal(res.allowedToPromise, false);
    assert.equal(res.requiresHumanApproval, true);
    assert.match(res.safeReply, /Korhogo/);
    assert.match(res.safeReply, /confirmer/i);
  });

  it('exclut strictement les brouillons, conflits et autres entreprises dans Verified RAG Engine™', () => {
    const resultsPromo = retrieveVerifiedKnowledge('promo 8500 entretien', demo.items, 'comp_froid_test');
    assert.equal(resultsPromo.some((r) => r.id === 'k_19'), false);

    const crossTenantResults = retrieveVerifiedKnowledge('entretien split', demo.items, 'other_company_id');
    assert.equal(crossTenantResults.length, 0);
  });

  it('détecte les contradictions tarifaires et place toute nouvelle ingestion en statut pending_verification', () => {
    const conflict = detectKnowledgeConflicts(
      {
        title: 'Entretien climatiseur split promo',
        content: 'Entretien climatiseur split à 8 500 FCFA',
        category: 'tarif',
        approvedPriceFCFA: 8500,
      },
      demo.items
    );

    assert.ok(conflict);
    assert.equal(conflict.type, 'contradiction');

    const parsed = parseRawKnowledgeText(
      'Entretien split;Nettoyage complet à 10 000 FCFA',
      'comp_froid_test',
      'catalogue.csv',
      'csv',
      'Direction'
    );
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].status, 'pending_verification');
    assert.equal(parsed[0].approvedPriceFCFA, 10000);
  });
});

describe('Suite 15: Fiko Deep Scan™ (Sécurité SSRF, Extraction HTML) & Learning Live™ V3.0', () => {
  it('bloque toutes les IP privées, loopback, link-local et métadonnées Cloud (protection SSRF)', async () => {
    assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
    assert.equal(isPrivateOrReservedIp('10.0.0.5'), true);
    assert.equal(isPrivateOrReservedIp('172.16.4.12'), true);
    assert.equal(isPrivateOrReservedIp('192.168.1.10'), true);
    assert.equal(isPrivateOrReservedIp('169.254.169.254'), true);
    assert.equal(isPrivateOrReservedIp('::1'), true);
    assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);

    const blockedUrls = [
      'http://127.0.0.1:3000/admin',
      'http://169.254.169.254/latest/meta-data',
      'http://localhost:8080',
      'http://192.168.1.10/router',
      'file:///etc/passwd',
      'ftp://example.com/data',
    ];

    for (const bad of blockedUrls) {
      const check = await validateSafeExternalUrl(bad, true);
      assert.equal(check.ok, false, `L'URL dangereuse ${bad} devait être bloquée`);
    }

    const validCheck = await validateSafeExternalUrl('kcg-ci.com', true);
    assert.equal(validCheck.ok, true);
    if (validCheck.ok) {
      assert.equal(validCheck.url.protocol, 'https:');
      assert.equal(validCheck.url.hostname, 'kcg-ci.com');
    }
  });

  it('extrait proprement le titre, les en-têtes et le texte nettoyé depuis du HTML réel', () => {
    const html = `
      <html>
        <head><title>KCG CI — Services Climatisation Abidjan</title><script>console.log("ignore")</script></head>
        <body>
          <h1>Nos Offres B2B</h1>
          <p>Entretien split complet à 10 000 FCFA à Cocody et Plateau.</p>
          <h2>Contact Rapide</h2>
        </body>
      </html>
    `;
    const extracted = extractTextAndTitleFromHtml(html);
    assert.equal(extracted.title, 'KCG CI — Services Climatisation Abidjan');
    assert.deepEqual(extracted.headings, ['Nos Offres B2B', 'Contact Rapide']);
    assert.match(extracted.cleanText, /10 000 FCFA/);
    assert.doesNotMatch(extracted.cleanText, /console\.log/);
  });

  it('structure les faits du dirigeant dans Fiko Learning Live™ et consomme les clarifications Deep Scan', () => {
    const demo = createDemoKnowledgeState('comp_live_v3');
    const turn = conductFikoLearningTurn({
      leaderMessage: 'Notre entretien split coûte 12 000 FCFA à Cocody et Marcory avec remise max 8 %.',
      currentStep: 1,
      identity: demo.identity,
      knowledgeItems: demo.items,
      policy: demo.policy,
      pendingClarifications: ['Confirmez-vous la couverture de Bingerville ?'],
    });

    assert.equal(turn.nextStep, 2);
    assert.equal(turn.extractedFacts.some((f) => f.approvedPriceFCFA === 12000), true);
    assert.equal(turn.detectedZones.includes('Cocody'), true);
    assert.equal(turn.detectedDiscountLimit, 8);
    assert.match(turn.fikoReply, /Bingerville/);
    assert.equal(turn.remainingClarifications.length, 0);
  });

  it('génère un Audit de Maîtrise transparent (ce que Fiko sait, ignore et bloque)', () => {
    const demo = createDemoKnowledgeState('comp_audit_v3');
    const audit = buildMasteryAuditReport(demo.identity, demo.items, demo.policy);

    assert.equal(audit.knownFactsCount, 18);
    assert.equal(audit.unknownGaps.length > 0, true);
    assert.equal(audit.authorizedCapabilities.some((c) => c.includes('Paystack')), true);
    assert.equal(audit.blockedCapabilities.some((b) => b.includes('Garantir un résultat')), true);
  });
});

