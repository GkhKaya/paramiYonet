import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { darkTheme } from './styles/theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoadingProvider, useLoading, LoadingBar } from './contexts/LoadingContext';
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

type PageType = 'dashboard' | 'accounts' | 'transactions' | 'credit-cards' | 'recurring' | 'reports' | 'settings' | 'profile' | 'categories' | 'help' | 'add-transaction';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const { setLoading } = useLoading();
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [pageLoading, setPageLoading] = useState(false);

  // Hash-based navigation with loading
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(2); // Remove '#/'
      if (hash && ['dashboard', 'accounts', 'transactions', 'credit-cards', 'recurring', 'reports', 'settings', 'profile', 'categories', 'help', 'add-transaction'].includes(hash)) {
        setPageLoading(true);
        setTimeout(() => {
          setCurrentPage(hash as PageType);
          setPageLoading(false);
        }, 300); // Small delay for smooth transition
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check initial hash

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Initial app loading
  React.useEffect(() => {
    if (!currentUser) {
      setLoading(true, 'Giriş yapılıyor...');
    } else {
      setLoading(false);
    }
  }, [currentUser, setLoading]);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'accounts':
        return <AccountsPage />;
      case 'transactions':
        return <TransactionsPage onNavigate={setCurrentPage} />;
      case 'credit-cards':
        return <CreditCardsPage />;
      case 'recurring':
        return <RecurringPayments />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings 
          onNavigateToProfile={() => setCurrentPage('profile')} 
          onNavigateToCategories={() => setCurrentPage('categories')}
          onNavigateToHelp={() => setCurrentPage('help')} 
        />;
      case 'profile':
        return <Profile onNavigateBack={() => setCurrentPage('settings')} />;
      case 'categories':
        return <CategoryManagement />;
      case 'help':
        return <HelpSupport />;
      case 'add-transaction':
        return <AddTransaction onClose={() => setCurrentPage('dashboard')} />;
      default:
        return <Dashboard />;
    }
  };

  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <>
      <LoadingBar show={pageLoading} />
      <WebLayout currentPage={currentPage} onNavigate={setCurrentPage}>
        {renderPage()}
      </WebLayout>
    </>
  );
};

const WebApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider>
        <LoadingProvider>
          <AppContent />
        </LoadingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default WebApp; 