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
const CreditCardsPage = () => <div>Kredi Kartları Sayfası</div>;
const GoldPage = () => <div>Altın Sayfası</div>;
const RecurringPage = () => <div>Tekrarlayan Ödemeler Sayfası</div>;
const ReportsPage = () => <div>Raporlar Sayfası</div>;
const SettingsPage = () => <div>Ayarlar Sayfası</div>;
const AddTransactionPage = () => <div>İşlem Ekle Sayfası</div>;

type PageType = 'dashboard' | 'accounts' | 'transactions' | 'credit-cards' | 'gold' | 'recurring' | 'reports' | 'settings' | 'add-transaction';

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

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
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
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