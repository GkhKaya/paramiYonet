/**
 * Validators - Form Doğrulama Yardımcıları
 * 
 * Bu dosya uygulamadaki tüm form doğrulama işlemlerini içerir.
 * Her validator tek bir sorumluluğa sahiptir ve test edilebilir yapıdadır.
 */

/**
 * Doğrulama sonucu tipi
 */
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * E-posta adresinin geçerliliğini kontrol eder
 * @param email - Kontrol edilecek e-posta adresi
 * @returns Doğrulama sonucu
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: 'E-posta adresi gereklidir'
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      errorMessage: 'Geçerli bir e-posta adresi giriniz'
    };
  }

  return { isValid: true };
};

/**
 * Şifrenin güvenlik kriterlerini kontrol eder
 * @param password - Kontrol edilecek şifre
 * @returns Doğrulama sonucu
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password || password.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Şifre gereklidir'
    };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      errorMessage: 'Şifre en az 6 karakter olmalıdır'
    };
  }

  // Güçlü şifre kontrolü (isteğe bağlı)
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
    return {
      isValid: false,
      errorMessage: 'Şifre en az bir büyük harf, bir küçük harf ve bir sayı içermelidir'
    };
  }

  return { isValid: true };
};

/**
 * Şifre onayının eşleşmesini kontrol eder
 * @param password - Orijinal şifre
 * @param confirmPassword - Onay şifresi
 * @returns Doğrulama sonucu
 */
export const validatePasswordConfirmation = (password: string, confirmPassword: string): ValidationResult => {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      errorMessage: 'Şifreler eşleşmiyor'
    };
  }

  return { isValid: true };
};

/**
 * Kullanıcı adının geçerliliğini kontrol eder
 * @param displayName - Kontrol edilecek kullanıcı adı
 * @returns Doğrulama sonucu
 */
export const validateDisplayName = (displayName: string): ValidationResult => {
  if (!displayName || displayName.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: 'Ad Soyad gereklidir'
    };
  }

  if (displayName.trim().length < 2) {
    return {
      isValid: false,
      errorMessage: 'Ad Soyad en az 2 karakter olmalıdır'
    };
  }

  if (displayName.trim().length > 50) {
    return {
      isValid: false,
      errorMessage: 'Ad Soyad en fazla 50 karakter olabilir'
    };
  }

  return { isValid: true };
};

/**
 * Hesap adının geçerliliğini kontrol eder
 * @param accountName - Kontrol edilecek hesap adı
 * @returns Doğrulama sonucu
 */
export const validateAccountName = (accountName: string): ValidationResult => {
  if (!accountName || accountName.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: 'Hesap adı gereklidir'
    };
  }

  if (accountName.trim().length < 2) {
    return {
      isValid: false,
      errorMessage: 'Hesap adı en az 2 karakter olmalıdır'
    };
  }

  if (accountName.trim().length > 30) {
    return {
      isValid: false,
      errorMessage: 'Hesap adı en fazla 30 karakter olabilir'
    };
  }

  return { isValid: true };
};

/**
 * Para miktarının geçerliliğini kontrol eder
 * @param amount - Kontrol edilecek miktar
 * @param allowZero - Sıfır değerine izin verilsin mi?
 * @param allowNegative - Negatif değerlere izin verilsin mi?
 * @returns Doğrulama sonucu
 */
export const validateAmount = (
  amount: number | string, 
  allowZero: boolean = false, 
  allowNegative: boolean = false
): ValidationResult => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return {
      isValid: false,
      errorMessage: 'Geçerli bir miktar giriniz'
    };
  }

  if (!allowZero && numericAmount === 0) {
    return {
      isValid: false,
      errorMessage: 'Miktar sıfırdan farklı olmalıdır'
    };
  }

  if (!allowNegative && numericAmount < 0) {
    return {
      isValid: false,
      errorMessage: 'Miktar negatif olamaz'
    };
  }

  // Çok büyük miktarları kontrol et
  const MAX_AMOUNT = 999999999.99;
  if (Math.abs(numericAmount) > MAX_AMOUNT) {
    return {
      isValid: false,
      errorMessage: 'Miktar çok büyük'
    };
  }

  return { isValid: true };
};

/**
 * İşlem açıklamasının geçerliliğini kontrol eder
 * @param description - Kontrol edilecek açıklama
 * @param required - Açıklama zorunlu mu?
 * @returns Doğrulama sonucu
 */
export const validateTransactionDescription = (description: string, required: boolean = false): ValidationResult => {
  if (required && (!description || description.trim().length === 0)) {
    return {
      isValid: false,
      errorMessage: 'Açıklama gereklidir'
    };
  }

  if (description && description.length > 200) {
    return {
      isValid: false,
      errorMessage: 'Açıklama en fazla 200 karakter olabilir'
    };
  }

  return { isValid: true };
};

/**
 * Telefon numarasının geçerliliğini kontrol eder (Türkiye formatı)
 * @param phone - Kontrol edilecek telefon numarası
 * @returns Doğrulama sonucu
 */
export const validatePhoneNumber = (phone: string): ValidationResult => {
  if (!phone || phone.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: 'Telefon numarası gereklidir'
    };
  }

  // Sadece rakamları al
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Türkiye telefon numarası formatları
  const isValidLength = cleanPhone.length === 10 || (cleanPhone.length === 11 && cleanPhone.startsWith('0'));
  
  if (!isValidLength) {
    return {
      isValid: false,
      errorMessage: 'Geçerli bir telefon numarası giriniz'
    };
  }

  return { isValid: true };
};

/**
 * Tarih seçiminin geçerliliğini kontrol eder
 * @param date - Kontrol edilecek tarih
 * @param allowFuture - Gelecek tarihlere izin verilsin mi?
 * @returns Doğrulama sonucu
 */
export const validateDate = (date: Date | string, allowFuture: boolean = false): ValidationResult => {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (isNaN(dateObj.getTime())) {
    return {
      isValid: false,
      errorMessage: 'Geçerli bir tarih seçiniz'
    };
  }

  const now = new Date();
  
  if (!allowFuture && dateObj > now) {
    return {
      isValid: false,
      errorMessage: 'Gelecek tarih seçilemez'
    };
  }

  // Çok eski tarihleri kontrol et (100 yıl öncesi)
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);
  
  if (dateObj < minDate) {
    return {
      isValid: false,
      errorMessage: 'Çok eski bir tarih seçildi'
    };
  }

  return { isValid: true };
}; 