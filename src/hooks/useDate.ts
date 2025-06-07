/**
 * useDate Hook - Tarih işlemleri için custom hook
 */

import { useCallback } from 'react';
import { 
  formatDate as formatDateUtil,
  formatRelativeDate,
  formatTimeUntil,
  getDaysDifference,
  getDateRange,
  isToday,
  isYesterday,
  isThisMonth,
  isThisYear,
  DateFormat
} from '../utils/date';

export const useDate = () => {
  // Temel tarih formatı
  const formatDate = useCallback((
    date: Date | string | number, 
    format: DateFormat = 'short'
  ) => {
    return formatDateUtil(date, format);
  }, []);

  // Göreli tarih formatı
  const formatRelative = useCallback((date: Date) => {
    return formatRelativeDate(date);
  }, []);

  // Gelecek tarih için kalan süre
  const formatUntil = useCallback((futureDate: Date) => {
    return formatTimeUntil(futureDate);
  }, []);

  // İki tarih arasındaki gün farkı
  const getDaysBetween = useCallback((date1: Date, date2: Date) => {
    return getDaysDifference(date1, date2);
  }, []);

  // Tarih aralığı
  const getRange = useCallback((type: 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'thisYear') => {
    return getDateRange(type);
  }, []);

  // Tarih kontrolleri
  const checkIsToday = useCallback((date: Date) => {
    return isToday(date);
  }, []);

  const checkIsYesterday = useCallback((date: Date) => {
    return isYesterday(date);
  }, []);

  const checkIsThisMonth = useCallback((date: Date) => {
    return isThisMonth(date);
  }, []);

  const checkIsThisYear = useCallback((date: Date) => {
    return isThisYear(date);
  }, []);

  // Kullanışlı formatlar
  const formatShort = useCallback((date: Date | string | number) => {
    return formatDateUtil(date, 'short');
  }, []);

  const formatLong = useCallback((date: Date | string | number) => {
    return formatDateUtil(date, 'long');
  }, []);

  const formatMonthYear = useCallback((date: Date | string | number) => {
    return formatDateUtil(date, 'month-year');
  }, []);

  const formatTime = useCallback((date: Date | string | number) => {
    return formatDateUtil(date, 'time');
  }, []);

  const formatFull = useCallback((date: Date | string | number) => {
    return formatDateUtil(date, 'full');
  }, []);

  // Akıllı format seçimi (tarihe göre otomatik format)
  const formatSmart = useCallback((date: Date) => {
    if (isToday(date)) {
      return 'Bugün';
    } else if (isYesterday(date)) {
      return 'Dün';
    } else if (isThisYear(date)) {
      return formatDateUtil(date, 'short').replace(/\/\d{4}$/, ''); // Yılı kaldır
    } else {
      return formatDateUtil(date, 'short');
    }
  }, []);

  return {
    formatDate,
    formatRelative,
    formatUntil,
    getDaysBetween,
    getRange,
    checkIsToday,
    checkIsYesterday,
    checkIsThisMonth,
    checkIsThisYear,
    formatShort,
    formatLong,
    formatMonthYear,
    formatTime,
    formatFull,
    formatSmart
  };
}; 