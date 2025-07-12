import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';

export interface ErrorState {
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  duration?: number;
  visible: boolean;
}

interface ErrorContextType {
  error: ErrorState | null;
  showError: (message: string, type?: 'error' | 'warning' | 'info' | 'success', title?: string, duration?: number) => void;
  hideError: () => void;
  showAuthError: (errorCode: string) => void;
  showNetworkError: () => void;
  showValidationError: (field: string, message: string) => void;
  showSuccess: (message: string, title?: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [error, setError] = useState<ErrorState | null>(null);

  const showError = (
    message: string, 
    type: 'error' | 'warning' | 'info' | 'success' = 'error',
    title?: string,
    duration?: number
  ) => {
    const errorState: ErrorState = {
      message,
      type,
      title,
      duration: duration || (type === 'success' ? 3000 : 5000),
      visible: true
    };

    setError(errorState);

    // Web platformu için Alert kullan
    if (Platform.OS === 'web') {
      Alert.alert(title || getDefaultTitle(type), message);
    }

    // Auto hide after duration
    if (duration !== -1) { // -1 means manual hide only
      setTimeout(() => {
        hideError();
      }, errorState.duration);
    }
  };

  const hideError = () => {
    setError(null);
  };

  const showAuthError = (errorCode: string) => {
    let title = 'Kimlik Doğrulama Hatası';
    let message = 'Beklenmeyen bir hata oluştu.';

    switch (errorCode) {
      case 'auth/user-not-found':
        message = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.';
        break;
      case 'auth/wrong-password':
        message = 'Şifre hatalı.';
        break;
      case 'auth/invalid-email':
        message = 'Geçersiz e-posta adresi.';
        break;
      case 'auth/email-already-in-use':
        message = 'Bu e-posta adresi zaten kullanımda.';
        break;
      case 'auth/weak-password':
        message = 'Şifre çok zayıf. En az 6 karakter olmalı.';
        break;
      case 'auth/too-many-requests':
        message = 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.';
        break;
      case 'auth/network-request-failed':
        message = 'İnternet bağlantınızı kontrol edin.';
        break;
      case 'auth/invalid-credential':
        message = 'E-posta veya şifre hatalı.';
        break;
      case 'auth/user-disabled':
        message = 'Bu hesap devre dışı bırakılmış.';
        break;
      default:
        message = `Giriş yapılamadı. Lütfen tekrar deneyin. (${errorCode})`;
    }

    showError(message, 'error', title);
  };

  const showSuccess = (message: string, title?: string) => {
    showError(message, 'success', title || 'Başarılı');
  };

  const showNetworkError = () => {
    showError(
      'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
      'error',
      'Bağlantı Hatası'
    );
  };

  const showValidationError = (field: string, message: string) => {
    showError(
      `${field}: ${message}`,
      'warning',
      'Doğrulama Hatası'
    );
  };

  const getDefaultTitle = (type: string): string => {
    switch (type) {
      case 'error': return 'Hata';
      case 'warning': return 'Uyarı';
      case 'info': return 'Bilgi';
      case 'success': return 'Başarılı';
      default: return 'Bildirim';
    }
  };

  return (
    <ErrorContext.Provider 
      value={{
        error,
        showError,
        hideError,
        showAuthError,
        showNetworkError,
        showValidationError,
        showSuccess
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
};

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}; 