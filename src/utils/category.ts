/**
 * Category Utilities - Kategori işlemleri
 * Kategori detayları ve işlemlerini merkezi olarak yönetir
 */

import { TransactionType } from '../models/Transaction';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, Category } from '../models/Category';

/**
 * Kategori adına göre kategori detaylarını döndürür
 */
export const getCategoryDetails = (
  categoryName: string, 
  type: TransactionType
): Category => {
  const categories = type === TransactionType.INCOME 
    ? DEFAULT_INCOME_CATEGORIES 
    : DEFAULT_EXPENSE_CATEGORIES;
  
  const category = categories.find(cat => cat.name === categoryName);
  
  if (!category) {
    // Fallback kategori
    return {
      id: 'unknown',
      name: categoryName,
      icon: type === TransactionType.INCOME ? 'add-circle' : 'ellipsis-horizontal',
      color: '#9E9E9E',
      type,
      isDefault: false
    };
  }
  
  return {
    id: category.name.toLowerCase().replace(/\s+/g, '-'),
    ...category
  };
};

/**
 * Tüm kategorileri tip bazında döndürür
 */
export const getCategoriesByType = (type: TransactionType): Category[] => {
  const categories = type === TransactionType.INCOME 
    ? DEFAULT_INCOME_CATEGORIES 
    : DEFAULT_EXPENSE_CATEGORIES;
    
  return categories.map(cat => ({
    id: cat.name.toLowerCase().replace(/\s+/g, '-'),
    ...cat
  }));
};

/**
 * Kategorinin ikon adını döndürür
 */
export const getCategoryIcon = (categoryName: string, type: TransactionType): string => {
  const category = getCategoryDetails(categoryName, type);
  return category.icon;
};

/**
 * Kategorinin rengini döndürür
 */
export const getCategoryColor = (categoryName: string, type: TransactionType): string => {
  const category = getCategoryDetails(categoryName, type);
  return category.color;
};

/**
 * Kategori adını Türkçe'ye çevirir (varsa)
 */
export const getLocalizedCategoryName = (categoryName: string): string => {
  // Özel çeviriler burada tanımlanabilir
  const translations: { [key: string]: string } = {
    'food': 'Yemek',
    'transport': 'Ulaşım',
    'entertainment': 'Eğlence',
    'shopping': 'Alışveriş',
    'bills': 'Faturalar',
    'salary': 'Maaş',
    'bonus': 'Prim',
    'investment': 'Yatırım'
  };
  
  return translations[categoryName.toLowerCase()] || categoryName;
};

/**
 * Kategorileri popülerlik sırasına göre sıralar
 */
export const sortCategoriesByPopularity = (
  categories: Category[], 
  usageData?: { [categoryName: string]: number }
): Category[] => {
  if (!usageData) {
    return categories;
  }
  
  return [...categories].sort((a, b) => {
    const aUsage = usageData[a.name] || 0;
    const bUsage = usageData[b.name] || 0;
    return bUsage - aUsage;
  });
};

/**
 * Kategori filtreleme
 */
export const filterCategories = (
  categories: Category[],
  searchTerm: string
): Category[] => {
  if (!searchTerm.trim()) {
    return categories;
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  return categories.filter(category => 
    category.name.toLowerCase().includes(term) ||
    category.icon.toLowerCase().includes(term)
  );
};

/**
 * Kategori gruplaması (tip bazında)
 */
export const groupCategoriesByType = (categories: Category[]): {
  income: Category[];
  expense: Category[];
} => {
  return categories.reduce(
    (groups, category) => {
      if (category.type === TransactionType.INCOME) {
        groups.income.push(category);
      } else {
        groups.expense.push(category);
      }
      return groups;
    },
    { income: [] as Category[], expense: [] as Category[] }
  );
};

/**
 * En çok kullanılan kategorileri döndürür
 */
export const getTopCategories = (
  type: TransactionType,
  usageData: { [categoryName: string]: number },
  limit: number = 5
): Category[] => {
  const categories = getCategoriesByType(type);
  const sorted = sortCategoriesByPopularity(categories, usageData);
  return sorted.slice(0, limit);
};

/**
 * Kategori önerisi (benzer kategoriler)
 */
export const getSuggestedCategories = (
  description: string,
  type: TransactionType
): Category[] => {
  const categories = getCategoriesByType(type);
  const lowercaseDesc = description.toLowerCase();
  
  // Basit keyword matching
  const suggestions = categories.filter(category => {
    const keywords = getCategoryKeywords(category.name);
    return keywords.some(keyword => lowercaseDesc.includes(keyword));
  });
  
  return suggestions.slice(0, 3);
};

/**
 * Kategori için anahtar kelimeler
 */
const getCategoryKeywords = (categoryName: string): string[] => {
  const keywordMap: { [key: string]: string[] } = {
    'Yemek': ['yemek', 'restoran', 'café', 'pizza', 'burger', 'döner'],
    'Market': ['market', 'süpermarket', 'migros', 'carrefour', 'şok'],
    'Ulaşım': ['otobüs', 'metro', 'taksi', 'uber', 'benzin', 'yakıt'],
    'Fatura': ['fatura', 'elektrik', 'su', 'doğalgaz', 'internet'],
    'İçecekler': ['kahve', 'çay', 'starbucks', 'içecek', 'cola'],
    'Eğlence': ['sinema', 'tiyatro', 'konser', 'eğlence', 'oyun'],
    'Giyim': ['giyim', 'kıyafet', 'ayakkabı', 'çanta', 'moda'],
    'Sağlık': ['doktor', 'hastane', 'eczane', 'ilaç', 'sağlık'],
    'Maaş': ['maaş', 'salary', 'ücret', 'gelir'],
    'Freelance': ['freelance', 'serbest', 'proje', 'danışmanlık']
  };
  
  return keywordMap[categoryName] || [categoryName.toLowerCase()];
}; 