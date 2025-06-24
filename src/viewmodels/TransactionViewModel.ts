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
// import { TransactionService } from '../services/TransactionService';

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

  constructor(private userId: string) {
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
      // Simplified query - only filter by userId to avoid index requirement
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', this.userId)
      );

      const querySnapshot = await getDocs(q);
      const allTransactions: Transaction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allTransactions.push({
          id: doc.id,
          userId: data.userId,
          type: data.type as TransactionType,
          amount: data.amount,
          description: data.description,
          category: data.category,
          categoryIcon: data.categoryIcon,
          accountId: data.accountId,
          date: data.date.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      // Sort client-side to avoid index requirement
      allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Client-side filtering by current month
      const monthStart = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
      const monthEnd = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0, 23, 59, 59);
      
      const filteredTransactions = allTransactions.filter(transaction => {
        const transactionDate = transaction.date;
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });

      runInAction(() => {
        this.transactions = filteredTransactions;
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
      const transactionData = {
        userId: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        categoryIcon: transaction.categoryIcon,
        accountId: transaction.accountId,
        date: Timestamp.fromDate(transaction.date),
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      const docRef = await addDoc(collection(db, 'transactions'), transactionData);
      
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
        id: docRef.id,
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

      const transactionRef = doc(db, 'transactions', transactionId);
      const updateData: any = { ...updates };

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.createdAt;

      // Convert date to Timestamp if provided
      if (updates.date) {
        updateData.date = Timestamp.fromDate(updates.date);
      }

      await updateDoc(transactionRef, {
        ...updateData,
        updatedAt: Timestamp.fromDate(new Date()),
      });

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

      const transactionRef = doc(db, 'transactions', transactionId);
      await deleteDoc(transactionRef);

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

    // Apply search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.category.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (this.filters.type) {
      filtered = filtered.filter(transaction => transaction.type === this.filters.type);
    }

    // Apply category filter
    if (this.filters.category) {
      filtered = filtered.filter(transaction => transaction.category === this.filters.category);
    }

    // Apply date range filter
    if (this.filters.dateRange) {
      filtered = filtered.filter(transaction => 
        transaction.date >= this.filters.dateRange!.start &&
        transaction.date <= this.filters.dateRange!.end
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
} 