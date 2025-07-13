interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in minutes
}

type CacheKey = string;

class CacheService {
  private cache: Map<CacheKey, CacheItem<any>> = new Map();
  private static instance: CacheService;
  
  // TTL values in minutes
  private static readonly DEFAULT_TTL = 5; // 5 minutes
  private static readonly CACHE_LIMITS = {
    TRANSACTIONS: 30, // 30 minutes
    ACCOUNTS: 60, // 1 hour
    CATEGORIES: 120, // 2 hours
    BUDGETS: 15, // 15 minutes
    USER_PROFILE: 30, // 30 minutes
    ANALYTICS: 10, // 10 minutes
  };

  private constructor() {
    // Cleanup expired cache items every 5 minutes
    setInterval(() => this.cleanupExpiredItems(), 5 * 60 * 1000);
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  private generateKey(prefix: string, ...params: (string | number)[]): CacheKey {
    return `${prefix}:${params.join(':')}`;
  }

  private isExpired(item: CacheItem<any>): boolean {
    const now = Date.now();
    const expiryTime = item.timestamp + (item.ttl * 60 * 1000);
    return now > expiryTime;
  }

  private cleanupExpiredItems(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
      }
    }
  }

  // Generic cache operations
  set<T>(key: CacheKey, data: T, ttl: number = CacheService.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: CacheKey): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (this.isExpired(item)) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  has(key: CacheKey): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (this.isExpired(item)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: CacheKey): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Domain-specific cache methods
  
  // Transactions
  setTransactions(userId: string, transactions: any[], params?: { monthStart?: Date, monthEnd?: Date }): void {
    const key = this.generateKey('transactions', userId, params?.monthStart?.toISOString() || '', params?.monthEnd?.toISOString() || '');
    this.set(key, transactions, CacheService.CACHE_LIMITS.TRANSACTIONS);
  }

  getTransactions(userId: string, params?: { monthStart?: Date, monthEnd?: Date }): any[] | null {
    const key = this.generateKey('transactions', userId, params?.monthStart?.toISOString() || '', params?.monthEnd?.toISOString() || '');
    return this.get(key);
  }

  // Accounts
  setAccounts(userId: string, accounts: any[]): void {
    const key = this.generateKey('accounts', userId);
    this.set(key, accounts, CacheService.CACHE_LIMITS.ACCOUNTS);
  }

  getAccounts(userId: string): any[] | null {
    const key = this.generateKey('accounts', userId);
    return this.get(key);
  }

  // Categories
  setCategories(userId: string, categories: any[]): void {
    const key = this.generateKey('categories', userId);
    this.set(key, categories, CacheService.CACHE_LIMITS.CATEGORIES);
  }

  getCategories(userId: string): any[] | null {
    const key = this.generateKey('categories', userId);
    return this.get(key);
  }

  // Budgets
  setBudgets(userId: string, budgets: any[]): void {
    const key = this.generateKey('budgets', userId);
    this.set(key, budgets, CacheService.CACHE_LIMITS.BUDGETS);
  }

  getBudgets(userId: string): any[] | null {
    const key = this.generateKey('budgets', userId);
    return this.get(key);
  }

  // User profile
  setUserProfile(userId: string, profile: any): void {
    const key = this.generateKey('user_profile', userId);
    this.set(key, profile, CacheService.CACHE_LIMITS.USER_PROFILE);
  }

  getUserProfile(userId: string): any | null {
    const key = this.generateKey('user_profile', userId);
    return this.get(key);
  }

  // Analytics
  setAnalytics(userId: string, type: string, data: any, params?: string[]): void {
    const key = this.generateKey('analytics', userId, type, ...(params || []));
    this.set(key, data, CacheService.CACHE_LIMITS.ANALYTICS);
  }

  getAnalytics(userId: string, type: string, params?: string[]): any | null {
    const key = this.generateKey('analytics', userId, type, ...(params || []));
    return this.get(key);
  }

  // Invalidation methods
  invalidateUserCache(userId: string): void {
    const keysToDelete: CacheKey[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  invalidateTransactionCache(userId: string): void {
    const keysToDelete: CacheKey[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`transactions:${userId}`) || key.startsWith(`analytics:${userId}`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  invalidateAccountCache(userId: string): void {
    const keysToDelete: CacheKey[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`accounts:${userId}`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Cache statistics
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default CacheService.getInstance(); 