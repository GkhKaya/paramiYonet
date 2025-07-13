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
import { Account, AccountType, CreateAccountRequest, UpdateAccountRequest, AccountSummary, GoldSummary, GoldType, GoldHoldings } from '../models/Account';
import { BaseViewModel } from './BaseViewModel';
import { Transaction, TransactionType } from '../models/Transaction';
import GoldPriceService from '../services/GoldPriceService';
import { COLORS } from '../constants';
import CacheService from '../services/CacheService';

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
  currentGoldPrices: any = null; // AllGoldPricesData türü olacak
  private goldPriceService = GoldPriceService.getInstance();
  private unsubscribeAccounts?: () => void; // Real-time listener cleanup

  constructor(private userId: string) {
    super();
    makeObservable(this, {
      accounts: observable,
      selectedAccount: observable,
      currentGoldPrices: observable,
      setAccounts: action,
      setSelectedAccount: action,
      setCurrentGoldPrices: action,
      addAccount: action,
      updateAccount: action,
      removeAccount: action,
      totalBalance: computed,
      accountsWithRealTimeBalances: computed,
      accountSummary: computed,
    });
    
    this.loadAccounts();
    this.loadGoldPrices();
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
      if (account.type === AccountType.GOLD && account.goldHoldings && this.currentGoldPrices) {
        // Altın hesabının anlık değerini hesapla
        let totalValue = 0;
        
        Object.entries(account.goldHoldings).forEach(([goldType, holdings]) => {
          if (holdings && holdings.length > 0) {
            const currentPrice = this.currentGoldPrices.prices[goldType as GoldType];
                         holdings.forEach((holding: any) => {
               totalValue += holding.quantity * currentPrice;
             });
          }
        });
        
        return {
          ...account,
          balance: totalValue
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
      goldSummary: {
        totalValue: 0,
        totalProfitLoss: 0,
        totalProfitLossPercentage: 0,
        breakdown: {
          [GoldType.GRAM]: { quantity: 0, value: 0 },
          [GoldType.QUARTER]: { quantity: 0, value: 0 },
          [GoldType.HALF]: { quantity: 0, value: 0 },
          [GoldType.FULL]: { quantity: 0, value: 0 },
        }
      }
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
          
          // Altın detaylarını hesapla
          if (account.goldHoldings && this.currentGoldPrices) {
            Object.entries(account.goldHoldings).forEach(([goldType, holdings]) => {
              if (holdings && holdings.length > 0) {
                const typeKey = goldType as GoldType;
                const currentPrice = this.currentGoldPrices.prices[typeKey];
                
                let typeQuantity = 0;
                let typeValue = 0;
                
                                 holdings.forEach((holding: any) => {
                   typeQuantity += holding.quantity;
                   typeValue += holding.quantity * currentPrice;
                 });
                
                summary.goldSummary.breakdown[typeKey].quantity += typeQuantity;
                summary.goldSummary.breakdown[typeKey].value += typeValue;
              }
            });
          }
          break;
      }
    });

    // Altın toplam kar/zarar hesaplama
    summary.goldSummary.totalValue = summary.goldBalance;
    
    // Kar/zarar hesaplaması için initial değerleri bul
    let totalInitialValue = 0;
    this.accounts
      .filter(acc => acc.type === AccountType.GOLD && acc.goldHoldings)
      .forEach(account => {
        Object.entries(account.goldHoldings!).forEach(([goldType, holdings]) => {
          if (holdings) {
                       holdings.forEach((holding: any) => {
             totalInitialValue += holding.quantity * holding.initialPrice;
           });
          }
        });
      });
    
    summary.goldSummary.totalProfitLoss = summary.goldSummary.totalValue - totalInitialValue;
    summary.goldSummary.totalProfitLossPercentage = totalInitialValue > 0 
      ? (summary.goldSummary.totalProfitLoss / totalInitialValue) * 100 
      : 0;

    return summary;
  }

  loadAccounts = async () => {
    try {
      this.setLoading(true);
      
      // Check cache first
      const cachedAccounts = CacheService.getAccounts(this.userId);
      if (cachedAccounts) {
        this.setAccounts(cachedAccounts);
        this.setLoading(false);
        return;
      }
      
      // Use simple query to avoid composite index requirement
      const accountsQuery = query(
        collection(db, 'accounts'),
        where('userId', '==', this.userId)
      );

      const snapshot = await getDocs(accountsQuery);
      const accountsData = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            openingDate: data.openingDate?.toDate() || new Date(),
            currency: data.currency || 'TRY',
            // Eğer includeInTotalBalance field'ı yoksa default true yap
            includeInTotalBalance: data.includeInTotalBalance !== undefined ? data.includeInTotalBalance : true,
            // Eğer color field'ı yoksa hesap tipine göre default renk ver
            color: data.color || getDefaultColorForAccountType(data.type),
            // goldHoldings varsa date'leri dönüştür
            goldHoldings: data.goldHoldings ? this.convertGoldHoldingsDates(data.goldHoldings) : undefined,
          } as Account;
        })
        // Filter for active accounts client-side to avoid composite index
        .filter(account => account.isActive !== false);
      
      // Cache the results
      CacheService.setAccounts(this.userId, accountsData);
      
      this.setAccounts(accountsData);
      this.setLoading(false);
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.setError('Hesaplar yüklenirken hata oluştu');
      this.setLoading(false);
    }
  };

  // Firebase'den gelen goldHoldings'deki date'leri dönüştür
  convertGoldHoldingsDates = (goldHoldings: any): GoldHoldings => {
    const converted: GoldHoldings = {};
    
    Object.entries(goldHoldings).forEach(([goldType, holdings]: [string, any]) => {
      if (holdings && Array.isArray(holdings)) {
                 converted[goldType as GoldType] = holdings.map((holding: any) => ({
           ...holding,
           purchaseDate: holding.purchaseDate?.toDate ? holding.purchaseDate.toDate() : new Date(holding.purchaseDate),
         }));
      }
    });
    
    return converted;
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
        ...(accountData.goldHoldings && { goldHoldings: this.convertGoldHoldingsForFirebase(accountData.goldHoldings) }),
        // Kredi kartı için özel alanlar
        ...(accountData.type === AccountType.CREDIT_CARD && {
          limit: accountData.limit || 0,
          currentDebt: accountData.currentDebt || 0,
          statementDay: accountData.statementDay || 1,
          dueDay: accountData.dueDay || 10,
          interestRate: accountData.interestRate || 0,
          minPaymentRate: accountData.minPaymentRate || 0.20,
        }),
      };

      const docRef = await addDoc(collection(db, 'accounts'), newAccount);
      
      const createdAccount: Account = {
        id: docRef.id,
        ...newAccount,
        createdAt: new Date(),
        updatedAt: new Date(),
        openingDate: new Date(),
        currency: 'TRY',
        goldHoldings: accountData.goldHoldings,
      };

      this.addAccount(createdAccount);
      
      // Invalidate cache after creating account
      CacheService.invalidateAccountCache(this.userId);
      
      this.setLoading(false);
      return true;
    } catch (error) {
      console.error('Error creating account:', error);
      this.setError('Hesap oluşturulurken hata oluştu');
      this.setLoading(false);
      return false;
    }
  };

  // GoldHoldings'i Firebase'e uygun formata çevir
  convertGoldHoldingsForFirebase = (goldHoldings: GoldHoldings): any => {
    const converted: any = {};
    
    Object.entries(goldHoldings).forEach(([goldType, holdings]) => {
      if (holdings && holdings.length > 0) {
                 converted[goldType] = holdings.map((holding: any) => ({
           ...holding,
           purchaseDate: Timestamp.fromDate(holding.purchaseDate),
         }));
      }
    });
    
    return converted;
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
      
             // goldHoldings varsa Firebase formatına çevir
       if (filteredUpdateData.goldHoldings && typeof filteredUpdateData.goldHoldings === 'object') {
         filteredUpdateData.goldHoldings = this.convertGoldHoldingsForFirebase(filteredUpdateData.goldHoldings as GoldHoldings);
       }
      
      const finalUpdateData = {
        ...filteredUpdateData,
        updatedAt: Timestamp.now(),
      };
      
      await updateDoc(accountRef, finalUpdateData);
      
      // Invalidate cache after updating account
      CacheService.invalidateAccountCache(this.userId);
      
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
      
      // Invalidate cache after deleting account
      CacheService.invalidateAccountCache(this.userId);
      
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

  /**
   * Kredi kartı harcaması ekler - bakiyeyi değiştirmez, sadece borcu arttırır
   */
  addCreditCardTransaction = async (
    creditCardId: string, 
    amount: number, 
    description: string, 
    category: string
  ): Promise<boolean> => {
    try {
      this.setLoading(true);

      const creditCard = this.getAccountById(creditCardId);
      if (!creditCard || creditCard.type !== AccountType.CREDIT_CARD) {
        throw new Error('Geçersiz kredi kartı');
      }

      // Kredi kartının borçunu artır
      const newDebt = (creditCard.currentDebt || 0) + amount;
      
      await updateDoc(doc(db, 'accounts', creditCardId), {
        currentDebt: newDebt,
        updatedAt: Timestamp.now()
      });

      // Transaction kaydı da ekle (görünürlük için)
      await addDoc(collection(db, 'transactions'), {
        userId: this.userId,
        accountId: creditCardId,
        amount: -amount, // Kredi kartında harcama negatif
        type: TransactionType.EXPENSE,
        description,
        category,
        categoryIcon: 'card',
        date: Timestamp.now(),
        createdAt: Timestamp.now(),
        isCreditCardTransaction: true,
      });

      // Real-time listener otomatik güncelleyecek, manual reload gerekmiyor

      this.setLoading(false);
      return true;
    } catch (error) {
      console.error('Kredi kartı harcaması eklenirken hata:', error);
      this.setError('Harcama eklenirken hata oluştu');
      this.setLoading(false);
      return false;
    }
  };

  /**
   * Kredi kartı borç ödemesi - seçilen hesaptan para alır, kredi kartı borcunu azaltır
   */
  addCreditCardPayment = async (
    creditCardId: string,
    fromAccountId: string | null,
    amount: number,
    paymentType: 'minimum' | 'full' | 'custom',
    description?: string,
    addAsExpense: boolean = true
  ): Promise<boolean> => {
    try {
      this.setLoading(true);

      const creditCard = this.getAccountById(creditCardId);
      if (!creditCard || creditCard.type !== AccountType.CREDIT_CARD) {
        throw new Error('Geçersiz kredi kartı');
      }

      // Dahili ödeme (kullanıcının kendi hesabından)
      if (fromAccountId) {
        const fromAccount = this.getAccountById(fromAccountId);

        if (!fromAccount) {
          throw new Error('Geçersiz ödeme hesabı');
        }

        if (fromAccount.balance < amount) {
          throw new Error('Yetersiz bakiye');
        }

        // Ödeme hesabından para çıkar
        await updateDoc(doc(db, 'accounts', fromAccountId), {
          balance: fromAccount.balance - amount,
          updatedAt: Timestamp.now(),
        });

        // Gider olarak işlem kaydet (eğer istenmişse)
        if (addAsExpense) {
          await addDoc(collection(db, 'transactions'), {
            userId: this.userId,
            accountId: fromAccountId,
            amount: -amount,
            type: TransactionType.EXPENSE,
            description: description || `Kredi kartı ödeme (${creditCard.name})`,
            category: 'Kredi Kartı Ödeme',
            categoryIcon: 'card',
            date: Timestamp.now(),
            createdAt: Timestamp.now(),
          });
        }
      }
      // `fromAccountId` null ise dış kaynaklı ödemedir, kullanıcının hesap bakiyeleri etkilenmez.

      // Kredi kartı borcunu azalt (her iki durumda da ortak)
      const newDebt = Math.max((creditCard.currentDebt || 0) - amount, 0);
      await updateDoc(doc(db, 'accounts', creditCardId), {
        currentDebt: newDebt,
        updatedAt: Timestamp.now(),
      });

      this.setLoading(false);
      return true;
    } catch (error) {
      console.error('Kredi kartı ödemesi yapılırken hata:', error);
      this.setError('Ödeme yapılırken hata oluştu');
      this.setLoading(false);
      return false;
    }
  };

  // Utility function to recalculate balances from transactions
  recalculateBalancesFromTransactions = async (): Promise<boolean> => {
    try {
      
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
      
      
      
      // Update each account's balance in Firebase
      const updatePromises = Object.entries(accountBalances).map(async ([accountId, balance]) => {
        const accountRef = doc(db, 'accounts', accountId);
        await updateDoc(accountRef, {
          balance: balance,
          updatedAt: Timestamp.fromDate(new Date())
        });
        
      });
      
      await Promise.all(updatePromises);
      
      
      return true;
    } catch (error) {
      console.error('Error recalculating balances:', error);
      this.setError('Bakiyeler hesaplanırken hata oluştu');
      return false;
    }
  };

  setCurrentGoldPrices = (prices: any) => {
    this.currentGoldPrices = prices;
  };

  loadGoldPrices = async () => {
    try {
      const pricesData = await this.goldPriceService.getAllGoldPrices();
      this.setCurrentGoldPrices(pricesData);
    } catch (error) {
      console.error('Error loading gold prices:', error);
    }
  };

  dispose = () => {
    if (this.unsubscribeAccounts) {
      this.unsubscribeAccounts();
    }
  };
} 