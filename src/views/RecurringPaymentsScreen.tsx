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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { RecurringPaymentCard } from '../components/recurring/RecurringPaymentCard';
import { CreateRecurringPaymentModal } from '../components/recurring/CreateRecurringPaymentModal';
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
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.centerContainer}>
            <Text style={styles.emptyStateText}>Giriş yapmanız gerekiyor</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (!paymentViewModel || !accountViewModel) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Düzenli ödemeler yükleniyor...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const summary = paymentViewModel.paymentSummary;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Düzenli Ödemeler</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#2196F3" />
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
              colors={["#2196F3"]}
              tintColor="#2196F3"
            />
          }
        >
          {/* Summary Card */}
          <View style={styles.summaryCard}>
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
                  summary.upcomingCount > 0 && { color: '#FF9800' }
                ]}>
                  {summary.upcomingCount}
                </Text>
                <Text style={styles.summaryLabel}>Bu Hafta</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={[
                  styles.summaryValue,
                  summary.overdueCount > 0 && { color: '#F44336' }
                ]}>
                  {summary.overdueCount}
                </Text>
                <Text style={styles.summaryLabel}>Gecikmiş</Text>
              </View>
            </View>
          </View>

          {/* Overdue Payments */}
          {paymentViewModel.overduePayments.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="alert-circle" size={20} color="#F44336" />
                <Text style={[styles.sectionTitle, { color: '#F44336' }]}>
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
            </View>
          )}

          {/* All Active Payments */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={20} color="#FFFFFF" />
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
                <Ionicons name="calendar-outline" size={48} color="#666666" />
                <Text style={styles.emptySectionText}>Henüz aktif düzenli ödeme yok</Text>
                <TouchableOpacity 
                  style={styles.addFirstPaymentButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.addFirstPaymentText}>İlk Düzenli Ödemenizi Ekleyin</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptySectionText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  addFirstPaymentButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addFirstPaymentText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RecurringPaymentsScreen; 