import { Account } from '../models/Account';
import { Transaction, TransactionType } from '../models/Transaction';
import { BaseViewModel, BaseViewModelState } from './BaseViewModel';

export interface DashboardViewModelState extends BaseViewModelState {
  accounts: Account[];
  recentTransactions: Transaction[];
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  user: {
    name: string;
    email: string;
  } | null;
}

export class DashboardViewModel extends BaseViewModel {
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

  // Quick actions
  navigateToAddIncome = () => {
    console.log('Navigate to Add Income');
    // Navigation logic will be handled by the screen
  };

  navigateToAddExpense = () => {
    console.log('Navigate to Add Expense');
    // Navigation logic will be handled by the screen
  };

  navigateToTransactions = () => {
    console.log('Navigate to Transactions');
    // Navigation logic will be handled by the screen
  };

  navigateToReports = () => {
    console.log('Navigate to Reports');
    // Navigation logic will be handled by the screen
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
      console.log('Loading accounts...');
    });
  };

  loadRecentTransactions = async () => {
    return this.handleAsync(async () => {
      // TODO: Implement with TransactionService
      console.log('Loading recent transactions...');
    });
  };

  loadMonthlyStats = async () => {
    return this.handleAsync(async () => {
      // TODO: Calculate monthly income/expense from transactions
      console.log('Loading monthly stats...');
    });
  };

  loadUserProfile = async () => {
    return this.handleAsync(async () => {
      // TODO: Implement with UserService
      console.log('Loading user profile...');
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
      console.log('Selected account:', account.name);
      // Handle account selection logic
    }
  };

  // Utility methods
  formatCurrency = (amount: number): string => {
    return `₺${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  getGreeting = (): string => {
    const hour = new Date().getHours();
    const userName = this.state.user?.name || 'Kullanıcı';
    
    if (hour < 12) {
      return `Günaydın, ${userName}`;
    } else if (hour < 18) {
      return `İyi günler, ${userName}`;
    } else {
      return `İyi akşamlar, ${userName}`;
    }
  };
} 