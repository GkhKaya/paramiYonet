import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { RecurringPaymentCard } from '../components/recurring/RecurringPaymentCard';
import { CreateRecurringPaymentModal } from '../components/recurring/CreateRecurringPaymentModal';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { RecurringPaymentViewModel } from '../viewmodels/RecurringPaymentViewModel';
import { AccountViewModel } from '../viewmodels/AccountViewModel';

interface RecurringPaymentsScreenProps {
  navigation: any;
}

const RecurringPaymentsScreen: React.FC<RecurringPaymentsScreenProps> = observer(({ navigation }) => {
  const { user } = useAuth();
  const [paymentViewModel, setPaymentViewModel] = useState<RecurringPaymentViewModel | null>(null);
  const [accountViewModel, setAccountViewModel] = useState<AccountViewModel | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Initialize ViewModels when user is available
  useEffect(() => {
    if (user?.id) {
      const paymentVm = new RecurringPaymentViewModel(user.id);
      const accountVm = new AccountViewModel(user.id);
      setPaymentViewModel(paymentVm);
      setAccountViewModel(accountVm);
      // Load initial data
      accountVm.loadAccounts();
    } else {
      setPaymentViewModel(null);
      setAccountViewModel(null);
    }
  }, [user?.id]);

  const formatCurrency = (amount: number) => {
    return `₺${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleRefresh = async () => {
    if (paymentViewModel && accountViewModel) {
      setRefreshing(true);
      await accountViewModel.loadAccounts();
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const handleDeletePayment = (paymentId: string, paymentName: string) => {
    Alert.alert(
      'Düzenli Ödemeyi Sil',
      `"${paymentName}" düzenli ödemesini silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (paymentViewModel) {
              const success = await paymentViewModel.deleteRecurringPayment(paymentId);
              if (success) {
                Alert.alert('Başarılı', 'Düzenli ödeme silindi');
              }
            }
          }
        }
      ]
    );
  };

  // Loading state
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyStateText}>Giriş yapmanız gerekiyor</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!paymentViewModel || !accountViewModel) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Düzenli ödemeler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const summary = paymentViewModel.paymentSummary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Düzenli Ödemeler</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color={COLORS.PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Özet</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.totalMonthlyAmount)}
              </Text>
              <Text style={styles.summaryLabel}>Aylık Toplam</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {summary.activeCount}
              </Text>
              <Text style={styles.summaryLabel}>Aktif Ödeme</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[
                styles.summaryValue,
                summary.upcomingCount > 0 && { color: COLORS.WARNING }
              ]}>
                {summary.upcomingCount}
              </Text>
              <Text style={styles.summaryLabel}>Bu Hafta</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[
                styles.summaryValue,
                summary.overdueCount > 0 && { color: COLORS.ERROR }
              ]}>
                {summary.overdueCount}
              </Text>
              <Text style={styles.summaryLabel}>Gecikmiş</Text>
            </View>
          </View>
        </Card>

        {/* Overdue Payments */}
        {paymentViewModel.overduePayments.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle" size={20} color={COLORS.ERROR} />
              <Text style={[styles.sectionTitle, { color: COLORS.ERROR }]}>
                Gecikmiş Ödemeler ({paymentViewModel.overduePayments.length})
              </Text>
            </View>
            {paymentViewModel.overduePayments.map((payment) => (
              <RecurringPaymentCard
                key={payment.id}
                payment={payment}
                onProcessPayment={() => paymentViewModel.processPayment(payment.id)}
                onSkipPayment={() => paymentViewModel.skipPayment(payment.id)}
                onToggleStatus={() => paymentViewModel.togglePaymentStatus(payment.id)}
                onDelete={() => handleDeletePayment(payment.id, payment.name)}
              />
            ))}
          </Card>
        )}

        {/* All Active Payments */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={20} color={COLORS.TEXT_PRIMARY} />
            <Text style={styles.sectionTitle}>
              Tüm Aktif Ödemeler ({paymentViewModel.activePayments.length})
            </Text>
          </View>
          {paymentViewModel.activePayments.length > 0 ? (
            paymentViewModel.activePayments.map((payment) => (
              <RecurringPaymentCard
                key={payment.id}
                payment={payment}
                onProcessPayment={() => paymentViewModel.processPayment(payment.id)}
                onSkipPayment={() => paymentViewModel.skipPayment(payment.id)}
                onToggleStatus={() => paymentViewModel.togglePaymentStatus(payment.id)}
                onDelete={() => handleDeletePayment(payment.id, payment.name)}
              />
            ))
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.TEXT_SECONDARY} />
              <Text style={styles.emptySectionText}>Henüz aktif düzenli ödeme yok</Text>
              <TouchableOpacity 
                style={styles.addFirstPaymentButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.addFirstPaymentText}>İlk Düzenli Ödemenizi Ekleyin</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Create Modal */}
      <CreateRecurringPaymentModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={async (paymentData) => {
          if (paymentViewModel) {
            const success = await paymentViewModel.createRecurringPayment(paymentData);
            if (success) {
              Alert.alert('Başarılı', 'Düzenli ödeme oluşturuldu');
            }
            return success;
          }
          return false;
        }}
        accounts={accountViewModel.accounts}
        isLoading={paymentViewModel.isLoading}
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: COLORS.TEXT_PRIMARY,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  summaryCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  sectionCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: COLORS.TEXT_PRIMARY,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptySectionText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  addFirstPaymentButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  addFirstPaymentText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
});

export default RecurringPaymentsScreen; 