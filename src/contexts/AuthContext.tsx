import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../models/User';
import { validateEmail, validatePassword, validateDisplayName } from '../utils/validation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  dataLoading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  signUp: (email: string, password: string, displayName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateUserProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
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

  useEffect(() => {
    // Firebase auth state değişikliklerini dinle
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // Firebase user'ı uygulama User modeline dönüştür
        const appUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setUser(appUser);
        setLoading(false);
        setDataLoading(false);
        setIsInitialLoad(false);
      } else {
        setUser(null);
        
        // Sadece ilk yüklemede auto-login dene
        if (isInitialLoad) {
          try {
            console.log('Initial load: checking for saved credentials...');
            const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
            if (rememberMe === 'true') {
              const email = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
              const password = await AsyncStorage.getItem(SAVED_PASSWORD_KEY);
              
              if (email && password) {
                console.log('Attempting auto-login with saved credentials...');
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
        } else {
          console.log('Not initial load, skipping auto-login');
        }
        
        setLoading(false);
        setDataLoading(false);
        setIsInitialLoad(false);
      }
    });

    return () => unsubscribe();
  }, [isInitialLoad]);

  const signIn = async (email: string, password: string, rememberMe?: boolean): Promise<boolean> => {
    try {
      // Email validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        Alert.alert('Giriş Hatası', emailValidation.message);
        return false;
      }

      // Password boş olup olmadığını kontrol et
      if (!password || password.trim().length === 0) {
        Alert.alert('Giriş Hatası', 'Şifre gereklidir.');
        return false;
      }

      setLoading(true);
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
      
      // Firebase hata mesajlarını Türkçe'ye çevir
      let errorMessage = 'Giriş yapılamadı.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Şifre hatalı.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.';
      }
      
      Alert.alert('Giriş Hatası', errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string): Promise<boolean> => {
    try {
      // Email validation
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        Alert.alert('Kayıt Hatası', emailValidation.message);
        return false;
      }

      // Password validation
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        Alert.alert('Kayıt Hatası', `Şifre kuralları:\n${passwordValidation.errors.join('\n')}`);
        return false;
      }

      // Display name validation
      const displayNameValidation = validateDisplayName(displayName);
      if (!displayNameValidation.isValid) {
        Alert.alert('Kayıt Hatası', displayNameValidation.message);
        return false;
      }

      setLoading(true);
      
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
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
        preferences: {
          currency: 'TRY',
          language: 'tr',
          theme: 'light',
          notifications: {
            enabled: true,
            dailyReminder: false,
            weeklyReport: true,
            budgetAlerts: true,
          },
          dateFormat: 'DD/MM/YYYY',
          firstDayOfWeek: 1,
        },
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);
      
      return true;
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      // Firebase hata mesajlarını Türkçe'ye çevir
      let errorMessage = 'Hesap oluşturulamadı.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta adresi zaten kullanımda.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Şifre çok zayıf. En az 6 karakter olmalıdır.';
      }
      
      Alert.alert('Kayıt Hatası', errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('Starting signOut process...'); // Debug log
      setLoading(true);
      console.log('Calling firebaseSignOut...'); // Debug log
      await firebaseSignOut(auth);
      console.log('Firebase signOut successful, clearing credentials...'); // Debug log
      // Çıkış yaparken kaydedilmiş bilgileri temizle
      await clearSavedCredentials();
      console.log('Credentials cleared successfully'); // Debug log
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    } finally {
      setLoading(false);
      console.log('signOut process completed'); // Debug log
    }
  };

  const getSavedCredentials = async (): Promise<{ email: string; password: string } | null> => {
    try {
      const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      if (rememberMe === 'true') {
        const email = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
        const password = await AsyncStorage.getItem(SAVED_PASSWORD_KEY);
        
        if (email && password) {
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
      console.log('Clearing saved credentials..., Platform:', Platform.OS); // Debug log
      await AsyncStorage.removeItem(REMEMBER_ME_KEY);
      console.log('REMEMBER_ME_KEY removed'); // Debug log
      await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
      console.log('SAVED_EMAIL_KEY removed'); // Debug log
      await AsyncStorage.removeItem(SAVED_PASSWORD_KEY);
      console.log('SAVED_PASSWORD_KEY removed'); // Debug log
      console.log('All saved credentials cleared'); // Debug log
    } catch (error) {
      console.error('Error clearing saved credentials:', error);
    }
  };

  const tryAutoLogin = async (): Promise<boolean> => {
    try {
      const savedCredentials = await getSavedCredentials();
      if (savedCredentials) {
        console.log('Saved credentials found, attempting auto-login...');
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