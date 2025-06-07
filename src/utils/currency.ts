/**
 * Currency Utilities - Para birimi ve formatla işlemleri
 * Tüm para formatı işlemlerini merkezi olarak yönetir
 */

import { CURRENCIES } from '../constants';

export type CurrencyCode = 'TRY' | 'USD' | 'EUR' | 'GBP';

/**
 * Para miktarını formatlar
 * @param amount - Formatlanacak miktar
 * @param options - Formatlama seçenekleri
 * @returns Formatlanmış para metni
 */
export const formatCurrency = (
  amount: number, 
  options: {
    showSymbol?: boolean;
    currency?: CurrencyCode;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSign?: boolean;
  } = {}
): string => {
  const {
    showSymbol = true,
    currency = 'TRY',
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    showSign = false
  } = options;

  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  const symbol = showSymbol && currencyInfo ? currencyInfo.symbol : '';
  
  const formatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  const absAmount = Math.abs(amount);
  const formattedAmount = formatter.format(absAmount);
  
  let result = '';
  
  // Sign handling
  if (showSign || amount < 0) {
    const sign = amount < 0 ? '-' : (showSign ? '+' : '');
    result = `${sign}${symbol}${formattedAmount}`;
  } else {
    result = `${symbol}${formattedAmount}`;
  }

  return result;
};

/**
 * Para miktarını renkli gösterim için sınıf adı döndürür
 */
export const getCurrencyColorClass = (amount: number): 'positive' | 'negative' | 'neutral' => {
  if (amount > 0) return 'positive';
  if (amount < 0) return 'negative';
  return 'neutral';
};

/**
 * Para miktarını renkli gösterim için hex renk döndürür
 */
export const getCurrencyColor = (amount: number): string => {
  if (amount > 0) return '#00E676'; // Success green
  if (amount < 0) return '#FF1744'; // Error red
  return '#9E9E9E'; // Neutral gray
};

/**
 * Kullanıcı girişinden para miktarını parse eder
 */
export const parseBalanceInput = (input: string): number => {
  // Sadece sayılar, virgül ve nokta karakterlerini tut
  const cleanInput = input.replace(/[^0-9,\.]/g, '');
  
  // Virgülü noktaya çevir (Türkçe ondalık ayracı)
  const normalizedInput = cleanInput.replace(',', '.');
  
  const parsed = parseFloat(normalizedInput);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Balance input için formatlama (kullanıcı yazarken)
 */
export const formatBalanceInput = (value: string): string => {
  const parsed = parseBalanceInput(value);
  if (parsed === 0 && value !== '0') return value;
  
  return parsed.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

/**
 * Para biriminin simgesini döndürür
 */
export const getCurrencySymbol = (currency: CurrencyCode = 'TRY'): string => {
  const currencyInfo = CURRENCIES.find(c => c.code === currency);
  return currencyInfo?.symbol || '₺';
};

/**
 * Para miktarını yönlü gösterim için formatlar (gelir/gider)
 */
export const formatDirectionalCurrency = (
  amount: number, 
  type: 'income' | 'expense' | 'auto' = 'auto',
  currency: CurrencyCode = 'TRY'
): string => {
  let sign = '';
  
  if (type === 'income') {
    sign = '+';
  } else if (type === 'expense') {
    sign = '-';
  } else if (type === 'auto') {
    sign = amount >= 0 ? '+' : '';
  }
  
  return `${sign}${formatCurrency(Math.abs(amount), { currency })}`;
};

/**
 * Büyük para miktarlarını kısaltılmış formatta gösterir
 */
export const formatLargeCurrency = (amount: number, currency: CurrencyCode = 'TRY'): string => {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const symbol = getCurrencySymbol(currency);
  
  if (absAmount >= 1000000) {
    return `${sign}${symbol}${(absAmount / 1000000).toFixed(1)}M`;
  }
  
  if (absAmount >= 1000) {
    return `${sign}${symbol}${(absAmount / 1000).toFixed(1)}K`;
  }
  
  return formatCurrency(amount, { currency });
}; 