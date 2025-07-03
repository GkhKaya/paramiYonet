import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Person,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  PersonAdd,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { gradients, animations } from '../styles/theme';
import { validatePassword, validatePasswordConfirm, PASSWORD_RULES } from '../../utils/validation';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { register } = useAuth();

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const validateForm = () => {
    if (!formData.displayName.trim()) {
      setError('Lütfen adınızı soyadınızı girin.');
      return false;
    }
    
    if (formData.displayName.trim().length < 2) {
      setError('Ad soyad en az 2 karakter olmalıdır.');
      return false;
    }
    
    if (!formData.email.trim()) {
      setError('Lütfen e-posta adresinizi girin.');
      return false;
    }
    
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Geçerli bir e-posta adresi girin.');
      return false;
    }
    
    if (!formData.password.trim()) {
      setError('Lütfen bir şifre girin.');
      return false;
    }
    
    if (!formData.confirmPassword.trim()) {
      setError('Lütfen şifre tekrarını girin.');
      return false;
    }
    
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(' '));
      return false;
    }
    
    const confirmValidation = validatePasswordConfirm(formData.password, formData.confirmPassword);
    if (!confirmValidation.isValid) {
      setError(confirmValidation.message || 'Şifreler eşleşmiyor.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      setSuccess('Hesap oluşturuluyor...');
      await register(formData.email, formData.password, formData.displayName);
      setSuccess('Hesap başarıyla oluşturuldu! Yönlendiriliyorsunuz...');
    } catch (error: any) {
      console.error('Registration error:', error);
      setSuccess('');
      if (error.code === 'auth/email-already-in-use') {
        setError('Bu e-posta adresi zaten kullanılıyor.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Geçersiz e-posta adresi.');
      } else if (error.code === 'auth/weak-password') {
        setError('Şifre çok zayıf. Lütfen daha güçlü bir şifre seçin.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('E-posta ile kayıt işlemi şu anda kullanılamıyor.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.');
      } else {
        setError('Kayıt olurken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: gradients.primary,
        p: 2,
      }}
    >
      <motion.div {...animations.scaleIn}>
        <Card
          sx={{
            maxWidth: 400,
            width: '100%',
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Logo and Title */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: 3,
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="60" height="60" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" rx="60" fill="url(#paint0_linear_2003_12)"/>
                  <path d="M35.2734 88.8281C33.979 88.8281 32.9297 87.7788 32.9297 86.4844C32.9297 85.19 33.979 84.1406 35.2734 84.1406H82.0312C83.3257 84.1406 84.375 85.19 84.375 86.4844C84.375 87.7788 83.3257 88.8281 82.0312 88.8281H35.2734Z" fill="#D9D9D9"/>
                  <rect x="37.5" y="29.1797" width="5.50781" height="56.9531" rx="2.75391" fill="#D9D9D9"/>
                  <rect x="45" y="12.1875" width="5.39062" height="73.9453" rx="2.69531" fill="#D9D9D9"/>
                  <rect x="52.3828" y="33.9844" width="5.39062" height="52.1484" rx="2.69531" fill="#D9D9D9"/>
                  <rect x="59.7656" y="42.0703" width="5.39062" height="44.0625" rx="2.69531" fill="#D9D9D9"/>
                  <rect x="67.2656" y="58.4766" width="5.39062" height="27.6562" rx="2.69531" fill="#D9D9D9"/>
                  <rect x="74.6484" y="37.5" width="5.39062" height="48.6328" rx="2.69531" fill="#D9D9D9"/>
                  <defs>
                    <linearGradient id="paint0_linear_2003_12" x1="-1.23047" y1="54.8437" x2="120" y2="53.7305" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#0575E6"/>
                      <stop offset="1" stopColor="#021B79"/>
                    </linearGradient>
                  </defs>
                </svg>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                ParamıYönet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Yeni hesap oluşturun
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}

            {/* Register Form */}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Ad Soyad"
                value={formData.displayName}
                onChange={handleChange('displayName')}
                required
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="E-posta"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                required
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Şifre"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                required
                sx={{ mb: 1 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Şifre kuralları */}
              <Box sx={{ mb: 2, ml: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Şifre Kuralları:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#aaa', fontSize: 13 }}>
                  <li>En az {PASSWORD_RULES.minLength} karakter</li>
                  <li>En az bir büyük harf</li>
                  <li>En az bir küçük harf</li>
                  <li>En az bir sayı</li>
                  <li>En az bir özel karakter ({PASSWORD_RULES.specialChars})</li>
                </ul>
              </Box>

              <TextField
                fullWidth
                label="Şifre Tekrar"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                required
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mb: 3,
                  background: gradients.secondary,
                  py: 1.5,
                  '&:hover': {
                    background: gradients.secondary,
                    opacity: 0.9,
                  },
                }}
                startIcon={loading ? <CircularProgress size={20} /> : <PersonAdd />}
              >
                {loading ? 'Kayıt oluşturuluyor...' : 'Kayıt Ol'}
              </Button>

              {/* Login Link */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Zaten hesabınız var mı?{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={onSwitchToLogin}
                    sx={{
                      color: 'primary.main',
                      textDecoration: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Giriş yapın
                  </Link>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  );
};

export default Register; 