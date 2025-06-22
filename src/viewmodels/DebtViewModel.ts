import { makeAutoObservable, runInAction } from 'mobx';
import { Alert } from 'react-native';
import { Debt, DebtType, DebtStatus, DebtPayment } from '../models/Debt';
import { DebtService } from '../services/DebtService';
import { AccountService } from '../services/AccountService';
import { TransactionService } from '../services/TransactionService';
import { TransactionType } from '../models/Transaction';

export class DebtViewModel {
  debts: Debt[] = [];
  isLoading = false;
  error: string | null = null;
  private userId: string;
  private unsubscribe?: () => void;

  constructor(userId: string) {
    this.userId = userId;
    makeAutoObservable(this);
  }

  async loadDebts() {
    runInAction(() => {
      this.isLoading = true;
      this.error = null;
    });

    try {
      const debts = await DebtService.getDebts(this.userId);
      runInAction(() => {
        this.debts = debts;
        this.isLoading = false;
      });
    } catch (error) {
      console.error('Error loading debts:', error);
      runInAction(() => {
        this.error = 'Borçlar yüklenirken hata oluştu';
        this.isLoading = false;
      });
    }
  }

  async createDebt(
    type: DebtType,
    personName: string,
    amount: number,
    accountId: string,
    description?: string,
    dueDate?: Date
  ): Promise<boolean> {
    try {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });

