import { makeObservable, observable, action, computed } from 'mobx';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs,
  QuerySnapshot,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction, TransactionType } from '../models/Transaction';
import { Account } from '../models/Account';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../models/Category';

export interface CategoryReport {
  name: string;
  amount: number;
  percentage: number;
  icon: string;
  color: string;
  transactionCount: number;
}

export interface MonthlyReport {
  month: string;
  year: number;
  income: number;
  expense: number;
  transactionCount: number;
}

export interface ReportSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
  averageDailyExpense: number;
  savingsRate: number;
  topExpenseCategory: string;
  topIncomeCategory: string;
}

export class ReportsViewModel {
  userId: string;
  transactions: Transaction[] = [];
  accounts: Account[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(userId: string) {
    this.userId = userId;
    makeObservable(this, {
      transactions: observable,
      accounts: observable,
      isLoading: observable,
      error: observable,
      weeklyTransactions: computed,
      monthlyTransactions: computed,
      weeklyExpenseCategories: computed,
      monthlyExpenseCategories: computed,
      weeklyIncomeCategories: computed,
      monthlyIncomeCategories: computed,
      weeklySummary: computed,
      monthlySummary: computed,
      lastMonthsTrends: computed,
      setLoading: action,
      setError: action,
      setTransactions: action,
      setAccounts: action,
    });

    this.initializeReports();
  }

  setLoading = (loading: boolean) => {
    this.isLoading = loading;
  };

  setError = (error: string | null) => {
    this.error = error;
  };

  setTransactions = (transactions: Transaction[]) => {
    this.transactions = transactions;
  };

  setAccounts = (accounts: Account[]) => {
    this.accounts = accounts;
  };

  private initializeReports = () => {
    this.setLoading(true);
    this.loadTransactions();
    this.loadAccounts();
  };

  private loadTransactions = () => {
    // Simplified query without orderBy to avoid composite index requirement
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', this.userId)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const transactionsList: Transaction[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          transactionsList.push({
            id: doc.id,
            userId: data.userId,
            amount: data.amount,
            description: data.description,
            type: data.type,
            category: data.category,
            categoryIcon: data.categoryIcon,
            accountId: data.accountId,
            date: data.date.toDate ? data.date.toDate() : new Date(data.date),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          } as Transaction);
        });
        
        // Sort by date in memory instead of in query
        transactionsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        this.setTransactions(transactionsList);
        this.setLoading(false);
      },
      (error) => {
        console.error('Error loading transactions:', error);
        this.setError('Veriler yüklenirken hata oluştu');
        this.setLoading(false);
      }
    );

    return unsubscribe;
  };

  private loadAccounts = async () => {
    try {
      // Simplified query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, 'accounts'),
        where('userId', '==', this.userId)
      );

      const snapshot = await getDocs(q);
      const accountsList: Account[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        accountsList.push({
          id: doc.id,
          userId: data.userId,
          name: data.name,
          type: data.type,
          balance: data.balance,
          color: data.color,
          icon: data.icon,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
          isActive: data.isActive !== undefined ? data.isActive : true,
        } as Account);
      });

      // Sort by createdAt in memory instead of in query
      accountsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      this.setAccounts(accountsList);
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.setError('Hesaplar yüklenirken hata oluştu');
    }
  };

  // Computed properties for different time periods
  get weeklyTransactions() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return this.transactions.filter(t => 
      new Date(t.date) >= oneWeekAgo
    );
  }

  get monthlyTransactions() {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    return this.transactions.filter(t => 
      new Date(t.date) >= oneMonthAgo
    );
  }

  // Category analysis
  private calculateCategoryReports = (transactions: Transaction[], type: TransactionType): CategoryReport[] => {
    const categoryMap = new Map<string, { amount: number; count: number }>();
    const totalAmount = transactions
      .filter(t => t.type === type)
      .reduce((sum, t) => sum + t.amount, 0);

    // Group transactions by category
    transactions
      .filter(t => t.type === type)
      .forEach(t => {
        const existing = categoryMap.get(t.category) || { amount: 0, count: 0 };
        categoryMap.set(t.category, {
          amount: existing.amount + t.amount,
          count: existing.count + 1
        });
      });

    // Convert to CategoryReport array
    const categories = type === TransactionType.EXPENSE 
      ? DEFAULT_EXPENSE_CATEGORIES 
      : DEFAULT_INCOME_CATEGORIES;

    const reports: CategoryReport[] = [];
    
    categoryMap.forEach((data, categoryName) => {
      const categoryInfo = categories.find(c => c.name === categoryName);
      const percentage = totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0;
      
      reports.push({
        name: categoryName,
        amount: data.amount,
        percentage: Math.round(percentage),
        icon: categoryInfo?.icon || 'help-circle-outline',
        color: categoryInfo?.color || '#6B7280',
        transactionCount: data.count
      });
    });

    // Sort by amount (descending) and return top 5
    return reports
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  };

  get weeklyExpenseCategories(): CategoryReport[] {
    return this.calculateCategoryReports(this.weeklyTransactions, TransactionType.EXPENSE);
  }

  get monthlyExpenseCategories(): CategoryReport[] {
    return this.calculateCategoryReports(this.monthlyTransactions, TransactionType.EXPENSE);
  }

  get weeklyIncomeCategories(): CategoryReport[] {
    return this.calculateCategoryReports(this.weeklyTransactions, TransactionType.INCOME);
  }

  get monthlyIncomeCategories(): CategoryReport[] {
    return this.calculateCategoryReports(this.monthlyTransactions, TransactionType.INCOME);
  }

  // Summary calculations
  private calculateSummary = (transactions: Transaction[], days: number): ReportSummary => {
    const income = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    const netAmount = income - expense;
    const savingsRate = income > 0 ? (netAmount / income) * 100 : 0;
    const averageDailyExpense = expense / days;

    // Find top categories
    const expenseCategories = this.calculateCategoryReports(transactions, TransactionType.EXPENSE);
    const incomeCategories = this.calculateCategoryReports(transactions, TransactionType.INCOME);

    return {
      totalIncome: income,
      totalExpense: expense,
      netAmount,
      transactionCount: transactions.length,
      averageDailyExpense,
      savingsRate,
      topExpenseCategory: expenseCategories[0]?.name || 'Yok',
      topIncomeCategory: incomeCategories[0]?.name || 'Yok'
    };
  };

  get weeklySummary(): ReportSummary {
    return this.calculateSummary(this.weeklyTransactions, 7);
  }

  get monthlySummary(): ReportSummary {
    return this.calculateSummary(this.monthlyTransactions, 30);
  }

  // Trends calculation
  get lastMonthsTrends(): MonthlyReport[] {
    const months: MonthlyReport[] = [];
    const currentDate = new Date();
    
    // Get last 4 months
    for (let i = 0; i < 4; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
      
      const monthTransactions = this.transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= date && transactionDate < nextMonth;
      });

      const income = monthTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expense = monthTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

      const monthName = date.toLocaleDateString('tr-TR', { 
        month: 'long', 
        year: 'numeric' 
      });

      months.push({
        month: monthName,
        year: date.getFullYear(),
        income,
        expense,
        transactionCount: monthTransactions.length
      });
    }

    return months;
  }

  // Helper methods
  getAccountName = (accountId: string): string => {
    const account = this.accounts.find(a => a.id === accountId);
    return account?.name || 'Bilinmeyen Hesap';
  };

  refreshData = () => {
    this.setLoading(true);
    this.initializeReports();
  };
} 