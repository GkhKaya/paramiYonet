import { 
  User, 
  UpdateUserRequest, 
  DEFAULT_USER_PREFERENCES,
  COLLECTIONS 
} from '../models';
import { auth, db } from '../config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  deleteUser,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';

class UserService {
  async register(email: string, password: string, displayName?: string): Promise<User> {
    try {
      // Firebase Auth'da kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Firestore'da kullanıcı profili oluştur
      const userData: Omit<User, 'id'> = {
        email: firebaseUser.email!,
        displayName: displayName || '',
        currency: 'TRY',
        createdAt: new Date(),
        updatedAt: new Date(),
        preferences: DEFAULT_USER_PREFERENCES,
      };

      await setDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        id: firebaseUser.uid,
        ...userData,
      };
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Kullanıcı profilini getir
      const userProfile = await this.getUserProfile(firebaseUser.uid);
      return userProfile;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  async getUserProfile(userId: string): Promise<User> {
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }

    const userData = userDoc.data();
    return {
      id: userDoc.id,
      email: userData.email,
      displayName: userData.displayName,
      currency: userData.currency,
      createdAt: userData.createdAt?.toDate() || new Date(),
      updatedAt: userData.updatedAt?.toDate() || new Date(),
      preferences: userData.preferences || DEFAULT_USER_PREFERENCES,
    };
  }

  async updateUserProfile(userId: string, updates: UpdateUserRequest): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  getCurrentUserId(): string | null {
    return auth.currentUser?.uid || null;
  }

  async deleteUserAccount(userId: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // 1. Kullanıcının tüm işlemlerini sil
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      transactionsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      // 2. Kullanıcının hesaplarını sil
      const accountsQuery = query(
        collection(db, 'accounts'),
        where('userId', '==', userId)
      );
      const accountsSnapshot = await getDocs(accountsQuery);
      accountsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      // 3. Kullanıcının kategorilerini sil
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('userId', '==', userId)
      );
      const categoriesSnapshot = await getDocs(categoriesQuery);
      categoriesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      // 4. Kullanıcının bütçelerini sil
      const budgetsQuery = query(
        collection(db, 'budgets'),
        where('userId', '==', userId)
      );
      const budgetsSnapshot = await getDocs(budgetsQuery);
      budgetsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      // 5. Kullanıcının tekrarlayan ödemelerini sil
      const recurringQuery = query(
        collection(db, 'recurringPayments'),
        where('userId', '==', userId)
      );
      const recurringSnapshot = await getDocs(recurringQuery);
      recurringSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      // 6. Kullanıcı profilini sil
      batch.delete(doc(db, COLLECTIONS.USERS, userId));

      // Tüm Firestore verilerini sil
      await batch.commit();

      // 7. Firebase Auth hesabını sil
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === userId) {
        await deleteUser(currentUser);
      }

      console.log('User account and all data deleted successfully');
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }
  }
}

export default new UserService(); 