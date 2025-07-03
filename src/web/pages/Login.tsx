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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { gradients, animations } from '../styles/theme';

interface LoginProps {
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Basit doğrulama
    if (!email.trim()) {
      setError('Lütfen e-posta adresinizi girin.');
      setLoading(false);
      return;
    }

    if (!password.trim()) {
      setError('Lütfen şifrenizi girin.');
      setLoading(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Geçerli bir e-posta adresi girin.');
      setLoading(false);
      return;
    }

    try {
      setSuccess('Giriş yapılıyor...');
      await login(email, password, rememberMe);
      setSuccess('Giriş başarılı! Yönlendiriliyorsunuz...');
    } catch (error: any) {
      console.error('Login error:', error);
      setSuccess('');
      if (error.code === 'auth/user-not-found') {
        setError('Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Yanlış şifre girdiniz.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Geçersiz e-posta adresi.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin.');
      } else if (error.code === 'auth/invalid-credential') {
        setError('E-posta veya şifre hatalı. Lütfen tekrar kontrol edin.');
      } else if (error.code === 'auth/user-disabled') {
        setError('Bu hesap devre dışı bırakılmış. Destek ekibi ile iletişime geçin.');
      } else {
        setError('Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
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
                  <rect width="120" height="120" rx="60" fill="url(#paint0_linear_2003_11)"/>
                  <path d="M35.2734 88.8281C33.979 88.8281 32.9297 87.7788 32.9297 86.4844C32.9297 85.19 33.979 84.1406 35.2734 84.1406H82.0312C83.3257 84.1406 84.375 85.19 84.375 86.4844C84.375 87.7788 83.3257 88.8281 82.0312 88.8281H35.2734Z" fill="#D9D9D9"/>
                  <rect x="37.5" y="29.1797" width="5.50781" height="56.9531" rx="2.75391" fill="#D9D9D9"/>
                  <rect x="45" y="12.1875" width="5.39062" height="73.9453" rx="2.69531" fill="#D9D9D9"/>
                  <rect x="52.3828" y="33.9844" width="5.39062" height="52.1484" rx="2.69531" fill="#D9D9D9"/>
                  <rect x="59.7656" y="42.0703" width="5.39062" height="44.0625" rx="2.69531" fill="#D9D9D9"/>
                  <rect x="67.2656" y="58.4766" width="5.39062" height="27.6562" rx="2.69531" fill="#D9D9D9"/>
                  <rect x="74.6484" y="37.5" width="5.39062" height="48.6328" rx="2.69531" fill="#D9D9D9"/>
                  <defs>
                    <linearGradient id="paint0_linear_2003_11" x1="-1.23047" y1="54.8437" x2="120" y2="53.7305" gradientUnits="userSpaceOnUse">
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
                Hesabınıza giriş yapın
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

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="E-posta"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ mb: 2 }}
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

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    color="primary"
                  />
                }
                label="Beni hatırla"
                sx={{ mb: 3 }}
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
                startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
              >
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </Button>

              {/* Register Link */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Hesabınız yok mu?{' '}
                  <Link
                    component="button"
                    type="button"
                    onClick={onSwitchToRegister}
                    sx={{
                      color: 'primary.main',
                      textDecoration: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Kayıt olun
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

export default Login; 