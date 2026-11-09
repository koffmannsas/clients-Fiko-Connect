import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export interface CompanyKnowledgeData {
  companyId: string;
  offers?: string;
  faq?: string;
  pricing?: string;
  objections?: string;
  targetAudience?: string;
  salesScript?: string;
  updatedAt?: string;
}

export class KnowledgeBaseService {
  private static storage: Map<string, CompanyKnowledgeData> = new Map();

  static async getCompanyKnowledgeAsync(companyId: string, adminDb?: any): Promise<CompanyKnowledgeData> {
    if (adminDb) {
      try {
        const docSnap = await adminDb.collection('knowledge').doc(companyId).get();
        if (docSnap.exists) {
          const data = docSnap.data();
          this.storage.set(companyId, data);
          return data;
        }
      } catch (err) {
        console.warn('[KNOWLEDGE] Firestore read error, falling back to memory:', err);
      }
    }
    return this.getCompanyKnowledge(companyId);
  }

  static getCompanyKnowledge(companyId: string): CompanyKnowledgeData {
    if (!this.storage.has(companyId)) {
      this.storage.set(companyId, {
        companyId,
        offers: 'Offres générales et catalogue de produits Fiko Connect OS.',
        faq: 'Acceptons Mobile Money (Wave, Orange Money, MTN) et Cartes bancaires.',
        pricing: 'Abonnements mensuels à partir de 35 400 FCFA.',
        objections: 'Traitement courtois et orientation vers les avantages concurrentiels.',
        targetAudience: 'TPE/PME et entrepreneurs en Afrique.',
        salesScript: 'Accueil -> Qualification des besoins -> Présentation de l\'offre -> Closing.',
        updatedAt: new Date().toISOString()
      });
    }
    return this.storage.get(companyId)!;
  }

  static async updateCompanyKnowledgeAsync(companyId: string, data: Partial<CompanyKnowledgeData>, adminDb?: any): Promise<CompanyKnowledgeData> {
    const existing = await this.getCompanyKnowledgeAsync(companyId, adminDb);
    const updated: CompanyKnowledgeData = {
      ...existing,
      ...data,
      companyId,
      updatedAt: new Date().toISOString()
    };
    this.storage.set(companyId, updated);

    if (adminDb) {
      try {
        await adminDb.collection('knowledge').doc(companyId).set(updated, { merge: true });
        console.log('[KNOWLEDGE] Saved knowledge to Firestore for company:', companyId);
      } catch (err) {
        console.error('[KNOWLEDGE] Firestore write error:', err);
      }
    }

    return updated;
  }

  static updateCompanyKnowledge(companyId: string, data: Partial<CompanyKnowledgeData>): CompanyKnowledgeData {
    const existing = this.getCompanyKnowledge(companyId);
    const updated: CompanyKnowledgeData = {
      ...existing,
      ...data,
      companyId,
      updatedAt: new Date().toISOString()
    };
    this.storage.set(companyId, updated);
    return updated;
  }

  static async buildPromptContextAsync(companyId: string, adminDb?: any): Promise<string> {
    const k = await this.getCompanyKnowledgeAsync(companyId, adminDb);
    return `
ROLE & IDENTITY:
Vous êtes Fiko Connect, le Directeur Commercial Senior virtuel de l'entreprise.
Votre rôle est de converser naturellement sur WhatsApp avec empathie, sérénité, intelligence commerciale et stratégie.
Vous parlez comme un véritable professionnel humain sur WhatsApp : messages concis, chaleureux, structurés, sans ton robotisé ni listes interminables d'arguments.

COMMERCIAL GUIDELINES:
- Identité produit : Vous vous présentez sous le nom "Fiko Connect" si le prospect vous interroge. Ne changez jamais de nom.
- Style WhatsApp : Écrivez des réponses courtes, directes et naturelles. Évitez les présentations encyclopédiques, le Markdown lourd ou les brochures de vente.
- Vente Consultative : Écoutez, qualifiez, reformulez le problème spécifique du prospect et posez UNE question pertinente à la fois.
- Prochaine Étape (CTA) : Proposez des étapes logiques (démonstration de 15 min, essai ciblé) adaptées à l'état de maturité du prospect sans mettre de fausse pression.

BUSINESS CONTEXT FOR COMPANY (${companyId}):
- OFFERS: ${k.offers || 'N/A'}
- FAQ: ${k.faq || 'N/A'}
- PRICING: ${k.pricing || 'N/A'}
- OBJECTIONS & CLOSING: ${k.objections || 'N/A'}
- TARGET AUDIENCE: ${k.targetAudience || 'N/A'}
- SALES SCRIPT: ${k.salesScript || 'N/A'}
`;
  }

  static buildPromptContext(companyId: string): string {
    const k = this.getCompanyKnowledge(companyId);
    return `
BUSINESS CONTEXT FOR COMPANY (${companyId}):
- OFFERS: ${k.offers || 'N/A'}
- FAQ: ${k.faq || 'N/A'}
- PRICING: ${k.pricing || 'N/A'}
- OBJECTIONS & CLOSING: ${k.objections || 'N/A'}
- TARGET AUDIENCE: ${k.targetAudience || 'N/A'}
- SALES SCRIPT: ${k.salesScript || 'N/A'}
`;
  }
}
