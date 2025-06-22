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
  DocumentData,
  orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Debt, DebtType, DebtStatus, DebtPayment } from '../models/Debt';

export class DebtService {
  private static readonly COLLECTION_NAME = 'debts';

  static async createDebt(debt: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const debtData = {
        userId: debt.userId,
        type: debt.type,
        personName: debt.personName,
        originalAmount: debt.originalAmount,
        currentAmount: debt.currentAmount,
        paidAmount: debt.paidAmount,
        accountId: debt.accountId,
        description: debt.description || '',
        status: debt.status,
        dueDate: debt.dueDate ? Timestamp.fromDate(debt.dueDate) : null,
        payments: debt.payments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          date: Timestamp.fromDate(payment.date),
          description: payment.description || '',
          createdAt: Timestamp.fromDate(payment.createdAt),
        })),
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), debtData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating debt:', error);
      throw error;
    }
  }

  static async getDebts(userId: string): Promise<Debt[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const debts: Debt[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        debts.push({
          id: doc.id,
          userId: data.userId,
          type: data.type,
          personName: data.personName,
          originalAmount: data.originalAmount,
          currentAmount: data.currentAmount,
          paidAmount: data.paidAmount,
          accountId: data.accountId,
          description: data.description,
          status: data.status,
          dueDate: data.dueDate?.toDate() || undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          payments: (data.payments || []).map((payment: any) => ({
            id: payment.id,
            amount: payment.amount,
            date: payment.date.toDate(),
            description: payment.description,
            createdAt: payment.createdAt.toDate(),
          })),
        });
      });

      // Sort client-side to avoid index requirement
      debts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return debts;
    } catch (error) {
      console.error('Error getting debts:', error);
      throw error;
    }
  }

  static async getDebt(debtId: string): Promise<Debt | null> {
    try {
      const debtRef = doc(db, this.COLLECTION_NAME, debtId);
      const debtDoc = await getDoc(debtRef);

      if (!debtDoc.exists()) {
        return null;
      }

      const data = debtDoc.data();
      return {
        id: debtDoc.id,
        userId: data.userId,
        type: data.type,
        personName: data.personName,
        originalAmount: data.originalAmount,
        currentAmount: data.currentAmount,
        paidAmount: data.paidAmount,
        accountId: data.accountId,
        description: data.description,
        status: data.status,
        dueDate: data.dueDate?.toDate() || undefined,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        payments: (data.payments || []).map((payment: any) => ({
          id: payment.id,
          amount: payment.amount,
          date: payment.date.toDate(),
          description: payment.description,
          createdAt: payment.createdAt.toDate(),
        })),
      };
    } catch (error) {
      console.error('Error getting debt:', error);
      throw error;
    }
  }

  static async updateDebt(debtId: string, updates: Partial<Debt>): Promise<void> {
    try {
      const debtRef = doc(db, this.COLLECTION_NAME, debtId);
      const updateData: any = { ...updates };

      // Remove id and dates from updates if present
      delete updateData.id;
      delete updateData.createdAt;

      // Convert dates to Timestamp if provided
      if (updates.dueDate) {
        updateData.dueDate = Timestamp.fromDate(updates.dueDate);
      }
      
      if (updates.payments) {
        updateData.payments = updates.payments.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          date: Timestamp.fromDate(payment.date),
          description: payment.description || '',
          createdAt: Timestamp.fromDate(payment.createdAt),
        }));
      }

      await updateDoc(debtRef, {
        ...updateData,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error updating debt:', error);
      throw error;
    }
  }

  static async addPayment(debtId: string, payment: Omit<DebtPayment, 'id' | 'createdAt'>): Promise<void> {
    try {
      const debt = await this.getDebt(debtId);
      if (!debt) {
        throw new Error('Debt not found');
      }

      const newPayment: DebtPayment = {
        id: Date.now().toString(),
        ...payment,
        createdAt: new Date(),
      };

      const updatedPayments = [...debt.payments, newPayment];
      const newPaidAmount = debt.paidAmount + payment.amount;
      const newCurrentAmount = debt.originalAmount - newPaidAmount;
      
      let newStatus = debt.status;
      if (newCurrentAmount <= 0) {
        newStatus = DebtStatus.PAID;
      } else if (newPaidAmount > 0) {
        newStatus = DebtStatus.PARTIAL;
      }

      await this.updateDebt(debtId, {
        payments: updatedPayments,
        paidAmount: newPaidAmount,
        currentAmount: Math.max(0, newCurrentAmount),
        status: newStatus,
      });
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  }

  static async deleteDebt(debtId: string): Promise<void> {
    try {
      const debtRef = doc(db, this.COLLECTION_NAME, debtId);
      await deleteDoc(debtRef);
    } catch (error) {
      console.error('Error deleting debt:', error);
      throw error;
    }
  }

  // Get debts by account
  static async getDebtsByAccount(userId: string, accountId: string): Promise<Debt[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('accountId', '==', accountId)
      );

      const querySnapshot = await getDocs(q);
      const debts: Debt[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        debts.push({
          id: doc.id,
          userId: data.userId,
          type: data.type,
          personName: data.personName,
          originalAmount: data.originalAmount,
          currentAmount: data.currentAmount,
          paidAmount: data.paidAmount,
          accountId: data.accountId,
          description: data.description,
          status: data.status,
          dueDate: data.dueDate?.toDate() || undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          payments: (data.payments || []).map((payment: any) => ({
            id: payment.id,
            amount: payment.amount,
            date: payment.date.toDate(),
            description: payment.description,
            createdAt: payment.createdAt.toDate(),
          })),
        });
      });

      // Sort client-side to avoid index requirement
      debts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return debts;
    } catch (error) {
      console.error('Error getting debts by account:', error);
      throw error;
    }
  }

  // Real-time listener for debts
  static listenToDebts(userId: string, callback: (debts: Debt[]) => void): () => void {
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const debts: Debt[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          debts.push({
            id: doc.id,
            userId: data.userId,
            type: data.type,
            personName: data.personName,
            originalAmount: data.originalAmount,
            currentAmount: data.currentAmount,
            paidAmount: data.paidAmount,
            accountId: data.accountId,
            description: data.description,
            status: data.status,
            dueDate: data.dueDate?.toDate() || undefined,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            payments: (data.payments || []).map((payment: any) => ({
              id: payment.id,
              amount: payment.amount,
              date: payment.date.toDate(),
              description: payment.description,
              createdAt: payment.createdAt.toDate(),
            })),
          });
        });

        // Sort client-side to avoid index requirement
        debts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        callback(debts);
      },
      (error) => {
        console.error('Error listening to debts:', error);
      }
    );

    return unsubscribe;
  }
} 