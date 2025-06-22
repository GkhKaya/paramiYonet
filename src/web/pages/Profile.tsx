import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  TextField,
  Stack,
  Chip,
  CircularProgress,
  Container,
  Alert,
  Paper,
  Grid,
  Divider,
  IconButton,
  Badge,
  Fade,
  Zoom,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Person,
  Edit,
  Save,
  Close,
  ArrowBack,
  Verified,
  Receipt,
  TrendingUp,
  TrendingDown,
  AccountBalance,
  CameraAlt,
  Email,
  Security,
  Notifications,
  Language,
  Analytics,
  Stars,
  Diamond,
  Wallet,
  History,
  Assessment,
  Lock,
  VpnKey,
  MailOutline,
  VisibilityOff,
  Visibility,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { AccountService } from '../../services/AccountService';
import { TransactionService } from '../../services/TransactionService';
import { SecurityService } from '../../services/FirebaseService';
import { formatCurrency } from '../../utils/formatters';

interface ProfileProps {
  onNavigateBack?: () => void;
}

interface UserStats {
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  accountCount: number;
  netBalance: number;
  avgTransactionAmount: number;
  lastTransactionDate: Date | null;
  monthlyTransactions: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  progress?: number;
  color: string;
}

const Profile: React.FC<ProfileProps> = ({ onNavigateBack }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Security states
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    totalTransactions: 0,
    totalIncome: 0,
    totalExpense: 0,
    accountCount: 0,
    netBalance: 0,
    avgTransactionAmount: 0,
    lastTransactionDate: null,
    monthlyTransactions: 0,
  });

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: 'first-transaction',
      title: 'İlk Adım',
      description: 'İlk işleminizi kaydettiniz',
      icon: <Stars />,
      unlocked: false,
      color: '#FFD700',
    },
    {
      id: 'transaction-master',
      title: 'İşlem Ustası',
      description: '100 işlem tamamladınız',
      icon: <Receipt />,
      unlocked: false,
      progress: 0,
      color: '#2196F3',
    },
    {
      id: 'account-collector',
      title: 'Hesap Koleksiyoncusu',
      description: '5 farklı hesap oluşturdunuz',
      icon: <AccountBalance />,
      unlocked: false,
      progress: 0,
      color: '#4CAF50',
    },
    {
      id: 'millionaire',
      title: 'Milyoner',
      description: 'Net bakiyeniz 1.000.000 TL\'yi geçti',
      icon: <Diamond />,
      unlocked: false,
      color: '#9C27B0',
    },
  ]);

  useEffect(() => {
    loadUserStats();
  }, []);

  // Alert göründüğünde otomatik kapatma
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 5000); // 5 saniye sonra otomatik kapan

      return () => clearTimeout(timer);
    }
  }, [alert]);

  const loadUserStats = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [accounts, transactions] = await Promise.all([
        AccountService.getUserAccounts(currentUser.uid),
        TransactionService.getUserTransactions(currentUser.uid),
      ]);

      const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const avgAmount = transactions.length > 0 
        ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length 
        : 0;

      const lastTransaction = transactions.length > 0 
        ? new Date(Math.max(...transactions.map(t => new Date(t.date).getTime())))
        : null;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear;
      }).length;

      const newStats = {
        totalTransactions: transactions.length,
        totalIncome,
        totalExpense,
        accountCount: accounts.length,
        netBalance: totalBalance,
        avgTransactionAmount: avgAmount,
        lastTransactionDate: lastTransaction,
        monthlyTransactions,
      };

      setStats(newStats);
      updateAchievements(newStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAchievements = (userStats: UserStats) => {
    setAchievements(prev => prev.map(achievement => {
      switch (achievement.id) {
        case 'first-transaction':
          return { ...achievement, unlocked: userStats.totalTransactions > 0 };
        case 'transaction-master':
          return { 
            ...achievement, 
            unlocked: userStats.totalTransactions >= 100,
            progress: Math.min(userStats.totalTransactions, 100)
          };
        case 'account-collector':
          return { 
            ...achievement, 
            unlocked: userStats.accountCount >= 5,
            progress: Math.min(userStats.accountCount, 5)
          };
        case 'millionaire':
          return { ...achievement, unlocked: userStats.netBalance >= 1000000 };
        default:
          return achievement;
      }
    }));
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      setDisplayName(currentUser?.displayName || '');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      // TODO: Implement profile update with UserService
      setAlert({ type: 'success', message: 'Profil başarıyla güncellendi!' });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setAlert({ type: 'error', message: 'Profil güncellenirken hata oluştu' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setAlert({ type: 'error', message: 'Lütfen tüm alanları doldurun' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlert({ type: 'error', message: 'Yeni şifreler eşleşmiyor' });
      return;
    }

    if (newPassword.length < 6) {
      setAlert({ type: 'error', message: 'Yeni şifre en az 6 karakter olmalıdır' });
      return;
    }

    setSecurityLoading(true);
    try {
      await SecurityService.changePassword(currentPassword, newPassword);
      
      // Form'u temizle ve kapat
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      
      setAlert({ type: 'success', message: 'Şifreniz başarıyla değiştirildi' });
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message || 'Şifre değiştirilemedi' });
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !emailPassword) {
      setAlert({ type: 'error', message: 'Lütfen tüm alanları doldurun' });
      return;
    }

    if (newEmail === currentUser?.email) {
      setAlert({ type: 'error', message: 'Yeni e-posta adresi mevcut adresle aynı' });
      return;
    }

    // E-posta formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setAlert({ type: 'error', message: 'Geçerli bir e-posta adresi girin' });
      return;
    }

    setSecurityLoading(true);
    try {
      await SecurityService.changeEmail(newEmail, emailPassword);
      
      // Form'u temizle ve kapat
      setNewEmail('');
      setEmailPassword('');
      setShowEmailForm(false);
      
      setAlert({ type: 'success', message: 'E-posta adresiniz başarıyla değiştirildi' });
    } catch (error: any) {
      setAlert({ type: 'error', message: error.message || 'E-posta adresi değiştirilemedi' });
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!currentUser?.email) {
      setAlert({ type: 'error', message: 'E-posta adresi bulunamadı' });
      return;
    }

    try {
      setSecurityLoading(true);
      await SecurityService.sendPasswordResetEmail(currentUser.email);
      
      setAlert({ 
        type: 'success', 
        message: `Şifre sıfırlama bağlantısı ${currentUser.email} adresine gönderildi. E-posta gelmezse spam/gereksiz e-posta klasörünüzü kontrol edin.` 
      });
    } catch (error: any) {
      console.error('Şifre sıfırlama e-postası hatası:', error);
      
      let errorMessage = 'E-posta gönderilemedi';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setAlert({ type: 'error', message: errorMessage });
    } finally {
      setSecurityLoading(false);
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const getJoinDate = () => {
    if (currentUser?.metadata?.creationTime) {
      return new Date(currentUser.metadata.creationTime).toLocaleDateString('tr-TR');
    }
    return 'Bilinmiyor';
  };

  const getUserLevel = () => {
    const transactionCount = stats.totalTransactions;
    if (transactionCount < 10) return { level: 'Başlangıç', color: '#9E9E9E', progress: transactionCount * 10 };
    if (transactionCount < 50) return { level: 'Orta', color: '#2196F3', progress: ((transactionCount - 10) / 40) * 100 };
    if (transactionCount < 100) return { level: 'İleri', color: '#FF9800', progress: ((transactionCount - 50) / 50) * 100 };
    return { level: 'Uzman', color: '#4CAF50', progress: 100 };
  };

  const userLevel = getUserLevel();

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        p: 3,
        pb: 6, // Extra bottom padding
      }}
    >
      <Container maxWidth="lg" sx={{ py: 2 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          {onNavigateBack && (
            <Button
              startIcon={<ArrowBack />}
              onClick={onNavigateBack}
              sx={{ 
                mb: 3, 
                color: '#bbb', 
                '&:hover': { color: '#fff', bgcolor: 'rgba(255, 255, 255, 0.1)' },
                transition: 'all 0.3s ease',
              }}
            >
              Ayarlara Dön
            </Button>
          )}
          
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 4,
                background: 'linear-gradient(135deg, #2196F3, #21CBF3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                boxShadow: '0 8px 32px rgba(33, 150, 243, 0.4)',
              }}
            >
              <Person sx={{ fontSize: 40, color: '#fff' }} />
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', mb: 2 }}>
              Profilim
            </Typography>
            <Typography variant="h6" sx={{ color: '#bbb', maxWidth: 600, mx: 'auto' }}>
              Hesap bilgilerinizi yönetin ve istatistiklerinizi görüntüleyin
            </Typography>
          </Box>
        </Box>

        {/* Alert */}
        {alert && (
          <Fade in>
            <Alert 
              severity={alert.type} 
              onClose={() => setAlert(null)}
              sx={{ 
                position: 'fixed',
                top: 80, // AppBar height'ı kadar boşluk
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                width: { xs: '90%', sm: '600px' },
                maxWidth: '90vw',
                mb: 3,
                bgcolor: alert.type === 'success' ? 'rgba(76, 175, 80, 0.95)' : 'rgba(244, 67, 54, 0.95)',
                border: `1px solid ${alert.type === 'success' ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)'}`,
                color: '#fff',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}
            >
              {alert.message}
            </Alert>
          </Fade>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 4 }}>
          {/* Left Column - Profile Info */}
          <Box sx={{ flex: { lg: '0 0 400px' } }}>
            <Stack spacing={3}>
              {/* Profile Card */}
              <Fade in timeout={600}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 3,
                }}>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        badgeContent={
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: currentUser?.emailVerified ? '#4CAF50' : '#F44336',
                              border: '3px solid #1e1e1e',
                            }}
                          />
                        }
                      >
                        <Avatar
                          sx={{
                            width: 100,
                            height: 100,
                            bgcolor: '#2196F3',
                            fontSize: 36,
                            fontWeight: 700,
                          }}
                        >
                          {currentUser?.email ? getInitials(currentUser.email) : 'U'}
                        </Avatar>
                      </Badge>
                      <Tooltip title="Profil fotoğrafını değiştir">
                        <IconButton
                          sx={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            bgcolor: '#2196F3',
                            color: '#fff',
                            width: 32,
                            height: 32,
                            '&:hover': { bgcolor: '#1976D2' },
                          }}
                        >
                          <CameraAlt fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Box sx={{ mb: 3 }}>
                      {isEditing ? (
                        <TextField
                          fullWidth
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Ad Soyad"
                          variant="outlined"
                          size="small"
                          sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              color: '#fff',
                              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                              '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                              '&.Mui-focused fieldset': { borderColor: '#2196F3' },
                            },
                          }}
                        />
                      ) : (
                        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
                          {displayName || 'Kullanıcı'}
                        </Typography>
                      )}
                      <Typography variant="body1" sx={{ color: '#bbb', mb: 2 }}>
                        {currentUser?.email}
                      </Typography>
                      
                      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                        <Chip 
                          icon={currentUser?.emailVerified ? <Verified /> : <Email />}
                          label={currentUser?.emailVerified ? 'Doğrulanmış' : 'Doğrulanmamış'} 
                          size="small" 
                          sx={{ 
                            bgcolor: currentUser?.emailVerified ? '#4CAF50' : '#F44336', 
                            color: '#fff' 
                          }} 
                        />
                        <Chip 
                          label={userLevel.level}
                          size="small" 
                          sx={{ bgcolor: userLevel.color, color: '#fff' }} 
                        />
                      </Stack>
                    </Box>

                    {isEditing ? (
                      <Stack direction="row" spacing={2}>
                        <Button
                          fullWidth
                          variant="outlined"
                          onClick={handleEditToggle}
                          startIcon={<Close />}
                          sx={{ borderColor: '#666', color: '#bbb' }}
                        >
                          İptal
                        </Button>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={handleSave}
                          disabled={loading}
                          startIcon={loading ? <CircularProgress size={16} /> : <Save />}
                          sx={{ bgcolor: '#2196F3', '&:hover': { bgcolor: '#1976D2' } }}
                        >
                          Kaydet
                        </Button>
                      </Stack>
                    ) : (
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={handleEditToggle}
                        startIcon={<Edit />}
                        sx={{ 
                          borderColor: '#2196F3', 
                          color: '#2196F3',
                          '&:hover': { borderColor: '#1976D2', bgcolor: 'rgba(33, 150, 243, 0.1)' }
                        }}
                      >
                        Profili Düzenle
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Fade>

              {/* User Level Progress */}
              <Fade in timeout={800}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 3,
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
                      Kullanıcı Seviyesi
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: '#bbb' }}>
                          {userLevel.level}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#bbb' }}>
                          {Math.round(userLevel.progress)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={userLevel.progress}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: userLevel.color,
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#777' }}>
                      {stats.totalTransactions} işlem tamamlandı
                    </Typography>
                  </CardContent>
                </Card>
              </Fade>

              {/* Account Info */}
              <Fade in timeout={1000}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 3,
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 3 }}>
                      Hesap Bilgileri
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ color: '#bbb' }}>
                          Üyelik Tarihi
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#fff' }}>
                          {getJoinDate()}
                        </Typography>
                      </Box>
                      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ color: '#bbb' }}>
                          Son İşlem
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#fff' }}>
                          {stats.lastTransactionDate ? 
                            stats.lastTransactionDate.toLocaleDateString('tr-TR') : 
                            'Henüz yok'
                          }
                        </Typography>
                      </Box>
                      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ color: '#bbb' }}>
                          Bu Ay İşlem
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#fff' }}>
                          {stats.monthlyTransactions}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Fade>
            </Stack>
          </Box>

          {/* Right Column - Statistics & Achievements */}
          <Box sx={{ flex: 1 }}>
            <Stack spacing={4}>
              {/* Statistics Grid */}
              <Fade in timeout={1200}>
                <Box>
                  <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 3 }}>
                    📊 İstatistikler
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
                    gap: 2,
                    mb: 3
                  }}>
                    {[
                      {
                        title: 'Toplam İşlem',
                        value: loading ? '...' : stats.totalTransactions.toString(),
                        icon: <Receipt />,
                        color: '#2196F3',
                      },
                      {
                        title: 'Toplam Gelir',
                        value: loading ? '...' : formatCurrency(stats.totalIncome),
                        icon: <TrendingUp />,
                        color: '#4CAF50',
                      },
                      {
                        title: 'Toplam Gider',
                        value: loading ? '...' : formatCurrency(stats.totalExpense),
                        icon: <TrendingDown />,
                        color: '#F44336',
                      },
                      {
                        title: 'Hesap Sayısı',
                        value: loading ? '...' : stats.accountCount.toString(),
                        icon: <AccountBalance />,
                        color: '#FF9800',
                      },
                    ].map((stat, index) => (
                      <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card sx={{ 
                          background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 2,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 8px 32px rgba(${stat.color.replace('#', '')}, 0.3)`,
                            borderColor: stat.color,
                          },
                        }}>
                          <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 2,
                                background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}40)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                mb: 2,
                                color: stat.color,
                              }}
                            >
                              {stat.icon}
                            </Box>
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mb: 0.5, fontSize: '0.9rem' }}>
                              {loading ? <CircularProgress size={16} /> : stat.value}
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#bbb', fontSize: '0.75rem' }}>
                              {stat.title}
                            </Typography>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </Box>

                  {/* Net Balance Card */}
                  <Card sx={{ 
                    background: `linear-gradient(135deg, ${stats.netBalance >= 0 ? '#1B5E20' : '#B71C1C'} 0%, ${stats.netBalance >= 0 ? '#2E7D32' : '#D32F2F'} 100%)`,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 3,
                  }}>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <Wallet sx={{ fontSize: 48, color: '#fff', mb: 2 }} />
                      <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
                        Net Bakiye
                      </Typography>
                      {loading ? (
                        <CircularProgress size={32} sx={{ color: '#fff' }} />
                      ) : (
                        <>
                          <Typography 
                            variant="h3" 
                            sx={{ 
                              color: '#fff',
                              fontWeight: 800,
                              mb: 1
                            }}
                          >
                            {formatCurrency(stats.netBalance)}
                          </Typography>
                          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                            {stats.netBalance >= 0 ? '🎉 Pozitif bakiye' : '⚠️ Negatif bakiye'}
                          </Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              </Fade>

              {/* Security Settings */}
              <Fade in timeout={1400}>
                <Box>
                  <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 3 }}>
                    🔐 Güvenlik Ayarları
                  </Typography>
                  
                  <Stack spacing={2}>
                    {/* Password Change */}
                    <Card sx={{ 
                      background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 2,
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #F44336, #E53935)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                              }}
                            >
                              <Lock />
                            </Box>
                            <Box>
                              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                                Şifre Değiştir
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#bbb' }}>
                                Hesap güvenliğiniz için şifrenizi güncelleyin
                              </Typography>
                            </Box>
                          </Box>
                          <Button
                            variant="outlined"
                            onClick={() => setShowPasswordForm(!showPasswordForm)}
                            sx={{ 
                              borderColor: '#F44336', 
                              color: '#F44336',
                              '&:hover': { borderColor: '#D32F2F', bgcolor: 'rgba(244, 67, 54, 0.1)' }
                            }}
                          >
                            {showPasswordForm ? 'İptal' : 'Değiştir'}
                          </Button>
                        </Box>

                        {showPasswordForm && (
                          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <Stack spacing={3}>
                              <TextField
                                fullWidth
                                type={showCurrentPassword ? 'text' : 'password'}
                                label="Mevcut Şifre"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                variant="outlined"
                                InputProps={{
                                  endAdornment: (
                                    <IconButton
                                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                      edge="end"
                                      sx={{ color: '#bbb' }}
                                    >
                                      {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                  ),
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: '#fff',
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                    '&.Mui-focused fieldset': { borderColor: '#F44336' },
                                  },
                                  '& .MuiInputLabel-root': { color: '#bbb' },
                                }}
                              />
                              <TextField
                                fullWidth
                                type={showNewPassword ? 'text' : 'password'}
                                label="Yeni Şifre"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                variant="outlined"
                                InputProps={{
                                  endAdornment: (
                                    <IconButton
                                      onClick={() => setShowNewPassword(!showNewPassword)}
                                      edge="end"
                                      sx={{ color: '#bbb' }}
                                    >
                                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                  ),
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: '#fff',
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                    '&.Mui-focused fieldset': { borderColor: '#F44336' },
                                  },
                                  '& .MuiInputLabel-root': { color: '#bbb' },
                                }}
                              />
                              <TextField
                                fullWidth
                                type="password"
                                label="Yeni Şifre Tekrar"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: '#fff',
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                    '&.Mui-focused fieldset': { borderColor: '#F44336' },
                                  },
                                  '& .MuiInputLabel-root': { color: '#bbb' },
                                }}
                              />
                              <Button
                                fullWidth
                                variant="contained"
                                onClick={handleChangePassword}
                                disabled={securityLoading || !currentPassword || !newPassword || !confirmPassword}
                                startIcon={securityLoading ? <CircularProgress size={16} /> : <VpnKey />}
                                sx={{
                                  bgcolor: '#F44336',
                                  '&:hover': { bgcolor: '#D32F2F' },
                                  py: 1.5,
                                }}
                              >
                                {securityLoading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                              </Button>
                            </Stack>
                          </Box>
                        )}
                      </CardContent>
                    </Card>

                    {/* Email Change */}
                    <Card sx={{ 
                      background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 2,
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                              }}
                            >
                              <MailOutline />
                            </Box>
                            <Box>
                              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                                E-posta Değiştir
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#bbb' }}>
                                Mevcut: {currentUser?.email}
                              </Typography>
                            </Box>
                          </Box>
                          <Button
                            variant="outlined"
                            onClick={() => setShowEmailForm(!showEmailForm)}
                            sx={{ 
                              borderColor: '#2196F3', 
                              color: '#2196F3',
                              '&:hover': { borderColor: '#1976D2', bgcolor: 'rgba(33, 150, 243, 0.1)' }
                            }}
                          >
                            {showEmailForm ? 'İptal' : 'Değiştir'}
                          </Button>
                        </Box>

                        {showEmailForm && (
                          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                            <Stack spacing={3}>
                              <TextField
                                fullWidth
                                type="email"
                                label="Yeni E-posta Adresi"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                variant="outlined"
                                autoCapitalize="none"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: '#fff',
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                    '&.Mui-focused fieldset': { borderColor: '#2196F3' },
                                  },
                                  '& .MuiInputLabel-root': { color: '#bbb' },
                                }}
                              />
                              <TextField
                                fullWidth
                                type="password"
                                label="Şifre Onayı"
                                value={emailPassword}
                                onChange={(e) => setEmailPassword(e.target.value)}
                                variant="outlined"
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: '#fff',
                                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.5)' },
                                    '&.Mui-focused fieldset': { borderColor: '#2196F3' },
                                  },
                                  '& .MuiInputLabel-root': { color: '#bbb' },
                                }}
                              />
                              <Button
                                fullWidth
                                variant="contained"
                                onClick={handleChangeEmail}
                                disabled={securityLoading || !newEmail || !emailPassword}
                                startIcon={securityLoading ? <CircularProgress size={16} /> : <MailOutline />}
                                sx={{
                                  bgcolor: '#2196F3',
                                  '&:hover': { bgcolor: '#1976D2' },
                                  py: 1.5,
                                }}
                              >
                                {securityLoading ? 'Değiştiriliyor...' : 'E-posta Değiştir'}
                              </Button>
                            </Stack>
                          </Box>
                        )}
                      </CardContent>
                    </Card>

                    {/* Password Reset */}
                    <Card sx={{ 
                      background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 2,
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #FF9800, #F57C00)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                              }}
                            >
                              <VpnKey />
                            </Box>
                            <Box>
                              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                                Şifre Sıfırlama
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#bbb' }}>
                                E-posta ile şifre sıfırlama bağlantısı alın
                              </Typography>
                            </Box>
                          </Box>
                          <Button
                            variant="outlined"
                            onClick={handleSendPasswordReset}
                            disabled={securityLoading}
                            startIcon={securityLoading ? <CircularProgress size={16} /> : null}
                            sx={{ 
                              borderColor: '#FF9800', 
                              color: '#FF9800',
                              '&:hover': { borderColor: '#F57C00', bgcolor: 'rgba(255, 152, 0, 0.1)' }
                            }}
                          >
                            {securityLoading ? 'Gönderiliyor...' : 'Gönder'}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Stack>
                </Box>
              </Fade>

              {/* Achievements */}
              <Fade in timeout={1600}>
                <Box>
                  <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 3 }}>
                    🏆 Başarımlar
                  </Typography>
                  
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2
                  }}>
                    {achievements.map((achievement, index) => (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card sx={{ 
                          background: achievement.unlocked ? 
                            `linear-gradient(135deg, ${achievement.color}20, ${achievement.color}10)` : 
                            'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                          border: `1px solid ${achievement.unlocked ? achievement.color : 'rgba(255, 255, 255, 0.1)'}`,
                          borderRadius: 2,
                          opacity: achievement.unlocked ? 1 : 0.6,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            borderColor: achievement.color,
                          },
                        }}>
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 2,
                                  background: achievement.unlocked ? achievement.color : '#555',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#fff',
                                }}
                              >
                                {achievement.icon}
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                                  {achievement.title}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#bbb', fontSize: '0.75rem' }}>
                                  {achievement.description}
                                </Typography>
                              </Box>
                              {achievement.unlocked && (
                                <Verified sx={{ color: achievement.color, fontSize: 20 }} />
                              )}
                            </Box>
                            {achievement.progress !== undefined && !achievement.unlocked && (
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2" sx={{ color: '#777', fontSize: '0.7rem' }}>
                                    İlerleme
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: '#777', fontSize: '0.7rem' }}>
                                    {achievement.progress}/{achievement.id === 'transaction-master' ? 100 : 5}
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={(achievement.progress / (achievement.id === 'transaction-master' ? 100 : 5)) * 100}
                                  sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: achievement.color,
                                      borderRadius: 2,
                                    },
                                  }}
                                />
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </Box>
                </Box>
              </Fade>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Profile; 