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
  Grid,
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
import PrivacyPolicyContent from '../components/PrivacyPolicyContent';

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
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false);
  
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
      setAlert({ type: 'error', message: 'Bu işlem için giriş yapmanız gerekir.' });
      return;
    }

    setDeletingAccount(true);
    try {
      // Önce kullanıcı verilerini sil
      await UserService.deleteUserData(currentUser.uid);
      // Sonra kullanıcıyı sil
      await UserService.deleteUserAccount();
      
      setDeleteDialogOpen(false);
      // Kullanıcı arayüzünden çıkış yapıldığını yansıt
    } catch (error: any) {
      console.error("Hesap silinirken hata oluştu:", error);
      setAlert({ type: 'error', message: error.message || 'Hesap silinirken bir hata oluştu. Lütfen tekrar deneyin.' });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleOpenPrivacyPolicy = () => {
    setPrivacyPolicyOpen(true);
  };

  const handleClosePrivacyPolicy = () => {
    setPrivacyPolicyOpen(false);
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
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRadius: 4,
          boxShadow: '0 8px 16px 0 rgba(0,0,0,0.1)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px 0 rgba(0,0,0,0.15)',
          },
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 1500 }}>
        {alert && (
          <Fade in>
            <Alert severity={alert.type} onClose={() => setAlert(null)}>
              {alert.message}
            </Alert>
          </Fade>
        )}
      </Box>
      
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#fff' }}>
        Ayarlar
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={6} lg={4}>
          <SettingCard
            icon={<AccountCircle />}
            title="Profil"
            description="Kişisel bilgilerinizi ve tercihlerinizi yönetin."
            color="#03A9F4"
            action={
              <Button 
                variant="outlined" 
                size="small"
                onClick={onNavigateToProfile}
                sx={{ borderColor: '#03A9F4', color: '#03A9F4' }}
              >
                Profili Görüntüle
              </Button>
            }
          />
        </Grid>

        {/* Security Card */}
        <Grid item xs={12} md={6} lg={4}>
          <SettingCard
            icon={<Shield />}
            title="Güvenlik"
            description="Şifre, e-posta ve iki adımlı doğrulamayı yönetin."
            color="#FFC107"
            action={
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => setShowSecurityDialog(true)}
                sx={{ borderColor: '#FFC107', color: '#FFC107' }}
              >
                Güvenlik Ayarları
              </Button>
            }
          />
        </Grid>

        {/* Theme Card */}
        <Grid item xs={12} md={6} lg={4}>
          <SettingCard
            icon={<Palette />}
            title="Görünüm"
            description="Uygulama temasını ve renk şemasını değiştirin."
            color="#E91E63"
            action={
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => window.alert('Tema özellikleri yakında gelecek')}
                sx={{ borderColor: '#E91E63', color: '#E91E63' }}
              >
                Temayı Değiştir
              </Button>
            }
          />
        </Grid>
        
        {/* Data & Export Card */}
        <Grid item xs={12} md={6} lg={4}>
          <SettingCard
            icon={<Backup />}
            title="Veri ve Yedekleme"
            description="Verilerinizi dışa aktarın veya içe aktarın."
            color="#4CAF50"
            action={
              <Button 
                variant="outlined" 
                size="small"
                onClick={handleExportData}
                disabled={exportingData}
                startIcon={exportingData ? <CircularProgress size={16} /> : <CloudDownload />}
                sx={{ borderColor: '#4CAF50', color: '#4CAF50' }}
              >
                Verileri Dışa Aktar
              </Button>
            }
          />
        </Grid>

         {/* Help & Support Card */}
        <Grid item xs={12} md={6} lg={4}>
          <SettingCard
            icon={<Support />}
            title="Yardım ve Destek"
            description="Yardım merkezi, SSS ve bize ulaşın."
            color="#9C27B0"
            action={
              <Button 
                variant="outlined" 
                size="small"
                onClick={onNavigateToHelp}
                sx={{ borderColor: '#9C27B0', color: '#9C27B0' }}
              >
                Yardım Merkezi
              </Button>
            }
          />
        </Grid>
        
        {/* Privacy Policy Card */}
        <Grid item xs={12} md={6} lg={4}>
          <SettingCard
            icon={<Policy />}
            title="Gizlilik Politikası"
            description="Verilerinizin nasıl kullanıldığını ve korunduğunu öğrenin."
            color="#673AB7"
            action={
              <Button 
                variant="outlined" 
                size="small"
                onClick={handleOpenPrivacyPolicy}
                sx={{ borderColor: '#673AB7', color: '#673AB7' }}
              >
                Politikayı Oku
              </Button>
            }
          />
        </Grid>
      </Grid>
      
      <Divider sx={{ my: 4, borderColor: 'rgba(255, 255, 255, 0.2)' }} />

      <Stack spacing={2} alignItems="center">
        <Button 
          color="error"
          variant="contained"
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
          startIcon={deletingAccount ? <CircularProgress size={20} /> : <DeleteSweep />}
          sx={{ minWidth: 200 }}
        >
          Hesabımı Sil
        </Button>
        <Button 
          variant="outlined"
          onClick={handleLogout}
          startIcon={<ExitToApp />}
          sx={{ minWidth: 200, color: '#fff', borderColor: '#fff' }}
        >
          Çıkış Yap
        </Button>
      </Stack>


      {/* Security Dialog */}
      <Dialog 
        open={showSecurityDialog} 
        onClose={() => setShowSecurityDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#2a2a2a', color: '#fff' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #444' }}>
          <Shield sx={{ mr: 1 }} /> Güvenlik Ayarları
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={() => setSecurityAction('password')}
              startIcon={<Lock />}
              sx={{ color: '#fff', borderColor: '#555' }}
            >
              Şifre Değiştir
            </Button>
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={() => setSecurityAction('email')}
              startIcon={<MailOutline />}
              sx={{ color: '#fff', borderColor: '#555' }}
            >
              E-posta Değiştir
            </Button>
             <Button 
              fullWidth 
              variant="outlined" 
              onClick={handleSendPasswordReset}
              startIcon={<VpnKey />}
              disabled={securityLoading}
              sx={{ color: '#fff', borderColor: '#555' }}
            >
              {securityLoading ? 'Gönderiliyor...' : 'Şifre Sıfırlama E-postası Gönder'}
            </Button>
          </Stack>

          {securityAction === 'password' && (
            <Box component="form" sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Şifre Değiştirme</Typography>
              <TextField
                label="Mevcut Şifre"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                margin="normal"
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end" sx={{ color: '#fff' }}>
                      {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
              <TextField
                label="Yeni Şifre"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                margin="normal"
                 InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end" sx={{ color: '#fff' }}>
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  ),
                }}
              />
              <TextField
                label="Yeni Şifre Tekrar"
                type={showNewPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                margin="normal"
              />
              <Button 
                onClick={handleChangePassword} 
                variant="contained" 
                fullWidth 
                sx={{ mt: 2 }}
                disabled={securityLoading}
              >
                {securityLoading ? <CircularProgress size={24} /> : 'Şifreyi Kaydet'}
              </Button>
            </Box>
          )}

          {securityAction === 'email' && (
            <Box component="form" sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>E-posta Değiştirme</Typography>
               <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Güvenliğiniz için, e-posta adresinizi değiştirmek için mevcut şifrenizi girmeniz gerekmektedir.
              </Typography>
              <TextField
                label="Yeni E-posta"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Mevcut Şifre"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                fullWidth
                margin="normal"
              />
              <Button 
                onClick={handleChangeEmail} 
                variant="contained" 
                fullWidth 
                sx={{ mt: 2 }}
                disabled={securityLoading}
              >
                {securityLoading ? <CircularProgress size={24} /> : 'E-postayı Kaydet'}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #444', px: 3, py: 2 }}>
          <Button onClick={() => {
            setShowSecurityDialog(false);
            setSecurityAction(null);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setNewEmail('');
            setEmailPassword('');
          }}
          sx={{ color: '#fff' }}
          >Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        PaperProps={{ sx: { bgcolor: '#2a2a2a', color: '#fff' } }}
      >
        <DialogTitle>Çıkış Yap</DialogTitle>
        <DialogContent>
          <Typography>Çıkış yapmak istediğinizden emin misiniz?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)} sx={{ color: '#fff' }}>İptal</Button>
          <Button onClick={confirmLogout} color="primary">
            Çıkış Yap
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { bgcolor: '#2a2a2a', color: '#fff' } }}
      >
        <DialogTitle>Hesabı Sil</DialogTitle>
        <DialogContent>
          <Typography>
            Hesabınızı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinecektir.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#fff' }}>İptal</Button>
          <Button onClick={confirmDeleteAccount} color="error" disabled={deletingAccount}>
            {deletingAccount ? <CircularProgress size={24} /> : 'Hesabı Sil'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={privacyPolicyOpen} onClose={handleClosePrivacyPolicy} maxWidth="md" fullWidth>
        <DialogTitle>Gizlilik Politikası</DialogTitle>
        <DialogContent dividers>
          <PrivacyPolicyContent />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePrivacyPolicy}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings; 