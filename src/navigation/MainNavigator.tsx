import React from 'react';
import { Text, Dimensions, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { MainStackParamList, MainTabParamList } from '../types';

// Import screens
import DashboardScreen from '../views/DashboardScreen';
import TransactionsScreen from '../views/TransactionsScreen';
import AddTransactionScreen from '../views/AddTransactionScreen';
import ReportsScreen from '../views/ReportsScreen';
import SettingsScreen from '../views/SettingsScreen';
import AccountsScreen from '../views/AccountsScreen';
import AddAccountScreen from '../views/AddAccountScreen';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const baseIconSize = isSmallDevice ? 22 : 24;
const isWeb = Platform.OS === 'web';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<MainStackParamList>();

const TabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: isWeb ? { display: 'none' } : {
          backgroundColor: COLORS.SURFACE,
          borderTopColor: COLORS.BORDER,
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, isSmallDevice ? 6 : 8),
          paddingTop: isSmallDevice ? 6 : 8,
          height: Math.max(70 + insets.bottom, isSmallDevice ? 70 : 80),
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT_SECONDARY,
        tabBarLabelStyle: {
          fontSize: isSmallDevice ? 11 : 12,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={baseIconSize} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarLabel: 'İşlemler',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'list' : 'list-outline'} 
              size={baseIconSize} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{
          tabBarLabel: 'Ekle',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'add-circle' : 'add-circle-outline'} 
              size={baseIconSize + 2} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          tabBarLabel: 'Raporlar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'bar-chart' : 'bar-chart-outline'} 
              size={baseIconSize} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Ayarlar',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'settings' : 'settings-outline'} 
              size={baseIconSize} 
              color={color} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="Accounts" component={AccountsScreen} />
      <Stack.Screen name="AddAccount" component={AddAccountScreen} />
    </Stack.Navigator>
  );
};

export default MainNavigator; 