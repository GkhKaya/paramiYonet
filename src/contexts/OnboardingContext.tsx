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
    id: 'welcome',
    title: 'Hoş Geldiniz!',
    description: 'ParamiYönet ile finansal kontrolünüz elinizde. Hadi başlayalım!',
    isCompleted: false,
  },
  {
    id: 'accounts',
    title: 'Hesaplarınızı Ekleyin',
    description: 'Banka hesaplarınızı, kredi kartlarınızı ve altın hesaplarınızı ekleyerek başlayın.',
    component: 'AddAccount',
    isCompleted: false,
  },
  {
    id: 'categories',
    title: 'Kategoriler',
    description: 'Harcamalarınızı düzenlemek için kategoriler oluşturun veya mevcut kategorileri kullanın.',
    component: 'ManageCategories',
    isCompleted: false,
  },
  {
    id: 'first-transaction',
    title: 'İlk İşleminizi Ekleyin',
    description: 'Bir gelir veya gider işlemi ekleyerek uygulamayı deneyimlemeye başlayın.',
    component: 'AddTransaction',
    isCompleted: false,
  },
  {
    id: 'budget',
    title: 'Bütçe Oluşturun',
    description: 'Aylık bütçenizi belirleyerek harcamalarınızı kontrol altında tutun.',
    component: 'CreateBudget',
    isCompleted: false,
  },
  {
    id: 'debts',
    title: 'Borçlarınızı Takip Edin',
    description: 'Kredi kartı borçları, kişisel borçlar ve diğer yükümlülüklerinizi kayıt altına alın.',
    component: 'Debts',
    isCompleted: false,
  },
  {
    id: 'complete',
    title: 'Tebrikler!',
    description: 'Artık ParamiYönet\'i kullanmaya hazırsınız. İyi yönetimler!',
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
      // Check user preferences first
      if (user?.preferences?.onboardingCompleted || user?.onboardingCompleted) {
        return false;
      }

      // Check local storage as fallback
      const hasSeenOnboarding = await AsyncStorage.getItem('onboarding_completed');
      return hasSeenOnboarding !== 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return true; // Show onboarding on error to be safe
    }
  };

  // Initialize onboarding status
  useEffect(() => {
    const initializeOnboarding = async () => {
      if (user) {
        const shouldShow = await checkShouldShowOnboarding();
        console.log('Should show onboarding:', shouldShow, 'User:', user.email);
        setIsOnboardingVisible(shouldShow);
        setIsOnboardingCompleted(!shouldShow);
      }
    };

    initializeOnboarding();
  }, [user]);



  const nextStep = () => {
    console.log('nextStep called:', { currentStep, totalSteps });
    if (currentStep < totalSteps - 1) {
      const newStep = currentStep + 1;
      console.log('Moving to step:', newStep);
      setCurrentStep(newStep);
    } else {
      console.log('Completing onboarding');
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
      setIsOnboardingVisible(false);
      setIsOnboardingCompleted(true);
      
      console.log('Onboarding skipped by user');
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      setIsOnboardingVisible(false);
      setIsOnboardingCompleted(true);
      
      // Mark all steps as completed
      setSteps(prevSteps => 
        prevSteps.map(step => ({ ...step, isCompleted: true }))
      );

      console.log('Onboarding completed successfully');
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
      console.log('Onboarding reset for testing');
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