import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { TransactionViewModel } from '../viewmodels/TransactionViewModel';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { CategoryViewModel } from '../viewmodels/CategoryViewModel';
import { useAuth } from './AuthContext';
import { DebtViewModel } from '../viewmodels/DebtViewModel';
import { RecurringPaymentViewModel } from '../viewmodels/RecurringPaymentViewModel';
import { BudgetViewModel } from '../viewmodels/BudgetViewModel';
import { AuthViewModel } from '../viewmodels/AuthViewModel';

export interface ViewModelContextType {
  authViewModel: AuthViewModel;
  transactionViewModel: TransactionViewModel | null;
  accountViewModel: AccountViewModel | null;
  categoryViewModel: CategoryViewModel | null;
  budgetViewModel: BudgetViewModel | null;
  debtViewModel: DebtViewModel | null;
  recurringPaymentViewModel: RecurringPaymentViewModel | null;
  isLoading: boolean;
}

export const ViewModelContext = createContext<ViewModelContextType | undefined>(undefined);

interface ViewModelProviderProps {
  children: ReactNode;
}

export const ViewModelProvider: React.FC<ViewModelProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [transactionViewModel, setTransactionViewModel] = useState<TransactionViewModel | null>(null);
  const [accountViewModel, setAccountViewModel] = useState<AccountViewModel | null>(null);
  const [categoryViewModel, setCategoryViewModel] = useState<CategoryViewModel | null>(null);
  const [budgetViewModel, setBudgetViewModel] = useState<BudgetViewModel | null>(null);
  const [debtViewModel, setDebtViewModel] = useState<DebtViewModel | null>(null);
  const [recurringPaymentViewModel, setRecurringPaymentViewModel] = useState<RecurringPaymentViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authViewModel = useMemo(() => new AuthViewModel(), []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (user?.id) {
      // ViewModels'leri oluştur
      const transactionVm = new TransactionViewModel(user.id);
      const accountVm = new AccountViewModel(user.id);
      const categoryVm = new CategoryViewModel(user.id);
      const budgetVm = new BudgetViewModel(user.id);
      const debtVm = new DebtViewModel(user.id);
      const recurringPaymentVm = new RecurringPaymentViewModel(user.id);
      
      setTransactionViewModel(transactionVm);
      setAccountViewModel(accountVm);
      setCategoryViewModel(categoryVm);
      setBudgetViewModel(budgetVm);
      setDebtViewModel(debtVm);
      setRecurringPaymentViewModel(recurringPaymentVm);
      
      // İlk veri yüklemesi
      Promise.all([
        transactionVm.loadTransactions(),
        accountVm.loadAccounts(),
        categoryVm.loadCustomCategories(),
        debtVm.loadDebts(),
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
      setCategoryViewModel(null);
      setBudgetViewModel(null);
      setDebtViewModel(null);
      setRecurringPaymentViewModel(null);
      setIsLoading(false);
    }

    return cleanup;
  }, [user?.id]);

  const value: ViewModelContextType = {
    authViewModel,
    transactionViewModel,
    accountViewModel,
    categoryViewModel,
    budgetViewModel,
    debtViewModel,
    recurringPaymentViewModel,
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