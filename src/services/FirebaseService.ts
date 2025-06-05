import { auth, db } from '../config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  User as FirebaseUser,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
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
  limit,
  Timestamp,
  DocumentReference,
  QuerySnapshot,
  DocumentSnapshot,
  setDoc,
} from 'firebase/firestore';
import { Transaction, TransactionType } from '../models/Transaction';
import { User as UserModel } from '../models/User';

class FirebaseService {
  // Authentication methods
  async signUp(email: string, password: string): Promise<FirebaseUser> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }

  async signIn(email: string, password: string): Promise<FirebaseUser> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }

  async signOut(): Promise<void> {
    await signOut(auth);
  }

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  // Firestore methods
  async addDocument(collectionName: string, data: any): Promise<string> {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  }

  async getDocuments(collectionName: string): Promise<any[]> {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getDocument(collectionName: string, docId: string): Promise<any | null> {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  }

  async updateDocument(collectionName: string, docId: string, data: any): Promise<void> {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data);
  }

  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  }

  async queryDocuments(
    collectionName: string, 
    field: string, 
    operator: any, 
    value: any
  ): Promise<any[]> {
    const q = query(collection(db, collectionName), where(field, operator, value));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

// Collection references
const COLLECTIONS = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  BUDGETS: 'budgets',
};

