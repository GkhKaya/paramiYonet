import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { CATEGORY_ICONS, getIconsByCategory, getIconCategories, getPopularIcons, CategoryIcon } from '../constants/icons';
import { TransactionType } from '../models/Transaction';
import { useAuth } from '../contexts/AuthContext';
import { useViewModels } from '../contexts/ViewModelContext';

const { width } = Dimensions.get('window');

// Kategori renkleri
const CATEGORY_COLORS = [
  '#FF3030', '#FF1744', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#00BCD4', '#00E676', '#4CAF50',
  '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
  '#FF5722', '#795548', '#607D8B', '#FFB300', '#FF6F00',
];

import { StackScreenProps } from '@react-navigation/stack';
import { MainStackParamList } from '../types';

type AddCategoryScreenProps = StackScreenProps<MainStackParamList, 'AddCategory'>;

const AddCategoryScreen: React.FC<AddCategoryScreenProps> = observer(({ route, navigation }) => {
  const { user } = useAuth();
  const { categoryViewModel } = useViewModels();

  const editCategory = route?.params?.editCategory;
  const isEditing = !!editCategory;

  // States
  const [selectedType, setSelectedType] = useState<TransactionType>(() => {
    if (editCategory?.type) {
      return editCategory.type === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE;
    }
    return route?.params?.defaultType === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE;
  });
  const [categoryName, setCategoryName] = useState(editCategory?.name || '');
  const [selectedIcon, setSelectedIcon] = useState<string>(editCategory?.icon || 'help-circle');
  const [selectedColor, setSelectedColor] = useState<string>(editCategory?.color || CATEGORY_COLORS[0]);
  const [selectedIconFilter, setSelectedIconFilter] = useState<string>('popüler');
  const [loading, setLoading] = useState(false);

  const iconFilters = ['popüler', 'tümü', ...getIconCategories()];

  const getFilteredIcons = (): CategoryIcon[] => {
    switch (selectedIconFilter) {
      case 'popüler':
        return getPopularIcons();
      case 'tümü':
        return CATEGORY_ICONS;
      default:
        return getIconsByCategory(selectedIconFilter);
    }
  };

  const handleSave = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Hata', 'Lütfen kategori adı girin');
      return;
    }

    if (!selectedIcon) {
      Alert.alert('Hata', 'Lütfen ikon seçin');
      return;
    }

    if (!user || !categoryViewModel) {
      Alert.alert('Hata', 'Sistem hatası');
      return;
    }

    setLoading(true);

    try {
      let success = false;

      if (isEditing && editCategory) {
        success = await categoryViewModel.editCategory(editCategory.id, {
          name: categoryName.trim(),
          icon: selectedIcon,
          color: selectedColor,
        });
      } else {
        success = await categoryViewModel.createCategory(
          categoryName.trim(),
          selectedIcon,
          selectedColor,
          selectedType
        );
      }

      if (success) {
        Alert.alert(
          'Başarılı',
          isEditing ? 'Kategori güncellendi' : 'Kategori oluşturuldu',
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
      } else {
        const errorMessage = categoryViewModel.error || 'İşlem sırasında hata oluştu';
        Alert.alert('Hata', errorMessage);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!editCategory || !categoryViewModel) return;

    Alert.alert(
      'Kategoriyi Sil',
      `"${editCategory.name}" kategorisini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const success = await categoryViewModel.deleteCategory(editCategory.id);
            setLoading(false);

            if (success) {
              Alert.alert('Başarılı', 'Kategori silindi', [
                { text: 'Tamam', onPress: () => navigation.goBack() }
              ]);
            } else {
              Alert.alert('Hata', categoryViewModel.error || 'Kategori silinemedi');
            }
          }
        }
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {isEditing ? 'Kategori Düzenle' : 'Kategori Ekle'}
      </Text>
      <View style={styles.headerRight}>
        {isEditing && categoryViewModel?.canDeleteCategory(editCategory!.id) && (
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Ionicons name="trash" size={20} color={COLORS.ERROR} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveButton}>
          <Text style={[styles.saveButtonText, loading && styles.saveButtonDisabled]}>
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Kategori Türü</Text>
      <View style={styles.typeContainer}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === TransactionType.EXPENSE && styles.typeButtonActive
          ]}
          onPress={() => setSelectedType(TransactionType.EXPENSE)}
          disabled={isEditing} // Düzenleme modunda tür değiştirilemez
        >
          <Ionicons 
            name="remove-circle" 
            size={20} 
            color={selectedType === TransactionType.EXPENSE ? COLORS.WHITE : COLORS.EXPENSE} 
          />
          <Text style={[
            styles.typeButtonText,
            selectedType === TransactionType.EXPENSE && styles.typeButtonTextActive
          ]}>
            Gider
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            selectedType === TransactionType.INCOME && styles.typeButtonActive
          ]}
          onPress={() => setSelectedType(TransactionType.INCOME)}
          disabled={isEditing} // Düzenleme modunda tür değiştirilemez
        >
          <Ionicons 
            name="add-circle" 
            size={20} 
            color={selectedType === TransactionType.INCOME ? COLORS.WHITE : COLORS.INCOME} 
          />
          <Text style={[
            styles.typeButtonText,
            selectedType === TransactionType.INCOME && styles.typeButtonTextActive
          ]}>
            Gelir
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderNameInput = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Kategori Adı</Text>
      <TextInput
        style={styles.nameInput}
        value={categoryName}
        onChangeText={setCategoryName}
        placeholder="Kategori adını girin..."
        placeholderTextColor={COLORS.TEXT_SECONDARY}
        maxLength={30}
        autoCapitalize="words"
      />
    </View>
  );

  const renderColorSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Renk Seçin</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
        {CATEGORY_COLORS.map((color, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              selectedColor === color && styles.colorOptionSelected
            ]}
            onPress={() => setSelectedColor(color)}
          >
            {selectedColor === color && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderIconSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>İkon Seçin</Text>
      
      {/* İkon filtreleri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconFilterScroll}>
        {iconFilters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.iconFilterButton,
              selectedIconFilter === filter && styles.iconFilterButtonActive
            ]}
            onPress={() => setSelectedIconFilter(filter)}
          >
            <Text style={[
              styles.iconFilterText,
              selectedIconFilter === filter && styles.iconFilterTextActive
            ]}>
              {filter === 'tümü' ? 'Tümü' : filter === 'popüler' ? 'Popüler' : filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* İkon grid */}
      <View style={styles.iconGrid}>
        {getFilteredIcons().map((iconData, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.iconOption,
              selectedIcon === iconData.name && styles.iconOptionSelected
            ]}
            onPress={() => setSelectedIcon(iconData.name)}
          >
            <Ionicons 
              name={iconData.name as any} 
              size={24} 
              color={COLORS.WHITE} 
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPreview = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Önizleme</Text>
      <View style={styles.previewContainer}>
        <View style={[styles.previewIcon, { backgroundColor: selectedColor }]}>
          <Ionicons name={selectedIcon as any} size={24} color="#FFFFFF" />
        </View>
        <Text style={styles.previewText}>{categoryName || 'Kategori Adı'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      {renderHeader()}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTypeSelector()}
        {renderNameInput()}
        {renderColorSelector()}
        {renderIconSelector()}
        {renderPreview()}
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  saveButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  saveButtonDisabled: {
    color: COLORS.TEXT_SECONDARY,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  section: {
    marginVertical: SPACING.lg,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    backgroundColor: COLORS.SURFACE,
    gap: SPACING.xs,
  },
  typeButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  typeButtonText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
  typeButtonTextActive: {
    color: COLORS.WHITE,
  },
  nameInput: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.md,
    color: COLORS.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  colorScroll: {
    flexGrow: 0,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: COLORS.WHITE,
  },
  iconFilterScroll: {
    flexGrow: 0,
    marginBottom: SPACING.md,
  },
  iconFilterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: COLORS.SURFACE,
    marginRight: SPACING.sm,
  },
  iconFilterButtonActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  iconFilterText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.TEXT_PRIMARY,
  },
  iconFilterTextActive: {
    color: COLORS.WHITE,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  iconOption: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    gap: SPACING.md,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '500',
    color: COLORS.TEXT_PRIMARY,
  },
});

export default AddCategoryScreen; 