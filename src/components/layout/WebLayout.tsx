import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { isWeb } from '../../utils/platform';

interface WebLayoutProps {
  children: React.ReactNode;
  title: string;
  activeRoute?: string;
  navigation?: any;
}

const navigationItems = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: 'grid-outline', 
    routeName: 'Dashboard',
    description: 'Ana sayfa ve özet bilgiler'
  },
  { 
    id: 'transactions', 
    label: 'İşlemler', 
    icon: 'swap-horizontal-outline', 
    routeName: 'Transactions',
    description: 'Gelir ve gider işlemleri'
  },
  { 
    id: 'reports', 
    label: 'Raporlar', 
    icon: 'bar-chart-outline', 
    routeName: 'Reports',
    description: 'Analizler, grafikler ve raporlar'
  },
  { 
    id: 'settings', 
    label: 'Ayarlar', 
    icon: 'settings-outline', 
    routeName: 'Settings',
    description: 'Uygulama ayarları'
  },
];

const quickActions = [
  { icon: 'add-circle', label: 'Hızlı Ekle', color: '#007AFF' },
  { icon: 'download-outline', label: 'Dışa Aktar', color: '#00C853' },
  { icon: 'help-circle-outline', label: 'Yardım', color: '#FF9500' },
];

export const WebLayout: React.FC<WebLayoutProps> = ({ 
  children, 
  title,
  activeRoute = 'dashboard',
  navigation
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const hookNavigation = useNavigation<any>();

  if (!isWeb) {
    return <>{children}</>;
  }

  const handleNavigation = (item: typeof navigationItems[0]) => {
    if (navigation && item.routeName) {
      // Web'de animasyonsuz navigasyon
      navigation.navigate(item.routeName, undefined, {
        animation: 'none'
      });
    }
  };

  const getCurrentPageInfo = () => {
    const currentItem = navigationItems.find(item => item.id === activeRoute);
    return currentItem || navigationItems[0];
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    if (navigation) {
      switch (action.icon) {
        case 'add-circle':
          // İşlem ekleme sayfasına git
          try {
            // Hook navigation ile root navigator'a eriş
            let rootNav = hookNavigation;
            while (rootNav.getParent?.()) {
              rootNav = rootNav.getParent();
            }
            rootNav.navigate('AddTransaction');
          } catch (error) {
            // Fallback olarak CommonActions dene
            hookNavigation.dispatch(
              CommonActions.navigate({
                name: 'AddTransaction',
              })
            );
          }
          break;
        case 'download-outline':
          // Dışa aktarma işlemi (gelecekte implement edilecek)
          console.log('Export functionality not implemented yet');
          break;
        case 'help-circle-outline':
          // Yardım sayfasına git
          navigation.navigate('HelpAndSupport', undefined, {
            animation: 'none'
          });
          break;
        default:
          break;
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.menuToggle}
            onPress={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Ionicons name="menu" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="wallet" size={24} color={COLORS.WHITE} />
            </View>
            <Text style={styles.logoText}>ParamıYönet</Text>
            <View style={styles.betaBadge}>
              <Text style={styles.betaText}>BETA</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerCenter}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.TEXT_SECONDARY} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ara..."
              placeholderTextColor={COLORS.TEXT_SECONDARY}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={styles.headerRight}>
          {quickActions.map((action, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.quickAction, { backgroundColor: action.color + '20' }]}
              onPress={() => handleQuickAction(action)}
            >
              <Ionicons name={action.icon as any} size={20} color={action.color} />
            </TouchableOpacity>
          ))}
          
          <View style={styles.userProfile}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={20} color={COLORS.WHITE} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Gökhan Kaya</Text>
              <Text style={styles.userRole}>Admin</Text>
            </View>
            <TouchableOpacity style={styles.dropdownButton}>
              <Ionicons name="chevron-down" size={16} color={COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.mainContainer}>
        {/* Left Sidebar */}
        <View style={[styles.sidebar, sidebarCollapsed && styles.sidebarCollapsed]}>
          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            <View style={styles.sidebarSection}>
              <Text style={styles.sectionTitle}>
                {sidebarCollapsed ? '' : 'Menü'}
              </Text>
              
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
                  <View style={styles.navItemLeft}>
                    <View style={[
                      styles.navIcon,
                      activeRoute === item.id && styles.navIconActive
                    ]}>
                      <Ionicons 
                        name={item.icon as any} 
                        size={20} 
                        color={activeRoute === item.id ? COLORS.WHITE : COLORS.TEXT_SECONDARY}
                      />
                    </View>
                    
                    {!sidebarCollapsed && (
                      <View style={styles.navTextContainer}>
                        <Text style={[
                          styles.navLabel,
                          activeRoute === item.id && styles.navLabelActive
                        ]}>
                          {item.label}
                        </Text>
                        <Text style={styles.navDescription}>
                          {item.description}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {!sidebarCollapsed && activeRoute === item.id && (
                    <View style={styles.activeIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {!sidebarCollapsed && (
              <View style={styles.sidebarFooter}>
                <View style={styles.footerCard}>
                  <View style={styles.footerIcon}>
                    <Ionicons name="bulb" size={20} color={COLORS.WARNING} />
                  </View>
                  <Text style={styles.footerTitle}>İpucu</Text>
                  <Text style={styles.footerText}>
                    Hızlı işlem eklemek için üst menüdeki + butonunu kullanabilirsiniz.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Main Content Area */}
        <View style={styles.contentArea}>
          {/* Page Header */}
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderLeft}>
              <View style={styles.breadcrumb}>
                <TouchableOpacity style={styles.breadcrumbItem}>
                  <Text style={styles.breadcrumbText}>Ana Sayfa</Text>
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_SECONDARY} />
                <Text style={styles.breadcrumbCurrent}>{getCurrentPageInfo().label}</Text>
              </View>
              
              <Text style={styles.pageTitle}>{title}</Text>
              <Text style={styles.pageSubtitle}>{getCurrentPageInfo().description}</Text>
            </View>
            
            <View style={styles.pageHeaderRight}>
              <Text style={styles.lastUpdate}>
                Son güncelleme: {new Date().toLocaleTimeString('tr-TR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.contentScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentContainer}>
              {children}
            </View>
            
            {/* Footer */}
            <View style={styles.contentFooter}>
              <View style={styles.footerContent}>
                <Text style={styles.footerCopyright}>
                  © 2025 ParamıYönet. Tüm hakları saklıdır.
                </Text>
                <View style={styles.footerLinks}>
                  <TouchableOpacity><Text style={styles.footerLink}>Gizlilik</Text></TouchableOpacity>
                  <TouchableOpacity><Text style={styles.footerLink}>Şartlar</Text></TouchableOpacity>
                  <TouchableOpacity><Text style={styles.footerLink}>Destek</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    height: '100vh' as any,
    fontFamily: 'system-ui, -apple-system, sans-serif' as any,
  },
  
  // Top Header
  topHeader: {
    height: 70,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#38383A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuToggle: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  betaBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  betaText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    gap: 12,
  },
  quickAction: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#38383A',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  userInfo: {
    marginRight: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userRole: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  dropdownButton: {
    padding: 4,
  },

  // Main Container
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },

  // Sidebar
  sidebar: {
    width: 280,
    backgroundColor: '#1C1C1E',
    borderRightWidth: 1,
    borderRightColor: '#38383A',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sidebarCollapsed: {
    width: 80,
  },
  sidebarContent: {
    flex: 1,
    padding: 16,
  },
  sidebarSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: 'transparent',
    cursor: 'pointer' as any,
  },
  navItemActive: {
    backgroundColor: COLORS.PRIMARY + '10',
  },
  navItemCollapsed: {
    justifyContent: 'center',
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#2C2C2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navIconActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  navTextContainer: {
    flex: 1,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  navLabelActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  navDescription: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  activeIndicator: {
    width: 4,
    height: 20,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 2,
  },
  sidebarFooter: {
    marginTop: 24,
  },
  footerCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  footerIcon: {
    marginBottom: 8,
  },
  footerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#A16207',
    lineHeight: 16,
  },

  // Content Area
  contentArea: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  pageHeader: {
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#38383A',
    paddingHorizontal: 32,
    paddingVertical: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pageHeaderLeft: {
    flex: 1,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breadcrumbItem: {
    marginRight: 4,
  },
  breadcrumbText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    cursor: 'pointer' as any,
  },
  breadcrumbCurrent: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
    marginLeft: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  pageHeaderRight: {
    alignItems: 'flex-end',
  },
  lastUpdate: {
    fontSize: 12,
    color: COLORS.TEXT_SECONDARY,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 32,
    minHeight: 600,
  },
  contentFooter: {
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#38383A',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerCopyright: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 24,
  },
  footerLink: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    cursor: 'pointer' as any,
  },
}); 