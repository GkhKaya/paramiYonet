import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User as FirebaseUser,
  getAuth
} from 'firebase/auth';
import { useError } from '../../contexts/ErrorContext';
import UserService from '../../services/UserService';
import { User } from '../../models/User';

const auth = getAuth();

interface AuthContextType {
  currentUser: FirebaseUser | null;
  user: User | null; // App-specific user data from Firestore
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (email: string, password: string, displayName: string) => Promise<boolean>;
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
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null); // App-specific user
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const { showAuthError } = useError();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (fbUser) => {
      setCurrentUser(fbUser);
      if (fbUser) {
        try {
          const appUser = await UserService.getUserProfile(fbUser.uid);
          setUser(appUser ?? null);
        } catch (error) {
          console.error("Failed to fetch user profile:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);


  const login = async (email: string, password: string, rememberMe?: boolean): Promise<boolean> => {
    setLoginLoading(true);
    try {
      await UserService.login(email, password);
      // "remember me" logic is handled by firebase persistence now
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      showAuthError(error.code || 'auth/unknown-error');
      return false;
    } finally {
      setLoginLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string): Promise<boolean> => {
    setLoginLoading(true);
    try {
      const newUser = await UserService.register(email, password, displayName);
      if (newUser) {
        setUser(newUser);
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Registration error:', error);
      showAuthError(error.code || 'auth/registration-failed');
      return false;
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await UserService.logout();
      setUser(null);
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    currentUser,
    user,
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