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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryIcon } from '../common/CategoryIcon';
import { Button } from '../common/Button';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { DEFAULT_EXPENSE_CATEGORIES } from '../../models/Category';

interface CreateBudgetModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (budgetData: {
    categoryName: string;
    budgetedAmount: number;
    period: 'monthly' | 'weekly';
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

  const resetForm = () => {
    setSelectedCategory('');
    setAmount('');
    setPeriod('monthly');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    // Validations
    if (!selectedCategory) {
      Alert.alert('Hata', 'Lütfen bir kategori seçin');
      return;
    }

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar girin');
      return;
    }

    try {
      const success = await onSubmit({
        categoryName: selectedCategory,
        budgetedAmount: numericAmount,
        period,
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

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kategori Seçin</Text>
            <View style={styles.categoriesGrid}>
              {DEFAULT_EXPENSE_CATEGORIES.map((category) => (
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
              {period === 'monthly' ? 'Aylık' : 'Haftalık'} harcama limitinizi belirleyin
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Bütçe Oluştur"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!selectedCategory || !amount}
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
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
}); 