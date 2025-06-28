import { useState, useCallback } from 'react';
import { TransactionViewModel, TransactionViewModelState } from '../viewmodels/TransactionViewModel';
import { Transaction, TransactionType } from '../models/Transaction';

// Mock data - same as in TransactionsScreen for now
const mockTransactions: Transaction[] = [
  // Will be moved to service layer later
  {
    id: '1',
    userId: 'user1',
    accountId: 'acc1',
    category: 'Yemek',
    categoryIcon: 'restaurant',
    type: TransactionType.EXPENSE,
    amount: 45.50,
    description: 'Kahvaltı',
    date: new Date('2024-01-15'),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Add other mock transactions...
];

const initialState: TransactionViewModelState = {
  isLoading: false,
  error: null,
  transactions: mockTransactions,
  filteredTransactions: mockTransactions,
  searchTerm: '',
  searchQuery: '',
  selectedFilter: 'all',
  selectedMonth: new Date(),
  filters: {},
  currentMonth: new Date(),
  editTransactionId: null,
};

export const useTransactionViewModel = () => {
  const [state, setState] = useState<TransactionViewModelState>(initialState);

  const viewModel = useCallback(() => {
    return new TransactionViewModel('default-user', setState, state);
  }, [setState, state]);

  return {
    state,
    viewModel: viewModel(),
  };
}; 