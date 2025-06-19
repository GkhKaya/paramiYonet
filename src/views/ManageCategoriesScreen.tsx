import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { StackScreenProps } from '@react-navigation/stack';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { TransactionType } from '../models/Transaction';
import { Category } from '../models/Category';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { useViewModels } from '../contexts/ViewModelContext';
import { MainStackParamList } from '../types';

type ManageCategoriesScreenProps = StackScreenProps<MainStackParamList, 'ManageCategories'>;

const ManageCategoriesScreen: React.FC<ManageCategoriesScreenProps> = observer(({ navigation }) => {
  const { categoryViewModel } = useViewModels();
  const [selectedType, setSelectedType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await categoryViewModel?.loadCustomCategories();
    setRefreshing(false);
  };

  const handleEditCategory = (category: Category) => {
    navigation.navigate('AddCategory', {
      editCategory: {
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        type: category.type === TransactionType.INCOME ? 'income' : 'expense',
      }
    });
  };

  const handleDeleteCategory = (category: Category) => {
    if (!categoryViewModel) return;

    Alert.alert(
      'Kategoriyi Sil',
      `"${category.name}" kategorisini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const success = await categoryViewModel.deleteCategory(category.id);
            if (success) {
              Alert.alert('Başarılı', 'Kategori silindi');
            } else {
              Alert.alert('Hata', categoryViewModel.error || 'Kategori silinemedi');
            }
          }
        }
      ]
    );
  };

  const getCategories = (): Category[] => {
    if (!categoryViewModel) return [];
    
    if (selectedType === TransactionType.EXPENSE) {
      return categoryViewModel.expenseCategories;
    } else {
      return categoryViewModel.incomeCategories;
    }
  };

  const getCustomCategories = (): Category[] => {
    return getCategories().filter(cat => !cat.isDefault);
  };

  const getDefaultCategories = (): Category[] => {
    return getCategories().filter(cat => cat.isDefault);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Kategoriler</Text>
      <TouchableOpacity 
        onPress={() => navigation.navigate('AddCategory', { defaultType: selectedType === TransactionType.INCOME ? 'income' : 'expense' })} 
        style={styles.headerButton}
      >
        <Ionicons name="add" size={24} color={COLORS.PRIMARY} />
      </TouchableOpacity>
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.typeContainer}>
      <TouchableOpacity
        style={[
          styles.typeButton,
          selectedType === TransactionType.EXPENSE && styles.typeButtonActive
        ]}
        onPress={() => setSelectedType(TransactionType.EXPENSE)}
      >
        <Ionicons 
          name="remove-circle" 
          size={20} 
          color={selectedType === TransactionType.EXPENSE ? COLORS.WHITE : COLORS.EXPENSE} 
        />
        <Text style={[
          styles.typeButtonText,
          selectedType === TransactionType.EXPENSE && styles.typeButtonTextActive
        ]}>
          Gider Kategorileri
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeButton,
          selectedType === TransactionType.INCOME && styles.typeButtonActive
        ]}
        onPress={() => setSelectedType(TransactionType.INCOME)}
      >
        <Ionicons 
          name="add-circle" 
          size={20} 
          color={selectedType === TransactionType.INCOME ? COLORS.WHITE : COLORS.INCOME} 
        />
        <Text style={[
          styles.typeButtonText,
          selectedType === TransactionType.INCOME && styles.typeButtonTextActive
        ]}>
          Gelir Kategorileri
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCategoryItem = (category: Category, isCustom: boolean) => (
    <View key={category.id} style={styles.categoryItem}>
      <View style={styles.categoryInfo}>
        <CategoryIcon iconName={category.icon} color={category.color} size="large" />
        <Text style={styles.categoryName}>{category.name}</Text>
        {!isCustom && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Varsayılan</Text>
          </View>
        )}
      </View>
      
      {isCustom && (
        <View style={styles.categoryActions}>
          <TouchableOpacity 
            onPress={() => handleEditCategory(category)}
            style={styles.actionButton}
          >
            <Ionicons name="create" size={20} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleDeleteCategory(category)}
            style={styles.actionButton}
          >
            <Ionicons name="trash" size={20} color={COLORS.ERROR} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderCategorySection = (title: string, categories: Category[], isCustom: boolean) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {title} ({categories.length})
      </Text>
      {categories.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open" size={48} color={COLORS.TEXT_SECONDARY} />
          <Text style={styles.emptyStateText}>
            {isCustom ? 'Henüz özel kategori eklenmemiş' : 'Varsayılan kategori bulunamadı'}
          </Text>
          {isCustom && (
            <TouchableOpacity 
              style={styles.addCategoryButton}
              onPress={() => navigation.navigate('AddCategory', { defaultType: selectedType === TransactionType.INCOME ? 'income' : 'expense' })}
            >
              <Ionicons name="add" size={20} color={COLORS.WHITE} />
              <Text style={styles.addCategoryButtonText}>İlk Kategorini Ekle</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        categories.map(category => renderCategoryItem(category, isCustom))
      )}
    </View>
  );

  const customCategories = getCustomCategories();
  const defaultCategories = getDefaultCategories();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      {renderHeader()}
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        {renderTypeSelector()}
        
        {renderCategorySection('Özel Kategorilerim', customCategories, true)}
        {renderCategorySection('Varsayılan Kategoriler', defaultCategories, false)}
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginVertical: SPACING.lg,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    backgroundColor: COLORS.SURFACE,
    gap: SPACING.xs,
  },
  typeButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  typeButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  typeButtonTextActive: {
    color: COLORS.WHITE,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    marginBottom: SPACING.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  categoryName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: COLORS.TEXT_SECONDARY,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultBadgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.BACKGROUND,
    fontWeight: '500',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.xs,
    borderRadius: 8,
    backgroundColor: COLORS.CARD,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  addCategoryButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '500',
    color: COLORS.WHITE,
  },
});

export default ManageCategoriesScreen; 