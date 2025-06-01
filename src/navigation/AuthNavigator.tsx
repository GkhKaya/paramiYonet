import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import LoginScreen from '../views/auth/LoginScreen';
import RegisterScreen from '../views/auth/RegisterScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  onAuthSuccess: () => void;
}

const AuthNavigator: React.FC<AuthNavigatorProps> = observer(({ onAuthSuccess }) => {
  const [currentScreen, setCurrentScreen] = useState<'Login' | 'Register'>('Login');

  const navigateToRegister = () => {
    setCurrentScreen('Register');
  };

  const navigateToLogin = () => {
    setCurrentScreen('Login');
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    >
      {currentScreen === 'Login' ? (
        <Stack.Screen name="Login">
          {() => (
            <LoginScreen
              onNavigateToRegister={navigateToRegister}
              onLoginSuccess={onAuthSuccess}
            />
          )}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Register">
          {() => (
            <RegisterScreen
              onNavigateToLogin={navigateToLogin}
              onRegisterSuccess={onAuthSuccess}
            />
          )}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
});

export default AuthNavigator; 