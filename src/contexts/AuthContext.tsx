import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../models/User';
import { validateEmail, validatePassword, validateDisplayName } from '../utils/validation';
import { RecurringPaymentService } from '../services/RecurringPaymentService';
import UserService from '../services/UserService';
import { useError } from './ErrorContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dataLoading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
  deleteUserAccount: (password: string) => Promise<boolean>;
  getSavedCredentials: () => Promise<{ email: string; password: string } | null>;
  clearSavedCredentials: () => Promise<void>;
  tryAutoLogin: () => Promise<boolean>;
}

// AsyncStorage keys
const REMEMBER_ME_KEY = '@paramiyonet_remember_me';
const SAVED_EMAIL_KEY = '@paramiyonet_saved_email';
const SAVED_PASSWORD_KEY = '@paramiyonet_saved_password';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // İlk yükleme kontrolü
  const { showAuthError, showError } = useError();

  useEffect(() => {
    // Firebase auth state değişikliklerini dinle
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setDataLoading(true);
        // Firestore'dan tam kullanıcı verisini çek
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        let appUser: User;

        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Firestore'daki Timestamp'i Date objesine çevir
          const createdAt = userData.createdAt instanceof Timestamp 
            ? userData.createdAt.toDate() 
            : new Date();
          const updatedAt = userData.updatedAt instanceof Timestamp 
            ? userData.updatedAt.toDate()
            : new Date();

          appUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: userData.displayName || firebaseUser.displayName || '',
            photoURL: userData.photoURL || firebaseUser.photoURL || undefined,
            preferences: userData.preferences || {},
            createdAt: createdAt,
            updatedAt: updatedAt,
          };
        } else {
          // Bu durum normalde signUp sonrası olmalı, ancak bir fallback olarak ekleyelim
          appUser = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || undefined,
            photoURL: firebaseUser.photoURL || undefined,
            createdAt: new Date(), // Gerçek kayıt zamanı olmadığı için fallback
            updatedAt: new Date(),
          };
        }
        
        setUser(appUser);
        setLoading(false);
        setDataLoading(false);
        setIsInitialLoad(false);
      } else {
        setUser(null);
        
        // Sadece ilk yüklemede auto-login dene
        if (isInitialLoad) {
          try {
            const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
            if (rememberMe === 'true') {
              const email = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
              const password = await AsyncStorage.getItem(SAVED_PASSWORD_KEY);
              
              if (email && password) {
                // Firebase auth state dinleyici içinde signIn çağırmayalım, 
                // bunun yerine direkt Firebase signIn yapalım
                await signInWithEmailAndPassword(auth, email, password);
                // Bu işlem başarılıysa onAuthStateChanged tekrar tetiklenecek
                return; // Loading'i burada false yapmayalım
              }
            }
          } catch (error) {
            console.error('Auto-login failed:', error);
            // Hatalı kayıtlı bilgileri temizle
            await AsyncStorage.removeItem(REMEMBER_ME_KEY);
            await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
            await AsyncStorage.removeItem(SAVED_PASSWORD_KEY);
          }
        }
        
        setLoading(false);
        setDataLoading(false);
        setIsInitialLoad(false);
      }
    });

    return () => unsubscribe();
  }, [isInitialLoad]);

  // Kullanıcı giriş yaptığında düzenli ödemeleri kontrol et
  useEffect(() => {
    if (user && !loading) {
      // Düzenli ödemeleri arka planda işle
      RecurringPaymentService.processRecurringPayments(user.id)
        .then(() => {
          console.log('Recurring payments processed successfully');
        })
        .catch((error) => {
          console.error('Error processing recurring payments:', error);
        });
    }
  }, [user, loading]);

  const signIn = async (email: string, password: string, rememberMe?: boolean): Promise<boolean> => {
    try {
      // Email validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        showError(emailValidation.message || 'Geçersiz e-posta adresi', 'error', 'Giriş Hatası');
        return false;
      }

      // Password boş olup olmadığını kontrol et
      if (!password || password.trim().length === 0) {
        showError('Şifre gereklidir.', 'error', 'Giriş Hatası');
        return false;
      }

      // Loading'i sadece doğrulama sonrası set et
      setDataLoading(true);
      
      await signInWithEmailAndPassword(auth, email, password);
      
      // Eğer "beni hatırla" seçildiyse bilgileri kaydet
      if (rememberMe) {
        await AsyncStorage.setItem(REMEMBER_ME_KEY, 'true');
        await AsyncStorage.setItem(SAVED_EMAIL_KEY, email);
        await AsyncStorage.setItem(SAVED_PASSWORD_KEY, password);
      } else {
        // "Beni hatırla" seçilmediyse kayıtlı bilgileri temizle
        await clearSavedCredentials();
      }
      
      return true;
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Use global error handler for auth errors
      showAuthError(error.code || 'auth/unknown-error');
      setDataLoading(false); // Error durumunda loading'i false yap
      return false;
    }
    // finally bloğunu kaldırıyoruz çünkü successful giriş durumunda onAuthStateChanged loading'i false yapacak
  };

  const signUp = async (email: string, password: string, displayName: string): Promise<boolean> => {
    try {
      // Email validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        showError(emailValidation.message || 'Geçersiz e-posta adresi', 'error', 'Kayıt Hatası');
        return false;
      }

      // Password validation
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        showError(`Şifre kuralları:\n${passwordValidation.errors.join('\n')}`, 'error', 'Kayıt Hatası');
        return false;
      }

      // Display name validation
      const displayNameValidation = validateDisplayName(displayName);
      if (!displayNameValidation.isValid) {
        showError(displayNameValidation.message || 'Geçersiz kullanıcı adı', 'error', 'Kayıt Hatası');
        return false;
      }

      setDataLoading(true);
      
      // Firebase'de kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Kullanıcı profil bilgisini güncelle
      await updateProfile(userCredential.user, {
        displayName: displayName
      });

      // Firestore'da kullanıcı belgesi oluştur
      const userData = {
        email: email,
        displayName: displayName,
        photoURL: null,
        currency: 'TRY',
        preferences: {
          onboardingCompleted: false
        },
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDocRef, userData);
      
      // onAuthStateChanged tetiklenecek ve kullanıcıyı set edecek
      setDataLoading(false);
      return true;
    } catch (error: any) {
      console.error('Sign up error:', error);
      showAuthError(error.code || 'auth/unknown-error');
      setDataLoading(false);
      return false;
    }
  };

  const deleteUserAccount = async (password: string): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) {
      showError('Oturum bulunamadı. Lütfen tekrar giriş yapın.', 'error', 'Doğrulama Hatası');
      return false;
    }

    setDataLoading(true);
    try {
      // 1. Re-authenticate user
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);

      // 2. Delete all user data from Firestore
      await UserService.deleteAllUserData(currentUser.uid);
      
      // 3. Delete user from Firebase Auth
      await deleteUser(currentUser);

      // onAuthStateChanged will handle the rest (setting user to null)
      showError('Hesabınız başarıyla silindi.', 'success', 'Başarılı');
      return true;

    } catch (error: any) {
      console.error("Failed to delete user account:", error);
      showAuthError(error.code || 'auth/delete-user-failed');
      return false;
    } finally {
      setDataLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      // Çıkış yaparken kaydedilmiş bilgileri temizle
      await clearSavedCredentials();
    } catch (error) {
      console.error('Sign out error:', error);
      showError('Çıkış yapılırken bir hata oluştu.', 'error', 'Hata');
    }
    // onAuthStateChanged otomatik olarak user'ı null yapacak ve loading'i false yapacak
  };

  const getSavedCredentials = async (): Promise<{ email: string; password: string } | null> => {
    try {
      const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      if (rememberMe === 'true') {
        const email = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
        const password = await AsyncStorage.getItem(SAVED_PASSWORD_KEY);
        
        if (email && password) {
          await clearSavedCredentials();
          return { email, password };
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting saved credentials:', error);
      return null;
    }
  };

  const clearSavedCredentials = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(REMEMBER_ME_KEY);
      await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
      await AsyncStorage.removeItem(SAVED_PASSWORD_KEY);
    } catch (error) {
      console.error('Error clearing saved credentials:', error);
    }
  };

  const tryAutoLogin = async (): Promise<boolean> => {
    try {
      const savedCredentials = await getSavedCredentials();
      if (savedCredentials) {
        // Otomatik giriş için direkt Firebase sign in kullanıyoruz,
        // signIn fonksiyonumuzu çağırmayız çünkü o kayıtlı bilgileri silebilir
        await signInWithEmailAndPassword(auth, savedCredentials.email, savedCredentials.password);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Auto-login failed:', error);
      // Hatalı kayıtlı bilgileri temizle
      await clearSavedCredentials();
      return false;
    }
  };

  const updateUserProfile = async (updates: { displayName?: string; photoURL?: string }): Promise<void> => {
    try {
      if (!auth.currentUser) {
        throw new Error('No authenticated user');
      }
      
      setLoading(true);
      await updateProfile(auth.currentUser, updates);
      
      // Update local user state
      if (user) {
        const updatedUser: User = {
          ...user,
          displayName: updates.displayName || user.displayName,
          photoURL: updates.photoURL || user.photoURL,
          updatedAt: new Date(),
        };
        setUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    dataLoading,
    signIn,
    signUp,
    signOut,
    updateUserProfile,
    deleteUserAccount,
    getSavedCredentials,
    clearSavedCredentials,
    tryAutoLogin,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 