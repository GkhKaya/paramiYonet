import { TransactionType } from './Transaction';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  isDefault: boolean;
  userId?: string;  // Custom kategoriler için
}

export interface CategoryWithStats extends Category {
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

// Önceden tanımlanmış kategoriler
export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id' | 'userId'>[] = [
  {
    name: 'Yemek',
    icon: 'restaurant',
    color: '#FF6B6B',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Market',
    icon: 'basket',
    color: '#4ECDC4',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Ulaşım',
    icon: 'car',
    color: '#45B7D1',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Fatura',
    icon: 'receipt',
    color: '#FF7675',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'İçecekler',
    icon: 'cafe',
    color: '#FECA57',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Eğlence',
    icon: 'musical-notes',
    color: '#A29BFE',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Sinema',
    icon: 'film',
    color: '#FF9FF3',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Hediye',
    icon: 'gift',
    color: '#FD79A8',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Seyahat',
    icon: 'airplane',
    color: '#54A0FF',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Giyim',
    icon: 'shirt',
    color: '#5F27CD',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Oyun',
    icon: 'game-controller',
    color: '#00D2D3',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Kitap',
    icon: 'book',
    color: '#6C5CE7',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Telefon',
    icon: 'phone-portrait',
    color: '#C44569',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Fitness',
    icon: 'fitness',
    color: '#F8B500',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Sağlık',
    icon: 'medical',
    color: '#E17055',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Elektronik',
    icon: 'phone-portrait',
    color: '#636E72',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Temizlik',
    icon: 'shield-checkmark',
    color: '#74B9FF',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Ev',
    icon: 'home',
    color: '#55A3FF',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Kişisel Bakım',
    icon: 'rose',
    color: '#FDCB6E',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Diğer',
    icon: 'ellipsis-horizontal',
    color: '#95A5A6',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id' | 'userId'>[] = [
  {
    name: 'Maaş',
    icon: 'cash',
    color: '#2ECC71',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Yan İş',
    icon: 'business',
    color: '#3498DB',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Freelance',
    icon: 'laptop',
    color: '#00CEC9',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Burs',
    icon: 'school',
    color: '#6C5CE7',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Harçlık',
    icon: 'wallet',
    color: '#FD79A8',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Yatırım',
    icon: 'trending-up',
    color: '#9B59B6',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Prim',
    icon: 'trophy',
    color: '#F39C12',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Temettü',
    icon: 'diamond',
    color: '#1ABC9C',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Hediye',
    icon: 'gift',
    color: '#E74C3C',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Satış',
    icon: 'storefront',
    color: '#0984E3',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Kira Geliri',
    icon: 'home',
    color: '#00B894',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Borç İade',
    icon: 'people',
    color: '#FDCB6E',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'İkramiye',
    icon: 'star',
    color: '#E84393',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Diğer',
    icon: 'add-circle',
    color: '#7F8C8D',
    type: TransactionType.INCOME,
    isDefault: true,
  },
]; 