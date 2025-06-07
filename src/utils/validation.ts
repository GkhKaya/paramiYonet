// Email ve Password Validation Utilities

// Email regex - RFC 5322 standardına uygun
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Password regex - En az 8 karakter, büyük harf, küçük harf, sayı ve özel karakter
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Password kuralları açıklaması
export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialChars: '@$!%*?&'
};

// Email validation fonksiyonu
export const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  if (!email) {
    return { isValid: false, message: 'Email adresi gereklidir.' };
  }
  
  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, message: 'Geçerli bir email adresi giriniz.' };
  }
  
  return { isValid: true };
};

// Password validation fonksiyonu
export const validatePassword = (password: string): { isValid: boolean; message?: string; errors: string[] } => {
  const errors: string[] = [];
  
  if (!password) {
    return { isValid: false, message: 'Şifre gereklidir.', errors: ['Şifre gereklidir.'] };
  }
  
  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`En az ${PASSWORD_RULES.minLength} karakter olmalıdır.`);
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('En az bir küçük harf içermelidir.');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('En az bir büyük harf içermelidir.');
  }
  
  if (!/\d/.test(password)) {
    errors.push('En az bir sayı içermelidir.');
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push(`En az bir özel karakter içermelidir (${PASSWORD_RULES.specialChars}).`);
  }
  
  const isValid = errors.length === 0;
  const message = isValid ? undefined : errors.join(' ');
  
  return { isValid, message, errors };
};

// Şifre confirm validation
export const validatePasswordConfirm = (password: string, confirmPassword: string): { isValid: boolean; message?: string } => {
  if (!confirmPassword) {
    return { isValid: false, message: 'Şifre tekrarı gereklidir.' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, message: 'Şifreler eşleşmiyor.' };
  }
  
  return { isValid: true };
};

// Display name validation
export const validateDisplayName = (displayName: string): { isValid: boolean; message?: string } => {
  if (!displayName || displayName.trim().length === 0) {
    return { isValid: false, message: 'İsim gereklidir.' };
  }
  
  if (displayName.trim().length < 2) {
    return { isValid: false, message: 'İsim en az 2 karakter olmalıdır.' };
  }
  
  if (displayName.trim().length > 50) {
    return { isValid: false, message: 'İsim en fazla 50 karakter olabilir.' };
  }
  
  return { isValid: true };
};

// Genel form validation fonksiyonu
export const validateForm = (formData: {
  email?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  if (formData.email !== undefined) {
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.message!;
    }
  }
  
  if (formData.password !== undefined) {
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message!;
    }
  }
  
  if (formData.confirmPassword !== undefined && formData.password !== undefined) {
    const confirmValidation = validatePasswordConfirm(formData.password, formData.confirmPassword);
    if (!confirmValidation.isValid) {
      errors.confirmPassword = confirmValidation.message!;
    }
  }
  
  if (formData.displayName !== undefined) {
    const displayNameValidation = validateDisplayName(formData.displayName);
    if (!displayNameValidation.isValid) {
      errors.displayName = displayNameValidation.message!;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}; 