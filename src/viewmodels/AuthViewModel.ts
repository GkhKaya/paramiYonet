import { makeObservable, observable, action, computed, runInAction } from 'mobx';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { BaseViewModel } from './BaseViewModel';
import { User, DEFAULT_USER_PREFERENCES } from '../models/User';
import { SecurityService } from '../services/SecurityService';

export interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  displayName?: string;
}

export interface AuthValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
  general?: string;
}

export class AuthViewModel extends BaseViewModel {
  // Observable properties
  currentUser: User | null = null;
  firebaseUser: FirebaseUser | null = null;
  isAuthenticated: boolean = false;
  isInitialized: boolean = false;
  
  // Form state
  formData: AuthFormData = {
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  };
  
  validationErrors: AuthValidationErrors = {};

  constructor() {
    super();
    makeObservable(this, {
      currentUser: observable,
      firebaseUser: observable,
      isAuthenticated: observable,
      isInitialized: observable,
      formData: observable,
      validationErrors: observable,
      
      // Computed
      isValidEmail: computed,
      isValidPassword: computed,
      isValidDisplayName: computed,
      canSignIn: computed,
      canSignUp: computed,
      
      // Actions
      setFormData: action,
      setValidationErrors: action,
      setCurrentUser: action,
      setFirebaseUser: action,
      setIsAuthenticated: action,
      setIsInitialized: action,
      clearForm: action,
      signIn: action,
      signUp: action,
      logout: action,
      initializeAuth: action,
      forgotPassword: action,
    });

    this.initializeAuth();
  }

