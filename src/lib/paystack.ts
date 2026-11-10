/**
 * Fiko OS - Paystack Gateway Utilities & Currency Engine
 * 
 * Rules for Paystack XOF (West African CFA Franc):
 * 1. Even though XOF has no fractional coins in physical circulation,
 *    Paystack API requires amount to be multiplied by 100 (in subunits / minor unit).
 *    Example: 25,000 FCFA => 2,500,000 subunits sent to Paystack API.
 * 2. Amounts must be strictly integer (no floating point centimes).
 */

export interface PaystackTransaction {
  reference: string;
  paystackId?: number;
  companyId: string;
  leadId?: string | number;
  customerName?: string;
  customerPhone?: string;
  customerEmail: string;
  amountCommercial: number; // In FCFA (e.g. 25000)
  amountPaystackSubunits: number; // In Paystack subunits (e.g. 2500000)
  currency: 'XOF';
  mode: 'test' | 'live';
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'TO_VERIFY';
  authorizationUrl?: string;
  accessCode?: string;
  paymentMethod?: string;
  gatewayResponse?: string;
  createdAt: string;
  paidAt?: string;
  verifiedAt?: string;
}

/**
 * Converts a commercial amount in FCFA (XOF) to Paystack integer subunits (x100).
 * Throws an error if amount is invalid or <= 0.
 */
export function toPaystackSubunits(amountXOF: number): number {
  if (typeof amountXOF !== 'number' || isNaN(amountXOF) || !isFinite(amountXOF)) {
    throw new Error('Montant invalide.');
  }
  if (amountXOF <= 0) {
    throw new Error('Le montant doit être supérieur à zéro.');
  }
  // XOF expects integer values multiplied by 100
  return Math.round(amountXOF * 100);
}

/**
 * Converts Paystack subunits back to commercial amount in FCFA (XOF) (/100).
 */
export function fromPaystackSubunits(subunits: number): number {
  if (typeof subunits !== 'number' || isNaN(subunits) || !isFinite(subunits)) {
    throw new Error('Subunits invalides.');
  }
  return Math.round(subunits / 100);
}

/**
 * Validates customer email required by Paystack
 */
export function isValidPaystackEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Determines whether a Paystack secret key is Test mode or Live mode.
 */
export function getPaystackMode(secretKey?: string): 'test' | 'live' {
  if (!secretKey) return 'test';
  return secretKey.startsWith('sk_live_') ? 'live' : 'test';
}

/**
 * Generates an idempotent, unique transaction reference for Fiko payments.
 */
export function generateFikoPaymentReference(companyId?: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const prefix = companyId ? `FIKO_${companyId.substring(0, 6).toUpperCase()}` : 'FIKO';
  return `${prefix}_${timestamp}_${randomSuffix}`;
}
