import { Account } from '../models/Account';
import { Transaction, TransactionType } from '../models/Transaction';
import { BaseViewModel, BaseViewModelState } from './BaseViewModel';

export interface DashboardViewModelState extends BaseViewModelState {
  accounts: Account[];
  recentTransactions: Transaction[];
  monthlyIncome: number;
  monthlyExpense: number;
  userProfile: {
    name: string;
    email: string;
  } | null;
}

export class DashboardViewModel extends BaseViewModel<DashboardViewModelState> {
  constructor(setState: (state: DashboardViewModelState) => void, initialState: DashboardViewModelState) {
    super(setState, initialState);
  }

  // Calculated properties
  getNetAmount = (): number => {
    return this.state.monthlyIncome - this.state.monthlyExpense;
  };

  getSavingsRate = (): number => {
    if (this.state.monthlyIncome === 0) return 0;
    return (this.getNetAmount() / this.state.monthlyIncome) * 100;
  };

  getTotalBalance = (): number => {
    return this.state.accounts?.reduce((total: number, account: Account) => total + account.balance, 0) || 0;
  };

  getAccountById = (accountId: string): Account | undefined => {
    return this.state.accounts.find((acc: Account) => acc.id === accountId);
  };

  // Data loading methods
  loadDashboardData = async () => {
    return this.handleAsync(async () => {
      // TODO: Parallel loading of all dashboard data
      await Promise.all([
        this.loadAccounts(),
        this.loadRecentTransactions(),
        this.loadMonthlyStats(),
        this.loadUserProfile()
      ]);
    });
  };

  loadAccounts = async () => {
    return this.handleAsync(async () => {
      // TODO: Implement with AccountService

    });
  };

  loadRecentTransactions = async () => {
    return this.handleAsync(async () => {
      // TODO: Implement with TransactionService

    });
  };

  loadMonthlyStats = async () => {
    return this.handleAsync(async () => {
      // TODO: Calculate monthly income/expense from transactions

    });
  };

  loadUserProfile = async () => {
    return this.handleAsync(async () => {
      // TODO: Implement with UserService

    });
  };

  // Refresh data
  refreshDashboard = async () => {
    return this.loadDashboardData();
  };

  // Account operations
  selectAccount = (accountId: string) => {
    const account = this.state.accounts.find((acc: Account) => acc.id === accountId);
    if (account) {
      // TODO: Navigation or state update logic
      console.log('Selected Account:', account.name);
    }
  };

  // Utility methods
  formatCurrency = (amount: number): string => {
    return `₺${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  getTransactionIcon = (transaction: Transaction): string => {
    return transaction.type === TransactionType.INCOME ? 'arrow-up' : 'arrow-down';
  };
} 