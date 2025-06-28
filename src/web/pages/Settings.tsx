import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Stack,
  Fade,
  Badge,
  TextField,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Person,
  Security,
  Category,
  Download,
  Delete,
  Info,
  HelpOutline,
  Policy,
  ExitToApp,
  Settings as SettingsIcon,
  AdminPanelSettings,
  CloudDownload,
  DeleteSweep,
  Support,
  Brightness4,
  Notifications,
  Language,
  Backup,
  AccountCircle,
  Shield,
  Palette,
  Lock,
  VpnKey,
  MailOutline,
  VisibilityOff,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { TransactionService } from '../../services/TransactionService';
import { Transaction } from '../../models/Transaction';
import UserService from '../../services/UserService';
import { SecurityService } from '../../services/FirebaseService';

interface SettingsProps {
  onNavigateToProfile?: () => void;
  onNavigateToCategories?: () => void;
  onNavigateToHelp?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onNavigateToProfile, onNavigateToCategories, onNavigateToHelp }) => {
  const { currentUser, logout } = useAuth();
  const [exportingData, setExportingData] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  // Security states
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [securityAction, setSecurityAction] = useState<'password' | 'email' | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Alert göründüğünde otomatik kapatma
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Security functions
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
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowSecurityDialog(false);
      
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setAlert({ type: 'error', message: 'Geçerli bir e-posta adresi girin' });
      return;
    }

    setSecurityLoading(true);
    try {
      await SecurityService.changeEmail(newEmail, emailPassword);
      
      setNewEmail('');
      setEmailPassword('');
      setShowSecurityDialog(false);
      
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
      setAlert({ type: 'error', message: error.message || 'E-posta gönderilemedi' });
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleExportData = async () => {
    if (!currentUser) {
      setAlert({ type: 'error', message: 'Bu özellik için giriş yapmanız gerekir.' });
      return;
    }

    setExportingData(true);
    try {
      const transactions = await TransactionService.getUserTransactions(currentUser.uid);

      if (transactions.length === 0) {
        setAlert({ type: 'error', message: 'Dışa aktarılacak herhangi bir işlem bulunamadı.' });
        setExportingData(false);
        return;
      }

      const jsonData = {
        userInfo: {
          userId: currentUser.uid,
          email: currentUser.email,
        },
        exportDate: new Date().toISOString(),
        transactions: transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          category: t.category,
          categoryIcon: t.categoryIcon,
          accountId: t.accountId,
          date: t.date instanceof Date ? t.date.toISOString() : String(t.date),
          createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
          updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : String(t.updatedAt),
        })),
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `parami_yonet_veriler_${currentUser.uid}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setAlert({ type: 'success', message: 'Verileriniz başarıyla JSON dosyası olarak indirildi.' });
    } catch (error) {
      console.error('Error exporting data:', error);
              setAlert({ type: 'error', message: 'Veriler dışa aktarılırken bir hata oluştu.' });
    } finally {
      setExportingData(false);
    }
  };

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
      setLogoutDialogOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
      window.alert('Çıkış yapılırken bir hata oluştu.');
    }
  };

  const handleDeleteAccount = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (!currentUser) {
      window.alert('Kullanıcı bulunamadı');
      return;
    }

    setDeletingAccount(true);
    try {
      await UserService.deleteUserAccount(currentUser.uid);
      setDeleteDialogOpen(false);
      // Hesap silindiğinde kullanıcı otomatik olarak logout olacak
    } catch (error: any) {
      console.error('Error deleting account:', error);
      
      // Firebase hatalarını kullanıcı dostu mesajlara çevir
      let errorMessage = 'Hesap silinirken bir hata oluştu.';
      
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Güvenlik nedeniyle, hesabınızı silmek için yeniden giriş yapmanız gerekiyor.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
      }
      
      window.alert(errorMessage);
    } finally {
      setDeletingAccount(false);
    }
  };

  const SettingCard = ({
    icon,
    title,
    description,
    action,
    color = '#2196F3',
    disabled = false,
    loading = false,
  }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
    color?: string;
    disabled?: boolean;
    loading?: boolean;
  }) => (
    <Fade in timeout={600}>
      <Card
        sx={{
          background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          transition: 'all 0.3s ease',
          cursor: action ? 'pointer' : 'default',
          '&:hover': action && !disabled ? {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 32px rgba(${color === '#F44336' ? '244, 67, 54' : '33, 150, 243'}, 0.3)`,
            borderColor: color,
          } : {},
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={3} alignItems="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${color}20, ${color}40)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <Box sx={{ color, fontSize: 28 }}>
                {icon}
              </Box>
              {loading && (
                <CircularProgress
                  size={60}
                  sx={{
                    color,
                    position: 'absolute',
                    top: -2,
                    left: -2,
                  }}
                />
              )}
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }}>
                {title}
              </Typography>
              <Typography variant="body2" sx={{ color: '#bbb', lineHeight: 1.5 }}>
                {description}
              </Typography>
            </Box>
            
            {action && (
              <Box>
                {action}
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Fade>
  );

  return (
    <Box 
      sx={{ 
        height: '100vh',
        overflow: 'auto',
        p: 3,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(255, 255, 255, 0.05)',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.3)',
          },
        },
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {/* Modern Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
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
            <SettingsIcon sx={{ fontSize: 40, color: '#fff' }} />
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', mb: 2 }}>
            Ayarlar & Tercihler
          </Typography>
          <Typography variant="h6" sx={{ color: '#bbb', maxWidth: 600, mx: 'auto' }}>
            Hesabınızı, güvenlik ayarlarınızı ve uygulama tercihlerinizi buradan yönetin
          </Typography>
        </Box>

        {/* User Profile Card */}
        <Box sx={{ mb: 6 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #1a237e 0%, #303f9f 100%)',
              border: '1px solid rgba(63, 81, 181, 0.3)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  badgeContent={
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: '#4CAF50',
                        border: '3px solid #1a237e',
                      }}
                    />
                  }
                >
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      bgcolor: '#fff',
                      color: '#1a237e',
                      fontSize: 32,
                      fontWeight: 700,
                    }}
                  >
                    {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                </Badge>
                
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
                    Hoşgeldiniz!
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
                    {currentUser?.email}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Chip label="Aktif Kullanıcı" size="small" sx={{ bgcolor: '#4CAF50', color: '#fff' }} />
                    <Chip label="Web Sürümü" size="small" sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: '#fff' }} />
                  </Stack>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Settings Cards */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, mb: 6 }}>
          {/* Account Settings */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 3 }}>
              🔐 Hesap & Güvenlik
            </Typography>
            <Stack spacing={3}>
              <SettingCard
                icon={<AccountCircle />}
                title="Profil Yönetimi"
                description="Kişisel bilgilerinizi düzenleyin ve güncelleyin"
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onNavigateToProfile ? onNavigateToProfile() : window.alert('Profil düzenleme yakında gelecek')}
                    sx={{ borderColor: '#2196F3', color: '#2196F3' }}
                  >
                    Düzenle
                  </Button>
                }
              />
              
              <SettingCard
                icon={<Shield />}
                title="Güvenlik Ayarları"
                description="Şifre değiştirme ve iki faktörlü doğrulama"
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                  setSecurityAction(null);
                  setShowSecurityDialog(true);
                }}
                    sx={{ borderColor: '#4CAF50', color: '#4CAF50' }}
                  >
                    Yapılandır
                  </Button>
                }
                color="#4CAF50"
              />
              
              <SettingCard
                icon={<Palette />}
                title="Kategori Yönetimi"
                description="Özel harcama ve gelir kategorilerinizi düzenleyin"
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onNavigateToCategories ? onNavigateToCategories() : window.alert('Kategori yönetimi yakında gelecek')}
                    sx={{ borderColor: '#FF9800', color: '#FF9800' }}
                  >
                    Yönet
                  </Button>
                }
                color="#FF9800"
              />
            </Stack>
          </Box>

          {/* Data & System */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 3 }}>
              💾 Veri & Sistem
            </Typography>
            <Stack spacing={3}>
              <SettingCard
                icon={<CloudDownload />}
                title="Veri Dışa Aktarma"
                description="Tüm finansal verilerinizi JSON formatında indirin"
                action={
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleExportData}
                    disabled={exportingData}
                    sx={{ 
                      bgcolor: '#2196F3',
                      '&:hover': { bgcolor: '#1976D2' }
                    }}
                  >
                    {exportingData ? 'İndiriliyor...' : 'İndir'}
                  </Button>
                }
                loading={exportingData}
              />
              
              <SettingCard
                icon={<Backup />}
                title="Yedekleme & Geri Yükleme"
                description="Verilerinizi bulut üzerinde güvenle saklayın"
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => window.alert('Yedekleme özelliği yakında gelecek')}
                    sx={{ borderColor: '#9C27B0', color: '#9C27B0' }}
                  >
                    Yedekle
                  </Button>
                }
                color="#9C27B0"
              />
              
              <SettingCard
                icon={<DeleteSweep />}
                title="Hesap Silme"
                description="Hesabınızı ve tüm verilerinizi kalıcı olarak silin"
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleDeleteAccount}
                    sx={{ borderColor: '#F44336', color: '#F44336' }}
                  >
                    Sil
                  </Button>
                }
                color="#F44336"
              />
            </Stack>
          </Box>
        </Box>

        {/* Support & Info Cards */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 3 }}>
            ℹ️ Destek & Bilgi
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3 
          }}>
            <SettingCard
              icon={<Info />}
              title="Uygulama Sürümü"
              description="ParamıYönet Web v1.0.0"
              action={
                <Chip 
                  label="Güncel" 
                  size="small" 
                  sx={{ bgcolor: '#4CAF50', color: '#fff' }} 
                />
              }
              color="#4CAF50"
            />
            
            <SettingCard
              icon={<Support />}
              title="Yardım & Destek"
              description="SSS, rehberler ve teknik destek"
              action={
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onNavigateToHelp ? onNavigateToHelp() : window.alert('Destek sayfası yakında gelecek')}
                  sx={{ borderColor: '#00BCD4', color: '#00BCD4' }}
                >
                  Destek
                </Button>
              }
              color="#00BCD4"
            />
            
            <SettingCard
              icon={<Policy />}
              title="Gizlilik Politikası"
              description="Veri kullanımı ve gizlilik şartları"
              action={
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => window.alert('Gizlilik politikası yakında gelecek')}
                  sx={{ borderColor: '#673AB7', color: '#673AB7' }}
                >
                  Oku
                </Button>
              }
              color="#673AB7"
            />
          </Box>
        </Box>

        {/* Logout Section */}
        <Box sx={{ textAlign: 'center' }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #d32f2f 0%, #f44336 100%)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              borderRadius: 3,
              maxWidth: 400,
              mx: 'auto',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <ExitToApp sx={{ fontSize: 48, color: '#fff', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
                Güvenli Çıkış
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 3 }}>
                Hesabınızdan güvenle çıkış yapın
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={handleLogout}
                sx={{
                  bgcolor: '#fff',
                  color: '#d32f2f',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.9)',
                  },
                }}
              >
                Çıkış Yap
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', py: 6, mt: 6 }}>
          <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
            Made with ❤️ by Devosuit © 2025 All rights reserved.
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="center">
            <Chip label="Modern Web" size="small" sx={{ bgcolor: '#2196F3', color: '#fff' }} />
            <Chip label="Firebase" size="small" sx={{ bgcolor: '#FF9800', color: '#fff' }} />
            <Chip label="React" size="small" sx={{ bgcolor: '#61DAFB', color: '#000' }} />
          </Stack>
        </Box>

        {/* Alert */}
        {alert && (
          <Fade in>
            <Alert 
              severity={alert.type} 
              onClose={() => setAlert(null)}
              sx={{ 
                position: 'fixed',
                top: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                width: { xs: '90%', sm: '600px' },
                maxWidth: '90vw',
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
      </Box>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: 3,
            minWidth: 400,
          },
        }}
      >
        <DialogTitle sx={{ color: '#fff', textAlign: 'center', pt: 3 }}>
          <ExitToApp sx={{ fontSize: 48, color: '#F44336', mb: 2, display: 'block', mx: 'auto' }} />
          Çıkış Yap
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', px: 4 }}>
          <Typography sx={{ color: '#bbb', mb: 2 }}>
            Hesabınızdan çıkış yapmak istediğinizden emin misiniz?
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Tüm verileriniz güvenli bir şekilde saklanacaktır.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, justifyContent: 'center', gap: 2 }}>
          <Button
            onClick={() => setLogoutDialogOpen(false)}
            variant="outlined"
            sx={{ borderColor: '#666', color: '#bbb', minWidth: 100 }}
          >
            İptal
          </Button>
          <Button
            onClick={confirmLogout}
            variant="contained"
            sx={{ 
              bgcolor: '#F44336',
              minWidth: 100,
              '&:hover': { bgcolor: '#D32F2F' }
            }}
          >
            Çıkış Yap
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: 3,
            minWidth: 500,
          },
        }}
      >
        <DialogTitle sx={{ color: '#fff', textAlign: 'center', pt: 3 }}>
          <DeleteSweep sx={{ fontSize: 48, color: '#F44336', mb: 2, display: 'block', mx: 'auto' }} />
          Hesap Silme
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', px: 4 }}>
          <Typography sx={{ color: '#bbb', mb: 2, fontWeight: 600 }}>
            Bu işlem geri alınamaz!
          </Typography>
          <Typography sx={{ color: '#bbb', mb: 3 }}>
            Hesabınız ve tüm verileriniz (işlemler, hesaplar, kategoriler, bütçeler) kalıcı olarak silinecek.
          </Typography>
          <Alert 
            severity="error" 
            sx={{ 
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              color: '#F44336',
              mb: 2
            }}
          >
            Bu işlem geri alınamaz ve tüm verileriniz kaybolacak!
          </Alert>
          {deletingAccount && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 2 }}>
              <CircularProgress size={20} sx={{ color: '#F44336' }} />
              <Typography sx={{ color: '#bbb' }}>
                Hesap siliniyor...
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, justifyContent: 'center', gap: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            disabled={deletingAccount}
            sx={{ borderColor: '#666', color: '#bbb', minWidth: 100 }}
          >
            İptal
          </Button>
          <Button
            onClick={confirmDeleteAccount}
            variant="contained"
            disabled={deletingAccount}
            startIcon={deletingAccount ? <CircularProgress size={16} color="inherit" /> : <Delete />}
            sx={{ 
              bgcolor: '#F44336',
              minWidth: 130,
              '&:hover': { bgcolor: '#D32F2F' },
              '&:disabled': { bgcolor: '#666', color: '#bbb' }
            }}
          >
            {deletingAccount ? 'Siliniyor...' : 'Hesabı Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Security Settings Dialog */}
      <Dialog
        open={showSecurityDialog}
        onClose={() => setShowSecurityDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ color: '#fff', textAlign: 'center', pt: 3 }}>
          <Shield sx={{ fontSize: 48, color: '#4CAF50', mb: 2, display: 'block', mx: 'auto' }} />
          Güvenlik Ayarları
        </DialogTitle>
        <DialogContent sx={{ px: 4, pb: 2 }}>
          <Stack spacing={3}>
            {/* Action Selection */}
            {!securityAction && (
              <Box>
                <Typography sx={{ color: '#bbb', mb: 3, textAlign: 'center' }}>
                  Hangi güvenlik işlemini yapmak istiyorsunuz?
                </Typography>
                <Stack spacing={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Lock />}
                    onClick={() => setSecurityAction('password')}
                    sx={{ 
                      borderColor: '#F44336', 
                      color: '#F44336',
                      py: 1.5,
                      '&:hover': { borderColor: '#D32F2F', bgcolor: 'rgba(244, 67, 54, 0.1)' }
                    }}
                  >
                    Şifre Değiştir
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<MailOutline />}
                    onClick={() => setSecurityAction('email')}
                    sx={{ 
                      borderColor: '#2196F3', 
                      color: '#2196F3',
                      py: 1.5,
                      '&:hover': { borderColor: '#1976D2', bgcolor: 'rgba(33, 150, 243, 0.1)' }
                    }}
                  >
                    E-posta Değiştir
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<VpnKey />}
                    onClick={handleSendPasswordReset}
                    disabled={securityLoading}
                    sx={{ 
                      borderColor: '#FF9800', 
                      color: '#FF9800',
                      py: 1.5,
                      '&:hover': { borderColor: '#F57C00', bgcolor: 'rgba(255, 152, 0, 0.1)' }
                    }}
                  >
                    {securityLoading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Gönder'}
                  </Button>
                  
                  <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                  
                  <Box sx={{ p: 2, bgcolor: 'rgba(255, 152, 0, 0.1)', borderRadius: 2, border: '1px solid rgba(255, 152, 0, 0.3)' }}>
                    <Typography variant="body2" sx={{ color: '#FF9800', textAlign: 'center', fontWeight: 600 }}>
                      🔒 İki Faktörlü Doğrulama
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#bbb', textAlign: 'center', mt: 1 }}>
                      Çok yakında eklenecek...
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            )}

            {/* Password Change Form */}
            {securityAction === 'password' && (
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', mb: 3, textAlign: 'center' }}>
                  <Lock sx={{ verticalAlign: 'middle', mr: 1, color: '#F44336' }} />
                  Şifre Değiştir
                </Typography>
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
                </Stack>
              </Box>
            )}

            {/* Email Change Form */}
            {securityAction === 'email' && (
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', mb: 3, textAlign: 'center' }}>
                  <MailOutline sx={{ verticalAlign: 'middle', mr: 1, color: '#2196F3' }} />
                  E-posta Değiştir
                </Typography>
                <Typography variant="body2" sx={{ color: '#bbb', mb: 3, textAlign: 'center' }}>
                  Mevcut: {currentUser?.email}
                </Typography>
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
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, justifyContent: 'center', gap: 2 }}>
          {securityAction ? (
            <>
              <Button
                onClick={() => {
                  setSecurityAction(null);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setNewEmail('');
                  setEmailPassword('');
                }}
                variant="outlined"
                sx={{ borderColor: '#666', color: '#bbb', minWidth: 100 }}
              >
                Geri
              </Button>
              <Button
                onClick={securityAction === 'password' ? handleChangePassword : handleChangeEmail}
                variant="contained"
                disabled={securityLoading}
                startIcon={securityLoading ? <CircularProgress size={16} /> : null}
                sx={{ 
                  bgcolor: securityAction === 'password' ? '#F44336' : '#2196F3',
                  minWidth: 120,
                  '&:hover': { 
                    bgcolor: securityAction === 'password' ? '#D32F2F' : '#1976D2' 
                  }
                }}
              >
                {securityLoading ? 'İşleniyor...' : (securityAction === 'password' ? 'Şifreyi Değiştir' : 'E-posta Değiştir')}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setShowSecurityDialog(false)}
              variant="outlined"
              sx={{ borderColor: '#666', color: '#bbb', minWidth: 100 }}
            >
              Kapat
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings; 