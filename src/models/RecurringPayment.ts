export interface RecurringPayment {
  id: string;
  userId: string;
  name: string;
  description?: string;
  amount: number;
  category: string;
  categoryIcon?: string;
  accountId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  nextPaymentDate: Date;
  lastPaymentDate?: Date;
  isActive: boolean;
  autoCreateTransaction: boolean;
  reminderDays: number; // Kaç gün önce hatırlatma yapılacak
  totalPaid: number; // Toplam ödenen tutar
  paymentCount: number; // Kaç kez ödeme yapıldı
  createdAt: Date;
  updatedAt?: Date;
}

export enum RecurringFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export interface RecurringPaymentSummary {
  totalMonthlyAmount: number;
  totalYearlyAmount: number;
  activeCount: number;
  upcomingCount: number; // Bu hafta ödenmesi gerekenler
  overdueCount: number; // Geçmişte kalanlars
} 