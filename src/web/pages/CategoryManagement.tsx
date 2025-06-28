import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Fab,
  Tabs,
  Tab,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Badge,
  Fade,
  Slide,
  Zoom,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Category as CategoryIcon,
  Refresh,
  Palette,
  Star,
  TrendingUp,
  TrendingDown,
  Close,
  Save,
  MoreHoriz,
  Restaurant,
  DirectionsCar,
  ShoppingCart,
  LocalGroceryStore,
  AttachMoney,
  Business,
  Computer,
  Home,
  LocalHospital,
  SportsEsports,
  School,
  Flight,
  CardGiftcard,
  Coffee,
  Smartphone,
  SportsSoccer,
  MusicNote,
} from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { CategoryService } from '../../services/CategoryService';
import { Category } from '../../models/Category';
import { TransactionType } from '../../models/Transaction';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../models/Category';
import { getCategoryIcon } from '../utils/categoryIcons';

// Animation component for slide transition
const SlideTransition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Memoized Preview Card Component
const CategoryPreviewCard = React.memo(({ name, icon, color }: { name: string; icon: string; color: string }) => {
  const iconComponent = getCategoryIcon(icon);
  return (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 2, background: `linear-gradient(45deg, ${color} 30%, ${color}E6 90%)` }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{ bgcolor: 'white', color: color }}>
          {iconComponent}
        </Avatar>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', flexGrow: 1 }}>
          {name || 'Kategori Adı'}
        </Typography>
        <Chip label="Önizleme" color="default" size="small" sx={{ color: 'white', bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
      </Stack>
    </Paper>
  );
});

// Kategori renkleri
const CATEGORY_COLORS = [
  '#FF3030', '#FF1744', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#00BCD4', '#00E676', '#4CAF50',
  '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
  '#FF5722', '#795548', '#607D8B', '#FFB300', '#FF6F00',
];

// Mevcut iconlar (Material-UI)
const AVAILABLE_ICONS = [
  { name: 'restaurant', icon: <Restaurant />, label: 'Restoran' },
  { name: 'local-grocery-store', icon: <LocalGroceryStore />, label: 'Market' },
  { name: 'directions-car', icon: <DirectionsCar />, label: 'Ulaşım' },
  { name: 'attach-money', icon: <AttachMoney />, label: 'Gelir' },
  { name: 'business', icon: <Business />, label: 'İş' },
  { name: 'computer', icon: <Computer />, label: 'Teknoloji' },
  { name: 'home', icon: <Home />, label: 'Ev' },
  { name: 'local-hospital', icon: <LocalHospital />, label: 'Sağlık' },
  { name: 'sports-esports', icon: <SportsEsports />, label: 'Oyun' },
  { name: 'school', icon: <School />, label: 'Eğitim' },
  { name: 'flight', icon: <Flight />, label: 'Seyahat' },
  { name: 'card-giftcard', icon: <CardGiftcard />, label: 'Hediye' },
  { name: 'coffee', icon: <Coffee />, label: 'Kahve' },
  { name: 'smartphone', icon: <Smartphone />, label: 'Telefon' },
  { name: 'sports-soccer', icon: <SportsSoccer />, label: 'Spor' },
  { name: 'music-note', icon: <MusicNote />, label: 'Müzik' },
  { name: 'shopping-cart', icon: <ShoppingCart />, label: 'Alışveriş' },
  { name: 'more-horiz', icon: <MoreHoriz />, label: 'Diğer' },
];

// Helper to get the icon component from name
// Moved outside to prevent re-creation on render
const getIconComponent = (iconName: string) => {
  const icon = AVAILABLE_ICONS.find(i => i.name === iconName);
  return icon ? icon.icon : <MoreHoriz />;
};

interface CategoryManagementProps {}

