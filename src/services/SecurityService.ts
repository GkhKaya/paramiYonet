export class SecurityService {
  private static readonly MAX_LOGIN_ATTEMPTS = parseInt(process.env.EXPO_PUBLIC_MAX_LOGIN_ATTEMPTS || '5');
  private static readonly RATE_LIMIT_REQUESTS = parseInt(process.env.EXPO_PUBLIC_RATE_LIMIT_REQUESTS || '100');
  private static readonly RATE_LIMIT_WINDOW = parseInt(process.env.EXPO_PUBLIC_RATE_LIMIT_WINDOW || '3600');
  
  private static loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private static rateLimitMap = new Map<string, { count: number; windowStart: number }>();

  // Input Validation
  static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 100;
  }

  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Şifre en az 8 karakter olmalıdır');
    }
    
    if (password.length > 128) {
      errors.push('Şifre en fazla 128 karakter olmalıdır');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Şifre en az bir büyük harf içermelidir');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Şifre en az bir küçük harf içermelidir');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Şifre en az bir rakam içermelidir');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Şifre en az bir özel karakter içermelidir');
    }
    
    // Check for common passwords
    const commonPasswords = [
      '12345678', 'password', 'qwerty', 'abc123', '123456789',
      'welcome', 'admin', 'letmein', 'monkey', 'dragon'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Bu şifre çok yaygın kullanılıyor, daha güvenli bir şifre seçin');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Input Sanitization
  static sanitizeString(input: string, maxLength: number = 200): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, ''); // Remove SQL injection characters
  }

  static sanitizeAmount(amount: any): number {
    if (typeof amount === 'number' && !isNaN(amount) && amount >= 0) {
      return Math.round(amount * 100) / 100; // Round to 2 decimal places
    }
    return 0;
  }

  static sanitizeDescription(description: string): string {
    return this.sanitizeString(description, 200);
  }

  static sanitizeAccountName(name: string): string {
    return this.sanitizeString(name, 50);
  }

  static sanitizeCategoryName(name: string): string {
    return this.sanitizeString(name, 50);
  }

  // Rate Limiting
  static checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const record = this.rateLimitMap.get(identifier);
    
    if (!record) {
      this.rateLimitMap.set(identifier, { count: 1, windowStart: now });
      return true;
    }
    
    // Check if we're in a new window
    if (now - record.windowStart > this.RATE_LIMIT_WINDOW * 1000) {
      this.rateLimitMap.set(identifier, { count: 1, windowStart: now });
      return true;
    }
    
    // Check if we've exceeded the limit
    if (record.count >= this.RATE_LIMIT_REQUESTS) {
      return false;
    }
    
    // Increment counter
    record.count++;
    return true;
  }

  // Login Attempt Tracking
  static recordLoginAttempt(identifier: string): boolean {
    const now = Date.now();
    const record = this.loginAttempts.get(identifier);
    
    if (!record) {
      this.loginAttempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }
    
    // Reset counter if last attempt was more than 15 minutes ago
    if (now - record.lastAttempt > 15 * 60 * 1000) {
      this.loginAttempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }
    
    record.count++;
    record.lastAttempt = now;
    
    return record.count <= this.MAX_LOGIN_ATTEMPTS;
  }

  static resetLoginAttempts(identifier: string): void {
    this.loginAttempts.delete(identifier);
  }

  static getLoginAttemptsLeft(identifier: string): number {
    const record = this.loginAttempts.get(identifier);
    if (!record) return this.MAX_LOGIN_ATTEMPTS;
    
    const now = Date.now();
    if (now - record.lastAttempt > 15 * 60 * 1000) {
      return this.MAX_LOGIN_ATTEMPTS;
    }
    
    return Math.max(0, this.MAX_LOGIN_ATTEMPTS - record.count);
  }

  // Data Validation
  static validateTransactionData(data: any): {
    isValid: boolean;
    errors: string[];
    sanitizedData?: any;
  } {
    const errors: string[] = [];
    
    if (!data.userId || typeof data.userId !== 'string') {
      errors.push('Geçersiz kullanıcı ID');
    }
    
    if (!data.accountId || typeof data.accountId !== 'string') {
      errors.push('Geçersiz hesap ID');
    }
    
    if (!data.description || typeof data.description !== 'string') {
      errors.push('Açıklama gerekli');
    }
    
    if (!data.category || typeof data.category !== 'string') {
      errors.push('Kategori gerekli');
    }
    
    if (!['income', 'expense'].includes(data.type)) {
      errors.push('Geçersiz işlem türü');
    }
    
    const amount = this.sanitizeAmount(data.amount);
    if (amount <= 0) {
      errors.push('Geçerli bir tutar giriniz');
    }
    
    if (amount > 1000000) {
      errors.push('Tutar çok büyük');
    }
    
    if (!data.date || !(data.date instanceof Date)) {
      errors.push('Geçerli bir tarih giriniz');
    }
    
    if (errors.length > 0) {
      return { isValid: false, errors };
    }
    
    return {
      isValid: true,
      errors: [],
      sanitizedData: {
        userId: data.userId,
        accountId: data.accountId,
        description: this.sanitizeDescription(data.description),
        category: this.sanitizeCategoryName(data.category),
        categoryIcon: data.categoryIcon || 'help-circle-outline',
        type: data.type,
        amount: amount,
        date: data.date
      }
    };
  }

  static validateAccountData(data: any): {
    isValid: boolean;
    errors: string[];
    sanitizedData?: any;
  } {
    const errors: string[] = [];
    
    if (!data.userId || typeof data.userId !== 'string') {
      errors.push('Geçersiz kullanıcı ID');
    }
    
    if (!data.name || typeof data.name !== 'string') {
      errors.push('Hesap adı gerekli');
    }
    
    const validAccountTypes = ['checking', 'savings', 'credit_card', 'cash', 'investment', 'gold'];
    if (!validAccountTypes.includes(data.type)) {
      errors.push('Geçersiz hesap türü');
    }
    
    const balance = this.sanitizeAmount(data.balance);
    if (isNaN(balance)) {
      errors.push('Geçerli bir bakiye giriniz');
    }
    
    if (errors.length > 0) {
      return { isValid: false, errors };
    }
    
    return {
      isValid: true,
      errors: [],
      sanitizedData: {
        userId: data.userId,
        name: this.sanitizeAccountName(data.name),
        type: data.type,
        balance: balance,
        color: data.color || '#007AFF',
        icon: data.icon || 'wallet-outline',
        isActive: data.isActive !== false,
        includeInTotalBalance: data.includeInTotalBalance !== false
      }
    };
  }

  // Environment Security
  static validateEnvironment(): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const requiredEnvVars = [
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Missing environment variable: ${envVar}`);
      }
    }
    
    // Check if we're in production and debug mode is enabled
    if (process.env.EXPO_PUBLIC_ENVIRONMENT === 'production' && 
        process.env.EXPO_PUBLIC_ENABLE_DEBUG_MODE === 'true') {
      errors.push('Debug mode should be disabled in production');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Security Headers and CSP
  static getSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://www.googleapis.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com"
      ].join('; ')
    };
  }

  // Error Sanitization
  static sanitizeError(error: any): string {
    if (!error) return 'Bilinmeyen hata';
    
    // Don't expose internal error details in production
    if (process.env.EXPO_PUBLIC_ENVIRONMENT === 'production') {
      // Map common Firebase errors to user-friendly messages
      const errorMessage = error.message || error.toString();
      
      if (errorMessage.includes('auth/user-not-found')) {
        return 'Kullanıcı bulunamadı';
      }
      
      if (errorMessage.includes('auth/wrong-password')) {
        return 'Yanlış şifre';
      }
      
      if (errorMessage.includes('auth/too-many-requests')) {
        return 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.';
      }
      
      if (errorMessage.includes('auth/network-request-failed')) {
        return 'Ağ bağlantısı hatası';
      }
      
      if (errorMessage.includes('permission-denied')) {
        return 'Bu işlem için yetkiniz yok';
      }
      
      if (errorMessage.includes('unauthenticated')) {
        return 'Oturum süreniz dolmuş, lütfen tekrar giriş yapın';
      }
      
      // Generic error for unknown errors
      return 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
    }
    
    // In development, show more details
    return error.message || error.toString();
  }

  // Generate secure random string
  static generateSecureId(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // Clean up sensitive data from logs
  static cleanupSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const cleaned = { ...data };
    const sensitiveKeys = [
      'password', 'token', 'apiKey', 'secret', 'key', 'authorization',
      'firebase', 'auth', 'credential', 'session'
    ];
    
    for (const key of Object.keys(cleaned)) {
      if (sensitiveKeys.some(sensitiveKey => 
          key.toLowerCase().includes(sensitiveKey)
      )) {
        cleaned[key] = '[REDACTED]';
      }
    }
    
    return cleaned;
  }
} 