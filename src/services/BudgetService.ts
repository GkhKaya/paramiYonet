import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
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
import { Budget } from '../models/Budget';

export class BudgetService {
  private static readonly COLLECTION_NAME = 'budgets';

  static async createBudget(budget: Omit<Budget, 'id'>): Promise<string> {
    try {
      const budgetData = {
        userId: budget.userId,
        categoryName: budget.categoryName,
        categoryIcon: budget.categoryIcon,
        categoryColor: budget.categoryColor,
        budgetedAmount: budget.budgetedAmount,
        spentAmount: 0, // Başlangıçta 0
        remainingAmount: budget.budgetedAmount, // Başlangıçta tam tutar
        progressPercentage: 0, // Başlangıçta 0%
        period: budget.period,
        startDate: Timestamp.fromDate(budget.startDate),
        endDate: Timestamp.fromDate(budget.endDate),
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), budgetData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating budget:', error);
      throw error;
    }
  }

  static async getBudgets(userId: string): Promise<Budget[]> {
    try {
      // Simplified query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const budgets: Budget[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        budgets.push({
          id: doc.id,
          userId: data.userId,
          categoryName: data.categoryName,
          categoryIcon: data.categoryIcon,
          categoryColor: data.categoryColor,
          budgetedAmount: data.budgetedAmount,
          spentAmount: data.spentAmount,
          remainingAmount: data.remainingAmount,
          progressPercentage: data.progressPercentage,
          period: data.period,
          startDate: this.toDateSafe(data.startDate),
          endDate: this.toDateSafe(data.endDate),
          createdAt: this.toDateSafe(data.createdAt),
          updatedAt: data.updatedAt ? this.toDateSafe(data.updatedAt) : this.toDateSafe(data.createdAt),
        });
      });

      // Sort by createdAt in memory instead of in query
      budgets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return budgets;
    } catch (error) {
      console.error('Error getting budgets:', error);
      throw error;
    }
  }

  static async getActiveBudgets(userId: string): Promise<Budget[]> {
    try {
      const now = new Date();
      // Simplified query without orderBy to avoid composite index requirement
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('endDate', '>=', Timestamp.fromDate(now))
      );

      const querySnapshot = await getDocs(q);
      const budgets: Budget[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        budgets.push({
          id: doc.id,
          userId: data.userId,
          categoryName: data.categoryName,
          categoryIcon: data.categoryIcon,
          categoryColor: data.categoryColor,
          budgetedAmount: data.budgetedAmount,
          spentAmount: data.spentAmount,
          remainingAmount: data.remainingAmount,
          progressPercentage: data.progressPercentage,
          period: data.period,
          startDate: data.startDate.toDate(),
          endDate: data.endDate.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt?.toDate() || data.createdAt.toDate(),
        });
      });

      // Sort by endDate in memory instead of in query
      budgets.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

      return budgets;
    } catch (error) {
      console.error('Error getting active budgets:', error);
      throw error;
    }
  }

  static async updateBudget(budgetId: string, updates: Partial<Budget>): Promise<void> {
    try {
      const budgetRef = doc(db, this.COLLECTION_NAME, budgetId);
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

      await updateDoc(budgetRef, {
        ...updateData,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error updating budget:', error);
      throw error;
    }
  }

  static async deleteBudget(budgetId: string): Promise<void> {
    try {
      const budgetRef = doc(db, this.COLLECTION_NAME, budgetId);
      await deleteDoc(budgetRef);
    } catch (error) {
      console.error('Error deleting budget:', error);
      throw error;
    }
  }

  static async updateBudgetProgress(budgetId: string, spentAmount: number, budgetedAmount: number): Promise<void> {
    try {
      const remainingAmount = Math.max(0, budgetedAmount - spentAmount);
      const progressPercentage = budgetedAmount > 0 ? (spentAmount / budgetedAmount) * 100 : 0;

      await this.updateBudget(budgetId, {
        spentAmount,
        remainingAmount,
        progressPercentage,
      });
    } catch (error) {
      console.error('Error updating budget progress:', error);
      throw error;
    }
  }

  // Real-time listener for budgets
  static listenToBudgets(userId: string, callback: (budgets: Budget[]) => void): () => void {
    // Simplified query without orderBy to avoid composite index requirement
    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const budgets: Budget[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          budgets.push({
            id: doc.id,
            userId: data.userId,
            categoryName: data.categoryName,
            categoryIcon: data.categoryIcon,
            categoryColor: data.categoryColor,
            budgetedAmount: data.budgetedAmount,
            spentAmount: data.spentAmount,
            remainingAmount: data.remainingAmount,
            progressPercentage: data.progressPercentage,
            period: data.period,
            startDate: this.toDateSafe(data.startDate),
            endDate: this.toDateSafe(data.endDate),
            createdAt: this.toDateSafe(data.createdAt),
            updatedAt: data.updatedAt ? this.toDateSafe(data.updatedAt) : this.toDateSafe(data.createdAt),
          });
        });
        
        // Sort by createdAt in memory instead of in query
        budgets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        callback(budgets);
      },
      (error) => {
        console.error('Error listening to budgets:', error);
      }
    );

    return unsubscribe;
  }

  private static toDateSafe(val: any): Date {
    if (!val) return new Date();
    if (val.toDate) return val.toDate();
    if (typeof val === 'string' || typeof val === 'number') return new Date(val);
    return val as Date;
  }
} 