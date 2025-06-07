/**
 * useCurrency Hook - Para formatı işlemleri için custom hook
 */

import { useCallback } from 'react';
import { 
  formatCurrency as formatCurrencyUtil,
  formatDirectionalCurrency,
  formatLargeCurrency,
  getCurrencySymbol,
  getCurrencyColor,
  parseBalanceInput,
  formatBalanceInput,
  CurrencyCode
} from '../utils/currency';

export interface UseCurrencyOptions {
  currency?: CurrencyCode;
  showSymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export const useCurrency = (options: UseCurrencyOptions = {}) => {
  const {
    currency = 'TRY',
    showSymbol = true,
    minimumFractionDigits = 0,
    maximumFractionDigits = 2
  } = options;

  // Para formatı
  const formatCurrency = useCallback((amount: number, overrideOptions?: Partial<UseCurrencyOptions>) => {
    return formatCurrencyUtil(amount, {
      currency,
      showSymbol,
      minimumFractionDigits,
      maximumFractionDigits,
      ...overrideOptions
    });
  }, [currency, showSymbol, minimumFractionDigits, maximumFractionDigits]);

  // Yönlü para formatı (gelir/gider)
  const formatDirectional = useCallback((
    amount: number, 
    type: 'income' | 'expense' | 'auto' = 'auto'
  ) => {
    return formatDirectionalCurrency(amount, type, currency);
  }, [currency]);

  // Büyük miktarlar için kısaltılmış format
  const formatLarge = useCallback((amount: number) => {
    return formatLargeCurrency(amount, currency);
  }, [currency]);

  // Para birimi simgesi
  const currencySymbol = getCurrencySymbol(currency);

  // Renk
  const getAmountColor = useCallback((amount: number) => {
    return getCurrencyColor(amount);
  }, []);

  // Input parsing
  const parseInput = useCallback((input: string) => {
    return parseBalanceInput(input);
  }, []);

  // Input formatting
  const formatInput = useCallback((value: string) => {
    return formatBalanceInput(value);
  }, []);

  return {
    formatCurrency,
    formatDirectional,
    formatLarge,
    currencySymbol,
    getAmountColor,
    parseInput,
    formatInput
  };
}; 