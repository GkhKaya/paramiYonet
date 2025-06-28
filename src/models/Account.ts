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
  // Altın türleri için yeni yapı
  goldHoldings?: GoldHoldings;
  goldGrams?: number; // Legacy support for goldGrams
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
  goldHoldings?: GoldHoldings;
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
  goldHoldings?: GoldHoldings;
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
  goldSummary: GoldSummary;
}

export interface GoldSummary {
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  breakdown: {
    [GoldType.GRAM]: { quantity: number; value: number; };
    [GoldType.QUARTER]: { quantity: number; value: number; };
    [GoldType.HALF]: { quantity: number; value: number; };
    [GoldType.FULL]: { quantity: number; value: number; };
  };
}

export interface GoldAccountDetails {
  accountId: string;
  accountName: string;
  goldHoldings: GoldHoldings;
  currentGoldPrices: GoldPrices;
  initialGoldPrices: GoldPrices;
  createdDate: Date;
  currentValue: number;
  initialValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  daysSinceCreation: number;
  breakdown: GoldBreakdown[];
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

// Yeni tipler
export enum GoldType {
  GRAM = 'GRA',           // Gram altın
  QUARTER = 'CEYREKALTIN', // Çeyrek altın
  HALF = 'YARIMALTIN',    // Yarım altın
  FULL = 'TAMALTIN'       // Tam altın
}

export interface GoldHolding {
  type: GoldType;
  quantity: number;
  initialPrice: number;
  purchaseDate: Date;
}

export interface GoldHoldings {
  [GoldType.GRAM]?: GoldHolding[];
  [GoldType.QUARTER]?: GoldHolding[];
  [GoldType.HALF]?: GoldHolding[];
  [GoldType.FULL]?: GoldHolding[];
}

export interface GoldPrices {
  [GoldType.GRAM]: number;
  [GoldType.QUARTER]: number;
  [GoldType.HALF]: number;
  [GoldType.FULL]: number;
}

export interface GoldBreakdown {
  type: GoldType;
  typeName: string;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  initialValue: number;
  profitLoss: number;
  profitLossPercentage: number;
} 