import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { Debt, DebtType, DebtStatus, DebtPayment } from '../models/Debt';
import { DebtViewModel } from '../viewmodels/DebtViewModel';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency, useDate } from '../hooks';

interface DebtDetailScreenProps {
  navigation: any;
  route: {
    params: {
      debtId: string;
    };
  };
}

const DebtDetailScreen: React.FC<DebtDetailScreenProps> = observer(({ navigation, route }) => {
  const { debtId } = route.params;
  const { user } = useAuth();
  const [debtViewModel, setDebtViewModel] = useState<DebtViewModel | null>(null);
  const [debt, setDebt] = useState<Debt | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [addingPayment, setAddingPayment] = useState(false);

  // Custom hooks
  const { formatCurrency, currencySymbol } = useCurrency();
  const { formatShort, formatLong } = useDate();

  // Initialize ViewModel and load debt
  useEffect(() => {
    if (user?.id) {
      const viewModel = new DebtViewModel(user.id);
      setDebtViewModel(viewModel);
      loadDebtData(viewModel);
    }
  }, [user?.id, debtId]);

  const loadDebtData = async (viewModel: DebtViewModel) => {
    setLoading(true);
    try {
      await viewModel.loadDebts();
      const foundDebt = viewModel.debts.find(d => d.id === debtId);
      setDebt(foundDebt || null);
    } catch (error) {
      console.error('Error loading debt:', error);
      Alert.alert('Hata', 'Borç bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAmountChange = (text: string) => {
    // Sadece sayı ve virgül kabul et
    let filtered = text.replace(/[^0-9,]/g, '');
    
    // Çoklu virgülü engelle
    const commaCount = (filtered.match(/,/g) || []).length;
    if (commaCount > 1) {
      const firstCommaIndex = filtered.indexOf(',');
      filtered = filtered.substring(0, firstCommaIndex + 1) + filtered.substring(firstCommaIndex + 1).replace(/,/g, '');
    }
    
    // Virgülden sonra max 2 basamak
    if (filtered.includes(',')) {
      const parts = filtered.split(',');
      if (parts[1] && parts[1].length > 2) {
        parts[1] = parts[1].substring(0, 2);
      }
      filtered = parts[0] + ',' + (parts[1] || '');
    }
    
    setPaymentAmount(filtered);
  };

  const getNumericPaymentAmount = (): number => {
    if (!paymentAmount || paymentAmount.trim() === '') return 0;
    const numericValue = parseFloat(paymentAmount.replace(',', '.'));
    return isNaN(numericValue) ? 0 : numericValue;
  };

  const handleAddPayment = async () => {
    const numericAmount = getNumericPaymentAmount();
    
    if (numericAmount <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar girin');
      return;
    }

    if (!debt) {
      Alert.alert('Hata', 'Borç bilgisi bulunamadı');
      return;
    }

    if (numericAmount > debt.currentAmount) {
      Alert.alert('Hata', 'Ödeme miktarı kalan borçtan fazla olamaz');
      return;
    }

    if (!debtViewModel) {
      Alert.alert('Hata', 'Sistem hatası');
      return;
    }

    setAddingPayment(true);

    const success = await debtViewModel.addPayment(
      debtId,
      numericAmount,
      paymentDescription.trim() || undefined
    );

    setAddingPayment(false);

    if (success) {
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentDescription('');
      await loadDebtData(debtViewModel);
      Alert.alert('Başarılı', 'Ödeme başarıyla eklendi');
    } else {
      Alert.alert('Hata', 'Ödeme eklenirken hata oluştu');
    }
  };

  const getDebtStatusColor = (status: DebtStatus): string => {
    switch (status) {
      case DebtStatus.PAID:
        return COLORS.SUCCESS;
      case DebtStatus.PARTIAL:
        return COLORS.WARNING;
      default:
        return COLORS.ERROR;
    }
  };

  const getDebtStatusText = (status: DebtStatus): string => {
    switch (status) {
      case DebtStatus.PAID:
        return 'Ödendi';
      case DebtStatus.PARTIAL:
        return 'Kısmi Ödendi';
      default:
        return 'Aktif';
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
        <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Borç Detayı</Text>
      <View style={styles.headerButton} />
    </View>
  );

  const renderDebtInfo = () => {
    if (!debt) return null;

    return (
      <Card style={styles.debtInfoCard}>
        <View style={styles.debtHeader}>
          <View style={[
            styles.debtTypeIcon,
            { backgroundColor: debt.type === DebtType.LENT ? COLORS.SUCCESS : COLORS.ERROR }
          ]}>
            <Ionicons
              name={debt.type === DebtType.LENT ? "arrow-up" : "arrow-down"}
              size={24}
              color={COLORS.WHITE}
            />
          </View>
          <View style={styles.debtHeaderInfo}>
            <Text style={styles.personName}>{debt.personName}</Text>
            <Text style={styles.debtTypeText}>
              {debt.type === DebtType.LENT ? 'Verilen Borç' : 'Alınan Borç'}
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getDebtStatusColor(debt.status) }
          ]}>
            <Text style={styles.statusText}>
              {getDebtStatusText(debt.status)}
            </Text>
          </View>
        </View>

        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Toplam Borç:</Text>
            <Text style={[
              styles.amountValue,
              { color: debt.type === DebtType.LENT ? COLORS.SUCCESS : COLORS.ERROR }
            ]}>
              {formatCurrency(debt.originalAmount)}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Ödenen:</Text>
            <Text style={[styles.amountValue, { color: COLORS.TEXT_SECONDARY }]}>
              {formatCurrency(debt.paidAmount)}
            </Text>
          </View>
          <View style={[styles.amountRow, styles.remainingRow]}>
            <Text style={styles.amountLabel}>Kalan:</Text>
            <Text style={[
              styles.amountValue,
              styles.remainingAmount,
              { color: debt.type === DebtType.LENT ? COLORS.SUCCESS : COLORS.ERROR }
            ]}>
              {formatCurrency(debt.currentAmount)}
            </Text>
          </View>
        </View>

        {debt.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionLabel}>Açıklama:</Text>
            <Text style={styles.descriptionText}>{debt.description}</Text>
          </View>
        )}

        <View style={styles.dateSection}>
          <Text style={styles.dateLabel}>Oluşturulma Tarihi:</Text>
          <Text style={styles.dateText}>{formatLong(debt.createdAt)}</Text>
        </View>
      </Card>
    );
  };

  const renderAddPaymentButton = () => {
    if (!debt || debt.status === DebtStatus.PAID) return null;

    return (
      <View style={styles.addPaymentContainer}>
        <TouchableOpacity
          style={styles.addPaymentButton}
          onPress={() => setShowPaymentModal(true)}
        >
          <Ionicons name="add-circle" size={20} color={COLORS.WHITE} />
          <Text style={styles.addPaymentText}>Ödeme Ekle</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPaymentHistory = () => {
    if (!debt || debt.payments.length === 0) return null;

    return (
      <Card style={styles.historyCard}>
        <Text style={styles.historyTitle}>Ödeme Geçmişi</Text>
        {debt.payments.map((payment, index) => (
          <View key={payment.id} style={styles.paymentItem}>
            <View style={styles.paymentLeft}>
              <View style={styles.paymentIcon}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS} />
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentAmount}>
                  {formatCurrency(payment.amount)}
                </Text>
                <Text style={styles.paymentDate}>
                  {formatShort(payment.date)}
                </Text>
                {payment.description && (
                  <Text style={styles.paymentDescription}>
                    {payment.description}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </Card>
    );
  };

  const renderPaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.paymentModalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ödeme Ekle</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Ödeme Tutarı</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={paymentAmount}
                  onChangeText={handlePaymentAmountChange}
                  placeholder="0,00"
                  placeholderTextColor={COLORS.TEXT_TERTIARY}
                  keyboardType="numeric"
                />
              </View>
              {debt && (
                <Text style={styles.maxAmountText}>
                  Maksimum: {formatCurrency(debt.currentAmount)}
                </Text>
              )}
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Açıklama (opsiyonel)</Text>
              <TextInput
                style={styles.descriptionInput}
                value={paymentDescription}
                onChangeText={setPaymentDescription}
                placeholder="Ödeme ile ilgili not..."
                placeholderTextColor={COLORS.TEXT_TERTIARY}
                multiline
                maxLength={100}
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, addingPayment && styles.saveButtonDisabled]}
              onPress={handleAddPayment}
              disabled={addingPayment}
            >
              {addingPayment ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={COLORS.WHITE} />
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Borç bilgileri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!debt) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.TEXT_TERTIARY} />
          <Text style={styles.errorTitle}>Borç bulunamadı</Text>
          <Text style={styles.errorDescription}>
            Bu borç kaydı silinmiş olabilir.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderDebtInfo()}
        {renderAddPaymentButton()}
        {renderPaymentHistory()}
      </ScrollView>

      {renderPaymentModal()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerButton: {
    minWidth: 40,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  errorDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  debtInfoCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  debtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  debtTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  debtHeaderInfo: {
    flex: 1,
  },
  personName: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  debtTypeText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  amountSection: {
    marginBottom: SPACING.lg,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  remainingRow: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    marginTop: SPACING.sm,
  },
  amountLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  amountValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
  remainingAmount: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '700',
  },
  descriptionSection: {
    marginBottom: SPACING.lg,
  },
  descriptionLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  descriptionText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  dateSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: SPACING.md,
  },
  dateLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_TERTIARY,
    marginBottom: 2,
  },
  dateText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  addPaymentContainer: {
    marginBottom: SPACING.lg,
  },
  addPaymentButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  addPaymentText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
  historyCard: {
    padding: SPACING.md,
  },
  historyTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    marginRight: SPACING.sm,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  paymentDescription: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_TERTIARY,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  paymentModalContainer: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  modalContent: {
    padding: SPACING.lg,
  },
  modalSection: {
    marginBottom: SPACING.lg,
  },
  modalSectionTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  currencySymbol: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginRight: SPACING.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  maxAmountText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
  },
  descriptionInput: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.TEXT_TERTIARY,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
});

export default DebtDetailScreen; 