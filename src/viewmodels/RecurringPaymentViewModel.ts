import { makeObservable, observable, action, computed } from 'mobx';
import { RecurringPayment, RecurringPaymentSummary } from '../models/RecurringPayment';
import { RecurringPaymentService } from '../services/RecurringPaymentService';
import { TransactionService } from '../services/TransactionService';
import { Transaction, TransactionType } from '../models/Transaction';
import { DEFAULT_EXPENSE_CATEGORIES } from '../models/Category';

export class RecurringPaymentViewModel {
  userId: string;
  recurringPayments: RecurringPayment[] = [];
  isLoading = false;
  error: string | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(userId: string) {
    this.userId = userId;
    makeObservable(this, {
      recurringPayments: observable,
      isLoading: observable,
      error: observable,
      activePayments: computed,
      upcomingPayments: computed,
      overduePayments: computed,
      paymentSummary: computed,
      setLoading: action,
      setError: action,
      setRecurringPayments: action,
    });

    this.initializePayments();
  }

  setLoading = (loading: boolean) => {
    this.isLoading = loading;
  };

  setError = (error: string | null) => {
    this.error = error;
  };

  setRecurringPayments = (payments: RecurringPayment[]) => {
    this.recurringPayments = payments;
  };

  private initializePayments = () => {
    this.setLoading(true);
    this.loadPayments();
  };

  private loadPayments = () => {
    // Real-time listener kullan
    this.unsubscribe = RecurringPaymentService.listenToRecurringPayments(this.userId, (payments) => {
      this.setRecurringPayments(payments);
      this.setLoading(false);
    });
  };

  // Computed properties
  get activePayments(): RecurringPayment[] {
    return this.recurringPayments.filter(payment => payment.isActive);
  }

  get upcomingPayments(): RecurringPayment[] {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    return this.activePayments.filter(payment => 
      payment.nextPaymentDate >= now && payment.nextPaymentDate <= nextWeek
    );
  }

  get overduePayments(): RecurringPayment[] {
    const now = new Date();
    return this.activePayments.filter(payment => 
      payment.nextPaymentDate < now
    );
  }

  get paymentSummary(): RecurringPaymentSummary {
    const active = this.activePayments;
    
    const totalMonthlyAmount = active.reduce((sum, payment) => {
      switch (payment.frequency) {
        case 'daily':
          return sum + (payment.amount * 30); // Approximate monthly
        case 'weekly':
          return sum + (payment.amount * 4.33); // Approximate monthly
        case 'monthly':
          return sum + payment.amount;
        case 'yearly':
          return sum + (payment.amount / 12);
        default:
          return sum;
      }
    }, 0);

    const totalYearlyAmount = totalMonthlyAmount * 12;

    return {
      totalMonthlyAmount,
      totalYearlyAmount,
      activeCount: active.length,
      upcomingCount: this.upcomingPayments.length,
      overdueCount: this.overduePayments.length,
    };
  }

  // Payment operations
  createRecurringPayment = async (paymentData: {
    name: string;
    description?: string;
    amount: number;
    category: string;
    accountId: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    startDate: Date;
    endDate?: Date;
    reminderDays: number;
    autoCreateTransaction: boolean;
  }): Promise<boolean> => {
    try {
      this.setLoading(true);
      this.setError(null);

      // Kategori bilgilerini al
      const category = DEFAULT_EXPENSE_CATEGORIES.find(
        cat => cat.name === paymentData.category
      );

      // İlk ödeme tarihini hesapla
      const nextPaymentDate = new Date(paymentData.startDate);

      const newPayment: Omit<RecurringPayment, 'id'> = {
        userId: this.userId,
        name: paymentData.name,
        description: paymentData.description,
        amount: paymentData.amount,
        category: paymentData.category,
        categoryIcon: category?.icon || 'card',
        accountId: paymentData.accountId,
        frequency: paymentData.frequency,
        startDate: paymentData.startDate,
        endDate: paymentData.endDate,
        nextPaymentDate,
        isActive: true,
        autoCreateTransaction: paymentData.autoCreateTransaction,
        reminderDays: paymentData.reminderDays,
        totalPaid: 0,
        paymentCount: 0,
        createdAt: new Date(),
      };

      await RecurringPaymentService.createRecurringPayment(newPayment);
      return true;
    } catch (error) {
      console.error('Error creating recurring payment:', error);
      this.setError('Düzenli ödeme oluşturulurken hata oluştu');
      return false;
    } finally {
      this.setLoading(false);
    }
  };

