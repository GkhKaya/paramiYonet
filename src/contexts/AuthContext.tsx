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
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../models/User';
import { validateEmail, validatePassword, validateDisplayName } from '../utils/validation';
import { RecurringPaymentService } from '../services/RecurringPaymentService';
import UserService from '../services/UserService';
import { UserService as FirebaseUserService } from '../services/FirebaseService';
import { useError } from './ErrorContext';
import CacheService from '../services/CacheService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dataLoading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  signUp: (email: string, password: string, name: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: { name?: string; photoURL?: string }) => Promise<void>;
  deleteUserAccount: (password: string) => Promise<boolean>;
  getSavedCredentials: () => Promise<{ email: string; password: string } | null>;
  clearSavedCredentials: () => Promise<void>;
  tryAutoLogin: () => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
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
        // Use optimized UserService with cache
        const appUser = await FirebaseUserService.getUser(firebaseUser.uid);
        
        if (!appUser) {
          // Fallback if user doesn't exist in Firestore
          const fallbackUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || '',
            currency: 'TRY',
            currencySymbol: '₺',
            currencyFormat: 'TR',
            language: 'tr',
            profilePictureUrl: firebaseUser.photoURL || undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
            onboardingCompleted: false,
          };
          
          // Create user in Firestore
          await FirebaseUserService.createUser(fallbackUser);
          setUser(fallbackUser);
        } else {
          setUser(appUser);
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
                console.log('Attempting auto-login for user:', email);
                // Firebase auth state dinleyici içinde signIn çağırmayalım, 
                // bunun yerine direkt Firebase signIn yapalım
                await signInWithEmailAndPassword(auth, email, password);
                // Bu işlem başarılıysa onAuthStateChanged tekrar tetiklenecek
                console.log('Auto-login successful');
                return; // Loading'i burada false yapmayalım
              }
            }
          } catch (error: any) {
            console.error('Auto-login failed:', error);
            
            // Hata tipine göre farklı davran
            if (error.code === 'auth/invalid-credential' || 
                error.code === 'auth/user-not-found' || 
                error.code === 'auth/wrong-password' ||
                error.code === 'auth/user-disabled') {
              console.log('Clearing invalid saved credentials due to:', error.code);
              // Hatalı kayıtlı bilgileri temizle
              await AsyncStorage.removeItem(REMEMBER_ME_KEY);
              await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
              await AsyncStorage.removeItem(SAVED_PASSWORD_KEY);
            }
            
            // Hata durumunda normal giriş ekranına devam et
            // Error durumunda kullanıcıya bilgi vermeyeceğiz, sessizce login ekranı göstereceğiz
            
            // Geliştirici için debug log
            if (__DEV__) {
              console.warn('Auto-login failed with saved credentials. User will need to login manually.');
            }
            
            // Geliştirici için debug log
            if (__DEV__) {
              console.warn('Auto-login failed with saved credentials. User will need to login manually.');
            }
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

  const forgotPassword = async (email: string): Promise<boolean> => {
    try {
      setDataLoading(true);
      await sendPasswordResetEmail(auth, email);
      setDataLoading(false);
      return true;
    } catch (error: any) {
      showAuthError(error.code || 'auth/unknown-error');
      setDataLoading(false);
      return false;
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<boolean> => {
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
      const displayNameValidation = validateDisplayName(name);
      if (!displayNameValidation.isValid) {
        showError(displayNameValidation.message || 'Geçersiz kullanıcı adı', 'error', 'Kayıt Hatası');
        return false;
      }

      setDataLoading(true);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Firebase Auth profilini güncelle
      await updateProfile(firebaseUser, { displayName: name });
      
      // Firestore'da kullanıcı profili oluştur
      const newUser: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: name,
        currency: 'TRY', // Varsayılan para birimi
        currencySymbol: '₺',
        currencyFormat: 'tr-TR',
        language: 'tr',
        createdAt: new Date(),
        updatedAt: new Date(),
        onboardingCompleted: false,
      };

      await FirebaseUserService.createUser(newUser);
      
      // Lokal state'i güncelle
      setUser(newUser);
      
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

  const updateUserProfile = async (updates: { name?: string; photoURL?: string }): Promise<void> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      showError('Bu işlemi yapmak için giriş yapmalısınız.', 'error', 'Yetkilendirme Hatası');
      return;
    }
  
    setDataLoading(true);
    try {
      // Firebase Auth profilini güncelle
      await updateProfile(firebaseUser, {
        displayName: updates.name,
        photoURL: updates.photoURL,
      });
  
      // Firestore'daki kullanıcı verisini güncelle
      const updateData: { [key: string]: any } = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.photoURL) updateData.profilePictureUrl = updates.photoURL;
      updateData.updatedAt = new Date();
  
      await FirebaseUserService.updateUser(firebaseUser.uid, updateData);
  
      // Lokal state'i güncelle
      if (user) {
        setUser({
          ...user,
          name: updates.name || user.name,
          profilePictureUrl: updates.photoURL || user.profilePictureUrl,
        });
      }
    } catch (error: any) {
      showAuthError(error.code || 'auth/unknown-error');
    } finally {
      setDataLoading(false);
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
    forgotPassword,
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