const CategoryManagement: React.FC<CategoryManagementProps> = () => {
  const { currentUser } = useAuth();
  const [selectedTab, setSelectedTab] = useState(0); // 0: Gider, 1: Gelir
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    icon: 'more-horiz',
    color: CATEGORY_COLORS[0],
    type: TransactionType.EXPENSE,
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [submitting, setSubmitting] = useState(false);

  // Load categories
  const loadCategories = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const userCategories = await CategoryService.getUserCategories(currentUser.uid);
      
      // Combine with default categories
      const allCategories: Category[] = [
        ...DEFAULT_EXPENSE_CATEGORIES.map((cat, index) => ({
          ...cat,
          id: `default-expense-${index}`,
        })),
        ...DEFAULT_INCOME_CATEGORIES.map((cat, index) => ({
          ...cat,
          id: `default-income-${index}`,
        })),
        ...userCategories,
      ];
      
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  useEffect(() => {
    loadCategories();
  }, [currentUser]);

  // Filter categories by type
  const getFilteredCategories = () => {
    const type = selectedTab === 0 ? TransactionType.EXPENSE : TransactionType.INCOME;
    return categories.filter(cat => cat.type === type);
  };

  const getCustomCategories = () => {
    return getFilteredCategories().filter(cat => !cat.isDefault);
  };

  const getDefaultCategories = () => {
    return getFilteredCategories().filter(cat => cat.isDefault);
  };

  // Form handlers
  const handleCreateCategory = () => {
    setFormData({
      name: '',
      icon: 'more-horiz',
      color: CATEGORY_COLORS[0],
      type: selectedTab === 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
    });
    setFormErrors({});
    setCreateModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
    });
    setFormErrors({});
    setEditModalOpen(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleFormChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleIconChange = React.useCallback((icon: string) => {
    setFormData(prev => ({ ...prev, icon }));
  }, []);

  const handleColorChange = React.useCallback((color: string) => {
    setFormData(prev => ({ ...prev, color }));
  }, []);

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Kategori adı gereklidir';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitCreate = async () => {
    if (!validateForm() || !currentUser) return;
    
    setSubmitting(true);
    try {
      await CategoryService.createCategory(
        currentUser.uid,
        formData.name.trim(),
        formData.icon,
        formData.color,
        formData.type
      );
      
      setCreateModalOpen(false);
      await loadCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      setFormErrors({ submit: 'Kategori oluşturulurken bir hata oluştu' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!validateForm() || !currentUser || !selectedCategory) return;
    
    setSubmitting(true);
    try {
      await CategoryService.updateCategory(selectedCategory.id, {
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color,
      });
      
      setEditModalOpen(false);
      await loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      setFormErrors({ submit: 'Kategori güncellenirken bir hata oluştu' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory || !currentUser) return;
    
    setSubmitting(true);
    try {
      await CategoryService.deleteCategory(selectedCategory.id);
      setDeleteDialogOpen(false);
      await loadCategories();
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const CategoryCard = ({ category, isCustom }: { category: Category; isCustom: boolean }) => (
    <Fade in timeout={600}>
      <Card
        sx={{
          background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: `0 8px 32px rgba(${category.color.replace('#', '')}, 0.3)`,
            borderColor: category.color,
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                bgcolor: category.color,
                width: 48,
                height: 48,
                color: '#fff',
              }}
            >
              {getCategoryIcon(category.name)}
            </Avatar>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600, mb: 0.5 }}>
                {category.name}
              </Typography>
              {!isCustom && (
                <Chip
                  label="Varsayılan"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: '#bbb',
                    fontSize: '0.75rem',
                  }}
                />
              )}
            </Box>
            
            {isCustom && (
              <Stack direction="row" spacing={1}>
                <IconButton
                  size="small"
                  onClick={() => handleEditCategory(category)}
                  sx={{
                    bgcolor: 'rgba(33, 150, 243, 0.1)',
                    color: '#2196F3',
                    '&:hover': {
                      bgcolor: 'rgba(33, 150, 243, 0.2)',
                    },
                  }}
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteCategory(category)}
                  sx={{
                    bgcolor: 'rgba(244, 67, 54, 0.1)',
                    color: '#F44336',
                    '&:hover': {
                      bgcolor: 'rgba(244, 67, 54, 0.2)',
                    },
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Fade>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} sx={{ color: '#2196F3' }} />
      </Box>
    );
  }

  const customCategories = getCustomCategories();
  const defaultCategories = getDefaultCategories();

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
      <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #FF9800, #FF6F00)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              boxShadow: '0 8px 32px rgba(255, 152, 0, 0.4)',
            }}
          >
            <CategoryIcon sx={{ fontSize: 40, color: '#fff' }} />
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', mb: 2 }}>
            Kategori Yönetimi
          </Typography>
          <Typography variant="h6" sx={{ color: '#bbb', maxWidth: 600, mx: 'auto' }}>
            Gelir ve gider kategorilerinizi düzenleyin, özelleştirin ve yönetin
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ mb: 4 }}>
          <Tabs
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
            centered
            sx={{
              '& .MuiTab-root': {
                color: '#bbb',
                fontSize: '1.1rem',
                fontWeight: 600,
                textTransform: 'none',
                minWidth: 200,
                '&.Mui-selected': { color: '#2196F3' },
              },
              '& .MuiTabs-indicator': { backgroundColor: '#2196F3', height: 3 },
            }}
          >
            <Tab
              label={`Gider Kategorileri (${categories.filter(c => c.type === TransactionType.EXPENSE).length})`}
              icon={<TrendingDown />}
              iconPosition="start"
            />
            <Tab
              label={`Gelir Kategorileri (${categories.filter(c => c.type === TransactionType.INCOME).length})`}
              icon={<TrendingUp />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{
              borderColor: '#2196F3',
              color: '#2196F3',
              '&:hover': { borderColor: '#1976D2', bgcolor: 'rgba(33, 150, 243, 0.1)' },
            }}
          >
            {refreshing ? 'Yenileniyor...' : 'Yenile'}
          </Button>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateCategory}
            sx={{
              bgcolor: '#4CAF50',
              '&:hover': { bgcolor: '#45a049' },
              fontWeight: 600,
              px: 3,
            }}
          >
            Yeni Kategori
          </Button>
        </Box>

        {/* Content */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          {/* Custom Categories */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 3 }}>
              🎨 Özel Kategorilerim ({customCategories.length})
            </Typography>
            
            {customCategories.length === 0 ? (
              <Paper
                sx={{
                  p: 6,
                  textAlign: 'center',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 3,
                }}
              >
                <CategoryIcon sx={{ fontSize: 64, color: '#555', mb: 2 }} />
                <Typography variant="h6" sx={{ color: '#bbb', mb: 2 }}>
                  Henüz özel kategori eklenmemiş
                </Typography>
                <Typography variant="body2" sx={{ color: '#777', mb: 3 }}>
                  İhtiyaçlarınıza özel kategoriler oluşturun
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateCategory}
                  sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#45a049' } }}
                >
                  İlk Kategorini Ekle
                </Button>
              </Paper>
            ) : (
              <Stack spacing={2}>
                {customCategories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    isCustom={true}
                  />
                ))}
              </Stack>
            )}
          </Box>

          {/* Default Categories */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 3 }}>
              ⭐ Varsayılan Kategoriler ({defaultCategories.length})
            </Typography>
            
            <Stack spacing={2}>
              {defaultCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isCustom={false}
                />
              ))}
            </Stack>
          </Box>
        </Box>

        {/* Floating Action Button */}
        <Zoom in timeout={800}>
          <Fab
            color="primary"
            onClick={handleCreateCategory}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              bgcolor: '#4CAF50',
              '&:hover': { bgcolor: '#45a049' },
              zIndex: 1000,
            }}
          >
            <Add />
          </Fab>
        </Zoom>

        {/* Modals */}
        <CategoryModal 
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Yeni Kategori Oluştur"
          onSubmit={handleSubmitCreate}
          formData={formData}
          formErrors={formErrors}
          submitting={submitting}
          handleFormChange={handleFormChange}
          handleIconChange={handleIconChange}
          handleColorChange={handleColorChange}
        />

        <CategoryModal 
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Kategoriyi Düzenle"
          onSubmit={handleSubmitEdit}
          formData={formData}
          formErrors={formErrors}
          submitting={submitting}
          handleFormChange={handleFormChange}
          handleIconChange={handleIconChange}
          handleColorChange={handleColorChange}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: {
              background: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              borderRadius: 3,
            },
          }}
        >
          <DialogTitle sx={{ color: '#fff', fontWeight: 700 }}>
            Kategoriyi Sil
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ color: '#bbb' }}>
              "{selectedCategory?.name}" kategorisini silmek istediğinizden emin misiniz? 
              Bu işlem geri alınamaz.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#bbb' }}>
              İptal
            </Button>
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={16} /> : <Delete />}
            >
              {submitting ? 'Siliniyor...' : 'Sil'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

// ====================================================================================
// STANDALONE MODAL COMPONENT
// Moved outside of the main component to prevent re-mounting on every render
// ====================================================================================
interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: () => void;
  formData: {
    name: string;
    icon: string;
    color: string;
    type: TransactionType;
  };
  formErrors: { [key: string]: string };
  submitting: boolean;
  handleFormChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleIconChange: (icon: string) => void;
  handleColorChange: (color: string) => void;
}

