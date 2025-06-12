/**
 * Kredi Kartı Yardımcı Fonksiyonları
 * TCMB Faiz Oranları: https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Istatistikler/Bankacilik+Verileri/Kredi_Karti_Islemlerinde_Uygulanacak_Azami_Faiz_Oranlari
 */

export interface CreditCardInterestRates {
  reference: number;  // Referans oran %3.11
  regular: number;    // Akdi faiz oranı
  overdue: number;    // Gecikme faiz oranı
}

/**
 * TCMB 2025 güncel faiz oranları
 * Dönem borcuna göre faiz oranı belirler
 */
export function getCreditCardInterestRates(debtAmount: number = 0): CreditCardInterestRates {
  // TCMB tablosundan alınan güncel oranlar (Haziran 2025)
  if (debtAmount < 25000) {
    return { 
      reference: 3.11, 
      regular: 3.50, 
      overdue: 3.80 
    };
  } else if (debtAmount < 150000) {
    return { 
      reference: 3.11, 
      regular: 4.25, 
      overdue: 4.55 
    };
  } else {
    return { 
      reference: 3.11, 
      regular: 4.75, 
      overdue: 5.05 
    };
  }
}

/**
 * Kredi kartı limitine göre faiz oranı hesaplama
 * Hesap oluşturulurken kullanılır
 */
export function getCreditCardInterestRatesByLimit(creditLimit: number = 0): CreditCardInterestRates {
  // TCMB tablosundan alınan güncel oranlar (Haziran 2025)
  // Limit değerine göre faiz oranı belirlenir
  if (creditLimit < 25000) {
    return { 
      reference: 3.11, 
      regular: 3.50, 
      overdue: 3.80 
    };
  } else if (creditLimit < 150000) {
    return { 
      reference: 3.11, 
      regular: 4.25, 
      overdue: 4.55 
    };
  } else {
    return { 
      reference: 3.11, 
      regular: 4.75, 
      overdue: 5.05 
    };
  }
}

/**
 * Faiz oranı açıklama mesajı
 */
export function getInterestRateDescription(): string {
  return 'TCMB düzenlemelerine göre otomatik hesaplanır. Bankadan bankaya değişebilir.';
}

/**
 * Nakit çekim/avans için faiz oranı
 */
export function getCashAdvanceInterestRate(): number {
  return 5.00; // Nakit çekim için %5.00 (TCMB tablosu)
}

/**
 * Asgari ödeme oranı (Türkiye'de yasal %20)
 */
export function getMinPaymentRate(): number {
  return 0.20;
}

/**
 * Asgari ödeme tutarını hesaplar
 */
export function calculateMinPayment(debtAmount: number): number {
  return debtAmount * getMinPaymentRate();
}

/**
 * Faiz hesaplama (aylık)
 */
export function calculateMonthlyInterest(debtAmount: number, isOverdue: boolean = false): number {
  const rates = getCreditCardInterestRates(debtAmount);
  const rate = isOverdue ? rates.overdue : rates.regular;
  return (debtAmount * rate) / 100;
}

/**
 * Kullanılabilir limit hesaplama
 */
export function calculateAvailableLimit(limit: number, currentDebt: number): number {
  return Math.max(limit - currentDebt, 0);
}

/**
 * Kredi kartı yapılandırma faiz oranı (BDDK 26/9/2024 kararı)
 */
export function getRestructuringInterestRate(): { regular: number; overdue: number } {
  return {
    regular: 3.11, // Aylık akdi faiz referans oranını aşamaz
    overdue: 5.30  // En yüksek gecikme faiz oranı
  };
}

/**
 * Kredi kartı gün validasyonu ve ayarlaması
 * 1-30 arası değer kabul eder, şubat için 30'u 28'e çevirir
 */
export function validateAndAdjustCreditCardDay(day: number): number {
  // 1-30 arası kontrol
  if (day < 1 || day > 30) {
    throw new Error('Gün 1-30 arasında olmalıdır');
  }

  // Şubat ayında 30. gün seçildiyse 28'e çevir
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth(); // 0 = Ocak, 1 = Şubat
  
  if (currentMonth === 1 && day === 30) { // Şubat ayındayız ve 30 seçilmişse
    return 28;
  }

  return day;
}

/**
 * Gün inputu için validasyon mesajı
 */
export function getDayValidationMessage(): string {
  return '1-30 arası bir gün seçin (Şubat ayında 30 seçilirse otomatik 28 olur)';
} 