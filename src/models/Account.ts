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
}

export interface UpdateAccountRequest extends Partial<CreateAccountRequest> {
  id: string;
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