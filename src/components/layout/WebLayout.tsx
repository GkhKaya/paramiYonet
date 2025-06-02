import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { isWeb, getWebContainerStyles, isLargeScreen } from '../../utils/platform';

interface WebLayoutProps {
  children: React.ReactNode;
  title: string;
  activeRoute?: string;
  navigation?: any; // React Navigation navigation object
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home-outline', routeName: 'Dashboard' },
  { id: 'transactions', label: 'İşlemler', icon: 'list-outline', routeName: 'Transactions' },
  { id: 'reports', label: 'Raporlar', icon: 'analytics-outline', routeName: 'Reports' },
  { id: 'accounts', label: 'Hesaplar', icon: 'card-outline', routeName: 'Accounts' },
  { id: 'settings', label: 'Ayarlar', icon: 'settings-outline', routeName: 'Settings' },
];

export const WebLayout: React.FC<WebLayoutProps> = ({ 
  children, 
  title,
  activeRoute = 'dashboard',
  navigation
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!isWeb) {
    return <>{children}</>;
  }

  const webContainerStyles = getWebContainerStyles();

  const handleNavigation = (item: typeof navigationItems[0]) => {
    if (navigation && item.routeName) {
      // For accounts, navigate to the stack screen
      if (item.routeName === 'Accounts') {
        navigation.navigate('Accounts');
      } else {
        // For other routes, navigate to the tab
        navigation.navigate(item.routeName);
      }
    }
  };

  return (
    <View style={[styles.webContainer, webContainerStyles, { width: '100%' as any, height: '100vh' as any }]}>
      {/* Top Header */}
      <View style={[styles.topHeader, { width: '100%' as any }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Ionicons name="menu" size={24} color={COLORS.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.logo}>ParamıYönet</Text>
        </View>
        
        <View style={styles.headerCenter}>
          <Text style={styles.pageTitle}>{title}</Text>
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="person-circle-outline" size={28} color={COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.mainContent, { width: '100%' as any, height: 'calc(100vh - 64px)' as any }]}>
        {/* Sidebar */}
        <View style={[
          styles.sidebar,
          sidebarCollapsed && styles.sidebarCollapsed
        ]}>
          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            <View style={styles.sidebarHeader}>
              {!sidebarCollapsed && (
                <Text style={styles.sidebarTitle}>Menü</Text>
              )}
            </View>
            
            <View style={styles.navigationItems}>
              {navigationItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.navItem,
                    activeRoute === item.id && styles.navItemActive,
                    sidebarCollapsed && styles.navItemCollapsed
                  ]}
                  onPress={() => handleNavigation(item)}
                >
                  <Ionicons 
                    name={item.icon as any} 
                    size={20} 
                    color={activeRoute === item.id ? COLORS.WHITE : COLORS.TEXT_SECONDARY}
                    style={styles.navIcon}
                  />
                  {!sidebarCollapsed && (
                    <Text style={[
                      styles.navLabel,
                      activeRoute === item.id && styles.navLabelActive
                    ]}>
                      {item.label}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Content Area */}
        <View style={styles.contentArea}>
          <ScrollView 
            style={styles.contentScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {children}
          </ScrollView>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Made by Devosuit © 2025 All rights reserved.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
    flexDirection: 'column',
  },
  
  // Top Header
  topHeader: {
    height: 64,
    backgroundColor: COLORS.SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    justifyContent: 'space-between',
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1000,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: SPACING.sm,
    marginRight: SPACING.md,
  },
  logo: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    color: COLORS.PRIMARY,
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  headerButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.sm,
  },

  // Main Content
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  
  // Sidebar
  sidebar: {
    width: 280,
    backgroundColor: COLORS.CARD,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER,
    minHeight: '100%',
  },
  sidebarCollapsed: {
    width: 80,
  },
  sidebarContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  sidebarHeader: {
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  sidebarTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  
  // Navigation
  navigationItems: {
    gap: SPACING.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },
  navIcon: {
    marginRight: SPACING.md,
  },
  navLabel: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '500',
  },
  navLabelActive: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },

  // Content Area
  contentArea: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.xl,
    minHeight: '100%',
    paddingBottom: SPACING.xl * 2,
  },

  // Footer
  footer: {
    height: 50,
    backgroundColor: COLORS.SURFACE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  footerText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_SECONDARY,
  },
}); 