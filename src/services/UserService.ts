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
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
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
}

export default new UserService(); 