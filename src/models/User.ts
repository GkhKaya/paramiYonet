export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string | null;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
  preferences?: UserPreferences;
  onboardingCompleted?: boolean;
}

export interface UserPreferences {
  currency: string;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    enabled: boolean;
    dailyReminder: boolean;
    weeklyReport: boolean;
    budgetAlerts: boolean;
  };
  dateFormat: string;
  firstDayOfWeek: number; // 0 = Sunday, 1 = Monday
  onboardingCompleted: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
  currency: string;
}

export interface UpdateUserRequest {
  displayName?: string;
  preferences?: Partial<UserPreferences>;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  currency: 'TRY',
  language: 'tr',
  theme: 'light',
  notifications: {
    enabled: true,
    dailyReminder: false,
    weeklyReport: true,
    budgetAlerts: true,
  },
  dateFormat: 'DD/MM/YYYY',
  firstDayOfWeek: 1, // Monday
  onboardingCompleted: false,
}; 