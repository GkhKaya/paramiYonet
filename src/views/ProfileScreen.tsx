import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { WebLayout } from '../components/layout/WebLayout';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { TransactionViewModel } from '../viewmodels/TransactionViewModel';
import { AccountViewModel } from '../viewmodels/AccountViewModel';
import { isWeb } from '../utils/platform';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = observer(({ navigation }) => {
  const { user, updateUserProfile } = useAuth();
  const [transactionViewModel, setTransactionViewModel] = useState<TransactionViewModel | null>(null);
  const [accountViewModel, setAccountViewModel] = useState<AccountViewModel | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Statistics
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [accountCount, setAccountCount] = useState(0);

  // Initialize ViewModels
  useEffect(() => {
    if (user?.id) {
      const transactionVm = new TransactionViewModel(user.id);
      const accountVm = new AccountViewModel(user.id);
      setTransactionViewModel(transactionVm);
      setAccountViewModel(accountVm);
      
      // Load data
      loadStatistics(transactionVm, accountVm);
    }
  }, [user?.id]);

  const loadStatistics = async (transactionVm: TransactionViewModel, accountVm: AccountViewModel) => {
    try {
      setLoading(true);
      await Promise.all([
        transactionVm.loadTransactions(),
        accountVm.loadAccounts()
      ]);

      // Calculate statistics
      const transactions = transactionVm.transactions;
      setTotalTransactions(transactions.length);
      
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalIncome(income);

      const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalExpense(expense);

      setAccountCount(accountVm.accounts.length);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₺${amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const getInitials = (email: string) => {
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const handleEditProfile = () => {
    setNewDisplayName(user?.displayName || '');
    setNewEmail(user?.email || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!newDisplayName.trim()) {
      Alert.alert('Hata', 'Lütfen ad soyad girin');
      return;
    }

    try {
      setLoading(true);
      await updateUserProfile({
        displayName: newDisplayName.trim(),
        // Email update might require re-authentication
      });
      
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi');
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Hata', 'Profil güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    icon, 
    title, 
    value, 
    color = COLORS.PRIMARY,
    isLoading = false 
  }: {
    icon: string;
    title: string;
    value: string;
    color?: string;
    isLoading?: boolean;
  }) => (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      )}
    </Card>
  );

  const renderContent = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.email ? getInitials(user.email) : 'U'}
              </Text>
            </View>
            <View style={styles.onlineIndicator} />
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.displayName}>
              {user?.displayName || 'Kullanıcı'}
            </Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <TouchableOpacity 
            style={styles.editButton}
            onPress={handleEditProfile}
          >
            <Ionicons name="pencil" size={20} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>
      </Card>

      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>İstatistikler</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon="receipt"
            title="Toplam İşlem"
            value={totalTransactions.toString()}
            color={COLORS.PRIMARY}
            isLoading={loading}
          />
          <StatCard
            icon="trending-up"
            title="Toplam Gelir"
            value={formatCurrency(totalIncome)}
            color={COLORS.SUCCESS}
            isLoading={loading}
          />
          <StatCard
            icon="trending-down"
            title="Toplam Gider"
            value={formatCurrency(totalExpense)}
            color={COLORS.ERROR}
            isLoading={loading}
          />
          <StatCard
            icon="wallet"
            title="Hesap Sayısı"
            value={accountCount.toString()}
            color={COLORS.WARNING}
            isLoading={loading}
          />
        </View>
      </View>

      {/* Net Balance */}
      <Card style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceTitle}>Net Bakiye</Text>
          <Ionicons 
            name="stats-chart" 
            size={24} 
            color={totalIncome - totalExpense >= 0 ? COLORS.SUCCESS : COLORS.ERROR} 
          />
        </View>
        <Text style={[
          styles.balanceValue,
          { color: totalIncome - totalExpense >= 0 ? COLORS.SUCCESS : COLORS.ERROR }
        ]}>
          {formatCurrency(totalIncome - totalExpense)}
        </Text>
        <Text style={styles.balanceSubtitle}>
          {totalIncome - totalExpense >= 0 ? 'Pozitif bakiye' : 'Negatif bakiye'}
        </Text>
      </Card>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('AddTransaction', { defaultType: 'income' })}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.SUCCESS + '20' }]}>
              <Ionicons name="add-circle" size={24} color={COLORS.SUCCESS} />
            </View>
            <Text style={styles.actionTitle}>Gelir Ekle</Text>
            <Text style={styles.actionSubtitle}>Yeni gelir işlemi</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('AddTransaction', { defaultType: 'expense' })}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.ERROR + '20' }]}>
              <Ionicons name="remove-circle" size={24} color={COLORS.ERROR} />
            </View>
            <Text style={styles.actionTitle}>Gider Ekle</Text>
            <Text style={styles.actionSubtitle}>Yeni gider işlemi</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('RecurringPayments')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.WARNING + '20' }]}>
              <Ionicons name="calendar" size={24} color={COLORS.WARNING} />
            </View>
            <Text style={styles.actionTitle}>Düzenli Ödemeler</Text>
            <Text style={styles.actionSubtitle}>Abonelik ve faturalar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.navigate('Analytics')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.PRIMARY + '20' }]}>
              <Ionicons name="analytics" size={24} color={COLORS.PRIMARY} />
            </View>
            <Text style={styles.actionTitle}>Analizler</Text>
            <Text style={styles.actionSubtitle}>Detaylı raporlar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowEditModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => setShowEditModal(false)}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Profil Düzenle</Text>
          <View style={styles.modalPlaceholder} />
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Ad Soyad</Text>
            <Input
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              placeholder="Ad Soyad"
              variant="outlined"
              leftIcon="person"
            />
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>E-posta</Text>
            <Input
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="E-posta"
              variant="outlined"
              leftIcon="mail"
              editable={false}
              inputStyle={{ color: COLORS.TEXT_SECONDARY }}
            />
            <Text style={styles.emailNote}>
              E-posta adresinizi değiştirmek için destek ile iletişime geçin.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            title="Kaydet"
            onPress={handleSaveProfile}
            loading={loading}
            disabled={!newDisplayName.trim()}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Web layout
  if (isWeb) {
    return (
      <WebLayout title="Profil" activeRoute="profile" navigation={navigation}>
        {renderContent()}
        {renderEditModal()}
      </WebLayout>
    );
  }

  // Mobile layout
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
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={styles.headerRight} />
      </View>

      {renderContent()}
      {renderEditModal()}
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: isSmallDevice ? TYPOGRAPHY.sizes.lg : TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    flex: 1,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerRight: {
    width: 40,
  },
  profileCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: COLORS.WHITE,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.SUCCESS,
    borderWidth: 2,
    borderColor: COLORS.WHITE,
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.xs,
  },
  email: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
  },
  editButton: {
    padding: SPACING.sm,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 8,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    textAlign: 'center',
  },
  balanceCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  balanceTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    marginRight: SPACING.xs,
  },
  balanceValue: {
    fontSize: TYPOGRAPHY.sizes.xxl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginBottom: SPACING.xs,
  },
  balanceSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    alignItems: 'center',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    shadowColor: COLORS.BLACK,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  actionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: COLORS.TEXT_PRIMARY,
  },
  modalPlaceholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  modalSection: {
    marginVertical: SPACING.md,
  },
  modalSectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  emailNote: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  modalFooter: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
  },
});

export default ProfileScreen; 