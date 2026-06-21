export interface Plan {
  id: string;
  name: string;
  price: number;
  limits: {
    messages: number;
    aiMessages: number;
    agents: number;
    contacts: number;
    automations: number;
  };
  features: string[];
}

export const PLANS: Record<string, Plan> = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    limits: {
      messages: 50,
      aiMessages: 10,
      agents: 1,
      contacts: 5,
      automations: 0
    },
    features: ['WhatsApp Basic', 'Standard AI']
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 19900,
    limits: {
      messages: 1000,
      aiMessages: 500,
      agents: 2,
      contacts: 100,
      automations: 3
    },
    features: ['WhatsApp Pro', 'Premium AI', 'CRM Basic']
  },
  BUSINESS: {
    id: 'business',
    name: 'Business',
    price: 49900,
    limits: {
      messages: 5000,
      aiMessages: 2500,
      agents: 5,
      contacts: 1000,
      automations: 10
    },
    features: ['Advanced AI', 'Multi-agent', 'Full Analytics']
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199000,
    limits: {
      messages: -1, // Unlimited
      aiMessages: -1,
      agents: 20,
      contacts: -1,
      automations: -1
    },
    features: ['Dedicated Support', 'Custom AI Training', 'SLA 99.9%']
  }
};
