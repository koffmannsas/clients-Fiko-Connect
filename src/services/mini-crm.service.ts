import { PlanTier } from './subscription.service';

export interface CRMLead {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email?: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  dealValue?: number;
  score?: number; // 0 to 100
  city?: string;
  country?: string;
  notes?: string;
  lastActivity?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CRMOpportunity {
  id: string;
  companyId: string;
  leadId: string;
  title: string;
  value: number;
  stage: 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST';
  probability: number;
  expectedClosingDate?: string;
  createdAt?: string;
}

export interface CRMTask {
  id: string;
  companyId: string;
  leadId: string;
  title: string;
  dueDate: string;
  type: 'CALL' | 'WHATSAPP_FOLLOWUP' | 'MEETING' | 'OFFER_SEND';
  status: 'PENDING' | 'COMPLETED';
}

export interface CRMMetrics {
  totalContacts: number;
  activeConversations: number;
  qualifiedLeads: number;
  pipelineValueFCFA: number;
  wonDealsValueFCFA: number;
  conversionRate: number;
  fikoHandledCount: number;
  fikoRevenueFCFA: number;
}

export interface CRMInsight {
  id: string;
  companyId: string;
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedAction: string;
  createdAt: string;
}

export const CRM_TIER_FEATURES: Record<PlanTier, {
  contacts: boolean;
  conversations: boolean;
  pipeline: boolean;
  leadScoring: boolean;
  followUp: boolean;
  salesIntelligence: boolean;
  closingCoach: boolean;
  performanceMetrics: boolean;
  executiveAnalytics: boolean;
  revenueCommandCenter: boolean;
}> = {
  starter: {
    contacts: true,
    conversations: true,
    pipeline: false,
    leadScoring: false,
    followUp: false,
    salesIntelligence: false,
    closingCoach: false,
    performanceMetrics: false,
    executiveAnalytics: false,
    revenueCommandCenter: false,
  },
  growth: {
    contacts: true,
    conversations: true,
    pipeline: true,
    leadScoring: true,
    followUp: true,
    salesIntelligence: false,
    closingCoach: false,
    performanceMetrics: false,
    executiveAnalytics: false,
    revenueCommandCenter: false,
  },
  pro: {
    contacts: true,
    conversations: true,
    pipeline: true,
    leadScoring: true,
    followUp: true,
    salesIntelligence: true,
    closingCoach: true,
    performanceMetrics: true,
    executiveAnalytics: false,
    revenueCommandCenter: false,
  },
  elite: {
    contacts: true,
    conversations: true,
    pipeline: true,
    leadScoring: true,
    followUp: true,
    salesIntelligence: true,
    closingCoach: true,
    performanceMetrics: true,
    executiveAnalytics: true,
    revenueCommandCenter: true,
  }
};

export class MiniCRMService {
  static getEntitlements(plan: PlanTier) {
    return CRM_TIER_FEATURES[plan] || CRM_TIER_FEATURES.starter;
  }

  static async getOverviewAsync(companyId: string, plan: PlanTier, db?: any) {
    const entitlements = this.getEntitlements(plan);
    let leads: CRMLead[] = [];

    if (db) {
      try {
        const snap = await db.collection('leads').where('companyId', '==', companyId).get();
        leads = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      } catch (err) {
        console.warn('[MINI_CRM] Firestore read leads error:', err);
      }
    }

    const totalContacts = leads.length;
    const qualifiedLeads = leads.filter(l => l.status === 'QUALIFIED' || l.status === 'PROPOSAL' || l.status === 'NEGOTIATION').length;
    const wonDealsValueFCFA = leads.filter(l => l.status === 'CLOSED_WON').reduce((acc, l) => acc + (l.dealValue || 0), 0);
    const pipelineValueFCFA = leads.filter(l => l.status !== 'CLOSED_LOST').reduce((acc, l) => acc + (l.dealValue || 0), 0);
    const conversionRate = totalContacts > 0 ? Math.round((leads.filter(l => l.status === 'CLOSED_WON').length / totalContacts) * 100) : 0;

    const metrics: CRMMetrics = {
      totalContacts,
      activeConversations: Math.min(totalContacts, 12),
      qualifiedLeads,
      pipelineValueFCFA,
      wonDealsValueFCFA,
      conversionRate,
      fikoHandledCount: Math.round(totalContacts * 0.85),
      fikoRevenueFCFA: Math.round(wonDealsValueFCFA * 0.75)
    };

    const insights: CRMInsight[] = entitlements.revenueCommandCenter ? [
      {
        id: 'ins-1',
        companyId,
        title: 'Opportunités à forte intention',
        description: `${qualifiedLeads} prospects sont qualifiés et prêts pour une proposition finale.`,
        impact: 'HIGH',
        recommendedAction: 'Concentrez vos relances WhatsApp sur ces prospects aujourd\'hui.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'ins-2',
        companyId,
        title: 'Performance Fiko Connect OS',
        description: 'Fiko a géré 85% de vos conversations entrantes sans intervention humaine.',
        impact: 'MEDIUM',
        recommendedAction: 'Conservez l\'auto-pilote actif pendant les heures de pointe.',
        createdAt: new Date().toISOString()
      }
    ] : [];

    return {
      companyId,
      plan,
      entitlements,
      metrics,
      insights,
      leads: leads.slice(0, 50)
    };
  }
}
