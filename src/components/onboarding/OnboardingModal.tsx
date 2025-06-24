import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const OnboardingModal: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    isOnboardingVisible,
    currentStep,
    steps,
    totalSteps,
    nextStep,
    previousStep,
    skipOnboarding,
    completeOnboarding,
  } = useOnboarding();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (isOnboardingVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentStep, isOnboardingVisible]);

  const currentStepData = steps[currentStep];

  const handleAction = () => {
    const stepId = currentStepData?.id;
    
    // Navigate to specific screens based on step
    switch (stepId) {
      case 'accounts':
        try {
          navigation.navigate('AddAccount');
          nextStep(); // Step'i ilerlet
        } catch (error) {
          console.log('Navigation error:', error);
          nextStep();
        }
        break;
      case 'categories':
        try {
          navigation.navigate('ManageCategories');
          nextStep(); // Step'i ilerlet
        } catch (error) {
          console.log('Navigation error:', error);
          nextStep();
        }
        break;
      case 'first-transaction':
        try {
          navigation.navigate('AddTransaction');
          nextStep(); // Step'i ilerlet
        } catch (error) {
          console.log('Navigation error:', error);
          nextStep();
        }
        break;
      case 'budget':
        // Navigate to budget creation when available
        nextStep();
        break;
      case 'debts':
        try {
          navigation.navigate('Debts');
          nextStep(); // Step'i ilerlet
        } catch (error) {
          console.log('Navigation error:', error);
          nextStep();
        }
        break;
      default:
        nextStep();
        break;
    }
  };

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'welcome':
        return 'hand-left';
      case 'accounts':
        return 'card';
      case 'categories':
        return 'grid';
      case 'first-transaction':
        return 'add-circle';
      case 'budget':
        return 'pie-chart';
      case 'debts':
        return 'card-outline';
      case 'complete':
        return 'checkmark-circle';
      default:
        return 'information-circle';
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: `${((currentStep + 1) / totalSteps) * 100}%`,
            },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {currentStep + 1} / {totalSteps}
      </Text>
    </View>
  );

  const renderStepIndicators = () => (
    <View style={styles.stepIndicators}>
      {steps.map((_, index) => (
        <View
          key={index}
          style={[
            styles.stepDot,
            {
                             backgroundColor: index <= currentStep ? COLORS.PRIMARY : COLORS.BORDER,
              transform: [{ scale: index === currentStep ? 1.2 : 1 }],
            },
          ]}
        />
      ))}
    </View>
  );

  console.log('OnboardingModal render:', { isOnboardingVisible, currentStep, currentStepData: currentStepData?.id });

  if (!isOnboardingVisible || !currentStepData) {
    console.log('OnboardingModal: Not showing because', { isOnboardingVisible, currentStepData: !!currentStepData });
    return null;
  }

  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={skipOnboarding}
              style={styles.skipButton}
            >
              <Text style={styles.skipText}>Geç</Text>
            </TouchableOpacity>
          </View>

          {/* Progress */}
          {renderProgressBar()}

          {/* Content */}
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Icon */}
                             <View style={styles.iconContainer}>
                 <LinearGradient
                   colors={['#2196F3', '#1976D2']}
                   style={styles.iconGradient}
                 >
                   <Ionicons
                     name={getStepIcon(currentStepData.id) as any}
                     size={48}
                     color="white"
                   />
                 </LinearGradient>
               </View>

              {/* Title */}
              <Text style={styles.title}>{currentStepData.title}</Text>

              {/* Description */}
              <Text style={styles.description}>
                {currentStepData.description}
              </Text>

              {/* Step Indicators */}
              {renderStepIndicators()}

              {/* Feature highlights for specific steps */}
              {currentStepData.id === 'welcome' && (
                <View style={styles.featuresContainer}>
                  <FeatureItem
                    icon="card"
                    title="Hesap Yönetimi"
                    description="Tüm hesaplarınızı tek yerden yönetin"
                  />
                  <FeatureItem
                    icon="analytics"
                    title="Detaylı Raporlar"
                    description="Harcamalarınızı analiz edin"
                  />
                  <FeatureItem
                    icon="library"
                    title="Altın ve Borç Yönetimi"
                    description="Altın hesabınızı ve borçlarınızı yönetin"
                  />
                </View>
              )}
            </ScrollView>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.buttonContainer}>
              {currentStep > 0 && (
                <TouchableOpacity
                  onPress={previousStep}
                  style={[styles.button, styles.secondaryButton]}
                >
                  <Ionicons name="chevron-back" size={20} color={COLORS.PRIMARY} />
                  <Text style={styles.secondaryButtonText}>Geri</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={currentStepData.component ? handleAction : nextStep}
                style={[styles.button, styles.primaryButton]}
              >
                <Text style={styles.primaryButtonText}>
                  {currentStepData.id === 'complete'
                    ? 'Başlayalım!'
                    : currentStepData.component
                    ? 'Devam Et'
                    : 'İleri'}
                </Text>
                {currentStepData.id !== 'complete' && (
                  <Ionicons name="chevron-forward" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
    </View>
  );
};

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      <Ionicons name={icon as any} size={24} color={COLORS.PRIMARY} />
    </View>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.BACKGROUND,
    zIndex: 1000,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  skipButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  skipText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '500',
  },
  progressContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  progressBackground: {
    height: 6,
    backgroundColor: COLORS.BORDER,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 3,
  },
  progressText: {
    textAlign: 'center',
    marginTop: SPACING.sm,
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  featuresContainer: {
    marginTop: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.PRIMARY}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: COLORS.PRIMARY,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
  },
});

export default OnboardingModal; 