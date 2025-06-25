import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../components/common/Card';
import CustomAlert, { AlertType } from '../components/common/CustomAlert';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { Debt, DebtType, DebtStatus } from '../models/Debt';
import { DebtViewModel } from '../viewmodels/DebtViewModel';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency, useDate } from '../hooks';

interface DebtsScreenProps {
  navigation: any;
}

const DebtsScreen: React.FC<DebtsScreenProps> = observer(({ navigation }) => {
  const { user } = useAuth();
  const [debtViewModel, setDebtViewModel] = useState<DebtViewModel | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'all' | 'lent' | 'borrowed'>('all');
  
  // Custom Alert states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // Custom Alert helper
  const showAlert = (type: AlertType, title: string, message: string, action?: () => void) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setConfirmAction(action ? () => action : null);
    setAlertVisible(true);
  };

  // Custom hooks
  const { formatCurrency } = useCurrency();
  const { formatShort } = useDate();

  // Initialize ViewModel
  useEffect(() => {
    if (user?.id) {
      const viewModel = new DebtViewModel(user.id);
      setDebtViewModel(viewModel);
      viewModel.loadDebts();
    } else {
      setDebtViewModel(null);
    }
  }, [user?.id]);

  // Refresh data when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      if (debtViewModel) {
        debtViewModel.loadDebts();
      }
    }, [debtViewModel])
  );

  const onRefresh = async () => {
    if (!debtViewModel) return;
    setRefreshing(true);
    await debtViewModel.loadDebts();
    setRefreshing(false);
  };

  const handleAddDebt = () => {
    navigation.navigate('AddDebt');
  };

  const handleDebtPress = (debt: Debt) => {
    navigation.navigate('DebtDetail', { debtId: debt.id });
  };

  const handleDeleteDebt = (debt: Debt) => {
    const deleteAction = async () => {
      if (debtViewModel) {
        const success = await debtViewModel.deleteDebt(debt.id);
        if (success) {
          showAlert('success', 'Başarılı', 'Borç başarıyla silindi');
        } else {
          showAlert('error', 'Hata', 'Borç silinirken hata oluştu');
        }
      }
    };

    showAlert(
      'warning',
      'Borç Sil',
      `"${debt.personName}" ile olan borcunuzu silmek istediğinizden emin misiniz?`,
      deleteAction
    );
  };

  const getFilteredDebts = (): Debt[] => {
    if (!debtViewModel?.debts) return [];
    
    switch (selectedTab) {
      case 'lent':
        return debtViewModel.debts.filter(debt => debt.type === DebtType.LENT);
      case 'borrowed':
        return debtViewModel.debts.filter(debt => debt.type === DebtType.BORROWED);
      default:
        return debtViewModel.debts;
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
        return 'Kısmi';
      default:
        return 'Aktif';
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.WHITE} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Borçlar</Text>
      <TouchableOpacity style={styles.addButton} onPress={handleAddDebt}>
        <Ionicons name="add" size={24} color={COLORS.WHITE} />
      </TouchableOpacity>
    </View>
  );

  const renderSummaryCards = () => {
    if (!debtViewModel) return null;

    return (
      <View style={styles.summaryContainer}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="trending-up" size={24} color={COLORS.SUCCESS} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Verilen Borçlar</Text>
              <Text style={[styles.summaryAmount, { color: COLORS.SUCCESS }]}>
                {formatCurrency(debtViewModel.totalLentAmount)}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="trending-down" size={24} color={COLORS.ERROR} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Alınan Borçlar</Text>
              <Text style={[styles.summaryAmount, { color: COLORS.ERROR }]}>
                {formatCurrency(debtViewModel.totalBorrowedAmount)}
              </Text>
            </View>
          </View>
        </Card>
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {[
        { key: 'all', label: 'Tümü', count: debtViewModel?.debts.length || 0 },
        { key: 'lent', label: 'Verdiklerim', count: debtViewModel?.debts.filter(d => d.type === DebtType.LENT).length || 0 },
        { key: 'borrowed', label: 'Aldıklarım', count: debtViewModel?.debts.filter(d => d.type === DebtType.BORROWED).length || 0 },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tab,
            selectedTab === tab.key && styles.activeTab
          ]}
          onPress={() => setSelectedTab(tab.key as any)}
        >
          <Text style={[
            styles.tabText,
            selectedTab === tab.key && styles.activeTabText
          ]}>
            {tab.label} ({tab.count})
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDebtItem = (debt: Debt) => (
    <TouchableOpacity
      key={debt.id}
      style={styles.debtItem}
      onPress={() => handleDebtPress(debt)}
    >
      <View style={styles.debtItemLeft}>
        <View style={[
          styles.debtTypeIcon,
          { backgroundColor: debt.type === DebtType.LENT ? COLORS.SUCCESS : COLORS.ERROR }
        ]}>
          <Ionicons
            name={debt.type === DebtType.LENT ? "arrow-up" : "arrow-down"}
            size={20}
            color={COLORS.WHITE}
          />
        </View>
        <View style={styles.debtInfo}>
          <Text style={styles.debtPersonName}>{debt.personName}</Text>
          <Text style={styles.debtDescription}>
            {debt.type === DebtType.LENT ? 'Verilen' : 'Alınan'} • {formatShort(debt.createdAt)}
          </Text>
          {debt.description && (
            <Text style={styles.debtNote}>{debt.description}</Text>
          )}
        </View>
      </View>

      <View style={styles.debtItemRight}>
        <Text style={[
          styles.debtAmount,
          { color: debt.type === DebtType.LENT ? COLORS.SUCCESS : COLORS.ERROR }
        ]}>
          {formatCurrency(debt.currentAmount)}
        </Text>
        <View style={[
          styles.debtStatus,
          { backgroundColor: getDebtStatusColor(debt.status) }
        ]}>
          <Text style={styles.debtStatusText}>
            {getDebtStatusText(debt.status)}
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteDebt(debt)}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.ERROR} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (!user) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyStateText}>Giriş yapmanız gerekiyor</Text>
        </View>
      );
    }

    if (!debtViewModel) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Borçlar yükleniyor...</Text>
        </View>
      );
    }

    const filteredDebts = getFilteredDebts();

    return (
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY]}
            tintColor={COLORS.PRIMARY}
          />
        }
      >
        {renderSummaryCards()}
        {renderTabs()}

        {debtViewModel.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
        ) : filteredDebts.length > 0 ? (
          <Card style={styles.debtsCard}>
            <Text style={styles.sectionTitle}>
              {selectedTab === 'all' ? 'Tüm Borçlar' :
               selectedTab === 'lent' ? 'Verdiğim Borçlar' : 'Aldığım Borçlar'}
            </Text>
            {filteredDebts.map(renderDebtItem)}
          </Card>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.TEXT_TERTIARY} />
            </View>
            <Text style={styles.emptyTitle}>Henüz borç yok</Text>
            <Text style={styles.emptyDescription}>
              İlk borcunuzu ekleyerek başlayın
            </Text>
            <TouchableOpacity style={styles.addFirstDebtButton} onPress={handleAddDebt}>
              <Ionicons name="add" size={20} color={COLORS.WHITE} />
              <Text style={styles.addFirstDebtText}>Borç Ekle</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      {renderContent()}
      
      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        primaryButtonText={confirmAction ? 'Sil' : 'Tamam'}
        secondaryButtonText={confirmAction ? 'İptal' : undefined}
        onPrimaryPress={() => {
          setAlertVisible(false);
          if (confirmAction) {
            confirmAction();
            setConfirmAction(null);
          }
        }}
        onSecondaryPress={confirmAction ? () => {
          setAlertVisible(false);
          setConfirmAction(null);
        } : undefined}
        onClose={() => {
          setAlertVisible(false);
          setConfirmAction(null);
        }}
      />
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
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.sm,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  summaryCard: {
    flex: 1,
    padding: SPACING.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
  },
  summaryAmount: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.PRIMARY,
  },
  tabText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '500',
    color: COLORS.TEXT_SECONDARY,
  },
  activeTabText: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  debtsCard: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.md,
  },
  debtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  debtItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  debtTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  debtInfo: {
    flex: 1,
  },
  debtPersonName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  debtDescription: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_SECONDARY,
  },
  debtNote: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.TEXT_TERTIARY,
    marginTop: 2,
  },
  debtItemRight: {
    alignItems: 'flex-end',
  },
  debtAmount: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
    marginBottom: 4,
  },
  debtStatus: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  debtStatusText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyIcon: {
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  emptyDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  addFirstDebtButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
  },
  addFirstDebtText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
    color: COLORS.WHITE,
    marginLeft: SPACING.xs,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});

export default DebtsScreen; 