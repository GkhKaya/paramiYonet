/**
 * useCategory Hook - Kategori işlemleri için custom hook
 */

import { useCallback, useMemo } from 'react';
import { TransactionType } from '../models/Transaction';
import { Category } from '../models/Category';
import { 
  getCategoryDetails,
  getCategoriesByType,
  getCategoryIcon,
  getCategoryColor,
  filterCategories,
  sortCategoriesByPopularity,
  getSuggestedCategories,
  getTopCategories
} from '../utils/category';

export interface UseCategoryOptions {
  type?: TransactionType;
  usageData?: { [categoryName: string]: number };
}

export const useCategory = (options: UseCategoryOptions = {}) => {
  const { type, usageData } = options;

  // Kategori detaylarını getir
  const getDetails = useCallback((categoryName: string, categoryType?: TransactionType) => {
    const targetType = categoryType || type || TransactionType.EXPENSE;
    return getCategoryDetails(categoryName, targetType);
  }, [type]);

  // Tüm kategorileri getir
  const getAllCategories = useCallback((categoryType?: TransactionType) => {
    const targetType = categoryType || type || TransactionType.EXPENSE;
    return getCategoriesByType(targetType);
  }, [type]);

  // Kategori ikonunu getir
  const getIcon = useCallback((categoryName: string, categoryType?: TransactionType) => {
    const targetType = categoryType || type || TransactionType.EXPENSE;
    return getCategoryIcon(categoryName, targetType);
  }, [type]);

  // Kategori rengini getir
  const getColor = useCallback((categoryName: string, categoryType?: TransactionType) => {
    const targetType = categoryType || type || TransactionType.EXPENSE;
    return getCategoryColor(categoryName, targetType);
  }, [type]);

  // Kategorileri filtrele
  const filterBySearch = useCallback((searchTerm: string, categories?: Category[]) => {
    const targetCategories = categories || getAllCategories();
    return filterCategories(targetCategories, searchTerm);
  }, [getAllCategories]);

  // Kategorileri popülerlik sırasına göre sırala  
  const sortByPopularity = useCallback((categories?: Category[]) => {
    const targetCategories = categories || getAllCategories();
    return sortCategoriesByPopularity(targetCategories, usageData);
  }, [getAllCategories, usageData]);

  // Kategori önerisi al
  const getSuggestions = useCallback((description: string, categoryType?: TransactionType) => {
    const targetType = categoryType || type || TransactionType.EXPENSE;
    return getSuggestedCategories(description, targetType);
  }, [type]);

  // En popüler kategorileri al
  const getTopCategoriesList = useCallback((limit: number = 5, categoryType?: TransactionType) => {
    const targetType = categoryType || type || TransactionType.EXPENSE;
    if (!usageData) return getAllCategories(targetType).slice(0, limit);
    return getTopCategories(targetType, usageData, limit);
  }, [type, usageData, getAllCategories]);

  // Gelir kategorileri
  const incomeCategories = useMemo(() => {
    return getCategoriesByType(TransactionType.INCOME);
  }, []);

  // Gider kategorileri
  const expenseCategories = useMemo(() => {
    return getCategoriesByType(TransactionType.EXPENSE);
  }, []);

  // Popüler kategoriler (varsa usage data'ya göre)
  const popularCategories = useMemo(() => {
    if (!type) return [];
    const categories = getAllCategories(type);
    return sortCategoriesByPopularity(categories, usageData);
  }, [type, usageData, getAllCategories]);

      return {
    // Temel işlemler
    getDetails,
    getAllCategories,
    getIcon,
    getColor,
    
    // Filtreleme ve sıralama
    filterBySearch,
    sortByPopularity,
    getSuggestions,
    getTopCategories: getTopCategoriesList,
    
    // Hazır listeler
    incomeCategories,
    expenseCategories,
    popularCategories
  };
}; 