  // Computed Properties
  get isValidEmail(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.formData.email);
  }

  get isValidPassword(): boolean {
    return this.formData.password.length >= 6;
  }

  get isValidDisplayName(): boolean {
    return (this.formData.displayName?.trim().length || 0) >= 2;
  }

  get canSignIn(): boolean {
    return this.isValidEmail && this.isValidPassword && !this.isLoading;
  }

  get canSignUp(): boolean {
    return (
      this.isValidEmail &&
      this.isValidPassword &&
      this.isValidDisplayName &&
      this.formData.password === this.formData.confirmPassword &&
      !this.isLoading
    );
  }

  // Actions
  setFormData = (updates: Partial<AuthFormData>) => {
    this.formData = { ...this.formData, ...updates };
    this.validateForm();
  };

  setValidationErrors = (errors: AuthValidationErrors) => {
    this.validationErrors = errors;
  };

  setCurrentUser = (user: User | null) => {
    this.currentUser = user;
  };

  setFirebaseUser = (user: FirebaseUser | null) => {
    this.firebaseUser = user;
  };

  setIsAuthenticated = (isAuthenticated: boolean) => {
    this.isAuthenticated = isAuthenticated;
  };

  setIsInitialized = (isInitialized: boolean) => {
    this.isInitialized = isInitialized;
  };

  clearForm = () => {
    this.formData = {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
    };
    this.validationErrors = {};
  };

  initializeAuth = () => {
    // Temporarily disable Firebase auth state listener for debugging
    runInAction(() => {
      this.setFirebaseUser(null);
      this.setIsAuthenticated(false);
      this.setCurrentUser(null);
      this.setIsInitialized(true);
    });
    
    /* 
    onAuthStateChanged(auth, async (firebaseUser) => {
      runInAction(() => {
        this.setFirebaseUser(firebaseUser);
        this.setIsAuthenticated(!!firebaseUser);
      });

      if (firebaseUser) {
        await this.loadUserProfile(firebaseUser.uid);
      } else {
        runInAction(() => {
          this.setCurrentUser(null);
        });
      }

      runInAction(() => {
        this.setIsInitialized(true);
      });
    });
    */
  };

  signIn = async (email: string, password: string) => {
    return this.executeAsync(async () => {
      try {
        // Security validations
        if (!SecurityService.validateEmail(email)) {
          throw new Error('Geçersiz email formatı');
        }
        
        // Rate limiting check
        if (!SecurityService.checkRateLimit(email)) {
          throw new Error('Çok fazla deneme. Lütfen daha sonra tekrar deneyin.');
        }
        
        // Check login attempts
        if (!SecurityService.recordLoginAttempt(email)) {
          const attemptsLeft = SecurityService.getLoginAttemptsLeft(email);
          throw new Error(`Çok fazla başarısız deneme. ${attemptsLeft} deneme hakkınız kaldı.`);
        }
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Reset login attempts on successful login
        SecurityService.resetLoginAttempts(email);
        
        await this.loadUserProfile(userCredential.user.uid);
        this.clearForm();
        return userCredential.user;
      } catch (error: any) {
        throw new Error(SecurityService.sanitizeError(error));
      }
    });
  };

  signUp = async (email: string, password: string, displayName: string) => {
    return this.executeAsync(async () => {
      try {
        // Security validations
        if (!SecurityService.validateEmail(email)) {
          throw new Error('Geçersiz email formatı');
        }
        
        const passwordValidation = SecurityService.validatePassword(password);
        if (!passwordValidation.isValid) {
          throw new Error(passwordValidation.errors.join(', '));
        }
        
        if (!displayName || displayName.trim().length === 0) {
          throw new Error('İsim gerekli');
        }
        
        const sanitizedDisplayName = SecurityService.sanitizeString(displayName, 50);
        
        // Rate limiting check
        if (!SecurityService.checkRateLimit(email)) {
          throw new Error('Çok fazla deneme. Lütfen daha sonra tekrar deneyin.');
        }
        
        // Firebase Auth'da kullanıcı oluştur
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Kullanıcı profile güncelle
        await updateProfile(firebaseUser, { displayName });

        // Firestore'da kullanıcı profili oluştur
        const userData: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: displayName,
          currency: 'TRY',
          createdAt: new Date(),
          updatedAt: new Date(),
          preferences: {
            ...DEFAULT_USER_PREFERENCES,
            currency: 'TRY',
          },
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), {
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        runInAction(() => {
          this.setCurrentUser(userData);
        });

        this.clearForm();
        return firebaseUser;
      } catch (error: any) {
        throw new Error(this.getAuthErrorMessage(error.code));
      }
    });
  };

  forgotPassword = async (email: string) => {
    return this.executeAsync(async () => {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (error: any) {
        throw new Error(this.getAuthErrorMessage(error.code));
      }
    });
  };

  logout = async () => {
    return this.executeAsync(async () => {
      await signOut(auth);
      runInAction(() => {
        this.setCurrentUser(null);
        this.setFirebaseUser(null);
        this.setIsAuthenticated(false);
      });
    });
  };

  // Private Methods
  private loadUserProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        runInAction(() => {
          this.setCurrentUser({
            ...userData,
            id: userId,
            createdAt: userData.createdAt || new Date(),
            updatedAt: userData.updatedAt || new Date(),
          });
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  private validateForm = () => {
    const errors: AuthValidationErrors = {};

    if (this.formData.email && !this.isValidEmail) {
      errors.email = 'Geçerli bir e-posta adresi girin';
    }

    if (this.formData.password && !this.isValidPassword) {
      errors.password = 'Şifre en az 6 karakter olmalı';
    }

    if (this.formData.displayName && !this.isValidDisplayName) {
      errors.displayName = 'İsim en az 2 karakter olmalı';
    }

    if (
      this.formData.confirmPassword &&
      this.formData.password !== this.formData.confirmPassword
    ) {
      errors.confirmPassword = 'Şifreler eşleşmiyor';
    }

    this.setValidationErrors(errors);
  };

  private getAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı';
      case 'auth/wrong-password':
        return 'Hatalı şifre';
      case 'auth/email-already-in-use':
        return 'Bu e-posta adresi zaten kullanımda';
      case 'auth/weak-password':
        return 'Şifre çok zayıf';
      case 'auth/invalid-email':
        return 'Geçersiz e-posta adresi';
      case 'auth/too-many-requests':
        return 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin';
      case 'auth/network-request-failed':
        return 'İnternet bağlantınızı kontrol edin';
      default:
        return 'Bir hata oluştu. Lütfen tekrar deneyin';
    }
  };
} 