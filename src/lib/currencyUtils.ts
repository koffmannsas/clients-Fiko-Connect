export type CurrencyCode = 'XOF' | 'XAF' | 'EUR' | 'USD' | 'GBP' | 'GHS' | 'NGN';

export interface CurrencyInfo {
  code: CurrencyCode;
  label: string;
  shortLabel: string;
  symbol: string;
  flag: string;
  /** Number of XOF (FCFA) per 1 unit of this currency */
  xofPerUnit: number;
  decimals: number;
  regionNote: string;
  isFixedParity?: boolean;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  XOF: {
    code: 'XOF',
    label: 'Franc CFA (UEMOA)',
    shortLabel: 'FCFA (XOF)',
    symbol: 'FCFA',
    flag: '🇨🇮',
    xofPerUnit: 1,
    decimals: 0,
    regionNote: 'Côte d’Ivoire, Sénégal, Bénin, Togo, Mali, Burkina Faso',
    isFixedParity: true,
  },
  XAF: {
    code: 'XAF',
    label: 'Franc CFA (CEMAC)',
    shortLabel: 'FCFA (XAF)',
    symbol: 'FCFA',
    flag: '🇨🇲',
    xofPerUnit: 1,
    decimals: 0,
    regionNote: 'Cameroun, Gabon, Congo, Tchad, RCA',
    isFixedParity: true,
  },
  EUR: {
    code: 'EUR',
    label: 'Euro',
    shortLabel: 'EUR (€)',
    symbol: '€',
    flag: '🇪🇺',
    xofPerUnit: 655.957,
    decimals: 2,
    regionNote: 'Parité fixe BCEAO : 1 € = 655,957 FCFA',
    isFixedParity: true,
  },
  USD: {
    code: 'USD',
    label: 'Dollar Américain',
    shortLabel: 'USD ($)',
    symbol: '$',
    flag: '🇺🇸',
    xofPerUnit: 610,
    decimals: 2,
    regionNote: 'Taux indicatif : 1 $ ≈ 610 FCFA',
  },
  GBP: {
    code: 'GBP',
    label: 'Livre Sterling',
    shortLabel: 'GBP (£)',
    symbol: '£',
    flag: '🇬🇧',
    xofPerUnit: 775,
    decimals: 2,
    regionNote: 'Taux indicatif : 1 £ ≈ 775 FCFA',
  },
  GHS: {
    code: 'GHS',
    label: 'Cedi Ghanéen',
    shortLabel: 'GHS (GH₵)',
    symbol: 'GH₵',
    flag: '🇬🇭',
    xofPerUnit: 42,
    decimals: 2,
    regionNote: 'Taux indicatif : 1 GH₵ ≈ 42 FCFA',
  },
  NGN: {
    code: 'NGN',
    label: 'Naira Nigérian',
    shortLabel: 'NGN (₦)',
    symbol: '₦',
    flag: '🇳🇬',
    xofPerUnit: 0.4,
    decimals: 0,
    regionNote: 'Taux indicatif : 1 ₦ ≈ 0,40 FCFA',
  },
};

export const CURRENCY_LIST: CurrencyInfo[] = Object.values(CURRENCIES);

/**
 * Converts a base amount in FCFA (XOF) to the target currency.
 */
export function convertFromXOF(amountXOF: number, targetCurrency: CurrencyCode): number {
  if (!Number.isFinite(amountXOF)) return 0;
  const info = CURRENCIES[targetCurrency] || CURRENCIES.XOF;
  if (info.xofPerUnit === 1) return amountXOF;
  return amountXOF / info.xofPerUnit;
}

/**
 * Converts an amount from a source currency back to base FCFA (XOF).
 */
export function convertToXOF(amount: number, sourceCurrency: CurrencyCode): number {
  if (!Number.isFinite(amount)) return 0;
  const info = CURRENCIES[sourceCurrency] || CURRENCIES.XOF;
  return amount * info.xofPerUnit;
}

/**
 * Formats an amount stored in base FCFA (XOF) into the requested display currency.
 */
export function formatCurrencyAmount(
  amountXOF: number,
  targetCurrency: CurrencyCode = 'XOF',
  options?: { compact?: boolean; suffix?: string }
): string {
  const info = CURRENCIES[targetCurrency] || CURRENCIES.XOF;
  const converted = convertFromXOF(amountXOF, targetCurrency);

  let formattedNumber: string;
  if (options?.compact && Math.abs(converted) >= 1_000_000) {
    const millions = converted / 1_000_000;
    formattedNumber = `${millions.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}M`;
  } else {
    const maxDecimals = info.decimals === 0 ? 0 : Math.abs(converted) >= 1000 ? 0 : info.decimals;
    const rounded = maxDecimals === 0 ? Math.round(converted) : converted;
    formattedNumber = rounded.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    });
  }

  const baseDisplay =
    info.code === 'USD'
      ? `$${formattedNumber}`
      : info.code === 'GBP'
      ? `£${formattedNumber}`
      : `${formattedNumber} ${info.symbol}`;

  return options?.suffix ? `${baseDisplay}${options.suffix}` : baseDisplay;
}

/**
 * Formats a base FCFA amount explicitly in FCFA regardless of selected display currency.
 */
export function formatBaseFCFA(amountXOF: number, suffix?: string): string {
  const safe = Number.isFinite(amountXOF) ? Math.round(amountXOF) : 0;
  const formatted = `${safe.toLocaleString('fr-FR')} FCFA`;
  return suffix ? `${formatted}${suffix}` : formatted;
}
