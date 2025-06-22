import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Paper,
  Chip,
  IconButton,
  Avatar,
  Divider,
  Link,
  Alert,
  Container,
  Fade,
  Slide,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ExpandMore,
  HelpOutline,
  Email,
  LinkedIn,
  GitHub,
  Language,
  Business,
  QuestionAnswer,
  ContactSupport,
  Person,
  Info,
  Lightbulb,
  Security,
  AccountBalance,
  Assessment,
  Add,
  AttachMoney,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const devInfo = {
  name: 'Gökhan Kaya',
  linkedin: 'https://www.linkedin.com/in/gkhkaya/',
  github: 'https://github.com/gkhkaya',
  website: 'https://gkhkaya.info',
  devosuit: 'https://devosuit.com',
};

const faqData = [
  {
    id: '1',
    question: 'Uygulamaya nasıl yeni bir işlem ekleyebilirim?',
    answer: 'Ana ekrandaki (Dashboard) "Hızlı İşlemler" bölümünden "Gelir Ekle" veya "Gider Ekle" butonlarını kullanabilir veya navigasyon menüsündeki "Ekle" seçeneğine giderek yeni işlem oluşturabilirsiniz. Gerekli alanları (tutar, açıklama, kategori, hesap, tarih) doldurduktan sonra "Kaydet" butonuna tıklamanız yeterlidir.',
    category: 'Kullanım',
    icon: <Add />,
  },
  {
    id: '2',
    question: 'Hesap bakiyem neden güncel değil?',
    answer: 'Hesap bakiyeleri, eklediğiniz işlemler baz alınarak otomatik olarak güncellenir. Eğer bir tutarsızlık fark ederseniz, internet bağlantınızı kontrol edin ve uygulamayı yenileyin. Bazı durumlarda, çok sayıda işlem yapıldıysa veya anlık bir senkronizasyon sorunu yaşandıysa kısa süreli gecikmeler olabilir.',
    category: 'Hesap',
    icon: <AccountBalance />,
  },
  {
    id: '3',
    question: 'Raporlar bölümünde neler bulabilirim?',
    answer: 'Raporlar bölümü, mali durumunuz hakkında detaylı analizler sunar. Haftalık ve aylık gelir-gider özetlerinizi, kategori bazlı harcamalarınızı ve gelir dağılımınızı grafiksel olarak görebilirsiniz. Bu sayede harcama alışkanlıklarınızı daha iyi anlayabilir ve bütçenizi daha etkin yönetebilirsiniz.',
    category: 'Raporlar',
    icon: <Assessment />,
  },
  {
    id: '4',
    question: 'Verilerim güvende mi?',
    answer: 'Evet, verileriniz Firebase platformunda güvenli bir şekilde saklanmaktadır. Firebase, Google tarafından sunulan güçlü güvenlik altyapılarına sahiptir. Kişisel verilerinizin gizliliğine ve güvenliğine büyük önem veriyoruz.',
    category: 'Güvenlik',
    icon: <Security />,
  },
  {
    id: '5',
    question: 'Uygulamayı farklı para birimlerinde kullanabilir miyim?',
    answer: 'Şu an için uygulama varsayılan olarak Türk Lirası (TRY) para birimini desteklemektedir. Gelecek güncellemelerde farklı para birimi seçenekleri eklemeyi planlıyoruz.',
    category: 'Para Birimi',
    icon: <AttachMoney />,
  },
  {
    id: '6',
    question: 'Kategori nasıl oluşturabilirim?',
    answer: 'Ayarlar sayfasından "Kategori Yönetimi" bölümüne giderek özel kategoriler oluşturabilirsiniz. İstediğiniz ikon ve rengi seçerek kişiselleştirilmiş kategoriler ekleyebilirsiniz.',
    category: 'Kategoriler',
    icon: <Lightbulb />,
  },
];

const contactEmail = 'parayonetimi@devosuit.com';

interface HelpSupportProps {}