// User Operations
export class UserService {
  static async createUser(user: UserModel): Promise<string> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, user.id);
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        currency: user.currency,
        createdAt: Timestamp.fromDate(user.createdAt),
        updatedAt: Timestamp.fromDate(new Date()),
        preferences: user.preferences,
      });
      return user.id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async getUser(userId: string): Promise<UserModel | null> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          id: userSnap.id,
          email: data.email,
          displayName: data.displayName,
          photoURL: data.photoURL,
          currency: data.currency,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          preferences: data.preferences,
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  static async updateUser(userId: string, updates: Partial<UserModel>): Promise<void> {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userId);
      const updateData: any = { ...updates };
      
      // Remove id from updates if present
      delete updateData.id;
      
      await updateDoc(userRef, {
        ...updateData,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
}

// Transaction Operations
export class TransactionService {
  static async createTransaction(transaction: Omit<Transaction, 'id'>): Promise<string> {
    try {
      const transactionData = {
        userId: transaction.userId,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        category: transaction.category,
        categoryIcon: transaction.categoryIcon,
        accountId: transaction.accountId || 'default',
        date: Timestamp.fromDate(transaction.date),
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), transactionData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  static async getTransactions(userId: string, monthStart?: Date, monthEnd?: Date): Promise<Transaction[]> {
    try {
      let q = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );

      // If month range is provided, filter by date
      if (monthStart && monthEnd) {
        q = query(
          collection(db, COLLECTIONS.TRANSACTIONS),
          where('userId', '==', userId),
          where('date', '>=', Timestamp.fromDate(monthStart)),
          where('date', '<=', Timestamp.fromDate(monthEnd)),
          orderBy('date', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          userId: data.userId,
          type: data.type as TransactionType,
          amount: data.amount,
          description: data.description,
          category: data.category,
          categoryIcon: data.categoryIcon,
          accountId: data.accountId || 'default',
          date: data.date.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }
  }

  static async updateTransaction(transactionId: string, updates: Partial<Transaction>): Promise<void> {
    try {
      const transactionRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
      const updateData: any = { ...updates };

      // Remove id from updates if present
      delete updateData.id;

      // Convert date to Timestamp if provided
      if (updates.date) {
        updateData.date = Timestamp.fromDate(updates.date);
      }

      await updateDoc(transactionRef, {
        ...updateData,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  static async deleteTransaction(transactionId: string): Promise<void> {
    try {
      const transactionRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
      await deleteDoc(transactionRef);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  static async getTransactionsByType(userId: string, type: TransactionType, limitCount: number = 10): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        where('userId', '==', userId),
        where('type', '==', type),
        orderBy('date', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const transactions: Transaction[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          userId: data.userId,
          type: data.type as TransactionType,
          amount: data.amount,
          description: data.description,
          category: data.category,
          categoryIcon: data.categoryIcon,
          accountId: data.accountId || 'default',
          date: data.date.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      return transactions;
    } catch (error) {
      console.error('Error getting transactions by type:', error);
      throw error;
    }
  }

  static async getMonthlyStats(userId: string, monthStart: Date, monthEnd: Date) {
    try {
      const transactions = await this.getTransactions(userId, monthStart, monthEnd);
      
      let totalIncome = 0;
      let totalExpense = 0;

      transactions.forEach((transaction) => {
        if (transaction.type === TransactionType.INCOME) {
          totalIncome += transaction.amount;
        } else {
          totalExpense += transaction.amount;
        }
      });

      const netAmount = totalIncome - totalExpense;

      return {
        totalIncome,
        totalExpense,
        netAmount,
        transactionCount: transactions.length,
      };
    } catch (error) {
      console.error('Error getting monthly stats:', error);
      throw error;
    }
  }
}

// Analytics and Reports
export class AnalyticsService {
  static async getCategorySpending(userId: string, monthStart: Date, monthEnd: Date, type?: TransactionType) {
    try {
      const transactions = await TransactionService.getTransactions(userId, monthStart, monthEnd);
      
      const categoryTotals: Record<string, number> = {};

      transactions
        .filter(t => !type || t.type === type)
        .forEach((transaction) => {
          if (!categoryTotals[transaction.category]) {
            categoryTotals[transaction.category] = 0;
          }
          categoryTotals[transaction.category] += transaction.amount;
        });

      // Convert to sorted array
      return Object.entries(categoryTotals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);
    } catch (error) {
      console.error('Error getting category spending:', error);
      throw error;
    }
  }

  static async getWeeklySpending(userId: string, weeks: number = 4) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (weeks * 7));

      const transactions = await TransactionService.getTransactions(userId, startDate, endDate);
      
      const weeklyData: Record<string, { income: number; expense: number }> = {};

      transactions.forEach((transaction) => {
        const weekKey = getWeekKey(transaction.date);
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { income: 0, expense: 0 };
        }

        if (transaction.type === TransactionType.INCOME) {
          weeklyData[weekKey].income += transaction.amount;
        } else {
          weeklyData[weekKey].expense += transaction.amount;
        }
      });

      return weeklyData;
    } catch (error) {
      console.error('Error getting weekly spending:', error);
      throw error;
    }
  }
}

// Helper functions
const getWeekKey = (date: Date): string => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  return startOfWeek.toISOString().split('T')[0];
};

// Security Services
export class SecurityService {
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }

      // Mevcut şifre ile yeniden kimlik doğrulama
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Şifreyi güncelle
      await updatePassword(user, newPassword);
    } catch (error: any) {
      console.error('Error changing password:', error);
      
      if (error.code === 'auth/wrong-password') {
        throw new Error('Mevcut şifre hatalı');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Yeni şifre çok zayıf. En az 6 karakter olmalıdır.');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('Bu işlem için tekrar giriş yapmanız gerekiyor');
      }
      
      throw error;
    }
  }

  static async changeEmail(newEmail: string, currentPassword: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }

      // Mevcut şifre ile yeniden kimlik doğrulama
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // E-posta adresini güncelle
      await updateEmail(user, newEmail);

      // Firestore'daki kullanıcı bilgilerini de güncelle
      await UserService.updateUser(user.uid, { email: newEmail });
    } catch (error: any) {
      console.error('Error changing email:', error);
      
      if (error.code === 'auth/wrong-password') {
        throw new Error('Şifre hatalı');
      } else if (error.code === 'auth/email-already-in-use') {
        throw new Error('Bu e-posta adresi zaten kullanımda');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Geçersiz e-posta adresi');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('Bu işlem için tekrar giriş yapmanız gerekiyor');
      }
      
      throw error;
    }
  }

  static async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      
      if (error.code === 'auth/user-not-found') {
        throw new Error('Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Geçersiz e-posta adresi');
      }
      
      throw error;
    }
  }
}

export default new FirebaseService(); 