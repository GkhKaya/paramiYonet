export enum DebtType {
  LENT = 'lent',     // Verilen borç
  BORROWED = 'borrowed' // Alınan borç
}

export enum DebtStatus {
  ACTIVE = 'active',
  PAID = 'paid',
  PARTIAL = 'partial'
}

export interface DebtPayment {
  id: string;
  amount: number;
  date: Date;
  description?: string;
  createdAt: Date;
}

export interface Debt {
  id: string;
  userId: string;
  type: DebtType;
  personName: string;
  originalAmount: number;
  currentAmount: number;
  paidAmount: number;
  accountId: string;
  description?: string;
  status: DebtStatus;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  payments: DebtPayment[];
} 