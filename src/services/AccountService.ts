import { 
  Account, 
  CreateAccountRequest, 
  UpdateAccountRequest, 
  AccountSummary,
  COLLECTIONS 
} from '../models';
import { db } from '../config/firebase';
import UserService from './UserService';
import { 
  collection,
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { AccountType } from '../models/Account';

export class AccountService {
  private static readonly COLLECTION_NAME = 'accounts';

  async createAccount(accountData: CreateAccountRequest): Promise<string> {
    const userId = UserService.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const newAccount = {
      userId,
      name: accountData.name,
      type: accountData.type,
      balance: accountData.initialBalance,
      color: accountData.color,
      icon: accountData.icon,
      isActive: true,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    const docRef = await addDoc(collection(db, this.COLLECTION_NAME), newAccount);
    return docRef.id;
  }

  async getUserAccounts(): Promise<Account[]> {
    const userId = UserService.getCurrentUserId();
    if (!userId) throw new Error('User not authenticated');

    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('userId', '==', userId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Account[];
  }

  async getAccount(accountId: string): Promise<Account | null> {
    const docRef = doc(db, this.COLLECTION_NAME, accountId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Account;
  }

  async updateAccount(accountId: string, updates: Partial<UpdateAccountRequest>): Promise<void> {
    await updateDoc(doc(db, this.COLLECTION_NAME, accountId), {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }

  async deleteAccount(accountId: string): Promise<void> {
    await updateDoc(doc(db, this.COLLECTION_NAME, accountId), {
      isActive: false,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }

  async updateAccountBalance(accountId: string, newBalance: number): Promise<void> {
    await updateDoc(doc(db, this.COLLECTION_NAME, accountId), {
      balance: newBalance,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  }

  async getAccountSummary(): Promise<AccountSummary> {
    const accounts = await this.getUserAccounts();
    
    const summary: AccountSummary = {
      totalBalance: 0,
      cashBalance: 0,
      debitCardBalance: 0,
      creditCardBalance: 0,
      savingsBalance: 0,
      investmentBalance: 0,
    };

    accounts.forEach(account => {
      summary.totalBalance += account.balance;
      
      switch (account.type) {
        case 'cash':
          summary.cashBalance += account.balance;
          break;
        case 'debit_card':
          summary.debitCardBalance += account.balance;
          break;
        case 'credit_card':
          summary.creditCardBalance += account.balance;
          break;
        case 'savings':
          summary.savingsBalance += account.balance;
          break;
        case 'investment':
          summary.investmentBalance += account.balance;
          break;
      }
    });

    return summary;
  }

  static async getUserAccounts(userId: string): Promise<Account[]> {
    try {
      const q = query(
        collection(db, AccountService.COLLECTION_NAME),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('createdAt', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const accounts: Account[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        accounts.push({
          id: doc.id,
          userId: data.userId,
          name: data.name,
          type: data.type as AccountType,
          balance: data.balance,
          color: data.color,
          icon: data.icon,
          isActive: data.isActive,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      return accounts;
    } catch (error) {
      console.error('Error getting accounts:', error);
      throw new Error('Hesaplar yüklenemedi');
    }
  }

  static async createAccount(accountData: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
    try {
      const now = new Date();
      
      const docRef = await addDoc(collection(db, AccountService.COLLECTION_NAME), {
        ...accountData,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

      return {
        id: docRef.id,
        ...accountData,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.error('Error creating account:', error);
      throw new Error('Hesap oluşturulamadı');
    }
  }

  static async updateAccount(id: string, updates: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    try {
      const docRef = doc(db, AccountService.COLLECTION_NAME, id);
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error updating account:', error);
      throw new Error('Hesap güncellenemedi');
    }
  }

  static async updateAccountBalance(accountId: string, newBalance: number): Promise<void> {
    try {
      await AccountService.updateAccount(accountId, { balance: newBalance });
    } catch (error) {
      console.error('Error updating account balance:', error);
      throw new Error('Hesap bakiyesi güncellenemedi');
    }
  }

  static async deactivateAccount(id: string): Promise<void> {
    try {
      await AccountService.updateAccount(id, { isActive: false });
    } catch (error) {
      console.error('Error deactivating account:', error);
      throw new Error('Hesap devre dışı bırakılamadı');
    }
  }

  static async deleteAccount(id: string): Promise<void> {
    try {
      const docRef = doc(db, AccountService.COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting account:', error);
      throw new Error('Hesap silinemedi');
    }
  }

  static async getTotalBalance(userId: string): Promise<number> {
    try {
      const accounts = await AccountService.getUserAccounts(userId);
      return accounts?.reduce((total, account) => total + account.balance, 0) || 0;
    } catch (error) {
      console.error('Error getting total balance:', error);
      throw new Error('Toplam bakiye hesaplanamadı');
    }
  }

  static async createDefaultAccounts(userId: string): Promise<Account[]> {
    try {
      const defaultAccounts = [
        {
          userId,
          name: 'Ana Hesap',
          type: AccountType.DEBIT_CARD,
          balance: 0,
          color: '#007AFF',
          icon: 'card',
          isActive: true,
        },
        {
          userId,
          name: 'Nakit',
          type: AccountType.CASH,
          balance: 0,
          color: '#2ECC71',
          icon: 'cash',
          isActive: true,
        },
      ];

      const createdAccounts: Account[] = [];
      for (const accountData of defaultAccounts) {
        const account = await AccountService.createAccount(accountData);
        createdAccounts.push(account);
      }

      return createdAccounts;
    } catch (error) {
      console.error('Error creating default accounts:', error);
      throw new Error('Varsayılan hesaplar oluşturulamadı');
    }
  }
}

export default new AccountService(); 