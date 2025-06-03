export interface Budget {
  id: string;
  userId: string;
  categoryName: string; // Bağlantılı kategori adı (örn: "Market")
  categoryIcon?: string; // Kategori ikonu (görselleştirme için)
  categoryColor?: string; // Kategori rengi (görselleştirme için)
  budgetedAmount: number; // Bütçelenen toplam miktar
  spentAmount: number; // Bu bütçe için harcanan miktar (hesaplanacak)
  remainingAmount: number; // Kalan miktar (hesaplanacak)
  progressPercentage: number; // Harcama yüzdesi (hesaplanacak)
  period: 'monthly' | 'weekly'; // Bütçe periyodu
  startDate: Date; // Bütçe başlangıç tarihi
  endDate: Date;   // Bütçe bitiş tarihi
  createdAt: Date;
  updatedAt?: Date;
}

// Bu arayüzü ReportsViewModel'da kullanacağız
export interface BudgetWithProgress extends Budget {
  // spentAmount, remainingAmount, progressPercentage zaten Budget içinde var,
  // ancak burada ReportsViewModel tarafından hesaplanacağını vurgulamak için eklenebilir
  // Veya direkt Budget arayüzünü kullanabiliriz ve bu alanlar ReportsViewModel'da doldurulur.
  // Şimdilik Budget arayüzünü doğrudan kullanalım.
} 