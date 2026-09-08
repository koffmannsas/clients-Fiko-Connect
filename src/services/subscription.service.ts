export type PlanTier = 'starter' | 'growth' | 'pro' | 'elite';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';

export interface PlanConfig {
  id: PlanTier;
  name: string;
  priceFCFA: number;
  description: string;
  maxContacts: number;
  features: string[];
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter (Essai 7 jours)',
    priceFCFA: 0,
    description: 'Automatisez vos réponses et capturez vos premiers leads.',
    maxContacts: 10,
    features: [
      'Réponses automatiques AI',
      'Capture des leads',
      'Base conversationnelle',
      'Qualification IA',
      'Relances automatiques',
      'Tableau de bord'
    ]
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceFCFA: 35400,
    description: 'Structurez votre acquisition commerciale.',
    maxContacts: 100,
    features: [
      'Tout Starter +',
      'Qualification intelligente',
      'Scoring prospects',
      'Suivi amélioré',
      'Relances automatiques',
      'Tableau de bord complet'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro ⭐',
    priceFCFA: 118000,
    description: 'Transformez vos conversations en ventes (+30% à +70% de conversion).',
    maxContacts: 500,
    features: [
      'Tout Growth +',
      'Scénarios de conversion',
      'Relances automatiques avancées',
      'Recommandations IA',
      'Optimisation du closing',
      'Tableau de bord temps réel'
    ]
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    priceFCFA: 342200,
    description: 'Une machine de vente intégrale sur mesure.',
    maxContacts: 2500,
    features: [
      'Tout PRO +',
      'IA personnalisée',
      'Stratégie complète',
      'Analytics avancés',
      'Accompagnement prioritaire',
      'Multi-équipes'
    ]
  }
};

export interface SubscriptionRecord {
  companyId: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  createdAt: string;
  trialStartedAt: string;
  trialEndsAt: string;
}

export class SubscriptionService {
  static calculateTrialExpiration(createdAtDate: Date = new Date()): { trialStartedAt: string; trialEndsAt: string } {
    const trialStartedAt = createdAtDate.toISOString();
    const trialEndsAtDate = new Date(createdAtDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const trialEndsAt = trialEndsAtDate.toISOString();
    return { trialStartedAt, trialEndsAt };
  }

  static isTrialExpired(trialEndsAt: string): boolean {
    const expiration = new Date(trialEndsAt).getTime();
    return Date.now() > expiration;
  }

  static getSubscriptionDetails(record?: Partial<SubscriptionRecord>): SubscriptionRecord {
    const now = new Date();
    const { trialStartedAt, trialEndsAt } = this.calculateTrialExpiration(now);

    const plan = record?.plan || 'starter';
    const createdAt = record?.createdAt || now.toISOString();
    const start = record?.trialStartedAt || trialStartedAt;
    const end = record?.trialEndsAt || trialEndsAt;

    let status: SubscriptionStatus = record?.status || 'TRIAL';
    if (status === 'TRIAL' && this.isTrialExpired(end)) {
      status = 'EXPIRED';
    }

    return {
      companyId: record?.companyId || 'co_unknown',
      plan,
      status,
      createdAt,
      trialStartedAt: start,
      trialEndsAt: end
    };
  }

  static verifySubscriptionAccess(subscription: SubscriptionRecord): { allowed: boolean; reason?: string } {
    if (subscription.status === 'EXPIRED') {
      return { allowed: false, reason: 'Période d\'essai de 7 jours expirée. Veuillez choisir un abonnement pour continuer.' };
    }
    if (subscription.status === 'CANCELLED' || subscription.status === 'SUSPENDED') {
      return { allowed: false, reason: 'Abonnement suspendu ou annulé.' };
    }
    return { allowed: true };
  }
}
