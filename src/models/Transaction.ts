export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  description: string;
  category: string;
  categoryIcon: string;
  type: TransactionType;
  accountId: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  // Kredi kartı işlemleri için ek alanlar
  isCreditCardTransaction?: boolean;
  creditCardPaymentType?: 'minimum' | 'full' | 'custom';
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export interface CreateTransactionRequest {
  amount: number;
  description: string;
  category: string;
  categoryIcon: string;
  type: TransactionType;
  accountId: string;
  date: Date;
  // Kredi kartı işlemleri için ek alanlar
  isCreditCardTransaction?: boolean;
  creditCardPaymentType?: 'minimum' | 'full' | 'custom';
}

export interface UpdateTransactionRequest extends Partial<CreateTransactionRequest> {
  id: string;
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  netAmount: number;
  transactionCount: number;
} 