import { makeObservable, observable, action, computed } from 'mobx';
import { BaseViewModel } from './BaseViewModel';
import { Category, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../models/Category';
import { TransactionType } from '../models/Transaction';
import { CategoryService } from '../services/CategoryService';

export class CategoryViewModel extends BaseViewModel {
  customCategories: Category[] = [];

  constructor(private userId: string) {
    super();
    makeObservable(this, {
      customCategories: observable,
      setCustomCategories: action,
      addCategory: action,
      removeCategory: action,
      updateCategory: action,
      allCategories: computed,
      expenseCategories: computed,
      incomeCategories: computed,
    });

    this.loadCustomCategories();
  }

  setCustomCategories = (categories: Category[]) => {
    this.customCategories = categories;
  };

  addCategory = (category: Category) => {
    this.customCategories.push(category);
  };

  removeCategory = (categoryId: string) => {
    this.customCategories = this.customCategories.filter(cat => cat.id !== categoryId);
  };

  updateCategory = (updatedCategory: Category) => {
    const index = this.customCategories.findIndex(cat => cat.id === updatedCategory.id);
    if (index !== -1) {
      this.customCategories[index] = updatedCategory;
    }
  };

  // Tüm kategorileri getir (default + custom)
  get allCategories(): Category[] {
    const defaultExpenseCategories: Category[] = DEFAULT_EXPENSE_CATEGORIES.map((cat, index) => ({
      ...cat,
      id: `default_expense_${index}`,
    }));

    const defaultIncomeCategories: Category[] = DEFAULT_INCOME_CATEGORIES.map((cat, index) => ({
      ...cat,
      id: `default_income_${index}`,
    }));

    return [...defaultExpenseCategories, ...defaultIncomeCategories, ...this.customCategories];
  }

  // Sadece gider kategorilerini getir
  get expenseCategories(): Category[] {
    return this.allCategories.filter(cat => cat.type === TransactionType.EXPENSE);
  }

  // Sadece gelir kategorilerini getir
  get incomeCategories(): Category[] {
    return this.allCategories.filter(cat => cat.type === TransactionType.INCOME);
  }

  // Custom kategorileri yükle
  loadCustomCategories = async (): Promise<void> => {
    await this.executeAsync(async () => {
      const categories = await CategoryService.getUserCategories(this.userId);
      this.setCustomCategories(categories);
      return categories;
    });
  };

  // Yeni kategori oluştur
  createCategory = async (
    name: string,
    icon: string,
    color: string,
    type: TransactionType
  ): Promise<boolean> => {
    const result = await this.executeAsync(async () => {
      // İsim benzersizliğini kontrol et
      const isUnique = await CategoryService.isCategoryNameUnique(this.userId, name);
      if (!isUnique) {
        throw new Error('Bu kategori adı zaten kullanılıyor');
      }

      // Default kategorilerle çakışıp çakışmadığını kontrol et
      const defaultNames = [
        ...DEFAULT_EXPENSE_CATEGORIES.map(cat => cat.name.toLowerCase()),
        ...DEFAULT_INCOME_CATEGORIES.map(cat => cat.name.toLowerCase())
      ];
      
      if (defaultNames.includes(name.toLowerCase().trim())) {
        throw new Error('Bu kategori adı varsayılan kategorilerle çakışıyor');
      }

      const categoryId = await CategoryService.createCategory(this.userId, name, icon, color, type);
      
      const newCategory: Category = {
        id: categoryId,
        userId: this.userId,
        name: name.trim(),
        icon,
        color,
        type,
        isDefault: false,
      };

      this.addCategory(newCategory);
      return newCategory;
    });

    return result !== null;
  };

  // Kategori güncelle
  editCategory = async (
    categoryId: string,
    updates: {
      name?: string;
      icon?: string;
      color?: string;
    }
  ): Promise<boolean> => {
    const result = await this.executeAsync(async () => {
      // İsim güncelleniyorsa benzersizliğini kontrol et
      if (updates.name) {
        const isUnique = await CategoryService.isCategoryNameUnique(
          this.userId,
          updates.name,
          categoryId
        );
        if (!isUnique) {
          throw new Error('Bu kategori adı zaten kullanılıyor');
        }
      }

      await CategoryService.updateCategory(categoryId, updates);

      // Local state'i güncelle
      const categoryIndex = this.customCategories.findIndex(cat => cat.id === categoryId);
      if (categoryIndex !== -1) {
        const updatedCategory = {
          ...this.customCategories[categoryIndex],
          ...updates,
        };
        this.updateCategory(updatedCategory);
      }

      return true;
    });

    return result !== null;
  };

  // Kategori sil
  deleteCategory = async (categoryId: string): Promise<boolean> => {
    const result = await this.executeAsync(async () => {
      await CategoryService.deleteCategory(categoryId);
      this.removeCategory(categoryId);
      return true;
    });

    return result !== null;
  };

  // Kategori adına göre kategori bul
  getCategoryByName = (name: string): Category | undefined => {
    return this.allCategories.find(cat => cat.name === name);
  };

  // Kategori ID'sine göre kategori bul
  getCategoryById = (id: string): Category | undefined => {
    return this.allCategories.find(cat => cat.id === id);
  };

  // Kategorinin silinebilir olup olmadığını kontrol et
  canDeleteCategory = (categoryId: string): boolean => {
    const category = this.getCategoryById(categoryId);
    return category ? !category.isDefault : false;
  };
} 