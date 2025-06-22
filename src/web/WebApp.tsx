import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { darkTheme } from './styles/theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
const CreditCardsPage = () => <div>Kredi Kartları Sayfası</div>;
const GoldPage = () => <div>Altın Sayfası</div>;
const RecurringPage = () => <div>Tekrarlayan Ödemeler Sayfası</div>;
const AddTransactionPage = () => <div>İşlem Ekle Sayfası</div>;

type PageType = 'dashboard' | 'accounts' | 'transactions' | 'credit-cards' | 'gold' | 'recurring' | 'reports' | 'settings' | 'profile' | 'categories' | 'help' | 'add-transaction';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  // Hash-based navigation
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(2); // Remove '#/'
      if (hash && ['dashboard', 'accounts', 'transactions', 'credit-cards', 'gold', 'recurring', 'reports', 'settings', 'profile', 'categories', 'help', 'add-transaction'].includes(hash)) {
        setCurrentPage(hash as PageType);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check initial hash

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'accounts':
        return <AccountsPage />;
      case 'transactions':
        return <TransactionsPage />;
      case 'credit-cards':
        return <CreditCardsPage />;
      case 'gold':
        return <GoldPage />;
      case 'recurring':
        return <RecurringPage />;
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
        return <AddTransactionPage />;
      default:
        return <Dashboard />;
    }
  };

  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <WebLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </WebLayout>
  );
};

const WebApp: React.FC = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default WebApp; 