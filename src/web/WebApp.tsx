import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { darkTheme } from './styles/theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoadingProvider, useLoading } from './contexts/LoadingContext';
import { ErrorProvider } from '../contexts/ErrorContext';
import { NetworkProvider } from '../contexts/NetworkContext';
import { NetworkStatusIndicator } from '../components/common/NetworkStatusIndicator';
import WebLayout from './components/Layout/WebLayout';
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/Transactions';
import AccountsPage from './pages/Accounts';
import AuthPage from './pages/AuthPage';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import CategoryManagement from './pages/CategoryManagement';
import HelpSupport from './pages/HelpSupport';
import CreditCardsPage from './pages/CreditCards';
import AddTransaction from './pages/AddTransaction';
import RecurringPayments from './pages/RecurringPayments';
import Debts from './pages/Debts';
import BudgetsPage from './pages/Budgets';

// Bu uygulama subfolder'da (ör: /paramiyonet/) yayınlanacağı için hash tabanlı yönlendirme uygundur.
// Eğer BrowserRouter kullanılsaydı, basename ayarı verilmeliydi. Şu an hash routing ile uyumlu.

type PageType = 'dashboard' | 'accounts' | 'transactions' | 'credit-cards' | 'recurring' | 'debts' | 'budgets' | 'reports' | 'settings' | 'profile' | 'categories' | 'help' | 'add-transaction';

const AppContent: React.FC = () => {
  console.log('AppContent component rendering...');
  const { currentUser, loading } = useAuth();
  const { setLoading } = useLoading();
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  // Navigation function that updates both state and browser history
  const navigateToPage = (page: PageType) => {
    if (page !== currentPage) {
      // Browser history'ye ekle
      window.history.pushState({ page }, '', `#/${page}`);
        setCurrentPage(page);
    }
  };

  // Hash-based navigation with browser history support
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(2); // Remove '#/'
      const validPages = ['dashboard', 'accounts', 'transactions', 'credit-cards', 'recurring', 'debts', 'budgets', 'reports', 'settings', 'profile', 'categories', 'help', 'add-transaction'];
      
      if (hash && validPages.includes(hash)) {
        const newPage = hash as PageType;
        if (newPage !== currentPage) {
            setCurrentPage(newPage);
        }
      } else {
        // Eğer hash yoksa veya geçersizse dashboard'a yönlendir
        if (currentPage !== 'dashboard') {
          window.history.replaceState({ page: 'dashboard' }, '', '#/dashboard');
          setCurrentPage('dashboard');
        }
      }
    };

    // Browser geri/ileri butonları için popstate event'i dinle
    const handlePopState = () => {
      handleHashChange();
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);
    
    // Initial hash check - eğer hash yoksa dashboard'a yönlendir
    const initialHash = window.location.hash.slice(2);
    if (!initialHash) {
      window.history.replaceState({ page: 'dashboard' }, '', '#/dashboard');
    }
    handleHashChange(); // Check initial hash

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Initial app loading - sadece loading state true iken göster
  React.useEffect(() => {
    if (loading) {
      setLoading(true, 'Uygulama yükleniyor...');
    } else {
      setLoading(false);
    }
  }, [loading, setLoading]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'accounts':
        return <AccountsPage />;
      case 'transactions':
        return <TransactionsPage onNavigate={navigateToPage} />;
      case 'credit-cards':
        return <CreditCardsPage />;
      case 'recurring':
        return <RecurringPayments />;
      case 'debts':
        return <Debts />;
      case 'budgets':
        return <BudgetsPage />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings 
          onNavigateToProfile={() => navigateToPage('profile')} 
          onNavigateToCategories={() => navigateToPage('categories')}
          onNavigateToHelp={() => navigateToPage('help')} 
        />;
      case 'profile':
        return <Profile onNavigateBack={() => navigateToPage('settings')} />;
      case 'categories':
        return <CategoryManagement />;
      case 'help':
        return <HelpSupport />;
      case 'add-transaction':
        return <AddTransaction 
          onClose={() => navigateToPage('dashboard')} 
          onSuccess={() => {
            // Form is already reset in AddTransaction component
            // User can continue adding transactions
          }}
        />;
      default:
        return <Dashboard />;
    }
  };

  console.log('Auth state:', { currentUser: !!currentUser, loading });

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#0f172a',
        color: '#f8fafc'
      }}>
        Yükleniyor...
      </div>
    );
  }

  if (!currentUser) {
    console.log('No user, showing AuthPage');
    return <AuthPage />;
  }

  return (
      <WebLayout currentPage={currentPage} onNavigate={navigateToPage}>
        <NetworkStatusIndicator />
        {renderPage()}
      </WebLayout>
  );
};

const WebApp: React.FC = () => {
  console.log('WebApp component rendering...');
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <ErrorProvider>
        <NetworkProvider>
          <AuthProvider>
            <LoadingProvider>
              <AppContent />
            </LoadingProvider>
          </AuthProvider>
        </NetworkProvider>
      </ErrorProvider>
    </ThemeProvider>
  );
};

export default WebApp; 