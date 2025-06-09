import { makeObservable, observable, action, computed } from 'mobx';
import { Budget } from '../models/Budget';
import { Transaction, TransactionType } from '../models/Transaction';
import { BudgetService } from '../services/BudgetService';
import { DEFAULT_EXPENSE_CATEGORIES } from '../models/Category'; // İkon ve renk almak için

export interface BudgetWithCalculations extends Budget {
  isOverBudget: boolean;
  daysRemaining: number;
  dailyBudgetRemaining: number;
  status: 'healthy' | 'warning' | 'over_budget';
}

export class BudgetViewModel {
  userId: string;
  budgets: Budget[] = [];
  isLoading = false;
  error: string | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(userId: string) {
    this.userId = userId;
    makeObservable(this, {
      budgets: observable,
      isLoading: observable,
      error: observable,
      activeBudgets: computed,
      totalBudgetedAmount: computed,
      totalSpentAmount: computed,
      overallBudgetStatus: computed,
      setLoading: action,
      setError: action,
      setBudgets: action,
    });

    this.initializeBudgets();
  }

  setLoading = (loading: boolean) => {
    this.isLoading = loading;
  };

  setError = (error: string | null) => {
    this.error = error;
  };

  setBudgets = (budgets: Budget[]) => {
    this.budgets = budgets;
  };

  private initializeBudgets = () => {
    this.setLoading(true);
    this.loadBudgets();
  };

  private loadBudgets = () => {
    // Real-time listener kullan
    this.unsubscribe = BudgetService.listenToBudgets(this.userId, (budgets) => {
      this.setBudgets(budgets);
      this.setLoading(false);
    });
  };

  // Computed properties
  get activeBudgets(): Budget[] {
    const now = new Date();
    return this.budgets.filter(budget => 
      budget.endDate >= now && budget.startDate <= now
    );
  }

  get totalBudgetedAmount(): number {
    return this.activeBudgets.reduce((total, budget) => total + budget.budgetedAmount, 0);
  }

  get totalSpentAmount(): number {
    return this.activeBudgets.reduce((total, budget) => total + budget.spentAmount, 0);
  }

  get overallBudgetStatus(): 'healthy' | 'warning' | 'over_budget' {
    const spentPercentage = this.totalBudgetedAmount > 0 
      ? (this.totalSpentAmount / this.totalBudgetedAmount) * 100 
      : 0;

    if (spentPercentage >= 100) return 'over_budget';
    if (spentPercentage >= 80) return 'warning';
    return 'healthy';
  }

  // Budget operations
  createBudget = async (budgetData: {
    categoryName: string;
    budgetedAmount: number;
    period: 'monthly' | 'weekly';
  }): Promise<boolean> => {
    try {
      this.setLoading(true);
      this.setError(null);

      // Kategori bilgilerini al
      const category = DEFAULT_EXPENSE_CATEGORIES.find(
        cat => cat.name === budgetData.categoryName
      );

      // Tarih aralığını hesapla
      const startDate = new Date();
      const endDate = new Date();

      if (budgetData.period === 'monthly') {
        startDate.setDate(1); // Ayın ilk günü
        endDate.setMonth(endDate.getMonth() + 1, 0); // Ayın son günü
      } else {
        // Haftalık için şu anki haftanın başlangıcı ve sonu
        const dayOfWeek = startDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate.setDate(startDate.getDate() + diffToMonday);
        endDate.setDate(startDate.getDate() + 6);
      }

      const newBudget: Omit<Budget, 'id'> = {
        userId: this.userId,
        categoryName: budgetData.categoryName,
        categoryIcon: category?.icon || 'ellipsis-horizontal',
        categoryColor: category?.color || '#95A5A6',
        budgetedAmount: budgetData.budgetedAmount,
        spentAmount: 0,
        remainingAmount: budgetData.budgetedAmount,
        progressPercentage: 0,
        period: budgetData.period,
        startDate,
        endDate,
        createdAt: new Date(),
      };

      await BudgetService.createBudget(newBudget);
      return true;
    } catch (error) {
      console.error('Error creating budget:', error);
      this.setError('Bütçe oluşturulurken hata oluştu');
      return false;
    } finally {
      this.setLoading(false);
    }
  };

  updateBudget = async (budgetId: string, updates: Partial<Budget>): Promise<boolean> => {
    try {
      this.setLoading(true);
      this.setError(null);

      await BudgetService.updateBudget(budgetId, updates);
      return true;
    } catch (error) {
      console.error('Error updating budget:', error);
      this.setError('Bütçe güncellenirken hata oluştu');
      return false;
    } finally {
      this.setLoading(false);
    }
  };

  deleteBudget = async (budgetId: string): Promise<boolean> => {
    try {
      this.setLoading(true);
      this.setError(null);

      await BudgetService.deleteBudget(budgetId);
      return true;
    } catch (error) {
      console.error('Error deleting budget:', error);
      this.setError('Bütçe silinirken hata oluştu');
      return false;
    } finally {
      this.setLoading(false);
    }
  };

  // Transaction entegrasyonu
  updateBudgetProgress = async (transactions: Transaction[]): Promise<void> => {
    try {
      for (const budget of this.activeBudgets) {
        let categoryTransactions: Transaction[];

        // 'Tüm Kategoriler' bütçesi için özel durum
        if (budget.categoryName === 'Tüm Kategoriler') {
          categoryTransactions = transactions.filter(t => 
            t.type === TransactionType.EXPENSE &&
            t.date >= budget.startDate &&
            t.date <= budget.endDate
          );
        } else {
          // Belirli bir kategori için normal filtreleme
          categoryTransactions = transactions.filter(t => 
            t.type === TransactionType.EXPENSE &&
            t.category === budget.categoryName &&
            t.date >= budget.startDate &&
            t.date <= budget.endDate
          );
        }

        const spentAmount = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);

        // Eğer spent amount değiştiyse güncelle
        if (spentAmount !== budget.spentAmount) {
          await BudgetService.updateBudgetProgress(
            budget.id, 
            spentAmount, 
            budget.budgetedAmount
          );
        }
      }
    } catch (error) {
      console.error('Error updating budget progress:', error);
    }
  };

  // Utility methods
  getBudgetWithCalculations = (budget: Budget): BudgetWithCalculations => {
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil(
      (budget.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    ));

    const dailyBudgetRemaining = daysRemaining > 0 
      ? budget.remainingAmount / daysRemaining 
      : 0;

    const isOverBudget = budget.spentAmount > budget.budgetedAmount;
    
    let status: 'healthy' | 'warning' | 'over_budget' = 'healthy';
    if (isOverBudget) {
      status = 'over_budget';
    } else if (budget.progressPercentage >= 80) {
      status = 'warning';
    }

    return {
      ...budget,
      isOverBudget,
      daysRemaining,
      dailyBudgetRemaining,
      status,
    };
  };

  getBudgetByCategory = (categoryName: string): Budget | undefined => {
    return this.activeBudgets.find(budget => budget.categoryName === categoryName);
  };

  getCategoryBudgetStatus = (categoryName: string): {
    hasBudget: boolean;
    isOverBudget: boolean;
    progressPercentage: number;
  } => {
    const budget = this.getBudgetByCategory(categoryName);
    
    if (!budget) {
      return {
        hasBudget: false,
        isOverBudget: false,
        progressPercentage: 0,
      };
    }

    return {
      hasBudget: true,
      isOverBudget: budget.spentAmount > budget.budgetedAmount,
      progressPercentage: budget.progressPercentage,
    };
  };

  // formatCurrency artık utils/currency'den import edilebilir

  // Cleanup
  dispose = () => {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  };
} 