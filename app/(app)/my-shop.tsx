import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Package, 
  Euro, 
  DollarSign, 
  PoundSterling,
  X,
  Check,
  Crown
} from 'lucide-react-native';
import { useUserRole } from '@/providers/UserRoleProvider';
import { useLanguage } from '@/providers/LanguageProvider';
import { useShop } from '@/providers/ShopProvider';

interface Product {
  id: string;
  title: string;
  price: number;
  currency: 'EUR' | 'USD' | 'GBP';
  createdAt: number;
}

export default function MyShopScreen() {
  const { userRole, products, addProduct, updateProduct, deleteProduct } = useUserRole();
  const { t } = useLanguage();
  const { hasAnyPremium } = useShop();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    currency: 'EUR' as 'EUR' | 'USD' | 'GBP',
  });

  // Redirect if not seller
  if (userRole !== 'seller') {
    Alert.alert(t('alert.error'), t('shop.onlyForSellers'), [
      { text: t('alert.ok'), onPress: () => router.replace('/(app)/settings') }
    ]);
    return null;
  }

  const maxProducts = hasAnyPremium ? 100 : 4;
  const canAddMore = products.length < maxProducts;

  const resetForm = () => {
    setFormData({
      title: '',
      price: '',
      currency: 'EUR',
    });
    setEditingProduct(null);
  };

  const openAddModal = () => {
    if (!canAddMore) {
      Alert.alert(
        t('shop.limitReached'),
        t('shop.limitReachedMessage'),
        [
          { text: t('alert.cancel'), style: 'cancel' },
          { text: t('shop.toShop'), onPress: () => router.push('/shop') }
        ]
      );
      return;
    }
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (product: Product) => {
    setFormData({
      title: product.title,
      price: product.price.toString(),
      currency: product.currency,
    });
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const validateForm = (): string | null => {
    const title = formData.title.trim();
    const price = parseFloat(formData.price);

    if (!title) return t('shop.titleRequired');
    if (title.length < 2) return t('shop.titleTooShort');
    if (title.length > 60) return t('shop.titleTooLong');
    if (isNaN(price)) return t('shop.priceInvalid');
    if (price < 0 || price > 99999) return t('shop.priceRange');
    if (!formData.currency) return t('shop.currencyRequired');

    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert(t('alert.error'), error);
      return;
    }

    try {
      const title = formData.title.trim();
      const price = parseFloat(formData.price);

      if (editingProduct) {
        await updateProduct(editingProduct.id, title, price, formData.currency);
        Alert.alert(t('alert.success'), t('alert.productUpdated'));
      } else {
        await addProduct(title, price, formData.currency);
        Alert.alert(t('alert.success'), t('alert.productAdded'));
      }

      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      if (error.message === 'Product title already exists') {
        Alert.alert(t('alert.error'), t('shop.titleExists'));
      } else {
        Alert.alert(t('alert.error'), error.message);
      }
    }
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      t('shop.deleteProduct'),
      `${t('alert.delete')} "${product.title}"?`,
      [
        { text: t('alert.cancel'), style: 'cancel' },
        {
          text: t('alert.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              Alert.alert(t('alert.success'), t('alert.productDeleted'));
            } catch (error: any) {
              Alert.alert(t('alert.error'), error.message);
            }
          }
        }
      ]
    );
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'GBP': return '£';
      default: return currency;
    }
  };

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case 'EUR': return Euro;
      case 'USD': return DollarSign;
      case 'GBP': return PoundSterling;
      default: return Euro;
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productTitle}>{item.title}</Text>
          <Text style={styles.productPrice}>
            {getCurrencySymbol(item.currency)}{item.price.toFixed(2)}
          </Text>
        </View>
        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Edit3 size={16} color="#2E7EFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={16} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Package size={32} color="#2E7EFF" />
        <Text style={styles.title}>{t('shop.myShop')}</Text>
        <Text style={styles.subtitle}>{t('shop.manageProducts')}</Text>
        
        <View style={styles.limitInfo}>
          <Text style={styles.limitText}>
            {products.length}/{maxProducts} {t('shop.productsCount')}
          </Text>
          {!hasAnyPremium && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/shop')}
            >
              <Crown size={12} color="#FFD700" />
              <Text style={styles.upgradeText}>Premium</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {products.length === 0 ? (
        <View style={styles.emptyState}>
          <Package size={64} color="#333" />
          <Text style={styles.emptyTitle}>{t('shop.noProducts')}</Text>
          <Text style={styles.emptyText}>{t('shop.addFirstProduct')}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={[styles.addButton, !canAddMore && styles.addButtonDisabled]}
        onPress={openAddModal}
      >
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>{t('shop.addProduct')}</Text>
      </TouchableOpacity>

      {/* Add/Edit Product Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? t('shop.editProduct') : t('shop.addProduct')}
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('shop.productTitle')}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder={t('shop.productTitle')}
                  placeholderTextColor="#666"
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                  maxLength={60}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('shop.productPrice')}</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  value={formData.price}
                  onChangeText={(text) => setFormData({ ...formData, price: text })}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{t('shop.productCurrency')}</Text>
                <View style={styles.currencySelector}>
                  {(['EUR', 'USD', 'GBP'] as const).map((currency) => {
                    const Icon = getCurrencyIcon(currency);
                    const isSelected = formData.currency === currency;
                    
                    return (
                      <TouchableOpacity
                        key={currency}
                        style={[styles.currencyOption, isSelected && styles.currencyOptionSelected]}
                        onPress={() => setFormData({ ...formData, currency })}
                      >
                        <Icon size={16} color={isSelected ? '#2E7EFF' : '#666'} />
                        <Text style={[styles.currencyText, isSelected && styles.currencyTextSelected]}>
                          {currency}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>{t('shop.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>{t('shop.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  limitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  limitText: {
    fontSize: 14,
    color: '#999',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD70020',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  upgradeText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  productList: {
    padding: 20,
  },
  productCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7EFF',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FF3B3020',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7EFF',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#444',
  },
  currencySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 2,
    borderColor: '#444',
  },
  currencyOptionSelected: {
    borderColor: '#2E7EFF',
    backgroundColor: '#2E7EFF20',
  },
  currencyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  currencyTextSelected: {
    color: '#2E7EFF',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2E7EFF',
    gap: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});