  updateRecurringPayment = async (paymentId: string, updates: Partial<RecurringPayment>): Promise<boolean> => {
    try {
      this.setLoading(true);
      this.setError(null);

      await RecurringPaymentService.updateRecurringPayment(paymentId, updates);
      return true;
    } catch (error) {
      console.error('Error updating recurring payment:', error);
      this.setError('Düzenli ödeme güncellenirken hata oluştu');
      return false;
    } finally {
      this.setLoading(false);
    }
  };

  deleteRecurringPayment = async (paymentId: string): Promise<boolean> => {
    try {
      this.setLoading(true);
      this.setError(null);

      await RecurringPaymentService.deleteRecurringPayment(paymentId);
      return true;
    } catch (error) {
      console.error('Error deleting recurring payment:', error);
      this.setError('Düzenli ödeme silinirken hata oluştu');
      return false;
    } finally {
      this.setLoading(false);
    }
  };

  // Toggle active status
  togglePaymentStatus = async (paymentId: string): Promise<boolean> => {
    const payment = this.recurringPayments.find(p => p.id === paymentId);
    if (!payment) return false;

    return this.updateRecurringPayment(paymentId, {
      isActive: !payment.isActive
    });
  };

  // Process payment (create transaction and update payment)
  processPayment = async (paymentId: string, createTransaction: boolean = true): Promise<boolean> => {
    try {
      this.setLoading(true);
      this.setError(null);

      const payment = this.recurringPayments.find(p => p.id === paymentId);
      if (!payment) {
        this.setError('Ödeme bulunamadı');
        return false;
      }

      // Create transaction if enabled and requested
      if (createTransaction && payment.autoCreateTransaction) {
        const transaction: Omit<Transaction, 'id'> = {
          userId: this.userId,
          amount: payment.amount,
          description: `${payment.name} - Düzenli Ödeme`,
          type: TransactionType.EXPENSE,
          category: payment.category,
          categoryIcon: payment.categoryIcon || 'card',
          accountId: payment.accountId,
          date: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await TransactionService.createTransaction(transaction);
      }

      // Update payment record
      await RecurringPaymentService.processPayment(paymentId);
      
      return true;
    } catch (error) {
      console.error('Error processing payment:', error);
      this.setError('Ödeme işlenirken hata oluştu');
      return false;
    } finally {
      this.setLoading(false);
    }
  };

  // Skip payment (just update next payment date without creating transaction)
  skipPayment = async (paymentId: string): Promise<boolean> => {
    try {
      const payment = this.recurringPayments.find(p => p.id === paymentId);
      if (!payment) return false;

      const nextPaymentDate = RecurringPaymentService.calculateNextPaymentDate(
        payment.nextPaymentDate, 
        payment.frequency
      );

      return this.updateRecurringPayment(paymentId, {
        nextPaymentDate,
        lastPaymentDate: payment.nextPaymentDate,
      });
    } catch (error) {
      console.error('Error skipping payment:', error);
      this.setError('Ödeme atlanırken hata oluştu');
      return false;
    }
  };

  // Utility methods
  formatCurrency = (amount: number): string => {
    return `₺${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  getFrequencyLabel = (frequency: string): string => {
    const labels: { [key: string]: string } = {
      daily: 'Günlük',
      weekly: 'Haftalık',
      monthly: 'Aylık',
      yearly: 'Yıllık',
    };
    return labels[frequency] || frequency;
  };

  getDaysUntilPayment = (nextPaymentDate: Date): number => {
    const now = new Date();
    const diffTime = nextPaymentDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  isPaymentOverdue = (nextPaymentDate: Date): boolean => {
    return nextPaymentDate < new Date();
  };

  // Cleanup
  dispose = () => {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  };
} 