import React from 'react';
import { Text, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { MainStackParamList, MainTabParamList } from '../types';
import { isWeb } from '../utils/platform';

// Import screens
import CleanDashboardScreen from '../views/CleanDashboardScreen';
import TransactionsScreen from '../views/TransactionsScreen';
import AddTransactionScreen from '../views/AddTransactionScreen';
import ReportsScreen from '../views/ReportsScreen';
import SettingsScreen from '../views/SettingsScreen';
import AccountsScreen from '../views/AccountsScreen';
import AddAccountScreen from '../views/AddAccountScreen';
import GoldAccountDetailScreen from '../views/GoldAccountDetailScreen';
import HelpAndSupportScreen from '../views/HelpAndSupportScreen';
import SecurityScreen from '../views/SecurityScreen';
import ProfileScreen from '../views/ProfileScreen';
import RecurringPaymentsScreen from '../views/RecurringPaymentsScreen';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const baseIconSize = isSmallDevice ? 22 : 24;

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<MainStackParamList>();

const TabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Transactions':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'AddTransaction':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Reports':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT_SECONDARY,
        tabBarStyle: {
          backgroundColor: COLORS.SURFACE,
          borderTopColor: COLORS.BORDER,
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8),
          height: Math.max(65 + insets.bottom, Platform.OS === 'ios' ? 85 : 65),
          ...(isWeb && {
            display: 'none',
          }),
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={CleanDashboardScreen}
        options={{
          title: 'Ana Sayfa',
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: 'İşlemler',
        }}
      />
      <Tab.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{
          title: 'Ekle',
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          title: 'Raporlar',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Ayarlar',
        }}
      />
    </Tab.Navigator>
  );
};

// Placeholder component for screens under development
const PlaceholderScreen: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.BACKGROUND }}>
    <Text style={{ fontSize: 18, color: COLORS.TEXT_PRIMARY }}>{title}</Text>
    {subtitle && (
      <Text style={{ fontSize: 14, color: COLORS.TEXT_SECONDARY, marginTop: 8 }}>{subtitle}</Text>
    )}
  </SafeAreaView>
);

// Analytics Screen Component
const AnalyticsScreen: React.FC = () => (
  <PlaceholderScreen title="Analizler" subtitle="Yakında gelecek..." />
);

const MainNavigator: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.BACKGROUND }} edges={['top']}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="AddAccount" component={AddAccountScreen} />
        <Stack.Screen name="GoldAccountDetail" component={GoldAccountDetailScreen} />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
                overlayStyle: {
                  opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  }),
                },
              };
            },
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 250,
                },
              },
            },
          }}
        />
        <Stack.Screen 
          name="RecurringPayments" 
          component={RecurringPaymentsScreen}
          options={{
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
                overlayStyle: {
                  opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  }),
                },
              };
            },
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 250,
                },
              },
            },
          }}
        />
        <Stack.Screen 
          name="Analytics" 
          component={AnalyticsScreen}
          options={{
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
                overlayStyle: {
                  opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  }),
                },
              };
            },
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 250,
                },
              },
            },
          }}
        />
        <Stack.Screen 
          name="HelpAndSupport" 
          component={HelpAndSupportScreen}
          options={{
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
                overlayStyle: {
                  opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  }),
                },
              };
            },
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 250,
                },
              },
            },
          }}
        />
        <Stack.Screen 
          name="Security" 
          component={SecurityScreen}
          options={{
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
                overlayStyle: {
                  opacity: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  }),
                },
              };
            },
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 300,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 250,
                },
              },
            },
          }}
        />
      </Stack.Navigator>
    </SafeAreaView>
  );
};

export default MainNavigator; 