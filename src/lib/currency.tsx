import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  CurrencyCode,
  CurrencyInfo,
  CURRENCIES,
  CURRENCY_LIST,
  convertFromXOF,
  convertToXOF,
  formatCurrencyAmount,
  formatBaseFCFA,
} from './currencyUtils';

interface CurrencyContextValue {
  currency: CurrencyCode;
  currencyInfo: CurrencyInfo;
  setCurrency: (code: CurrencyCode) => void;
  formatMoney: (amountInXOF: number, options?: { compact?: boolean; suffix?: string }) => string;
  formatFcfa: (amountInXOF: number, suffix?: string) => string;
  convertFromBase: (amountInXOF: number) => number;
  isBaseFcfa: boolean;
  currencies: CurrencyInfo[];
}

const STORAGE_KEY = 'fiko_display_currency';

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
      if (saved && CURRENCIES[saved]) {
        return saved;
      }
    } catch {
      // Ignore storage access restrictions
    }
    return 'XOF';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // Ignore storage access restrictions
    }
  }, [currency]);

  const setCurrency = (code: CurrencyCode) => {
    if (CURRENCIES[code]) {
      setCurrencyState(code);
    }
  };

  const currencyInfo = CURRENCIES[currency] || CURRENCIES.XOF;
  const isBaseFcfa = currency === 'XOF' || currency === 'XAF';

  const value: CurrencyContextValue = {
    currency,
    currencyInfo,
    setCurrency,
    formatMoney: (amountInXOF, options) => formatCurrencyAmount(amountInXOF, currency, options),
    formatFcfa: (amountInXOF, suffix) => formatBaseFCFA(amountInXOF, suffix),
    convertFromBase: (amountInXOF) => convertFromXOF(amountInXOF, currency),
    isBaseFcfa,
    currencies: CURRENCY_LIST,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Graceful fallback if rendered outside provider in isolation
    return {
      currency: 'XOF',
      currencyInfo: CURRENCIES.XOF,
      setCurrency: () => {},
      formatMoney: (amountInXOF, options) => formatCurrencyAmount(amountInXOF, 'XOF', options),
      formatFcfa: (amountInXOF, suffix) => formatBaseFCFA(amountInXOF, suffix),
      convertFromBase: (amountInXOF) => amountInXOF,
      isBaseFcfa: true,
      currencies: CURRENCY_LIST,
    };
  }
  return ctx;
}

export { CURRENCIES, CURRENCY_LIST, convertFromXOF, convertToXOF, formatCurrencyAmount, formatBaseFCFA };
export type { CurrencyCode, CurrencyInfo };