const CategoryModal = ({ 
  open, 
  onClose, 
  title, 
  onSubmit,
  formData,
  formErrors,
  submitting,
  handleFormChange,
  handleIconChange,
  handleColorChange
}: CategoryModalProps) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={SlideTransition}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 4 } }}
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" fontWeight="bold">{title}</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {/* Preview Card */}
          <CategoryPreviewCard name={formData.name} icon={formData.icon} color={formData.color} />

          {/* Form Fields */}
          <TextField
            fullWidth
            autoFocus
            label="Kategori Adı"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            error={!!formErrors.name}
            helperText={formErrors.name}
            variant="outlined"
          />
          
          {/* Icon Selection */}
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
              İkon Seç
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, maxHeight: 150, overflowY: 'auto' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 1 }}>
                {AVAILABLE_ICONS.map(({ name, icon }) => (
                  <IconButton
                    key={name}
                    onClick={() => handleIconChange(name)}
                    sx={{
                      border: formData.icon === name ? `2px solid ${formData.color}` : '2px solid transparent',
                      borderRadius: '25%',
                      p: 0.5,
                      transition: 'border 0.2s ease-in-out',
                      width: '100%',
                      height: '40px'
                    }}
                  >
                    {icon}
                  </IconButton>
                ))}
              </Box>
            </Paper>
          </Box>

          {/* Color Selection */}
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
              Renk Seç
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))', gap: 1 }}>
                {CATEGORY_COLORS.map(color => (
                  <IconButton
                    key={color}
                    onClick={() => handleColorChange(color)}
                    sx={{
                      width: '100%',
                      height: 32,
                      bgcolor: color,
                      border: formData.color === color ? '3px solid #fff' : '3px solid transparent',
                      boxShadow: formData.color === color ? `0 0 0 2px ${color}` : 'none',
                      transition: 'border 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                      borderRadius: '50%',
                      '&:hover': {
                        transform: 'scale(1.1)',
                      },
                    }}
                  />
                ))}
              </Box>
            </Paper>
          </Box>

          {formErrors.submit && <Alert severity="error">{formErrors.submit}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} variant="outlined" color="secondary">İptal</Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          color="primary"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Save />}
        >
          {submitting ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryManagement;