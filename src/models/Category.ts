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
    color: '#FF3030',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Market',
    icon: 'basket',
    color: '#00E5CC',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Ulaşım',
    icon: 'car',
    color: '#2196F3',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Fatura',
    icon: 'receipt',
    color: '#FF1744',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'İçecekler',
    icon: 'cafe',
    color: '#FFB300',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Eğlence',
    icon: 'musical-notes',
    color: '#9C27B0',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Sinema',
    icon: 'film',
    color: '#E91E63',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Hediye',
    icon: 'gift',
    color: '#FF4081',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Seyahat',
    icon: 'airplane',
    color: '#2196F3',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Giyim',
    icon: 'shirt',
    color: '#673AB7',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Oyun',
    icon: 'game-controller',
    color: '#00BCD4',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Kitap',
    icon: 'book',
    color: '#3F51B5',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Telefon',
    icon: 'phone-portrait',
    color: '#E91E63',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Fitness',
    icon: 'fitness',
    color: '#FF9800',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Sağlık',
    icon: 'medical',
    color: '#FF5722',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Elektronik',
    icon: 'phone-portrait',
    color: '#607D8B',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Temizlik',
    icon: 'shield-checkmark',
    color: '#2196F3',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Ev',
    icon: 'home',
    color: '#FF9800',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Kişisel Bakım',
    icon: 'rose',
    color: '#FF6F00',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
  {
    name: 'Diğer',
    icon: 'ellipsis-horizontal',
    color: '#9E9E9E',
    type: TransactionType.EXPENSE,
    isDefault: true,
  },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id' | 'userId'>[] = [
  {
    name: 'Maaş',
    icon: 'cash',
    color: '#4CAF50',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Yan İş',
    icon: 'business',
    color: '#2196F3',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Freelance',
    icon: 'laptop',
    color: '#00BCD4',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Burs',
    icon: 'school',
    color: '#3F51B5',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Harçlık',
    icon: 'wallet',
    color: '#E91E63',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Yatırım',
    icon: 'trending-up',
    color: '#9C27B0',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Prim',
    icon: 'trophy',
    color: '#FF9800',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Temettü',
    icon: 'diamond',
    color: '#00BCD4',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Hediye',
    icon: 'gift',
    color: '#F44336',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Satış',
    icon: 'storefront',
    color: '#2196F3',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Kira Geliri',
    icon: 'home',
    color: '#4CAF50',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Borç İade',
    icon: 'people',
    color: '#FF9800',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'İkramiye',
    icon: 'star',
    color: '#E91E63',
    type: TransactionType.INCOME,
    isDefault: true,
  },
  {
    name: 'Diğer',
    icon: 'add-circle',
    color: '#9E9E9E',
    type: TransactionType.INCOME,
    isDefault: true,
  },
]; 