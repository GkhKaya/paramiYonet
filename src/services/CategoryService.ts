import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Category } from '../models/Category';
import { TransactionType } from '../models/Transaction';

export class CategoryService {
  private static readonly COLLECTION_NAME = 'categories';

  // Kullanıcının custom kategorilerini getir
  static async getUserCategories(userId: string): Promise<Category[]> {
    try {
      const categoriesQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('name', 'asc')
      );

      const querySnapshot = await getDocs(categoriesQuery);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          icon: data.icon,
          color: data.color,
          type: data.type,
          isDefault: false, // User categories are never default
          userId: data.userId,
        } as Category;
      });
    } catch (error) {
      console.error('Error getting user categories:', error);
      throw error;
    }
  }

  // Yeni kategori oluştur
  static async createCategory(
    userId: string,
    name: string,
    icon: string,
    color: string,
    type: TransactionType
  ): Promise<string> {
    try {
      const categoryData = {
        userId,
        name: name.trim(),
        icon,
        color,
        type,
        isDefault: false,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), categoryData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Kategori güncelle
  static async updateCategory(
    categoryId: string,
    updates: {
      name?: string;
      icon?: string;
      color?: string;
    }
  ): Promise<void> {
    try {
      const categoryRef = doc(db, this.COLLECTION_NAME, categoryId);
      await updateDoc(categoryRef, {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Kategori sil
  static async deleteCategory(categoryId: string): Promise<void> {
    try {
      const categoryRef = doc(db, this.COLLECTION_NAME, categoryId);
      await deleteDoc(categoryRef);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Kategori adının benzersiz olup olmadığını kontrol et
  static async isCategoryNameUnique(userId: string, name: string, excludeId?: string): Promise<boolean> {
    try {
      const categoriesQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('name', '==', name.trim())
      );

      const querySnapshot = await getDocs(categoriesQuery);
      
      if (excludeId) {
        // Update işlemi için - aynı ID'li kategoriyi hariç tut
        return querySnapshot.docs.filter(doc => doc.id !== excludeId).length === 0;
      }
      
      return querySnapshot.docs.length === 0;
    } catch (error) {
      console.error('Error checking category name uniqueness:', error);
      return false;
    }
  }
} 