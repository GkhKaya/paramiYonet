import { StackNavigationProp } from '@react-navigation/stack';
import { Account } from '../models/Account';

// Genel tip tanımlamaları
export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP';

export type DateRange = {
  startDate: Date;
  endDate: Date;
};

export type Period = 'day' | 'week' | 'month' | 'year' | 'custom';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface FilterParams {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  accountId?: string;
  type?: 'income' | 'expense';
  search?: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    colors?: string[];
  }[];
}

export interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  recentTransactions: any[];
  topCategories: any[];
  accountBalances: any[];
}

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  AddTransaction: { defaultType?: 'income' | 'expense' } | undefined;
  AddAccount: { editAccount?: Account } | undefined;
  GoldAccountDetail: { account: Account };
  Accounts: undefined;
  EditAccount: { accountId: string };
  Profile: undefined;
  RecurringPayments: undefined;
  Analytics: undefined;
  HelpAndSupport: undefined;
  Security: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  AddTransaction: { defaultType?: 'income' | 'expense' } | undefined;
  Reports: undefined;
  Settings: undefined;
};

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    income: string;
    expense: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    sizes: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      xxl: number;
    };
    weights: {
      regular: string;
      medium: string;
      bold: string;
    };
  };
}

// Gold Price Types
export interface GoldPriceData {
  buyPrice: number;        // Alış fiyatı
  sellPrice: number;       // Satış fiyatı
  lastUpdate: Date;        // Son güncelleme zamanı
  change: number;          // Değişim yüzdesi
  changeAmount: number;    // Değişim miktarı (TL)
  gramPrice?: number;      // Gram altın fiyatı
  source?: string;         // Veri kaynağı
}

export interface CanliDovizGoldResponse {
  success: boolean;
  data?: {
    buyPrice: number;
    sellPrice: number;
    lastPrice: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    time: string;
  };
  error?: string;
}

export interface GoldPriceHistory {
  date: Date;
  price: number;
  change: number;
} 