const HelpSupport: React.FC<HelpSupportProps> = () => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank');
  };

  const handleEmailClick = () => {
    window.open(`mailto:${contactEmail}`, '_blank');
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Kullanım': '#2196F3',
      'Hesap': '#4CAF50',
      'Raporlar': '#FF9800',
      'Güvenlik': '#F44336',
      'Para Birimi': '#9C27B0',
      'Kategoriler': '#FF5722',
    };
    return colors[category] || '#666';
  };

  return (
    <Box 
      sx={{ 
        height: '100vh',
        overflow: 'auto',
        p: 3,
        '&::-webkit-scrollbar': { width: '8px' },
        '&::-webkit-scrollbar-track': { background: 'rgba(255, 255, 255, 0.05)' },
        '&::-webkit-scrollbar-thumb': { 
          background: 'rgba(255, 255, 255, 0.2)', 
          borderRadius: '4px',
          '&:hover': { background: 'rgba(255, 255, 255, 0.3)' },
        },
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
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
            <HelpOutline sx={{ fontSize: 40, color: '#fff' }} />
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', mb: 2 }}>
            Yardım & Destek
          </Typography>
          <Typography variant="h6" sx={{ color: '#bbb', maxWidth: 600, mx: 'auto' }}>
            Size yardımcı olmak için buradayız. Sıkça sorulan sorular, iletişim bilgileri ve daha fazlası
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          {/* Developer Info */}
          <Box sx={{ flex: { md: '0 0 400px' } }}>
            <Fade in timeout={600}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 3,
                  position: 'sticky',
                  top: 24,
                }}
              >
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Box sx={{ mb: 3 }}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        mx: 'auto',
                        mb: 2,
                        bgcolor: '#2196F3',
                        fontSize: 32,
                        fontWeight: 700,
                      }}
                    >
                      GK
                    </Avatar>
                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
                      {devInfo.name}
                    </Typography>
                    <Chip 
                      label="Full Stack Developer" 
                      size="small" 
                      sx={{ bgcolor: 'rgba(33, 150, 243, 0.2)', color: '#2196F3' }} 
                    />
                  </Box>

                  <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                  <Typography variant="body2" sx={{ color: '#bbb', mb: 3 }}>
                    💼 İletişim ve Sosyal Medya
                  </Typography>

                  <Stack spacing={2}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<LinkedIn />}
                      onClick={() => handleLinkClick(devInfo.linkedin)}
                      sx={{
                        borderColor: '#0077B5',
                        color: '#0077B5',
                        '&:hover': { bgcolor: 'rgba(0, 119, 181, 0.1)', borderColor: '#0077B5' },
                      }}
                    >
                      LinkedIn
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<GitHub />}
                      onClick={() => handleLinkClick(devInfo.github)}
                      sx={{
                        borderColor: '#666',
                        color: '#666',
                        '&:hover': { bgcolor: 'rgba(102, 102, 102, 0.1)', borderColor: '#666' },
                      }}
                    >
                      GitHub
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Language />}
                      onClick={() => handleLinkClick(devInfo.website)}
                      sx={{
                        borderColor: '#4CAF50',
                        color: '#4CAF50',
                        '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.1)', borderColor: '#4CAF50' },
                      }}
                    >
                      gkhkaya.info
                    </Button>

                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Business />}
                      onClick={() => handleLinkClick(devInfo.devosuit)}
                      sx={{
                        borderColor: '#FF9800',
                        color: '#FF9800',
                        '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.1)', borderColor: '#FF9800' },
                      }}
                    >
                      Devosuit
                    </Button>
                  </Stack>

                  <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Email />}
                    onClick={handleEmailClick}
                    sx={{
                      bgcolor: '#2196F3',
                      '&:hover': { bgcolor: '#1976D2' },
                      fontWeight: 600,
                    }}
                  >
                    E-posta Gönder
                  </Button>
                                 </CardContent>
               </Card>
             </Fade>
           </Box>

           {/* FAQ Section */}
           <Box sx={{ flex: 1 }}>
            <Fade in timeout={800}>
              <Box>
                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mb: 1 }}>
                  🤔 Sıkça Sorulan Sorular
                </Typography>
                <Typography variant="body1" sx={{ color: '#bbb', mb: 4 }}>
                  En çok merak edilen konulara hızlıca cevap bulun
                </Typography>

                <Stack spacing={2}>
                  {faqData.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Accordion
                        expanded={expandedAccordion === item.id}
                        onChange={handleAccordionChange(item.id)}
                        sx={{
                          background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px !important',
                          '&:before': { display: 'none' },
                          '&.Mui-expanded': {
                            boxShadow: `0 8px 32px rgba(${getCategoryColor(item.category).replace('#', '')}, 0.2)`,
                            borderColor: getCategoryColor(item.category),
                          },
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMore sx={{ color: '#fff' }} />}
                          sx={{
                            '& .MuiAccordionSummary-content': {
                              alignItems: 'center',
                              gap: 2,
                            },
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: getCategoryColor(item.category),
                              width: 40,
                              height: 40,
                              color: '#fff',
                            }}
                          >
                            {item.icon}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                              {item.question}
                            </Typography>
                            <Chip
                              label={item.category}
                              size="small"
                              sx={{
                                bgcolor: `${getCategoryColor(item.category)}20`,
                                color: getCategoryColor(item.category),
                                fontWeight: 500,
                                mt: 0.5,
                              }}
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                          <Box sx={{ pl: 7 }}>
                            <Typography sx={{ color: '#bbb', lineHeight: 1.7 }}>
                              {item.answer}
                            </Typography>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    </motion.div>
                  ))}
                </Stack>

                {/* Contact Section */}
                <Box sx={{ mt: 6 }}>
                  <Paper
                    sx={{
                      p: 4,
                      background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 3,
                      textAlign: 'center',
                    }}
                  >
                    <ContactSupport sx={{ fontSize: 48, color: '#2196F3', mb: 2 }} />
                    <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 2 }}>
                      Sorunuzu bulamadınız mı?
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#bbb', mb: 3 }}>
                      Bizimle doğrudan iletişime geçin, size yardımcı olmaktan mutluluk duyarız
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<Email />}
                      onClick={handleEmailClick}
                      sx={{
                        bgcolor: '#2196F3',
                        '&:hover': { bgcolor: '#1976D2' },
                        px: 4,
                        py: 1.5,
                        fontWeight: 600,
                      }}
                    >
                      {contactEmail}
                    </Button>
                  </Paper>
                </Box>

                {/* Version Info */}
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                  <Alert 
                    severity="info" 
                    sx={{ 
                      bgcolor: 'rgba(33, 150, 243, 0.1)', 
                      border: '1px solid rgba(33, 150, 243, 0.3)',
                      color: '#fff',
                      '& .MuiAlert-icon': { color: '#2196F3' },
                    }}
                  >
                    <Typography variant="body2">
                      <strong>ParamıYönet Web v1.0</strong> - Firebase destekli modern finansal yönetim uygulaması
                    </Typography>
                  </Alert>
                </Box>
                             </Box>
             </Fade>
           </Box>
         </Box>
      </Container>
    </Box>
  );
};

export default HelpSupport; 