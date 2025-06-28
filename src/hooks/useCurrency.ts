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
import { useAuth } from '../contexts/AuthContext';

export interface UseCurrencyOptions {
  currency?: CurrencyCode;
  showSymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export const useCurrency = () => {
  const { user } = useAuth();
  const currencySymbol = user?.currencySymbol || '₺';
  const currencyCode = (user?.currency as CurrencyCode) || 'TRY';

  const formatInput = useCallback((input: string): string => {
    if (input === null || input === undefined) return '';

    // First, remove all thousand separators (dots).
    let cleanInput = String(input).replace(/\./g, '');
    // Then, remove any character that is not a digit or a comma.
    cleanInput = cleanInput.replace(/[^0-9,]/g, '');

    // Ensure only one comma exists. If more, keep the first one.
    const parts = cleanInput.split(',');
    if (parts.length > 2) {
        cleanInput = parts[0] + ',' + parts.slice(1).join('');
    }

    // Now, re-apply formatting.
    const [integerPart, decimalPart] = cleanInput.split(',');

    // Add thousand separators to the integer part.
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // Reconstruct the string.
    if (decimalPart !== undefined) {
        // Limit decimal part to 2 digits.
        return `${formattedInteger},${decimalPart.slice(0, 2)}`;
    }

    return formattedInteger;
  }, []);

  const parseInput = useCallback((formattedValue: string): number => {
    if (!formattedValue) return 0;
    
    const withoutSeparators = String(formattedValue).replace(/\./g, '');
    const normalized = withoutSeparators.replace(',', '.');

    const value = parseFloat(normalized);
    
    return isNaN(value) ? 0 : value;
  }, []);

  const formatCurrency = useCallback((value: number, overrideCurrency?: CurrencyCode) => {
    if (isNaN(value)) {
      return '';
    }
  
    const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: overrideCurrency || currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    };
  
    const locale = currencyCode === 'TRY' ? 'tr-TR' : 'en-US';
  
    return new Intl.NumberFormat(locale, options).format(value);
  }, [currencyCode]);

  // Para formatı
  const formatCurrencyUtilCallback = useCallback((amount: number, overrideOptions?: Partial<UseCurrencyOptions>) => {
    return formatCurrencyUtil(amount, {
      currency: user?.currency || 'TRY',
      showSymbol: true,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...overrideOptions
    });
  }, [user?.currency]);

  // Yönlü para formatı (gelir/gider)
  const formatDirectional = useCallback(
    (amount: number, type: 'income' | 'expense' | 'auto' = 'auto') => {
      return formatDirectionalCurrency(amount, type, currencyCode);
    },
    [currencyCode]
  );

  // Büyük miktarlar için kısaltılmış format
  const formatLarge = useCallback(
    (amount: number) => {
      return formatLargeCurrency(amount, currencyCode);
    },
    [currencyCode]
  );

  // Renk
  const getAmountColor = useCallback((amount: number) => {
    return getCurrencyColor(amount);
  }, []);

  return {
    formatCurrency: formatCurrencyUtilCallback,
    formatDirectional,
    formatLarge,
    currencySymbol,
    currencyCode,
    getAmountColor,
    parseInput,
    formatInput
  };
}; 