import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryIcon } from '../common/CategoryIcon';
import { Button } from '../common/Button';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../models/Category';

interface CreateBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (budgetData: {
    categoryName: string;
    budgetedAmount: number;
    period: 'monthly' | 'weekly';
    includeAllCategories?: boolean;
    budgetType?: 'single' | 'all';
  }) => Promise<boolean>;
  isLoading: boolean;
}

export const CreateBudgetModal: React.FC<CreateBudgetModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isLoading,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [budgetType, setBudgetType] = useState<'single' | 'all'>('single');
  const [includeIncomeCategories, setIncludeIncomeCategories] = useState(false);

  const resetForm = () => {
    setSelectedCategory('');
    setAmount('');
    setPeriod('monthly');
    setBudgetType('single');
    setIncludeIncomeCategories(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    // Validations
    if (budgetType === 'single' && !selectedCategory) {
      Alert.alert('Hata', 'Lütfen bir kategori seçin veya tüm kategoriler seçeneğini kullanın');
      return;
    }

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar girin');
      return;
    }

    try {
      const success = await onSubmit({
        categoryName: budgetType === 'all' ? 'Tüm Kategoriler' : selectedCategory,
        budgetedAmount: numericAmount,
        period,
        includeAllCategories: budgetType === 'all',
        budgetType,
      });

      if (success) {
        resetForm();
        onClose();
      }
    } catch (error) {
      console.error('Error creating budget:', error);
    }
  };

  const formatAmount = (text: string) => {
    // Remove non-numeric characters except comma and dot
    const cleaned = text.replace(/[^0-9.,]/g, '');
    setAmount(cleaned);
  };

  const handleBudgetTypeChange = (type: 'single' | 'all') => {
    setBudgetType(type);
    if (type === 'all') {
      setSelectedCategory('');
    }
  };

  const allCategories = [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...(includeIncomeCategories ? DEFAULT_INCOME_CATEGORIES : [])
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.title}>Yeni Bütçe</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Budget Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bütçe Türü</Text>
            <View style={styles.budgetTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.budgetTypeButton,
                  budgetType === 'single' && styles.budgetTypeButtonActive
                ]}
                onPress={() => handleBudgetTypeChange('single')}
              >
                <Ionicons 
                  name="pricetag" 
                  size={20} 
                  color={budgetType === 'single' ? COLORS.WHITE : COLORS.PRIMARY} 
                />
                <Text style={[
                  styles.budgetTypeButtonText,
                  budgetType === 'single' && styles.budgetTypeButtonTextActive
                ]}>
                  Tek Kategori
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.budgetTypeButton,
                  budgetType === 'all' && styles.budgetTypeButtonActive
                ]}
                onPress={() => handleBudgetTypeChange('all')}
              >
                <Ionicons 
                  name="pricetags" 
                  size={20} 
                  color={budgetType === 'all' ? COLORS.WHITE : COLORS.PRIMARY} 
                />
                <Text style={[
                  styles.budgetTypeButtonText,
                  budgetType === 'all' && styles.budgetTypeButtonTextActive
                ]}>
                  Tüm Kategoriler
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.budgetTypeHelper}>
              {budgetType === 'single' 
                ? 'Belirli bir kategori için bütçe oluşturun'
                : 'Tüm kategoriler için toplam bütçe belirleyin'
              }
            </Text>
          </View>

          {/* Period Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bütçe Periyodu</Text>
            <View style={styles.periodSelector}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  period === 'monthly' && styles.periodButtonActive
                ]}
                onPress={() => setPeriod('monthly')}
              >
                <Text style={[
                  styles.periodButtonText,
                  period === 'monthly' && styles.periodButtonTextActive
                ]}>
                  Aylık
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  period === 'weekly' && styles.periodButtonActive
                ]}
                onPress={() => setPeriod('weekly')}
              >
                <Text style={[
                  styles.periodButtonText,
                  period === 'weekly' && styles.periodButtonTextActive
                ]}>
                  Haftalık
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Selection - Only show for single category budget */}
          {budgetType === 'single' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kategori Seçin</Text>
              
              {/* Include Income Categories Switch */}
              <View style={styles.includeIncomeContainer}>
                <View style={styles.includeIncomeLeft}>
                  <Text style={styles.includeIncomeLabel}>Gelir Kategorilerini Dahil Et</Text>
                  <Text style={styles.includeIncomeDescription}>
                    Gider kategorilerinin yanında gelir kategorilerini de göster
                  </Text>
                </View>
                <Switch
                  value={includeIncomeCategories}
                  onValueChange={setIncludeIncomeCategories}
                  trackColor={{ false: COLORS.SURFACE, true: COLORS.PRIMARY + '40' }}
                  thumbColor={includeIncomeCategories ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                  ios_backgroundColor={COLORS.SURFACE}
                />
              </View>

              <View style={styles.categoriesGrid}>
                {allCategories.map((category) => (
                  <TouchableOpacity
                    key={category.name}
                    style={[
                      styles.categoryItem,
                      selectedCategory === category.name && styles.categoryItemSelected
                    ]}
                    onPress={() => setSelectedCategory(category.name)}
                  >
                    <CategoryIcon
                      iconName={category.icon}
                      color={category.color}
                      size="small"
                    />
                    <Text style={[
                      styles.categoryItemText,
                      selectedCategory === category.name && styles.categoryItemTextSelected
                    ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* All Categories Summary - Only show for all categories budget */}
          {budgetType === 'all' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dahil Edilen Kategoriler</Text>
              <View style={styles.allCategoriesSummary}>
                <View style={styles.categorySummaryItem}>
                  <Ionicons name="trending-down" size={20} color={COLORS.ERROR} />
                  <Text style={styles.categorySummaryText}>
                    {DEFAULT_EXPENSE_CATEGORIES.length} Gider Kategorisi
                  </Text>
                </View>
                {includeIncomeCategories && (
                  <View style={styles.categorySummaryItem}>
                    <Ionicons name="trending-up" size={20} color={COLORS.SUCCESS} />
                    <Text style={styles.categorySummaryText}>
                      {DEFAULT_INCOME_CATEGORIES.length} Gelir Kategorisi
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Include Income Categories Switch for All Categories */}
              <View style={styles.includeIncomeContainer}>
                <View style={styles.includeIncomeLeft}>
                  <Text style={styles.includeIncomeLabel}>Gelir Kategorilerini Dahil Et</Text>
                  <Text style={styles.includeIncomeDescription}>
                    Gelir kategorilerini de bütçe hesaplamasına dahil et
                  </Text>
                </View>
                <Switch
                  value={includeIncomeCategories}
                  onValueChange={setIncludeIncomeCategories}
                  trackColor={{ false: COLORS.SURFACE, true: COLORS.PRIMARY + '40' }}
                  thumbColor={includeIncomeCategories ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY}
                  ios_backgroundColor={COLORS.SURFACE}
                />
              </View>

              <Text style={styles.allCategoriesHelper}>
                Bu bütçe, seçilen kategorilerdeki toplam {period === 'monthly' ? 'aylık' : 'haftalık'} 
                harcamalarınızı takip edecektir.
              </Text>
            </View>
          )}

          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bütçe Tutarı</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>₺</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={formatAmount}
                placeholder="0,00"
                placeholderTextColor={COLORS.TEXT_SECONDARY}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
            <Text style={styles.amountHelper}>
              {budgetType === 'all' 
                ? `${period === 'monthly' ? 'Aylık' : 'Haftalık'} toplam harcama limitinizi belirleyin`
                : `${period === 'monthly' ? 'Aylık' : 'Haftalık'} harcama limitinizi belirleyin`
              }
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Bütçe Oluştur"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={(budgetType === 'single' && !selectedCategory) || !amount}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: COLORS.TEXT_PRIMARY,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginVertical: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  budgetTypeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: SPACING.xs,
  },
  budgetTypeButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    gap: SPACING.xs,
  },
  budgetTypeButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  budgetTypeButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_SECONDARY,
  },
  budgetTypeButtonTextActive: {
    color: COLORS.WHITE,
  },
  budgetTypeHelper: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    padding: SPACING.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  periodButtonText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_SECONDARY,
  },
  periodButtonTextActive: {
    color: COLORS.WHITE,
  },
  includeIncomeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  includeIncomeLeft: {
    flex: 1,
  },
  includeIncomeLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
  },
  includeIncomeDescription: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryItem: {
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.SURFACE,
    minWidth: '30%',
    flex: 1,
  },
  categoryItemSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY + '10',
  },
  categoryItemText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  categoryItemTextSelected: {
    color: COLORS.PRIMARY,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SPACING.md,
  },
  currencySymbol: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
    marginRight: SPACING.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.lg,
    color: COLORS.TEXT_PRIMARY,
    paddingVertical: SPACING.md,
  },
  amountHelper: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
  },
  allCategoriesSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  categorySummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categorySummaryText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    marginLeft: SPACING.xs,
  },
  allCategoriesHelper: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
}); 