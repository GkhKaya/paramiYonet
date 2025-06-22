import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { RecurringPayment } from '../models/RecurringPayment';
import { TransactionService } from './TransactionService';
import { TransactionType } from '../models/Transaction';

export class RecurringPaymentService {
  private static readonly COLLECTION_NAME = 'recurringPayments';

  static async createRecurringPayment(payment: Omit<RecurringPayment, 'id'>): Promise<string> {
    try {
      const paymentData = {
        userId: payment.userId,
        name: payment.name,
        description: payment.description || '',
        amount: payment.amount,
        category: payment.category,
        categoryIcon: payment.categoryIcon || '',
        accountId: payment.accountId,
        frequency: payment.frequency,
        startDate: Timestamp.fromDate(payment.startDate),
        endDate: payment.endDate ? Timestamp.fromDate(payment.endDate) : null,
        nextPaymentDate: Timestamp.fromDate(payment.nextPaymentDate),
        lastPaymentDate: payment.lastPaymentDate ? Timestamp.fromDate(payment.lastPaymentDate) : null,
        isActive: payment.isActive,
        autoCreateTransaction: payment.autoCreateTransaction,
        reminderDays: payment.reminderDays,
        totalPaid: payment.totalPaid,
        paymentCount: payment.paymentCount,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), paymentData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating recurring payment:', error);
      throw error;
    }
  }

