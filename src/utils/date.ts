/**
 * Date Utilities - Tarih formatları ve işlemleri
 * Tüm tarih formatı işlemlerini merkezi olarak yönetir
 */

export type DateFormat = 'short' | 'long' | 'relative' | 'month-year' | 'time' | 'full';

/**
 * Tarihi belirtilen formatta formatlar
 */
export const formatDate = (
  date: Date | string | number, 
  format: DateFormat = 'short'
): string => {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return 'Geçersiz tarih';
  }
  
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
      
    case 'month-year':
      return dateObj.toLocaleDateString('tr-TR', {
        month: 'long',
        year: 'numeric'
      });
      
    case 'time':
      return dateObj.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
    case 'full':
      return dateObj.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
    case 'relative':
      return formatRelativeDate(dateObj);
      
    default:
      return formatDate(date, 'short');
  }
};

/**
 * Göreli tarih formatı (bugün, dün, X gün önce)
 */
export const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateToCompare = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const diffTime = today.getTime() - dateToCompare.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Bugün';
  } else if (diffDays === 1) {
    return 'Dün';
  } else if (diffDays === -1) {
    return 'Yarın';
  } else if (diffDays > 0 && diffDays <= 7) {
    return `${diffDays} gün önce`;
  } else if (diffDays < 0 && diffDays >= -7) {
    return `${Math.abs(diffDays)} gün sonra`;
  } else {
    return formatDate(date, 'short');
  }
};

/**
 * İki tarih arasındaki gün farkını hesaplar
 */
export const getDaysDifference = (date1: Date, date2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const secondDate = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  
  return Math.round((firstDate.getTime() - secondDate.getTime()) / oneDay);
};

/**
 * Tarihin bugün olup olmadığını kontrol eder
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Tarihin dün olup olmadığını kontrol eder
 */
export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
};

/**
 * Tarihin bu ay olup olmadığını kontrol eder
 */
export const isThisMonth = (date: Date): boolean => {
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

/**
 * Tarihin bu yıl olup olmadığını kontrol eder
 */
export const isThisYear = (date: Date): boolean => {
  const now = new Date();
  return date.getFullYear() === now.getFullYear();
};

/**
 * Ay başından bugüne kadar olan gün sayısını döndürür
 */
export const getDaysFromMonthStart = (date: Date = new Date()): number => {
  return date.getDate();
};

/**
 * Ay sonuna kadar olan gün sayısını döndürür
 */
export const getDaysUntilMonthEnd = (date: Date = new Date()): number => {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return lastDay.getDate() - date.getDate();
};

/**
 * İki tarih arasındaki ay farkını hesaplar
 */
export const getMonthsDifference = (date1: Date, date2: Date): number => {
  return (date1.getFullYear() - date2.getFullYear()) * 12 + (date1.getMonth() - date2.getMonth());
};

/**
 * Gelecekte olan bir tarih için kalan süreyi formatlar
 */
export const formatTimeUntil = (futureDate: Date): string => {
  const now = new Date();
  const diffTime = futureDate.getTime() - now.getTime();
  
  if (diffTime <= 0) {
    return 'Geçmiş';
  }
  
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return 'Yarın';
  } else if (diffDays <= 7) {
    return `${diffDays} gün sonra`;
  } else if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} hafta sonra`;
  } else if (diffDays <= 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} ay sonra`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} yıl sonra`;
  }
};

/**
 * Belirli bir tarih aralığının başlangıç ve bitiş tarihlerini döndürür
 */
export const getDateRange = (type: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear'): { start: Date; end: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (type) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
      
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday,
        end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
      
    case 'thisWeek':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Pazartesi
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return { start: startOfWeek, end: endOfWeek };
      
    case 'thisMonth':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      };
      
    case 'thisYear':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31)
      };
      
    default:
      return { start: today, end: today };
  }
}; 