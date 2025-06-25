import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  component?: string;
  action?: () => void;
  isCompleted: boolean;
}

interface OnboardingContextType {
  isOnboardingVisible: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  totalSteps: number;
  isOnboardingCompleted: boolean;
  nextStep: () => void;
  previousStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  setOnboardingVisible: (visible: boolean) => void;
  checkShouldShowOnboarding: () => Promise<boolean>;
  resetOnboarding: () => Promise<void>; // Debug için
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'app-features',
    title: 'ParamiYönet\'e Hoş Geldiniz!',
    description: 'Finansal yaşamınızı kolaylaştıracak 3 temel özelliğimizi keşfedin.',
    isCompleted: false,
  },
  {
    id: 'first-account',
    title: 'İlk Hesabınızı Oluşturun',
    description: 'Banka hesabınızı, kredi kartınızı veya nakit hesabınızı ekleyerek başlayın.',
    isCompleted: false,
  },
  {
    id: 'analytics-overview',
    title: 'Güçlü Analiz Araçları',
    description: 'Harcamalarınızı analiz edin ve finansal hedeflerinize ulaşın.',
    isCompleted: false,
  },
  {
    id: 'complete',
    title: 'Hazırsınız!',
    description: 'Artık ParamiYönet ile finansal kontrolünüz elinizde. Hadi başlayalım!',
    isCompleted: false,
  },
];

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>(ONBOARDING_STEPS);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false);
  const { user } = useAuth();

  const totalSteps = steps.length;

  // Check if user should see onboarding
  const checkShouldShowOnboarding = async (): Promise<boolean> => {
    try {
      if (!user) {
        return false;
      }

      // Check user preferences first - eğer onboarding tamamlanmışsa gösterme
      if (user?.preferences?.onboardingCompleted) {
        return false;
      }

      // Check if user is newly registered (created within last 24 hours)
      if (user?.createdAt) {
        const userCreatedTime = user.createdAt; // AuthContext'ten artık Date objesi geliyor
        const now = new Date();
        const timeDifference = now.getTime() - userCreatedTime.getTime();
        const twentyFourHoursInMs = 24 * 60 * 60 * 1000; // 24 saat
        
        // Eğer kullanıcı 24 saatten uzun süredir kayıtlıysa onboarding gösterme
        if (timeDifference > twentyFourHoursInMs) {
          // Otomatik olarak tamamlandı işaretle, bir daha kontrol etmesin
          const UserService = (await import('../services/UserService')).default;
          await UserService.updateUserProfile(user.id, { 
            preferences: { ...user.preferences, onboardingCompleted: true } 
          });
          return false;
        }
      } else {
        // createdAt yoksa ne olur ne olmaz gösterme
        return false;
      }

      // AsyncStorage'deki yedek kontrolü de kaldırabiliriz veya bırakabiliriz.
      // Şimdilik bırakalım, eski versiyonlardan gelen kullanıcılar için bir güvence olabilir.
      const onboardingHistory = await AsyncStorage.getItem(`onboarding_completed_${user?.id}`);
      if (onboardingHistory === 'true') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false; // Hata durumunda onboarding gösterme
    }
  };

  // Initialize onboarding status
  useEffect(() => {
    const initializeOnboarding = async () => {
      if (user) {
        const shouldShow = await checkShouldShowOnboarding();
        setIsOnboardingVisible(shouldShow);
        setIsOnboardingCompleted(!shouldShow);
      } else {
        // User yok ise onboarding gösterme
        setIsOnboardingVisible(false);
        setIsOnboardingCompleted(false);
      }
    };

    initializeOnboarding();
  }, [user]);

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      
      // User-specific onboarding history
      if (user?.id) {
        await AsyncStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      }
      
      setIsOnboardingVisible(false);
      setIsOnboardingCompleted(true);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      
      // User-specific onboarding history
      if (user?.id) {
        await AsyncStorage.setItem(`onboarding_completed_${user.id}`, 'true');
        
        const UserService = (await import('../services/UserService')).default;
        await UserService.updateUserProfile(user.id, {
          preferences: {
            ...user.preferences,
            onboardingCompleted: true,
          }
        });
      }
      
      setIsOnboardingVisible(false);
      setIsOnboardingCompleted(true);
      
      // Mark all steps as completed
      setSteps(prevSteps => 
        prevSteps.map(step => ({ ...step, isCompleted: true }))
      );
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const setOnboardingVisible = (visible: boolean) => {
    setIsOnboardingVisible(visible);
  };

  // Debug function to reset onboarding (for testing)
  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('onboarding_completed');
      setCurrentStep(0);
      setIsOnboardingCompleted(false);
      setIsOnboardingVisible(true);
      setSteps(ONBOARDING_STEPS);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        isOnboardingVisible,
        currentStep,
        steps,
        totalSteps,
        isOnboardingCompleted,
        nextStep,
        previousStep,
        skipOnboarding,
        completeOnboarding,
        setOnboardingVisible,
        checkShouldShowOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}; 