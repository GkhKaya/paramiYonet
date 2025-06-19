import React from 'react';
import { Text, Dimensions, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
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
import AddCategoryScreen from '../views/AddCategoryScreen';
import ManageCategoriesScreen from '../views/ManageCategoriesScreen';
import GoldAccountDetailScreen from '../views/GoldAccountDetailScreen';
import HelpAndSupportScreen from '../views/HelpAndSupportScreen';
import SecurityScreen from '../views/SecurityScreen';
import ProfileScreen from '../views/ProfileScreen';
import RecurringPaymentsScreen from '../views/RecurringPaymentsScreen';
import AnalyticsScreen from '../views/AnalyticsScreen';
import CreditCardTransactionScreen from '../views/CreditCardTransactionScreen';
import CreditCardPaymentScreen from '../views/CreditCardPaymentScreen';
import ReportsCreditCardPaymentScreen from '../views/ReportsCreditCardPaymentScreen';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const baseIconSize = isSmallDevice ? 22 : 24;

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<MainStackParamList>();

const TabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Transactions':
              iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
              break;
            case 'AddTransaction':
              return null; // Custom button için icon döndürmeyelim
            case 'Reports':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Settings':
              iconName = focused ? 'person' : 'person-outline';
              break; 
            default:
              iconName = 'circle';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarButton: (props) => {
          if (route.name === 'AddTransaction') {
            return (
              <TouchableOpacity
                style={styles.customTabButton}
                onPress={() => {
                  // Root navigator'ı bul
                  let rootNav = navigation;
                  while (rootNav.getParent()) {
                    rootNav = rootNav.getParent();
                  }
                  
                  rootNav.navigate('AddTransaction');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            );
          }
          return <TouchableOpacity {...props} />;
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopWidth: 0,
          paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 8),
          height: Math.max(65 + insets.bottom, Platform.OS === 'ios' ? 85 : 65),
          ...(isWeb && {
            display: 'none', // Hide mobile tabs on web
          }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={CleanDashboardScreen}
        options={{
          title: 'Kayıtlar',
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
        component={CleanDashboardScreen} // Placeholder component - asla render edilmeyecek
        options={{
          title: '',
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
          title: 'Ben',
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

const MainNavigator: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }} edges={['top']}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          ...(Platform.OS === 'web' && {
            animationEnabled: false,
            cardStyleInterpolator: () => ({}),
          }),
        }}
      >
        <Stack.Screen 
          name="MainTabs" 
          component={TabNavigator} 
        />
        <Stack.Screen 
          name="AddTransaction" 
          component={AddTransactionScreen}
          options={{
            presentation: 'modal',
            animationTypeForReplace: 'push',
            cardStyleInterpolator: ({ current }) => ({
              cardStyle: {
                opacity: current.progress,
              },
            }),
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 200, // Daha hızlı açılma
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 150, // Daha hızlı kapanma
                },
              },
            },
          }}
        />
        <Stack.Screen name="AddAccount" component={AddAccountScreen} />
        <Stack.Screen 
          name="AddCategory" 
          component={AddCategoryScreen}
          options={{
            presentation: 'modal',
            animationTypeForReplace: 'push',
            cardStyleInterpolator: ({ current }) => ({
              cardStyle: {
                opacity: current.progress,
              },
            }),
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 200,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 150,
                },
              },
            },
          }}
        />
        <Stack.Screen name="ManageCategories" component={ManageCategoriesScreen} />
        <Stack.Screen name="GoldAccountDetail" component={GoldAccountDetailScreen} />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            ...(Platform.OS !== 'web' && {
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
            }),
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
          name="HelpAndSupport" 
          component={HelpAndSupportScreen}
          options={{
            ...(Platform.OS !== 'web' && {
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
            }),
          }}
        />
        <Stack.Screen 
          name="Security" 
          component={SecurityScreen}
          options={{
            ...(Platform.OS !== 'web' && {
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
            }),
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
          name="CreditCardTransaction" 
          component={CreditCardTransactionScreen}
          options={{
            presentation: 'modal',
            animationTypeForReplace: 'push',
            cardStyleInterpolator: ({ current }) => ({
              cardStyle: {
                opacity: current.progress,
              },
            }),
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 200,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 150,
                },
              },
            },
          }}
        />
        <Stack.Screen 
          name="CreditCardPayment" 
          component={CreditCardPaymentScreen}
          options={{
            presentation: 'modal',
            animationTypeForReplace: 'push',
            cardStyleInterpolator: ({ current }) => ({
              cardStyle: {
                opacity: current.progress,
              },
            }),
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 200,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 150,
                },
              },
            },
          }}
        />
        <Stack.Screen 
          name="ReportsCreditCardPayment" 
          component={ReportsCreditCardPaymentScreen}
          options={{
            presentation: 'modal',
            animationTypeForReplace: 'push',
            cardStyleInterpolator: ({ current }) => ({
              cardStyle: {
                opacity: current.progress,
              },
            }),
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 200,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 150,
                },
              },
            },
          }}
        />
      </Stack.Navigator>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  customTabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#000000',
  },
});

export default MainNavigator; 