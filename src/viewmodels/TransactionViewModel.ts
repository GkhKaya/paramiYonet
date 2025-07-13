import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction, TransactionType } from '../models/Transaction';
import { TransactionService } from '../services/FirebaseService';
import CacheService from '../services/CacheService';

export interface TransactionViewModelState {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  searchTerm: string;
  searchQuery?: string; // Legacy support for useTransactionViewModel
  selectedFilter?: string; // Legacy support for useTransactionViewModel
  selectedMonth?: Date; // Legacy support for useTransactionViewModel
  filters: TransactionFilters;
  currentMonth: Date;
  isLoading: boolean;
  error: string | null;
  editTransactionId: string | null;
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
}

export interface DayGroup {
  date: string;
  displayDate: string;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
}

export interface TransactionFilters {
  type?: TransactionType;
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}

// Mock data for demo purposes
const createMockTransactions = (): Transaction[] => {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  return [
    {
      id: '1',
      userId: 'default-user',
      accountId: 'account-1',
      category: 'Maaş',
      categoryIcon: 'cash',
      type: TransactionType.INCOME,
      amount: 15000,
      description: 'Aylık maaş',
      date: new Date(thisMonth.getTime() + 1 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      userId: 'default-user',
      accountId: 'account-1',
      category: 'Market',
      categoryIcon: 'basket',
      type: TransactionType.EXPENSE,
      amount: 250,
      description: 'Haftalık market alışverişi',
      date: new Date(thisMonth.getTime() + 2 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      userId: 'default-user',
      accountId: 'account-1',
      category: 'Ulaşım',
      categoryIcon: 'car',
      type: TransactionType.EXPENSE,
      amount: 150,
      description: 'Otobüs kartı yüklemesi',
      date: new Date(thisMonth.getTime() + 3 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '4',
      userId: 'default-user',
      accountId: 'account-1',
      category: 'Freelance',
      categoryIcon: 'laptop',
      type: TransactionType.INCOME,
      amount: 2500,
      description: 'Freelance proje ödemesi',
      date: new Date(thisMonth.getTime() + 5 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '5',
      userId: 'default-user',
      accountId: 'account-1',
      category: 'Yemek',
      categoryIcon: 'restaurant',
      type: TransactionType.EXPENSE,
      amount: 85,
      description: 'Öğle yemeği',
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
};

export class TransactionViewModel {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  searchTerm: string = '';
  filters: TransactionFilters = {};
  currentMonth: Date = new Date();
  isLoading: boolean = false;
  error: string | null = null;
  editTransactionId: string | null = null;

  constructor(
    private userId: string = 'default-user',
    private setState?: (updater: (prev: TransactionViewModelState) => TransactionViewModelState) => void,
    private state?: TransactionViewModelState
  ) {
    makeObservable(this, {
      transactions: observable,
      filteredTransactions: observable,
      searchTerm: observable,
      filters: observable,
      currentMonth: observable,
      isLoading: observable,
      error: observable,
      editTransactionId: observable,
      monthlyStats: computed,
      dayGroups: computed,
      recentTransactions: computed,
      loadTransactions: action,
      addTransaction: action,
      updateTransaction: action,
      deleteTransaction: action,
      setSearchTerm: action,
      setFilters: action,
      setEditTransactionId: action,
      clearEditTransactionId: action,
      goToNextMonth: action,
      goToPreviousMonth: action,
      getTransactionById: action,
    });

    this.loadTransactions();
  }

  get monthlyStats(): MonthlyStats {
    let totalIncome = 0;
    let totalExpense = 0;

    this.filteredTransactions.forEach((transaction) => {
      if (transaction.type === TransactionType.INCOME) {
        totalIncome += transaction.amount;
      } else {
        totalExpense += transaction.amount;
      }
    });

    return {
      totalIncome,
      totalExpense,
      netAmount: totalIncome - totalExpense,
      transactionCount: this.filteredTransactions.length,
    };
  }

  get recentTransactions(): Transaction[] {
    // Tüm işlemleri tarihe göre sırala ve son 3'ünü al
    return [...this.transactions]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3);
  }

  get dayGroups(): DayGroup[] {
    const groups: { [key: string]: DayGroup } = {};

    this.filteredTransactions.forEach((transaction) => {
      // Saat dilimi problemini önlemek için local tarih formatı kullan
      const dateKey = transaction.date.getFullYear() + '-' + 
                     (transaction.date.getMonth() + 1).toString().padStart(2, '0') + '-' + 
                     transaction.date.getDate().toString().padStart(2, '0');
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          displayDate: this.formatDateDisplay(transaction.date),
          transactions: [],
          totalIncome: 0,
          totalExpense: 0,
          netAmount: 0,
        };
      }

      groups[dateKey].transactions.push(transaction);
      
      if (transaction.type === TransactionType.INCOME) {
        groups[dateKey].totalIncome += transaction.amount;
      } else {
        groups[dateKey].totalExpense += transaction.amount;
      }
      
      groups[dateKey].netAmount = groups[dateKey].totalIncome - groups[dateKey].totalExpense;
    });

    return Object.values(groups).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  setSearchTerm(term: string): void {
    this.searchTerm = term;
    this.applyFilters();
  }

  setFilters(filters: Partial<TransactionFilters>): void {
    this.filters = { ...this.filters, ...filters };
    this.applyFilters();
  }

  goToNextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.loadTransactions();
  }

  goToPreviousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.loadTransactions();
  }

  async loadTransactions(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      const monthStart = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
      const monthEnd = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0, 23, 59, 59);
      
      // Use optimized TransactionService with cache
      const transactions = await TransactionService.getTransactions(
        this.userId,
        monthStart,
        monthEnd,
        true, // use cache
        100 // limit
      );

      runInAction(() => {
        this.transactions = transactions;
        this.applyFilters();
        this.isLoading = false;
      });

    } catch (error) {
      runInAction(() => {
        this.error = `İşlemler yüklenemedi: ${(error as Error).message}`;
        this.isLoading = false;
      });
    }
  }

  async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      // Use optimized TransactionService with cache invalidation
      const transactionWithDates = {
        ...transaction,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const transactionId = await TransactionService.createTransaction(transactionWithDates);
      
      // Update account balance
      const accountRef = doc(db, 'accounts', transaction.accountId);
      const accountDoc = await getDoc(accountRef);
      
      if (accountDoc.exists()) {
        const accountData = accountDoc.data();
        const currentBalance = accountData.balance || 0;
        let newBalance = currentBalance;
        
        // For expenses, subtract from balance; for income, add to balance
        if (transaction.type === TransactionType.EXPENSE) {
          newBalance = currentBalance - transaction.amount;
        } else {
          newBalance = currentBalance + transaction.amount;
        }
        
        await updateDoc(accountRef, {
          balance: newBalance,
          updatedAt: Timestamp.fromDate(new Date())
        });
      }
      
      // Add to local state
      const newTransaction: Transaction = {
        ...transaction,
        id: transactionId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      runInAction(() => {
        this.transactions.unshift(newTransaction);
        this.applyFilters();
      });

      return true;
    } catch (error) {
      console.error('Error adding transaction:', error);
      runInAction(() => {
        this.error = `İşlem eklenemedi: ${(error as Error).message}`;
      });
      return false;
    }
  }

  async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<boolean> {
    try {
      // Get the current transaction to calculate balance changes
      const currentTransaction = this.transactions.find(t => t.id === transactionId);
      if (!currentTransaction) {
        throw new Error('Transaction not found');
      }

      // Use optimized TransactionService with cache invalidation
      await TransactionService.updateTransaction(transactionId, updates);

      // Update account balance if amount or type changed
      if (updates.amount !== undefined || updates.type !== undefined) {
        const accountRef = doc(db, 'accounts', currentTransaction.accountId);
        const accountDoc = await getDoc(accountRef);
        
        if (accountDoc.exists()) {
          const currentBalance = accountDoc.data().balance || 0;
          
          // Reverse the original transaction
          let newBalance = currentBalance;
          if (currentTransaction.type === TransactionType.EXPENSE) {
            newBalance += currentTransaction.amount; // Add back the expense
          } else {
            newBalance -= currentTransaction.amount; // Subtract back the income
          }
          
          // Apply the new transaction
          const newAmount = updates.amount ?? currentTransaction.amount;
          const newType = updates.type ?? currentTransaction.type;
          
          if (newType === TransactionType.EXPENSE) {
            newBalance -= newAmount;
          } else {
            newBalance += newAmount;
          }
          
          await updateDoc(accountRef, {
            balance: newBalance,
            updatedAt: Timestamp.fromDate(new Date())
          });
        }
      }

      // Update local state
      runInAction(() => {
        const index = this.transactions.findIndex(t => t.id === transactionId);
        if (index !== -1) {
          this.transactions[index] = { ...this.transactions[index], ...updates, updatedAt: new Date() };
          this.applyFilters();
        }
      });

      return true;
    } catch (error) {
      console.error('Error updating transaction:', error);
      runInAction(() => {
        this.error = `İşlem güncellenemedi: ${(error as Error).message}`;
      });
      return false;
    }
  }

  async deleteTransaction(transactionId: string): Promise<boolean> {
    try {
      // Get the transaction to reverse its balance effect
      const transactionToDelete = this.transactions.find(t => t.id === transactionId);
      if (!transactionToDelete) {
        throw new Error('Transaction not found');
      }

      // Use optimized TransactionService with cache invalidation
      await TransactionService.deleteTransaction(transactionId, this.userId);

      // Update account balance (reverse the transaction)
      const accountRef = doc(db, 'accounts', transactionToDelete.accountId);
      const accountDoc = await getDoc(accountRef);
      
      if (accountDoc.exists()) {
        const currentBalance = accountDoc.data().balance || 0;
        let newBalance = currentBalance;
        
        // Reverse the transaction effect
        if (transactionToDelete.type === TransactionType.EXPENSE) {
          newBalance += transactionToDelete.amount; // Add back the expense
        } else {
          newBalance -= transactionToDelete.amount; // Subtract back the income
        }
        
        await updateDoc(accountRef, {
          balance: newBalance,
          updatedAt: Timestamp.fromDate(new Date())
        });
      }

      // Remove from local state
      runInAction(() => {
        this.transactions = this.transactions.filter(t => t.id !== transactionId);
        this.applyFilters();
      });

      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      runInAction(() => {
        this.error = `İşlem silinemedi: ${(error as Error).message}`;
      });
      return false;
    }
  }

  private applyFilters(): void {
    let filtered = [...this.transactions];

    // Filter by type
    if (this.filters.type) {
      filtered = filtered.filter((t) => t.type === this.filters.type);
    }

    // Filter by category
    if (this.filters.category) {
      filtered = filtered.filter((t) => t.category === this.filters.category);
    }

    // Filter by search term
    if (this.filters.searchTerm && this.filters.searchTerm.trim() !== '') {
      const searchTermLower = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(searchTermLower) ||
          t.category.toLowerCase().includes(searchTermLower)
      );
    }

    this.filteredTransactions = filtered;
  }

  private formatDateDisplay(date: Date): string {
    const now = new Date();
    
    // Bugünün, dünün ve gelen tarihin Unix timestamp'lerini al (gün bazında)
    const nowDay = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));
    const dateDay = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
    
    const dayDiff = nowDay - dateDay;

    if (dayDiff === 0) {
      return 'Bugün';
    } else if (dayDiff === 1) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
      });
    }
  }

  setEditTransactionId(transactionId: string): void {
    this.editTransactionId = transactionId;
  }

  clearEditTransactionId(): void {
    this.editTransactionId = null;
  }

  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    this.isLoading = true;
    try {
      const docRef = doc(db, 'transactions', transactionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        // Convert Firestore Timestamp to JS Date
        const transaction: Transaction = {
          id: docSnap.id,
          ...data,
          date: (data.date as Timestamp).toDate(),
          createdAt: (data.createdAt as Timestamp)?.toDate(),
          updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        } as Transaction;
        
        runInAction(() => {
          this.isLoading = false;
        });
        return transaction;
      } else {
        runInAction(() => {
          this.error = 'Transaction not found';
          this.isLoading = false;
        });
        return null;
      }
    } catch (error) {
      runInAction(() => {
        console.error("Error fetching transaction by ID:", error);
        this.error = "Failed to fetch transaction.";
        this.isLoading = false;
      });
      return null;
    }
  }
} 