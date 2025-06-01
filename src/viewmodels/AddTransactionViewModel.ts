import { Account } from '../models/Account';
import { Transaction, TransactionType } from '../models/Transaction';
import { Category } from '../models/Category';
import { BaseViewModel, BaseViewModelState } from './BaseViewModel';

export interface AddTransactionViewModelState extends BaseViewModelState {
  amount: string;
  description: string;
  selectedType: TransactionType;
  selectedCategory: string;
  selectedAccount: string;
  selectedDate: Date;
  accounts: Account[];
  categories: Category[];
  validationErrors: {
    amount?: string;
    description?: string;
    category?: string;
  };
}

export class AddTransactionViewModel extends BaseViewModel {
  constructor(setState: (state: AddTransactionViewModelState) => void, initialState: AddTransactionViewModelState) {
    super(setState, initialState);
  }

  // Form field setters
  setAmount = (amount: string) => {
    const formattedAmount = this.formatAmountInput(amount);
    this.setState((prev: AddTransactionViewModelState) => ({
      ...prev,
      amount: formattedAmount,
      validationErrors: { ...prev.validationErrors, amount: undefined }
    }));
  };

  setDescription = (description: string) => {
    this.setState((prev: AddTransactionViewModelState) => ({
      ...prev,
      description,
      validationErrors: { ...prev.validationErrors, description: undefined }
    }));
  };

  setSelectedType = (type: TransactionType) => {
    this.setState((prev: AddTransactionViewModelState) => ({
      ...prev,
      selectedType: type,
      selectedCategory: '', // Reset category when type changes
      validationErrors: { ...prev.validationErrors, category: undefined }
    }));
    
    // Load categories for the selected type
    this.loadCategories(type);
  };

  setSelectedCategory = (category: string) => {
    this.setState((prev: AddTransactionViewModelState) => ({
      ...prev,
      selectedCategory: category,
      validationErrors: { ...prev.validationErrors, category: undefined }
    }));
  };

  setSelectedAccount = (accountId: string) => {
    this.setState((prev: AddTransactionViewModelState) => ({
      ...prev,
      selectedAccount: accountId
    }));
  };

  setSelectedDate = (date: Date) => {
    this.setState((prev: AddTransactionViewModelState) => ({
      ...prev,
      selectedDate: date
    }));
  };

  // Validation
  private validateForm = (): boolean => {
    const errors: { amount?: string; description?: string; category?: string } = {};
    let isValid = true;

    // Amount validation
    if (!this.state.amount || this.state.amount.trim() === '') {
      errors.amount = 'Tutar gerekli';
      isValid = false;
    } else {
      const numericAmount = parseFloat(this.state.amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        errors.amount = 'Geçerli bir tutar girin';
        isValid = false;
      }
    }

    // Description validation
    if (!this.state.description || this.state.description.trim() === '') {
      errors.description = 'Açıklama gerekli';
      isValid = false;
    }

    // Category validation
    if (!this.state.selectedCategory) {
      errors.category = 'Kategori seçin';
      isValid = false;
    }

    this.setState((prev: AddTransactionViewModelState) => ({
      ...prev,
      validationErrors: errors
    }));

    return isValid;
  };

  // Utility methods
  private formatAmountInput = (value: string): string => {
    // Remove non-numeric characters except decimal point
    return value.replace(/[^0-9.]/g, '');
  };

  formatCurrency = (amount: number): string => {
    return `₺${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  formatDate = (date: Date): string => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Data loading
  loadAccounts = async () => {
    return this.handleAsync(async () => {
      // TODO: Implement with AccountService
      console.log('Loading accounts...');
    });
  };

  loadCategories = async (type: TransactionType) => {
    return this.handleAsync(async () => {
      // TODO: Implement with CategoryService
      console.log('Loading categories for type:', type);
    });
  };

  // Transaction operations
  saveTransaction = async (): Promise<boolean> => {
    if (!this.validateForm()) {
      return false;
    }

    return this.handleAsync(async () => {
      const transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: 'current-user-id', // TODO: Get from auth context
        accountId: this.state.selectedAccount,
        category: this.state.selectedCategory,
        categoryIcon: this.getCategoryIcon(this.state.selectedCategory),
        type: this.state.selectedType,
        amount: parseFloat(this.state.amount),
        description: this.state.description,
        date: this.state.selectedDate,
      };

      console.log('Saving transaction:', transactionData);
      
      // TODO: Implement with TransactionService
      // const result = await TransactionService.createTransaction(transactionData);
      
      // Reset form on success
      this.resetForm();
      
      return true;
    }) !== null;
  };

  resetForm = () => {
    this.setState((prev: AddTransactionViewModelState) => ({
      ...prev,
      amount: '',
      description: '',
      selectedCategory: '',
      selectedDate: new Date(),
      validationErrors: {}
    }));
  };

  // Helper methods
  private getCategoryIcon = (categoryName: string): string => {
    // TODO: Get from category service or constants
    const categoryMap: { [key: string]: string } = {
      'Yemek': 'restaurant',
      'Market': 'basket',
      'Ulaşım': 'car',
      'Maaş': 'cash',
      'Yan İş': 'business',
      // Add more mappings...
    };
    
    return categoryMap[categoryName] || 'cash';
  };

  getFilteredCategories = (): Category[] => {
    return this.state.categories.filter((category: Category) => 
      category.type === this.state.selectedType
    );
  };

  canGoToFutureDate = (): boolean => {
    return false; // Generally don't allow future dates for transactions
  };

  getMaxDate = (): Date => {
    return new Date(); // Maximum date is today
  };
} 