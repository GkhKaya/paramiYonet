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
  Timestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Transaction, TransactionType } from '../models/Transaction';
import { AccountType } from '../models/Account';

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
      const batch = writeBatch(db);
      
      // Create transaction document
      const transactionRef = doc(collection(db, this.COLLECTION_NAME));
      batch.set(transactionRef, {
        ...transactionData,
        date: Timestamp.fromDate(transactionData.date),
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

      // Update account balance or credit card debt
      const accountRef = doc(db, 'accounts', transactionData.accountId);
      const accountDoc = await getDoc(accountRef);
      
      if (!accountDoc.exists()) {
        throw new Error('Hesap bulunamadı');
      }

      const accountData = accountDoc.data();
      
      console.log('TransactionService.createTransaction - Account data:', {
        accountId: transactionData.accountId,
        accountType: accountData.type,
        currentDebt: accountData.currentDebt,
        transactionType: transactionData.type,
        transactionAmount: transactionData.amount
      });
      
      // Check if this is a credit card account
      if (accountData.type === AccountType.CREDIT_CARD) {
        // For credit card transactions, update currentDebt instead of balance
        const currentDebt = accountData.currentDebt || 0;
        let newDebt: number;
        
        if (transactionData.type === TransactionType.EXPENSE) {
          // Credit card expense increases debt
          newDebt = currentDebt + transactionData.amount;
        } else {
          // Credit card payment (income) decreases debt
          newDebt = Math.max(0, currentDebt - transactionData.amount);
        }

        console.log('Credit card debt update:', {
          oldDebt: currentDebt,
          newDebt: newDebt,
          transactionType: transactionData.type,
          amount: transactionData.amount
        });

        batch.update(accountRef, { 
          currentDebt: newDebt,
          updatedAt: Timestamp.fromDate(now)
        });
      } else {
        // For regular accounts, update balance
        const currentBalance = accountData.balance || 0;
      let newBalance: number;
        
      if (transactionData.type === TransactionType.INCOME) {
        newBalance = currentBalance + transactionData.amount;
      } else {
        newBalance = currentBalance - transactionData.amount;
      }

      batch.update(accountRef, { 
        balance: newBalance,
        updatedAt: Timestamp.fromDate(now)
      });
      }

      // Execute batch write
      await batch.commit();

      return {
        id: transactionRef.id,
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
      const now = new Date();
      const batch = writeBatch(db);
      
      const transactionRef = doc(db, this.COLLECTION_NAME, id);
      
      // Get current transaction to calculate balance difference
      const currentTransactionDoc = await getDoc(transactionRef);
      if (!currentTransactionDoc.exists()) {
        throw new Error('İşlem bulunamadı');
      }
      
      const currentTransaction = currentTransactionDoc.data();
      
      const updateData: any = {
        ...updates,
        updatedAt: Timestamp.fromDate(now),
      };

      // Convert date to Timestamp if provided
      if (updates.date) {
        updateData.date = Timestamp.fromDate(updates.date);
      }

      batch.update(transactionRef, updateData);

      // Update account balance or credit card debt if amount or type changed
      if (updates.amount !== undefined || updates.type !== undefined) {
        const accountId = updates.accountId || currentTransaction.accountId;
        const accountRef = doc(db, 'accounts', accountId);
        const accountDoc = await getDoc(accountRef);
        
        if (!accountDoc.exists()) {
          throw new Error('Hesap bulunamadı');
        }

        const accountData = accountDoc.data();
        
        if (accountData.type === AccountType.CREDIT_CARD) {
          // For credit card accounts, update currentDebt
          let currentDebt = accountData.currentDebt || 0;
          
          // Revert old transaction effect
          if (currentTransaction.type === TransactionType.EXPENSE) {
            currentDebt -= currentTransaction.amount;
          } else {
            currentDebt += currentTransaction.amount;
          }
          
          // Apply new transaction effect
          const newAmount = updates.amount !== undefined ? updates.amount : currentTransaction.amount;
          const newType = updates.type !== undefined ? updates.type : currentTransaction.type;
          
          if (newType === TransactionType.EXPENSE) {
            currentDebt += newAmount;
          } else {
            currentDebt = Math.max(0, currentDebt - newAmount);
          }

          batch.update(accountRef, { 
            currentDebt: Math.max(0, currentDebt),
            updatedAt: Timestamp.fromDate(now)
          });
        } else {
          // For regular accounts, update balance
        let currentBalance = accountData.balance || 0;
        
        // Revert old transaction effect
        if (currentTransaction.type === TransactionType.INCOME) {
          currentBalance -= currentTransaction.amount;
        } else {
          currentBalance += currentTransaction.amount;
        }
        
        // Apply new transaction effect
        const newAmount = updates.amount !== undefined ? updates.amount : currentTransaction.amount;
        const newType = updates.type !== undefined ? updates.type : currentTransaction.type;
        
        if (newType === TransactionType.INCOME) {
          currentBalance += newAmount;
        } else {
          currentBalance -= newAmount;
        }

        batch.update(accountRef, { 
          balance: currentBalance,
          updatedAt: Timestamp.fromDate(now)
        });
        }
      }

      await batch.commit();
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error('İşlem güncellenemedi');
    }
  }

  // Delete a transaction
  static async deleteTransaction(id: string): Promise<void> {
    try {
      const now = new Date();
      const batch = writeBatch(db);
      
      const transactionRef = doc(db, this.COLLECTION_NAME, id);
      
      // Get transaction to revert its balance effect
      const transactionDoc = await getDoc(transactionRef);
      if (!transactionDoc.exists()) {
        throw new Error('İşlem bulunamadı');
      }
      
      const transactionData = transactionDoc.data();
      
      // Delete transaction
      batch.delete(transactionRef);
      
      // Revert account balance or credit card debt
      const accountRef = doc(db, 'accounts', transactionData.accountId);
      const accountDoc = await getDoc(accountRef);
      
      if (!accountDoc.exists()) {
        throw new Error('Hesap bulunamadı');
      }

      const accountData = accountDoc.data();
      
      if (accountData.type === AccountType.CREDIT_CARD) {
        // For credit card accounts, revert currentDebt
        let currentDebt = accountData.currentDebt || 0;
        
        // Revert transaction effect
        if (transactionData.type === TransactionType.EXPENSE) {
          currentDebt -= transactionData.amount;
        } else {
          currentDebt += transactionData.amount;
        }

        batch.update(accountRef, { 
          currentDebt: Math.max(0, currentDebt),
          updatedAt: Timestamp.fromDate(now)
        });
      } else {
        // For regular accounts, revert balance
      let currentBalance = accountData.balance || 0;
      
      // Revert transaction effect
      if (transactionData.type === TransactionType.INCOME) {
        currentBalance -= transactionData.amount;
      } else {
        currentBalance += transactionData.amount;
      }

      batch.update(accountRef, { 
        balance: currentBalance,
        updatedAt: Timestamp.fromDate(now)
      });
      }

      await batch.commit();
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