      // Create debt record
      const debtData: Omit<Debt, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: this.userId,
        type,
        personName,
        originalAmount: amount,
        currentAmount: amount,
        paidAmount: 0,
        accountId,
        description,
        status: DebtStatus.ACTIVE,
        dueDate,
        payments: [],
      };

      const debtId = await DebtService.createDebt(debtData);

      // Update account balance and create transaction
      if (type === DebtType.LENT) {
        // Borç verirken hesaptan düş
        await AccountService.updateBalance(accountId, -amount);
        
        // Transaction oluştur
        await TransactionService.createTransaction({
          userId: this.userId,
          amount: amount,
          description: `${personName} kişisine borç verildi`,
          type: TransactionType.EXPENSE,
          category: 'Borç',
          categoryIcon: 'person-add-outline',
          accountId,
          date: new Date(),
        });
      } else {
        // Borç alırken hesaba ekle
        await AccountService.updateBalance(accountId, amount);
        
        // Transaction oluştur
        await TransactionService.createTransaction({
          userId: this.userId,
          amount: amount,
          description: `${personName} kişisinden borç alındı`,
          type: TransactionType.INCOME,
          category: 'Borç',
          categoryIcon: 'person-remove-outline',
          accountId,
          date: new Date(),
        });
      }

      await this.loadDebts();
      
      runInAction(() => {
        this.isLoading = false;
      });

      return true;
    } catch (error) {
      console.error('Error creating debt:', error);
      runInAction(() => {
        this.error = 'Borç oluşturulurken hata oluştu';
        this.isLoading = false;
      });
      return false;
    }
  }

  async addPayment(
    debtId: string,
    amount: number,
    description?: string
  ): Promise<boolean> {
    try {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });

      const debt = this.debts.find(d => d.id === debtId);
      if (!debt) {
        throw new Error('Borç bulunamadı');
      }

      // Add payment to debt
      await DebtService.addPayment(debtId, {
        amount,
        date: new Date(),
        description,
      });

      // Update account balance and create transaction
      if (debt.type === DebtType.LENT) {
        // Verilen borç ödendiğinde hesaba ekle
        await AccountService.updateBalance(debt.accountId, amount);
        
        // Transaction oluştur
        await TransactionService.createTransaction({
          userId: this.userId,
          amount: amount,
          description: `${debt.personName} borç ödemesi`,
          type: TransactionType.INCOME,
          category: 'Borç',
          categoryIcon: 'checkmark-circle-outline',
          accountId: debt.accountId,
          date: new Date(),
        });
      } else {
        // Alınan borç ödendiğinde hesaptan düş
        await AccountService.updateBalance(debt.accountId, -amount);
        
        // Transaction oluştur
        await TransactionService.createTransaction({
          userId: this.userId,
          amount: amount,
          description: `${debt.personName} borç ödemesi`,
          type: TransactionType.EXPENSE,
          category: 'Borç',
          categoryIcon: 'checkmark-circle-outline',
          accountId: debt.accountId,
          date: new Date(),
        });
      }

      await this.loadDebts();
      
      runInAction(() => {
        this.isLoading = false;
      });

      return true;
    } catch (error) {
      console.error('Error adding payment:', error);
      runInAction(() => {
        this.error = 'Ödeme eklenirken hata oluştu';
        this.isLoading = false;
      });
      return false;
    }
  }

  async deleteDebt(debtId: string): Promise<boolean> {
    try {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });

      // Borç bilgilerini sil işleminden önce al
      const debt = this.debts.find(d => d.id === debtId);
      if (!debt) {
        throw new Error('Borç bulunamadı');
      }

      // Borcu sil
      await DebtService.deleteDebt(debtId);

      // Hesap bakiyesini geri güncelle
      if (debt.type === DebtType.LENT) {
        // Verilen borç silindiğinde kalan tutarı hesaba geri ekle
        await AccountService.updateBalance(debt.accountId, debt.currentAmount);
        
        // İptal transaction'ı oluştur
        await TransactionService.createTransaction({
          userId: this.userId,
          amount: debt.currentAmount,
          description: `${debt.personName} borcunun iptali`,
          type: TransactionType.INCOME,
          category: 'Borç',
          categoryIcon: 'close-circle-outline',
          accountId: debt.accountId,
          date: new Date(),
        });
      } else {
        // Alınan borç silindiğinde kalan tutarı hesaptan düş
        await AccountService.updateBalance(debt.accountId, -debt.currentAmount);
        
        // İptal transaction'ı oluştur
        await TransactionService.createTransaction({
          userId: this.userId,
          amount: debt.currentAmount,
          description: `${debt.personName} borcunun iptali`,
          type: TransactionType.EXPENSE,
          category: 'Borç',
          categoryIcon: 'close-circle-outline',
          accountId: debt.accountId,
          date: new Date(),
        });
      }

      await this.loadDebts();
      
      runInAction(() => {
        this.isLoading = false;
      });

      return true;
    } catch (error) {
      console.error('Error deleting debt:', error);
      runInAction(() => {
        this.error = 'Borç silinirken hata oluştu';
        this.isLoading = false;
      });
      return false;
    }
  }

  async getDebtsByAccount(accountId: string): Promise<Debt[]> {
    try {
      return await DebtService.getDebtsByAccount(this.userId, accountId);
    } catch (error) {
      console.error('Error getting debts by account:', error);
      return [];
    }
  }

  // Computed properties
  get totalLentAmount(): number {
    return this.debts
      .filter(debt => debt.type === DebtType.LENT && debt.status !== DebtStatus.PAID)
      .reduce((sum, debt) => sum + debt.currentAmount, 0);
  }

  get totalBorrowedAmount(): number {
    return this.debts
      .filter(debt => debt.type === DebtType.BORROWED && debt.status !== DebtStatus.PAID)
      .reduce((sum, debt) => sum + debt.currentAmount, 0);
  }

  get activeDebts(): Debt[] {
    return this.debts.filter(debt => debt.status !== DebtStatus.PAID);
  }

  get paidDebts(): Debt[] {
    return this.debts.filter(debt => debt.status === DebtStatus.PAID);
  }

  startListening() {
    this.unsubscribe = DebtService.listenToDebts(this.userId, (debts) => {
      runInAction(() => {
        this.debts = debts;
      });
    });
  }

  stopListening() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }

  dispose() {
    this.stopListening();
  }
} 