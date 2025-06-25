import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAuth } from '../../contexts/AuthContext';
import { AccountService } from '../../services/AccountService';
import { COLORS, SHADOWS } from '../../constants/ui';
import CustomAlert, { AlertType } from '../common/CustomAlert';

// Enum'ları import edelim
enum AccountType {
  DEBIT_CARD = 'debit_card',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  CASH = 'cash',
  GOLD = 'gold',
}



const { width, height } = Dimensions.get('window');

const OnboardingModal: React.FC = () => {
  const { 
    isOnboardingVisible, 
    currentStep, 
    steps, 
    nextStep, 
    skipOnboarding, 
    completeOnboarding
  } = useOnboarding();
  
  const { user } = useAuth();
  
  // Form states
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: AccountType.DEBIT_CARD,
    initialBalance: '',
    color: '#2196F3',
  });
  


  const [isLoading, setIsLoading] = useState(false);
  const [showAccountTypeDropdown, setShowAccountTypeDropdown] = useState(false);
  
  // Custom Alert states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>('error');
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertAction, setAlertAction] = useState<(() => void) | null>(null);

  // Custom Alert helper
  const showAlert = (type: AlertType, title: string, message: string, action?: () => void) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertAction(action ? () => action : null);
    setAlertVisible(true);
  };

  // Account types data (sadece temel hesaplar onboarding'de)
  const accountTypes = [
    { 
      type: AccountType.DEBIT_CARD, 
      name: 'Banka Kartı', 
      icon: 'card',
      color: '#2196F3',
      description: 'En yaygın hesap türü'
    },
    { 
      type: AccountType.CASH, 
      name: 'Nakit', 
      icon: 'cash',
      color: '#4CAF50',
      description: 'Cüzdanınızdaki nakit para'
    },
  ];

  if (!isOnboardingVisible || !steps[currentStep]) {
    return null;
  }

  const currentStepData = steps[currentStep];

  // Account submission
  const handleAccountSubmit = async () => {
    if (!accountForm.name.trim()) {
      showAlert('error', 'Hata', 'Lütfen hesap adı girin');
      return;
    }

    if (!user?.id) {
      showAlert('error', 'Hata', 'Kullanıcı bilgisi bulunamadı');
      return;
    }

    setIsLoading(true);
    try {
      // AccountService static methodlarını kullan
      const accountData = {
        userId: user.id,
        name: accountForm.name,
        type: accountForm.type,
        balance: parseFloat(accountForm.initialBalance) || 0,
        color: accountForm.color,
        icon: accountTypes.find(t => t.type === accountForm.type)?.icon || 'card',
        isActive: true,
        includeInTotalBalance: true,
      };

      await AccountService.createAccount(accountData);
      
      showAlert('success', 'Başarılı!', 'Hesabınız oluşturuldu', nextStep);
    } catch (error) {
      showAlert('error', 'Hata', 'Hesap oluşturulamadı');
    } finally {
      setIsLoading(false);
    }
  };



  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'app-features':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.headerSection}>
              <Text style={styles.mainTitle}>ParamiYönet'e Hoş Geldiniz! 🎉</Text>
              <Text style={styles.subtitle}>3 dakikada kurulumu tamamlayın</Text>
            </View>

            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="wallet-outline" size={28} color="#1976D2" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Akıllı Hesap Yönetimi</Text>
                  <Text style={styles.featureDesc}>Tüm hesaplarınızı tek yerden kontrol edin</Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#E8F5E8' }]}>
                  <Ionicons name="analytics-outline" size={28} color="#388E3C" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Detaylı Harcama Analizi</Text>
                  <Text style={styles.featureDesc}>Nereye ne kadar harcadığınızı görün</Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="trending-up-outline" size={28} color="#F57C00" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Bütçe ve Hedef Takibi</Text>
                  <Text style={styles.featureDesc}>Mali hedeflerinize kolayca ulaşın</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
              <Text style={styles.primaryButtonText}>Hadi Başlayalım</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        );

      case 'first-account':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.headerSection}>
              <Text style={styles.mainTitle}>İlk Hesabınızı Oluşturun 💳</Text>
              <Text style={styles.subtitle}>En çok kullandığınız hesapla başlayın</Text>
              
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color={COLORS.PRIMARY} />
                <Text style={styles.infoText}>
                  Kredi kartı, altın ve yatırım hesapları gibi diğer hesap türlerini daha sonra uygulama içinden ekleyebilirsiniz.
                </Text>
              </View>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hesap Türü</Text>
                <TouchableOpacity 
                  style={styles.dropdownButton} 
                  onPress={() => setShowAccountTypeDropdown(!showAccountTypeDropdown)}
                >
                  <View style={styles.dropdownContent}>
                    <Ionicons 
                      name={accountTypes.find(t => t.type === accountForm.type)?.icon as any} 
                      size={20} 
                      color={COLORS.PRIMARY} 
                    />
                    <Text style={styles.dropdownText}>
                      {accountTypes.find(t => t.type === accountForm.type)?.name}
                    </Text>
                  </View>
                  <Ionicons 
                    name={showAccountTypeDropdown ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={COLORS.TEXT_SECONDARY} 
                  />
                </TouchableOpacity>
                
                {showAccountTypeDropdown && (
                  <View style={styles.dropdownList}>
                    {accountTypes.map((accountType, index) => (
                      <TouchableOpacity
                        key={accountType.type}
                        style={[
                          styles.dropdownItem,
                          accountForm.type === accountType.type && styles.dropdownItemActive,
                          index === accountTypes.length - 1 && styles.dropdownItemLast
                        ]}
                        onPress={() => {
                          setAccountForm({...accountForm, type: accountType.type, color: accountType.color});
                          setShowAccountTypeDropdown(false);
                        }}
                      >
                        <Ionicons 
                          name={accountType.icon as any} 
                          size={20} 
                          color={accountForm.type === accountType.type ? COLORS.PRIMARY : COLORS.TEXT_SECONDARY} 
                        />
                        <View style={styles.dropdownItemTextContainer}>
                          <Text style={[
                            styles.dropdownItemText,
                            accountForm.type === accountType.type && styles.dropdownItemTextActive
                          ]}>
                            {accountType.name}
                          </Text>
                          <Text style={[
                            styles.dropdownItemDescription,
                            accountForm.type === accountType.type && styles.dropdownItemDescriptionActive
                          ]}>
                            {accountType.description}
                          </Text>
                        </View>
                        {accountForm.type === accountType.type && (
                          <Ionicons name="checkmark" size={20} color={COLORS.PRIMARY} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hesap Adı</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Örn: Ana Hesap"
                  value={accountForm.name}
                  onChangeText={(text) => setAccountForm({...accountForm, name: text})}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Başlangıç Bakiyesi (₺)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  value={accountForm.initialBalance}
                  onChangeText={(text) => setAccountForm({...accountForm, initialBalance: text})}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]} 
              onPress={handleAccountSubmit}
              disabled={isLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Oluşturuluyor...' : 'Hesabı Oluştur'}
              </Text>
              {!isLoading && <Ionicons name="checkmark" size={20} color="white" />}
            </TouchableOpacity>
          </View>
        );



      case 'analytics-overview':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.headerSection}>
              <Text style={styles.mainTitle}>Güçlü Analiz Araçları 📊</Text>
              <Text style={styles.subtitle}>Harcamalarınızı analiz edin ve kontrol edin</Text>
            </View>

            <View style={styles.analyticsPreview}>
              <View style={styles.analyticsItem}>
                <Ionicons name="pie-chart" size={24} color="#2196F3" />
                <Text style={styles.analyticsTitle}>Kategori Dağılımı</Text>
                <Text style={styles.analyticsDesc}>Hangi kategorilerde ne kadar harcadığınızı görün</Text>
              </View>

              <View style={styles.analyticsItem}>
                <Ionicons name="trending-up" size={24} color="#4CAF50" />
                <Text style={styles.analyticsTitle}>Gelir/Gider Takibi</Text>
                <Text style={styles.analyticsDesc}>Aylık gelir ve giderinizi karşılaştırın</Text>
              </View>

              <View style={styles.analyticsItem}>
                <Ionicons name="calendar" size={24} color="#FF9800" />
                <Text style={styles.analyticsTitle}>Dönemsel Raporlar</Text>
                <Text style={styles.analyticsDesc}>Haftalık, aylık ve yıllık raporlar alın</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
              <Text style={styles.primaryButtonText}>Harika Görünüyor!</Text>
              <Ionicons name="thumbs-up" size={20} color="white" />
            </TouchableOpacity>
          </View>
        );

      case 'complete':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
              </View>
              <Text style={styles.successTitle}>🎉 Tebrikler!</Text>
              <Text style={styles.successSubtitle}>
                ParamiYönet kullanmaya hazırsınız
              </Text>

              <View style={styles.successFeatures}>
                <View style={styles.successFeature}>
                  <Ionicons name="wallet-outline" size={20} color="#4CAF50" />
                  <Text style={styles.successFeatureText}>Hesap yönetimi aktif</Text>
                </View>
                <View style={styles.successFeature}>
                  <Ionicons name="analytics-outline" size={20} color="#4CAF50" />
                  <Text style={styles.successFeatureText}>Harcama analizleri hazır</Text>
                </View>
                <View style={styles.successFeature}>
                  <Ionicons name="people-outline" size={20} color="#4CAF50" />
                  <Text style={styles.successFeatureText}>Borç takibi mevcut</Text>
                </View>
                <View style={styles.successFeature}>
                  <Ionicons name="card-outline" size={20} color="#4CAF50" />
                  <Text style={styles.successFeatureText}>Kredi kartı yönetimi</Text>
                </View>
                <View style={styles.successFeature}>
                  <Ionicons name="diamond-outline" size={20} color="#4CAF50" />
                  <Text style={styles.successFeatureText}>Altın portföyü takibi</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.successButton} onPress={completeOnboarding}>
              <Text style={styles.successButtonText}>Hadi Başlayalım!</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={true} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
            <Text style={styles.skipText}>Geç</Text>
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${((currentStep + 1) / steps.length) * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentStep + 1}/{steps.length}
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStepContent()}
        </ScrollView>
      </View>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onPrimaryPress={() => {
          setAlertVisible(false);
          if (alertAction) {
            alertAction();
          }
        }}
        onClose={() => setAlertVisible(false)}
      />
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
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: '500',
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 20,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.BORDER,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 2,
  },
  progressText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    ...SHADOWS.sm,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
    position: 'relative',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  dropdownContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    ...SHADOWS.md,
    zIndex: 1000,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.PRIMARY + '20',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  dropdownItemTextActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  dropdownItemDescription: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
    marginTop: 2,
    opacity: 0.8,
  },
  dropdownItemDescriptionActive: {
    color: COLORS.PRIMARY,
    opacity: 1,
  },

  analyticsPreview: {
    marginBottom: 40,
  },
  analyticsItem: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    ...SHADOWS.sm,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    marginTop: 12,
    marginBottom: 4,
  },
  analyticsDesc: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 18,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 32,
  },
  successFeatures: {
    alignItems: 'flex-start',
  },
  successFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  successFeatureText: {
    fontSize: 16,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '500',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 16,
    padding: 18,
    gap: 8,
    ...SHADOWS.md,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.TEXT_DISABLED,
  },
  primaryButtonText: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: COLORS.BORDER,
    borderRadius: 16,
    padding: 18,
    marginRight: 12,
    backgroundColor: COLORS.SURFACE,
  },
  secondaryButtonText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.SUCCESS,
    borderRadius: 16,
    padding: 20,
    gap: 8,
    ...SHADOWS.md,
  },
  successButtonText: {
    color: COLORS.WHITE,
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    ...SHADOWS.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
    marginLeft: 12,
    fontStyle: 'italic',
  },
});

export default OnboardingModal; 