  static async getRecurringPayments(userId: string): Promise<RecurringPayment[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const payments: RecurringPayment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        payments.push({
          id: doc.id,
          userId: data.userId,
          name: data.name,
          description: data.description,
          amount: data.amount,
          category: data.category,
          categoryIcon: data.categoryIcon,
          accountId: data.accountId,
          frequency: data.frequency,
          startDate: data.startDate.toDate(),
          endDate: data.endDate?.toDate() || undefined,
          nextPaymentDate: data.nextPaymentDate.toDate(),
          lastPaymentDate: data.lastPaymentDate?.toDate() || undefined,
          isActive: data.isActive,
          autoCreateTransaction: data.autoCreateTransaction,
          reminderDays: data.reminderDays,
          totalPaid: data.totalPaid,
          paymentCount: data.paymentCount,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt?.toDate() || data.createdAt.toDate(),
        });
      });

      // Sort by nextPaymentDate
      payments.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());

      return payments;
    } catch (error) {
      console.error('Error getting recurring payments:', error);
      throw error;
    }
  }

  static async getActiveRecurringPayments(userId: string): Promise<RecurringPayment[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const payments: RecurringPayment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        payments.push({
          id: doc.id,
          userId: data.userId,
          name: data.name,
          description: data.description,
          amount: data.amount,
          category: data.category,
          categoryIcon: data.categoryIcon,
          accountId: data.accountId,
          frequency: data.frequency,
          startDate: data.startDate.toDate(),
          endDate: data.endDate?.toDate() || undefined,
          nextPaymentDate: data.nextPaymentDate.toDate(),
          lastPaymentDate: data.lastPaymentDate?.toDate() || undefined,
          isActive: data.isActive,
          autoCreateTransaction: data.autoCreateTransaction,
          reminderDays: data.reminderDays,
          totalPaid: data.totalPaid,
          paymentCount: data.paymentCount,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt?.toDate() || data.createdAt.toDate(),
        });
      });

      // Sort by nextPaymentDate
      payments.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());

      return payments;
    } catch (error) {
      console.error('Error getting active recurring payments:', error);
      throw error;
    }
  }

  static async updateRecurringPayment(paymentId: string, updates: Partial<RecurringPayment>): Promise<void> {
    try {
      const paymentRef = doc(db, this.COLLECTION_NAME, paymentId);
      const updateData: any = { ...updates };

      // Remove id from updates if present
      delete updateData.id;

      // Convert dates to Timestamp if provided
      if (updates.startDate) {
        updateData.startDate = Timestamp.fromDate(updates.startDate);
      }
      if (updates.endDate) {
        updateData.endDate = Timestamp.fromDate(updates.endDate);
      }
      if (updates.nextPaymentDate) {
        updateData.nextPaymentDate = Timestamp.fromDate(updates.nextPaymentDate);
      }
      if (updates.lastPaymentDate) {
        updateData.lastPaymentDate = Timestamp.fromDate(updates.lastPaymentDate);
      }

      await updateDoc(paymentRef, {
        ...updateData,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error updating recurring payment:', error);
      throw error;
    }
  }

  static async deleteRecurringPayment(paymentId: string): Promise<void> {
    try {
      const paymentRef = doc(db, this.COLLECTION_NAME, paymentId);
      await deleteDoc(paymentRef);
    } catch (error) {
      console.error('Error deleting recurring payment:', error);
      throw error;
    }
  }

  // Calculate next payment date based on frequency
  static calculateNextPaymentDate(currentDate: Date, frequency: string): Date {
    const next = new Date(currentDate);
    
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    
    return next;
  }

  // Process payment (update payment record)
  static async processPayment(paymentId: string): Promise<void> {
    try {
      const paymentRef = doc(db, this.COLLECTION_NAME, paymentId);
      const paymentDoc = await getDoc(paymentRef);
      
      if (!paymentDoc.exists()) {
        throw new Error('Recurring payment not found');
      }

      const paymentData = paymentDoc.data();
      const currentNextPayment = paymentData.nextPaymentDate.toDate();
      const newNextPayment = this.calculateNextPaymentDate(currentNextPayment, paymentData.frequency);

      await updateDoc(paymentRef, {
        lastPaymentDate: Timestamp.fromDate(currentNextPayment),
        nextPaymentDate: Timestamp.fromDate(newNextPayment),
        totalPaid: paymentData.totalPaid + paymentData.amount,
        paymentCount: paymentData.paymentCount + 1,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  // Real-time listener for recurring payments
  static listenToRecurringPayments(userId: string, callback: (payments: RecurringPayment[]) => void): () => void {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const payments: RecurringPayment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          payments.push({
            id: doc.id,
            userId: data.userId,
            name: data.name,
            description: data.description,
            amount: data.amount,
            category: data.category,
            categoryIcon: data.categoryIcon,
            accountId: data.accountId,
            frequency: data.frequency,
            startDate: data.startDate.toDate(),
            endDate: data.endDate?.toDate() || undefined,
            nextPaymentDate: data.nextPaymentDate.toDate(),
            lastPaymentDate: data.lastPaymentDate?.toDate() || undefined,
            isActive: data.isActive,
            autoCreateTransaction: data.autoCreateTransaction,
            reminderDays: data.reminderDays,
            totalPaid: data.totalPaid,
            paymentCount: data.paymentCount,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt?.toDate() || data.createdAt.toDate(),
          });
        });
        
        // Sort by nextPaymentDate
        payments.sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime());
        
        callback(payments);
      },
      (error) => {
        console.error('Error listening to recurring payments:', error);
      }
    );

    return unsubscribe;
  }

  // Process all due recurring payments for a user
  static async processRecurringPayments(userId: string): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('isActive', '==', true),
        where('autoCreateTransaction', '==', true)
      );

      const querySnapshot = await getDocs(q);
      const duePayments: RecurringPayment[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const nextPaymentDate = data.nextPaymentDate.toDate();
        nextPaymentDate.setHours(0, 0, 0, 0);
        
        // Check if payment is due (nextPaymentDate <= today)
        if (nextPaymentDate <= today) {
          duePayments.push({
            id: doc.id,
            userId: data.userId,
            name: data.name,
            description: data.description,
            amount: data.amount,
            category: data.category,
            categoryIcon: data.categoryIcon,
            accountId: data.accountId,
            frequency: data.frequency,
            startDate: data.startDate.toDate(),
            endDate: data.endDate?.toDate() || undefined,
            nextPaymentDate: data.nextPaymentDate.toDate(),
            lastPaymentDate: data.lastPaymentDate?.toDate() || undefined,
            isActive: data.isActive,
            autoCreateTransaction: data.autoCreateTransaction,
            reminderDays: data.reminderDays,
            totalPaid: data.totalPaid,
            paymentCount: data.paymentCount,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt?.toDate() || data.createdAt.toDate(),
          });
        }
      });

      // Process each due payment
      for (const payment of duePayments) {
        try {
          // Create transaction
          const transactionData = {
            userId: payment.userId,
            amount: payment.amount,
            description: payment.description || payment.name,
            type: payment.amount > 0 ? TransactionType.INCOME : TransactionType.EXPENSE,
            category: payment.category,
            categoryIcon: payment.categoryIcon || 'help-circle-outline',
            accountId: payment.accountId,
            date: payment.nextPaymentDate,
          };

          await TransactionService.createTransaction(transactionData);

          // Update recurring payment
          const newNextPayment = this.calculateNextPaymentDate(payment.nextPaymentDate, payment.frequency);
          
          await this.updateRecurringPayment(payment.id, {
            lastPaymentDate: payment.nextPaymentDate,
            nextPaymentDate: newNextPayment,
            totalPaid: payment.totalPaid + payment.amount,
            paymentCount: payment.paymentCount + 1,
          });

          console.log(`Processed recurring payment: ${payment.name}`);
        } catch (error) {
          console.error(`Error processing recurring payment ${payment.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing recurring payments:', error);
      throw error;
    }
  }
} 