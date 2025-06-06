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
import GoldPriceService from '../services/GoldPriceService';
import { COLORS } from '../constants';

// Hesap tipine göre default renk getiren yardımcı fonksiyon
const getDefaultColorForAccountType = (type: string): string => {
  switch (type) {
    case AccountType.CASH:
      return COLORS.SUCCESS;
    case AccountType.DEBIT_CARD:
      return COLORS.PRIMARY;
    case AccountType.CREDIT_CARD:
      return COLORS.ERROR;
    case AccountType.SAVINGS:
      return COLORS.WARNING;
    case AccountType.INVESTMENT:
      return COLORS.SECONDARY;
    case AccountType.GOLD:
      return '#FFD700';
    default:
      return COLORS.PRIMARY;
  }
};

export class AccountViewModel extends BaseViewModel {
  accounts: Account[] = [];
  selectedAccount: Account | null = null;
  currentGoldPrice: number = 4250; // Default price
  private goldPriceService = GoldPriceService.getInstance();
  private unsubscribeAccounts?: () => void; // Real-time listener cleanup

  constructor(private userId: string) {
    super();
    makeObservable(this, {
      accounts: observable,
      selectedAccount: observable,
      currentGoldPrice: observable,
      setAccounts: action,
      setSelectedAccount: action,
      setCurrentGoldPrice: action,
      addAccount: action,
      updateAccount: action,
      removeAccount: action,
      totalBalance: computed,
      accountsWithRealTimeBalances: computed,
      accountSummary: computed,
    });
    
    this.loadAccounts();
    this.loadGoldPrice();
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

  // Altın hesapları için real-time balance hesaplama
  get accountsWithRealTimeBalances(): Account[] {
    return this.accounts.map(account => {
      if (account.type === AccountType.GOLD && account.goldGrams) {
        return {
          ...account,
          balance: account.goldGrams * this.currentGoldPrice
        };
      }
      return account;
    });
  }

  get totalBalance(): number {
    return this.accountsWithRealTimeBalances
      .filter(account => account.includeInTotalBalance)
      .reduce((total, account) => total + account.balance, 0);
  }

  get accountSummary(): AccountSummary {
    const summary: AccountSummary = {
      totalBalance: 0,
      cashBalance: 0,
      debitCardBalance: 0,
      creditCardBalance: 0,
      savingsBalance: 0,
      investmentBalance: 0,
      goldBalance: 0,
      goldGrams: 0,
    };

    this.accountsWithRealTimeBalances.forEach(account => {
      // Sadece toplam bakiyeye dahil edilenler toplam bakiyeye eklenir
      if (account.includeInTotalBalance) {
        summary.totalBalance += account.balance;
      }
      
      // Fakat tüm hesaplar kendi kategorilerinde sayılır
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
        case AccountType.GOLD:
          summary.goldBalance += account.balance;
          summary.goldGrams += account.goldGrams || 0;
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
      this.unsubscribeAccounts = onSnapshot(accountsQuery, (snapshot) => {
        const accountsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            // Eğer includeInTotalBalance field'ı yoksa default true yap
            includeInTotalBalance: data.includeInTotalBalance !== undefined ? data.includeInTotalBalance : true,
            // Eğer color field'ı yoksa hesap tipine göre default renk ver
            color: data.color || getDefaultColorForAccountType(data.type),
          } as Account;
        });
        
        this.setAccounts(accountsData);
        this.setLoading(false);
      });
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.setError('Hesaplar yüklenirken hata oluştu');
      this.setLoading(false);
    }
  };

  createAccount = async (accountData: CreateAccountRequest): Promise<boolean> => {
    try {
      this.setLoading(true);
      
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
        includeInTotalBalance: accountData.includeInTotalBalance ?? true, // Default true
        // Altın hesapları için özel alanlar
        ...(accountData.goldGrams && { goldGrams: accountData.goldGrams }),
        ...(accountData.initialGoldPrice && { initialGoldPrice: accountData.initialGoldPrice }),
      };

      const docRef = await addDoc(collection(db, 'accounts'), newAccount);
      
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
      
      // Undefined değerleri filtrele
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );
      
      const finalUpdateData = {
        ...filteredUpdateData,
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

  setCurrentGoldPrice = (price: number) => {
    this.currentGoldPrice = price;
  };

  loadGoldPrice = async () => {
    try {
      const priceData = await this.goldPriceService.getCurrentGoldPrices();
      this.setCurrentGoldPrice(priceData.gramPrice || priceData.buyPrice);
    } catch (error) {
      console.error('Altın fiyatı yüklenirken hata:', error);
      // Default fiyat zaten set edilmiş
    }
  };

  // Cleanup method
  dispose = () => {
    if (this.unsubscribeAccounts) {
      this.unsubscribeAccounts();
    }
  };
} 