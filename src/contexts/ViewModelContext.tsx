import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TransactionViewModel } from '../viewmodels/TransactionViewModel';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { useAuth } from './AuthContext';

interface ViewModelContextType {
  transactionViewModel: TransactionViewModel | null;
  accountViewModel: AccountViewModel | null;
  isLoading: boolean;
}

const ViewModelContext = createContext<ViewModelContextType>({
  transactionViewModel: null,
  accountViewModel: null,
  isLoading: true,
});

interface ViewModelProviderProps {
  children: ReactNode;
}

export const ViewModelProvider: React.FC<ViewModelProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [transactionViewModel, setTransactionViewModel] = useState<TransactionViewModel | null>(null);
  const [accountViewModel, setAccountViewModel] = useState<AccountViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (user?.id) {
      // ViewModels'leri oluştur
      const transactionVm = new TransactionViewModel(user.id);
      const accountVm = new AccountViewModel(user.id);
      
      setTransactionViewModel(transactionVm);
      setAccountViewModel(accountVm);
      
      // İlk veri yüklemesi
      Promise.all([
        transactionVm.loadTransactions(),
        accountVm.loadAccounts()
      ]).then(() => {
        setIsLoading(false);
      }).catch(error => {
        console.error('ViewModelProvider: Error loading initial data:', error);
        setIsLoading(false);
      });
      
      // Cleanup function
      cleanup = () => {
        if (accountVm.dispose) {
          accountVm.dispose();
        }
      };
    } else {
      // Kullanıcı oturumu kapandıysa ViewModels'leri temizle
      setTransactionViewModel(null);
      setAccountViewModel(null);
      setIsLoading(false);
    }

    return cleanup;
  }, [user?.id]);

  const value: ViewModelContextType = {
    transactionViewModel,
    accountViewModel,
    isLoading,
  };

  return (
    <ViewModelContext.Provider value={value}>
      {children}
    </ViewModelContext.Provider>
  );
};

export const useViewModels = (): ViewModelContextType => {
  const context = useContext(ViewModelContext);
  if (!context) {
    throw new Error('useViewModels must be used within a ViewModelProvider');
  }
  return context;
}; 