import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction, TransactionType } from '../models/Transaction';

export class TransactionService {
  private static readonly COLLECTION_NAME = 'transactions';

  // Get all transactions for a user
  static async getUserTransactions(userId: string): Promise<Transaction[]> {
    try {
      // Simplified query without orderBy to avoid index requirement
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          userId: data.userId,
          accountId: data.accountId,
          category: data.category,
          categoryIcon: data.categoryIcon,
          type: data.type as TransactionType,
          amount: data.amount,
          description: data.description,
          date: data.date?.toDate() ?? new Date(),
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
        });
      });

      // Sort client-side to avoid index requirement
      transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw new Error('İşlemler yüklenemedi');
    }
  }

  // Get recent transactions (last 10)
  static async getRecentTransactions(userId: string): Promise<Transaction[]> {
    try {
      // Simplified query without orderBy to avoid index requirement
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          userId: data.userId,
          accountId: data.accountId,
          category: data.category,
          categoryIcon: data.categoryIcon,
          type: data.type as TransactionType,
          amount: data.amount,
          description: data.description,
          date: data.date?.toDate() ?? new Date(),
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
        });
      });

      // Sort client-side and limit to 10 most recent
      transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return transactions.slice(0, 10);
    } catch (error) {
      console.error('Error getting recent transactions:', error);
      throw new Error('Son işlemler yüklenemedi');
    }
  }

  // Get transactions for a specific month
  static async getMonthlyTransactions(userId: string, year: number, month: number): Promise<Transaction[]> {
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      // Simplified query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
      );
      
      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          userId: data.userId,
          accountId: data.accountId,
          category: data.category,
          categoryIcon: data.categoryIcon,
          type: data.type as TransactionType,
          amount: data.amount,
          description: data.description,
          date: data.date?.toDate() ?? new Date(),
          createdAt: data.createdAt?.toDate() ?? new Date(),
          updatedAt: data.updatedAt?.toDate() ?? new Date(),
        });
      });

      // Sort client-side to avoid index requirement
      transactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      return transactions;
    } catch (error) {
      console.error('Error getting monthly transactions:', error);
      throw new Error('Aylık işlemler yüklenemedi');
    }
  }

  // Create a new transaction
  static async createTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    try {
      const now = new Date();
      
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), {
        ...transactionData,
        date: Timestamp.fromDate(transactionData.date),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

      return {
        id: docRef.id,
        ...transactionData,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('İşlem kaydedilemedi');
    }
  }

  // Update an existing transaction
  static async updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
      };

      // Convert date to Timestamp if provided
      if (updates.date) {
        updateData.date = Timestamp.fromDate(updates.date);
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error('İşlem güncellenemedi');
    }
  }

  // Delete a transaction
  static async deleteTransaction(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw new Error('İşlem silinemedi');
    }
  }

  // Get monthly statistics
  static async getMonthlyStats(userId: string, year: number, month: number): Promise<{
    totalIncome: number;
    totalExpense: number;
    netAmount: number;
    transactionCount: number;
  }> {
    try {
      const transactions = await this.getMonthlyTransactions(userId, year, month);
      
      let totalIncome = 0;
      let totalExpense = 0;

      transactions.forEach(transaction => {
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
        transactionCount: transactions.length,
      };
    } catch (error) {
      console.error('Error getting monthly stats:', error);
      throw new Error('Aylık istatistikler yüklenemedi');
    }
  }

  // Get category breakdown for a specific period
  static async getCategoryBreakdown(
    userId: string, 
    startDate: Date, 
    endDate: Date, 
    type?: TransactionType
  ): Promise<{ [category: string]: number }> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate)),
        ...(type ? [where('type', '==', type)] : [])
      );
      
      const querySnapshot = await getDocs(q);
      const categoryTotals: { [category: string]: number } = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const category = data.category;
        const amount = data.amount;

        if (categoryTotals[category]) {
          categoryTotals[category] += amount;
        } else {
          categoryTotals[category] = amount;
        }
      });

      return categoryTotals;
    } catch (error) {
      console.error('Error getting category breakdown:', error);
      throw new Error('Kategori analizi yüklenemedi');
    }
  }
} 