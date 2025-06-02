/**
 * Formatters - Para, Tarih ve Sayı Formatlama Yardımcıları
 * 
 * Bu dosya uygulamada kullanılan tüm formatlama işlemlerini içerir.
 * Clean code prensiplerine uygun olarak her fonksiyon tek bir sorumluluğa sahiptir.
 */

/**
 * Para miktarını Türk Lirası formatında gösterir
 * @param amount - Formatlanacak miktar (sayı)
 * @param showCurrency - Para birimi sembolü gösterilsin mi? (varsayılan: true)
 * @returns Formatlanmış para metni (örn: "₺1.234,56")
 */
export const formatCurrency = (amount: number, showCurrency: boolean = true): string => {
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  
  const symbol = showCurrency ? '₺' : '';
  const sign = amount < 0 ? '-' : '';
  
  return `${sign}${symbol}${formatted}`;
};

/**
 * Para miktarını renkli gösterim için CSS class'ı döndürür
 * @param amount - Kontrol edilecek miktar
 * @returns Pozitif için 'positive', negatif için 'negative', sıfır için 'neutral'
 */
export const getCurrencyColorClass = (amount: number): 'positive' | 'negative' | 'neutral' => {
  if (amount > 0) return 'positive';
  if (amount < 0) return 'negative';
  return 'neutral';
};

/**
 * Tarihi Türkçe formatında gösterir
 * @param date - Formatlanacak tarih
 * @param format - Format tipi ('short' | 'long' | 'relative')
 * @returns Formatlanmış tarih metni
 */
export const formatDate = (date: Date | string, format: 'short' | 'long' | 'relative' = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
    case 'long':
      return dateObj.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      
    case 'relative':
      return formatRelativeDate(dateObj);
      
    default:
      return formatDate(date, 'short');
  }
};

/**
 * Relatif tarih formatı (örn: "2 gün önce", "bugün")
 * @param date - Karşılaştırılacak tarih
 * @returns Relatif tarih metni
 */
export const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffInMilliseconds = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Bugün';
  if (diffInDays === 1) return 'Dün';
  if (diffInDays < 7) return `${diffInDays} gün önce`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} hafta önce`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} ay önce`;
  
  return `${Math.floor(diffInDays / 365)} yıl önce`;
};

/**
 * Bakiye giriş metnini temizler ve sayıya çevirir
 * @param input - Kullanıcı girişi
 * @returns Temizlenmiş sayı değeri
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
 * Telefon numarasını Türkiye formatında düzenler
 * @param phone - Ham telefon numarası
 * @returns Formatlanmış telefon numarası (örn: "+90 555 123 45 67")
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `+90 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    const withoutZero = cleaned.slice(1);
    return formatPhoneNumber(withoutZero);
  }
  
  return phone; // Geçersiz format ise olduğu gibi döndür
};

/**
 * Büyük sayıları kısaltılmış formatta gösterir
 * @param num - Kısaltılacak sayı
 * @returns Kısaltılmış format (örn: "1.2K", "3.4M")
 */
export const formatLargeNumber = (num: number): string => {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (absNum >= 1000000) {
    return `${sign}${(absNum / 1000000).toFixed(1)}M`;
  }
  
  if (absNum >= 1000) {
    return `${sign}${(absNum / 1000).toFixed(1)}K`;
  }
  
  return `${sign}${absNum}`;
};

/**
 * Yüzde değerini formatlar
 * @param value - Yüzde değeri (0-100 arası)
 * @param decimals - Ondalık basamak sayısı (varsayılan: 1)
 * @returns Formatlanmış yüzde metni (örn: "%12.5")
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `%${value.toFixed(decimals)}`;
}; 