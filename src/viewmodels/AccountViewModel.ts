import { makeObservable, observable, action, computed } from 'mobx';
import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Account, AccountType, CreateAccountRequest, UpdateAccountRequest, AccountSummary } from '../models/Account';
import { BaseViewModel } from './BaseViewModel';
import { Transaction, TransactionType } from '../models/Transaction';

export class AccountViewModel extends BaseViewModel {
  accounts: Account[] = [];
  selectedAccount: Account | null = null;

  constructor(private userId: string) {
    super();
    makeObservable(this, {
      accounts: observable,
      selectedAccount: observable,
      setAccounts: action,
      setSelectedAccount: action,
      addAccount: action,
      updateAccount: action,
      removeAccount: action,
      totalBalance: computed,
      accountSummary: computed,
    });
    
    this.loadAccounts();
  }

  setAccounts = (accounts: Account[]) => {
    this.accounts = accounts;
  };

  setSelectedAccount = (account: Account | null) => {
    this.selectedAccount = account;
  };

  addAccount = (account: Account) => {
    this.accounts.push(account);
  };

  updateAccount = (updatedAccount: Account) => {
    const index = this.accounts.findIndex(account => account.id === updatedAccount.id);
    if (index !== -1) {
      this.accounts[index] = updatedAccount;
    }
  };

  removeAccount = (accountId: string) => {
    this.accounts = this.accounts.filter(account => account.id !== accountId);
  };

  get totalBalance(): number {
    return this.accounts.reduce((total, account) => total + account.balance, 0);
  }

  get accountSummary(): AccountSummary {
    const summary: AccountSummary = {
      totalBalance: 0,
      cashBalance: 0,
      debitCardBalance: 0,
      creditCardBalance: 0,
      savingsBalance: 0,
      investmentBalance: 0,
    };

    this.accounts.forEach(account => {
      summary.totalBalance += account.balance;
      
      switch (account.type) {
        case AccountType.CASH:
          summary.cashBalance += account.balance;
          break;
        case AccountType.DEBIT_CARD:
          summary.debitCardBalance += account.balance;
          break;
        case AccountType.CREDIT_CARD:
          summary.creditCardBalance += account.balance;
          break;
        case AccountType.SAVINGS:
          summary.savingsBalance += account.balance;
          break;
        case AccountType.INVESTMENT:
          summary.investmentBalance += account.balance;
          break;
      }
    });

    return summary;
  }

  loadAccounts = async () => {
    try {
      this.setLoading(true);
      
      const accountsQuery = query(
        collection(db, 'accounts'),
        where('userId', '==', this.userId),
        where('isActive', '==', true)
      );

      // Real-time listener
      const unsubscribe = onSnapshot(accountsQuery, (snapshot) => {
        const accountsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Account;
        });
        
        this.setAccounts(accountsData);
        this.setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.setError('Hesaplar yüklenirken hata oluştu');
      this.setLoading(false);
    }
  };

  createAccount = async (accountData: CreateAccountRequest): Promise<boolean> => {
    try {
      this.setLoading(true);
      
      console.log('Creating account with initial balance:', accountData.initialBalance);
      
      const newAccount = {
        userId: this.userId,
        name: accountData.name,
        type: accountData.type,
        balance: accountData.initialBalance,
        color: accountData.color,
        icon: accountData.icon,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
      };

      console.log('Account data to save:', newAccount);

      const docRef = await addDoc(collection(db, 'accounts'), newAccount);
      
      console.log('Account created with ID:', docRef.id);
      
      const createdAccount: Account = {
        id: docRef.id,
        ...newAccount,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.addAccount(createdAccount);
      this.setLoading(false);
      return true;
    } catch (error) {
      console.error('Error creating account:', error);
      this.setError('Hesap oluşturulurken hata oluştu');
      this.setLoading(false);
      return false;
    }
  };

  updateAccountInfo = async (accountData: UpdateAccountRequest): Promise<boolean> => {
    try {
      this.setLoading(true);
      
      const accountRef = doc(db, 'accounts', accountData.id);
      const { id, ...updateData } = accountData; // Destructure to remove id
      const finalUpdateData = {
        ...updateData,
        updatedAt: Timestamp.now(),
      };
      
      await updateDoc(accountRef, finalUpdateData);
      
      this.setLoading(false);
      return true;
    } catch (error) {
      console.error('Error updating account:', error);
      this.setError('Hesap güncellenirken hata oluştu');
      this.setLoading(false);
      return false;
    }
  };

  deleteAccount = async (accountId: string): Promise<boolean> => {
    try {
      this.setLoading(true);
      
      const accountRef = doc(db, 'accounts', accountId);
      await updateDoc(accountRef, {
        isActive: false,
        updatedAt: Timestamp.now()
      });
      
      this.removeAccount(accountId);
      this.setLoading(false);
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      this.setError('Hesap silinirken hata oluştu');
      this.setLoading(false);
      return false;
    }
  };

  updateAccountBalance = async (accountId: string, newBalance: number): Promise<boolean> => {
    try {
      const accountRef = doc(db, 'accounts', accountId);
      await updateDoc(accountRef, {
        balance: newBalance,
        updatedAt: Timestamp.now()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating account balance:', error);
      this.setError('Hesap bakiyesi güncellenirken hata oluştu');
      return false;
    }
  };

  getAccountById = (accountId: string): Account | undefined => {
    return this.accounts.find(account => account.id === accountId);
  };

  getAccountsByType = (type: AccountType): Account[] => {
    return this.accounts.filter(account => account.type === type);
  };

  // Utility function to recalculate balances from transactions
  recalculateBalancesFromTransactions = async (): Promise<boolean> => {
    try {
      console.log('Starting balance recalculation...');
      
      // Get all transactions for this user
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', this.userId)
      );
      
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactions: Transaction[] = [];
      
      transactionsSnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          userId: data.userId,
          accountId: data.accountId,
          type: data.type as TransactionType,
          amount: data.amount,
          description: data.description,
          category: data.category,
          categoryIcon: data.categoryIcon,
          date: data.date.toDate(),
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      
      console.log('Found transactions:', transactions.length);
      
      // Calculate balance for each account
      const accountBalances: { [accountId: string]: number } = {};
      
      // Initialize all accounts with 0 balance
      this.accounts.forEach(account => {
        accountBalances[account.id] = 0;
      });
      
      // Calculate balances from transactions
      transactions.forEach(transaction => {
        if (transaction.accountId && accountBalances.hasOwnProperty(transaction.accountId)) {
          if (transaction.type === TransactionType.INCOME) {
            accountBalances[transaction.accountId] += transaction.amount;
          } else {
            accountBalances[transaction.accountId] -= transaction.amount;
          }
        }
      });
      
      console.log('Calculated balances:', accountBalances);
      
      // Update each account's balance in Firebase
      const updatePromises = Object.entries(accountBalances).map(async ([accountId, balance]) => {
        const accountRef = doc(db, 'accounts', accountId);
        await updateDoc(accountRef, {
          balance: balance,
          updatedAt: Timestamp.fromDate(new Date())
        });
        console.log(`Updated account ${accountId} balance to ${balance}`);
      });
      
      await Promise.all(updatePromises);
      
      console.log('Balance recalculation completed');
      return true;
    } catch (error) {
      console.error('Error recalculating balances:', error);
      this.setError('Bakiyeler hesaplanırken hata oluştu');
      return false;
    }
  };
} 