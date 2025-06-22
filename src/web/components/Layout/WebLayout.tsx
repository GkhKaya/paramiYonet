import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  Typography, 
  List, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme,
  Badge,
  Chip
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import {
  Dashboard,
  AccountBalance,
  CreditCard,
  TrendingUp,
  Assessment,
  Settings,
  Menu as MenuIcon,
  Notifications,
  AccountCircle,
  Logout,
  Diamond,
  Receipt,
  Repeat,
  Add
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { gradients, animations } from '../../styles/theme';


const drawerWidth = 280;

type PageType = 'dashboard' | 'accounts' | 'transactions' | 'credit-cards' | 'recurring' | 'reports' | 'settings' | 'profile' | 'categories' | 'help' | 'add-transaction';

interface WebLayoutProps {
  children: React.ReactNode;
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
}

const menuItems = [
  {
    text: 'Ana Sayfa',
    icon: Dashboard,
    page: 'dashboard' as PageType,
    color: '#3b82f6'
  },
  {
    text: 'İşlemler',
    icon: Receipt,
    page: 'transactions' as PageType,
    color: '#f59e0b'
  },
  {
    text: 'Hesaplar',
    icon: AccountBalance,
    page: 'accounts' as PageType,
    color: '#10b981'
  },
  {
    text: 'Kredi Kartları',
    icon: CreditCard,
    page: 'credit-cards' as PageType,
    color: '#ef4444'
  },
  {
    text: 'Tekrarlayan',
    icon: Repeat,
    page: 'recurring' as PageType,
    color: '#8b5cf6'
  },
  {
    text: 'Raporlar',
    icon: Assessment,
    page: 'reports' as PageType,
    color: '#06b6d4'
  },
  {
    text: 'Ayarlar',
    icon: Settings,
    page: 'settings' as PageType,
    color: '#64748b'
  },
];

const WebLayout: React.FC<WebLayoutProps> = ({ children, currentPage, onNavigate }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser, logout } = useAuth();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Firebase'den toplam bakiye hesaplama
  useEffect(() => {
    const calculateTotalBalance = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Firebase'den tüm işlemleri çek ve toplam bakiye hesapla  
        const { db } = await import('../../../config/firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        
        const transactionsRef = collection(db, 'transactions');
        const q = query(transactionsRef, where('userId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        
        let balance = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === 'income') {
            balance += data.amount || 0;
          } else if (data.type === 'expense') {
            balance -= data.amount || 0;
          }
        });
        
        setTotalBalance(balance);
      } catch (error) {
        console.error('Error calculating total balance:', error);
        setTotalBalance(0);
      } finally {
        setLoading(false);
      }
    };

    calculateTotalBalance();
  }, [currentUser]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleProfileMenuClose();
  };

  const isMenuOpen = Boolean(anchorEl);

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo Area */}
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: gradients.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.2rem'
            }}
          >
            ₺
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            ParamıYönet
          </Typography>
        </Box>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ p: 2 }}>
        <motion.div {...animations.scaleIn}>
          <Box
            onClick={() => onNavigate('add-transaction')}
            sx={{
              p: 2,
              borderRadius: 3,
              background: gradients.primary,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(99, 102, 241, 0.3)',
              },
              transition: 'all 0.2s ease'
            }}
          >
            <Add />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              İşlem Ekle
            </Typography>
          </Box>
        </motion.div>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ flex: 1, px: 1 }}>
        <List>
          {menuItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <motion.div key={item.text} {...animations.slideIn}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => onNavigate(item.page)}
                  sx={{
                    mb: 0.5,
                    borderRadius: 2,
                    '&.Mui-selected': {
                      background: `linear-gradient(135deg, ${item.color}20, ${item.color}10)`,
                      borderLeft: `3px solid ${item.color}`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${item.color}30, ${item.color}20)`,
                      }
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? item.color : 'text.secondary' }}>
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? item.color : 'text.primary'
                    }}
                  />
                </ListItemButton>
              </motion.div>
            );
          })}
        </List>
      </Box>

      {/* Bottom Stats */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Anlık Durum
          </Typography>
          {loading ? (
            <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'warning.main', animation: 'pulse 2s infinite' }} />
          ) : (
            <Chip 
              size="small" 
              label={totalBalance >= 0 ? "Pozitif" : "Negatif"} 
              color={totalBalance >= 0 ? "success" : "error"} 
            />
          )}
        </Box>
        <Typography variant="h6" sx={{ 
          fontWeight: 700, 
          color: loading ? 'text.secondary' : (totalBalance >= 0 ? 'success.main' : 'error.main')
        }}>
          {loading ? '₺ - - -' : `₺${totalBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Toplam Bakiye (Gelir - Gider)
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          background: 'rgba(30, 41, 59, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(51, 65, 85, 0.3)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {menuItems.find(item => item.page === currentPage)?.text || 'Dashboard'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton color="inherit">
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>
            
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-search-account-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {currentUser?.displayName?.charAt(0).toUpperCase() || currentUser?.email?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          height: '100vh',
          overflow: 'auto',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { background: 'rgba(255, 255, 255, 0.05)' },
          '&::-webkit-scrollbar-thumb': { 
            background: 'rgba(255, 255, 255, 0.2)', 
            borderRadius: '4px',
            '&:hover': { background: 'rgba(255, 255, 255, 0.3)' },
          },
        }}
      >
        <Toolbar />
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            {...animations.fadeIn}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        keepMounted
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        open={isMenuOpen}
        onClose={handleProfileMenuClose}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {currentUser?.displayName || 'Kullanıcı'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {currentUser?.email}
          </Typography>
        </Box>
        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          Profil
        </MenuItem>
        <MenuItem onClick={handleProfileMenuClose}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          Ayarlar
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Çıkış Yap
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default WebLayout; 