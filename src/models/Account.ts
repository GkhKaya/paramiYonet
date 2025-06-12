export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  goldGrams?: number;
  initialGoldPrice?: number;
  includeInTotalBalance: boolean;
  // Kredi kartı alanları
  limit?: number;
  currentDebt?: number;
  statementDay?: number;
  dueDay?: number;
  interestRate?: number;
  minPaymentRate?: number;
  creditCardTransactions?: CreditCardTransaction[];
  creditCardPayments?: CreditCardPayment[];
}

export enum AccountType {
  CASH = 'cash',           // Nakit
  DEBIT_CARD = 'debit_card',    // Banka Kartı
  CREDIT_CARD = 'credit_card',  // Kredi Kartı
  SAVINGS = 'savings',          // Tasarruf
  INVESTMENT = 'investment',    // Yatırım
  GOLD = 'gold',               // Altın
}

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  initialBalance: number;
  color: string;
  icon: string;
  goldGrams?: number;
  initialGoldPrice?: number;
  includeInTotalBalance?: boolean;
  // Kredi kartı alanları
  limit?: number;
  currentDebt?: number;
  statementDay?: number;
  dueDay?: number;
  interestRate?: number;
  minPaymentRate?: number;
}

export interface UpdateAccountRequest {
  id: string;
  name?: string;
  type?: AccountType;
  color?: string;
  icon?: string;
  goldGrams?: number;
  initialGoldPrice?: number;
  includeInTotalBalance?: boolean;
  // Kredi kartı alanları
  limit?: number;
  currentDebt?: number;
  statementDay?: number;
  dueDay?: number;
  interestRate?: number;
  minPaymentRate?: number;
}

export interface AccountSummary {
  totalBalance: number;
  cashBalance: number;
  debitCardBalance: number;
  creditCardBalance: number;
  savingsBalance: number;
  investmentBalance: number;
  goldBalance: number;
  goldGrams: number;
}

export interface GoldAccountDetails {
  accountId: string;
  accountName: string;
  totalGrams: number;
  currentGoldPrice: number;
  initialGoldPrice: number;
  createdDate: Date;
  currentValue: number;
  initialValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  daysSinceCreation: number;
}

export interface CreditCardTransaction {
  id: string;
  creditCardId: string;
  amount: number;
  description: string;
  category: string;
  date: Date;
  isInstallment?: boolean;
  installmentCount?: number;
  installmentNumber?: number;
}

export interface CreditCardPayment {
  id: string;
  creditCardId: string;
  fromAccountId: string;
  amount: number;
  paymentType: 'minimum' | 'full' | 'custom';
  date: Date;
  description?: string;
} 