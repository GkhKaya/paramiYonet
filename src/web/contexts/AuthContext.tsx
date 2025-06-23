import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useError } from '../../contexts/ErrorContext';

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  loginLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const { showAuthError } = useError();

  const login = async (email: string, password: string, rememberMe?: boolean): Promise<void> => {
    try {
      setLoginLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      
      // Eğer "beni hatırla" seçildiyse bilgileri kaydet
      if (rememberMe) {
        localStorage.setItem('paramiyonet_remember_me', 'true');
        localStorage.setItem('paramiyonet_saved_email', email);
        localStorage.setItem('paramiyonet_saved_password', password);
      } else {
        // "Beni hatırla" seçilmediyse kayıtlı bilgileri temizle
        localStorage.removeItem('paramiyonet_remember_me');
        localStorage.removeItem('paramiyonet_saved_email');
        localStorage.removeItem('paramiyonet_saved_password');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      showAuthError(error.code || 'auth/unknown-error');
      setLoginLoading(false);
      throw error;
    }
    // Successful login durumunda onAuthStateChanged loginLoading'i false yapacak
  };

  const register = async (email: string, password: string, displayName: string): Promise<void> => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      if (result.user) {
        await updateProfile(result.user, { displayName });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      showAuthError(error.code || 'auth/unknown-error');
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Kayıtlı bilgileri temizle
      localStorage.removeItem('paramiyonet_remember_me');
      localStorage.removeItem('paramiyonet_saved_email');
      localStorage.removeItem('paramiyonet_saved_password');
      
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  useEffect(() => {
    let isInitialLoad = true;
    let isAutoLoginAttempted = false;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setLoading(false);
        setLoginLoading(false);
        isInitialLoad = false;
      } else {
        // Sadece ilk yüklemede ve daha önce denenmemişse auto-login dene
        if (isInitialLoad && !isAutoLoginAttempted) {
          isAutoLoginAttempted = true;
          try {
            const rememberMe = localStorage.getItem('paramiyonet_remember_me');
            if (rememberMe === 'true') {
              const email = localStorage.getItem('paramiyonet_saved_email');
              const password = localStorage.getItem('paramiyonet_saved_password');
              
              if (email && password) {
                console.log('Attempting auto-login...');
                await signInWithEmailAndPassword(auth, email, password);
                return; // onAuthStateChanged tekrar tetiklenecek
              }
            }
          } catch (error) {
            console.error('Auto-login failed:', error);
            // Hatalı kayıtlı bilgileri temizle
            localStorage.removeItem('paramiyonet_remember_me');
            localStorage.removeItem('paramiyonet_saved_email');
            localStorage.removeItem('paramiyonet_saved_password');
          }
        }
        
        setCurrentUser(null);
        setLoading(false);
        isInitialLoad = false;
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    login,
    register,
    logout,
    loading,
    loginLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 