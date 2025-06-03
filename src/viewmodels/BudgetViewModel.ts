import { makeObservable, observable, action } from 'mobx';
import { Budget } from '../models/Budget';
import { DEFAULT_EXPENSE_CATEGORIES } from '../models/Category'; // İkon ve renk almak için

export class BudgetViewModel {
  budgets: Budget[] = [];
  isLoading = false;
  error: string | null = null;
  userId: string;

  constructor(userId: string) {
    this.userId = userId;
    makeObservable(this, {
      budgets: observable,
      isLoading: observable,
      error: observable,
      setBudgets: action,
      setLoading: action,
      setError: action,
      loadBudgets: action, // Gerçek yükleme fonksiyonu daha sonra eklenecek
    });
    this.loadMockBudgets(); // Başlangıçta sahte bütçeleri yükle
  }

  setLoading = (loading: boolean) => {
    this.isLoading = loading;
  };

  setError = (error: string | null) => {
    this.error = error;
  };

  setBudgets = (budgets: Budget[]) => {
    this.budgets = budgets;
  };

  // TODO: Firebase'den bütçeleri yüklemek için gerçek fonksiyon
  loadBudgets = async () => {
    this.setLoading(true);
    // Firebase'den veri çekme mantığı buraya gelecek
    // Şimdilik sahte bütçeleri kullanıyoruz
    this.loadMockBudgets(); 
    this.setLoading(false);
  };

  // Sahte bütçe verileri (UI geliştirme için)
  private loadMockBudgets = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const marketCategory = DEFAULT_EXPENSE_CATEGORIES.find(c => c.name === 'Market');
    const foodCategory = DEFAULT_EXPENSE_CATEGORIES.find(c => c.name === 'Yemek');

    const mockBudgets: Budget[] = [
      {
        id: '1',
        userId: this.userId,
        categoryName: 'Market',
        categoryIcon: marketCategory?.icon || 'basket',
        categoryColor: marketCategory?.color || '#4ECDC4',
        budgetedAmount: 2000,
        spentAmount: 0, // ReportsViewModel'da hesaplanacak
        remainingAmount: 2000, // ReportsViewModel'da hesaplanacak
        progressPercentage: 0, // ReportsViewModel'da hesaplanacak
        period: 'monthly',
        startDate: firstDayOfMonth,
        endDate: lastDayOfMonth,
        createdAt: today,
      },
      {
        id: '2',
        userId: this.userId,
        categoryName: 'Yemek',
        categoryIcon: foodCategory?.icon || 'restaurant',
        categoryColor: foodCategory?.color || '#FF6B6B',
        budgetedAmount: 1500,
        spentAmount: 0,
        remainingAmount: 1500,
        progressPercentage: 0,
        period: 'monthly',
        startDate: firstDayOfMonth,
        endDate: lastDayOfMonth,
        createdAt: today,
      },
      // İsterseniz haftalık bütçe örneği de eklenebilir
    ];
    this.setBudgets(mockBudgets);
  };
} 