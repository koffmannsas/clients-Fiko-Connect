export interface PaystackWidgetData {
  reference: string;
  amountCommercial: number;
  currency: 'XOF';
  authorizationUrl?: string;
  isPaid?: boolean;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TO_VERIFY';
  mode?: 'test' | 'live';
  customerEmail?: string;
  paidAt?: string;
}

export interface ChatMessage {
  id: string | number;
  sender: 'client' | 'ai' | 'admin';
  text: string;
  timestamp: string;
  deliveryStatus?: 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  paystackPayment?: PaystackWidgetData;
}

export interface Thread {
  id: string | number;
  name: string;
  avatar: string;
  lastMsg: string;
  time: string;
  unread: boolean;
  score: number;
  mobile: string;
  category: string;
  customerEmail?: string;
  lastClientMessageTimestamp?: number | string;
  paidTransactionReference?: string;
  messages: ChatMessage[];
}

export interface Lead {
  id: string | number;
  name: string;
  phone: string;
  email?: string;
  score: number;
  status: 'Nouveau' | 'Qualifié' | 'Proposition' | 'Négociation' | 'Payé';
  lastActivity: string;
  dealValue: number;
  provider: 'Paystack';
  notes: string;
  lastMessage: string;
  companyId?: string;
  lastClientMessageTimestamp?: number | string;
  paidTransactionReference?: string;
  paidAmount?: number;
  paidAt?: string;
  isTestPayment?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentTransactionRecord {
  id?: string;
  reference: string;
  paystackId?: number;
  paystackReference?: string;
  companyId: string;
  leadId?: string | number;
  customerName?: string;
  customerPhone?: string;
  customerEmail: string;
  amountCommercial?: number;
  amountPaystackSubunits?: number;
  amount: number;
  currency: 'XOF' | string;
  mode: 'test' | 'live';
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TO_VERIFY';
  authorizationUrl?: string;
  checkoutUrl?: string;
  accessCode?: string;
  paymentMethod?: string;
  channel?: string;
  gatewayResponse?: string;
  createdAt: string;
  paidAt?: string;
  verifiedAt?: string;
}
