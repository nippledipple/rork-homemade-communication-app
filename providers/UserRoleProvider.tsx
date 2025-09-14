import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export type UserRole = 'buyer' | 'seller';

interface Product {
  id: string;
  title: string;
  price: number;
  currency: 'EUR' | 'USD' | 'GBP';
  createdAt: number;
}

interface ProductMessage {
  type: 'hm.product';
  v: 1;
  items: Product[];
}

export const [UserRoleProvider, useUserRole] = createContextHook(() => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserRole = useCallback(async () => {
    try {
      setIsLoading(true);
      let role = null;
      
      if (Platform.OS !== 'web') {
        try {
          role = await SecureStore.getItemAsync('userRole');
        } catch {
          role = await AsyncStorage.getItem('userRole');
        }
      } else {
        role = await AsyncStorage.getItem('userRole');
      }
      
      if (role && (role === 'buyer' || role === 'seller')) {
        // Use setTimeout to ensure state updates happen after component is mounted
        setTimeout(() => {
          setUserRole(role as UserRole);
        }, 0);
      }
    } catch (error) {
      console.error('Failed to load user role:', error);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 0);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      let productsData = null;
      
      if (Platform.OS !== 'web') {
        try {
          productsData = await SecureStore.getItemAsync('userProducts');
        } catch {
          productsData = await AsyncStorage.getItem('userProducts');
        }
      } else {
        productsData = await AsyncStorage.getItem('userProducts');
      }
      
      if (productsData) {
        const parsed = JSON.parse(productsData);
        setProducts(parsed);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  useEffect(() => {
    loadUserRole();
  }, [loadUserRole]);

  useEffect(() => {
    if (userRole) {
      loadProducts();
    }
  }, [userRole, loadProducts]);

  const saveUserRole = useCallback(async (role: UserRole) => {
    try {
      if (Platform.OS !== 'web') {
        try {
          await SecureStore.setItemAsync('userRole', role);
        } catch {
          await AsyncStorage.setItem('userRole', role);
        }
      } else {
        await AsyncStorage.setItem('userRole', role);
      }
      
      setUserRole(role);
    } catch (error) {
      console.error('Failed to save user role:', error);
      throw error;
    }
  }, []);

  const saveProducts = useCallback(async (newProducts: Product[]) => {
    try {
      const productsData = JSON.stringify(newProducts);
      
      if (Platform.OS !== 'web') {
        try {
          await SecureStore.setItemAsync('userProducts', productsData);
        } catch {
          await AsyncStorage.setItem('userProducts', productsData);
        }
      } else {
        await AsyncStorage.setItem('userProducts', productsData);
      }
      
      setProducts(newProducts);
    } catch (error) {
      console.error('Failed to save products:', error);
      throw error;
    }
  }, []);

  const addProduct = useCallback(async (title: string, price: number, currency: 'EUR' | 'USD' | 'GBP') => {
    if (userRole !== 'seller') {
      throw new Error('Only sellers can add products');
    }

    // Check for duplicate titles (case-insensitive)
    const titleExists = products.some(p => p.title.toLowerCase() === title.toLowerCase());
    if (titleExists) {
      throw new Error('Product title already exists');
    }

    const newProduct: Product = {
      id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      price,
      currency,
      createdAt: Date.now(),
    };

    const updatedProducts = [...products, newProduct];
    await saveProducts(updatedProducts);
    return newProduct;
  }, [userRole, products, saveProducts]);

  const updateProduct = useCallback(async (id: string, title: string, price: number, currency: 'EUR' | 'USD' | 'GBP') => {
    if (userRole !== 'seller') {
      throw new Error('Only sellers can update products');
    }

    // Check for duplicate titles (case-insensitive), excluding current product
    const titleExists = products.some(p => p.id !== id && p.title.toLowerCase() === title.toLowerCase());
    if (titleExists) {
      throw new Error('Product title already exists');
    }

    const updatedProducts = products.map(p => 
      p.id === id ? { ...p, title: title.trim(), price, currency } : p
    );
    await saveProducts(updatedProducts);
  }, [userRole, products, saveProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    if (userRole !== 'seller') {
      throw new Error('Only sellers can delete products');
    }

    const updatedProducts = products.filter(p => p.id !== id);
    await saveProducts(updatedProducts);
  }, [userRole, products, saveProducts]);

  const reorderProducts = useCallback(async (newOrder: Product[]) => {
    if (userRole !== 'seller') {
      throw new Error('Only sellers can reorder products');
    }

    await saveProducts(newOrder);
  }, [userRole, saveProducts]);

  const createProductMessage = useCallback((selectedProducts?: Product[]): ProductMessage => {
    const productsToSend = selectedProducts || products;
    return {
      type: 'hm.product',
      v: 1,
      items: productsToSend,
    };
  }, [products]);

  const clearUserData = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        try {
          await SecureStore.deleteItemAsync('userRole');
          await SecureStore.deleteItemAsync('userProducts');
        } catch {
          await AsyncStorage.removeItem('userRole');
          await AsyncStorage.removeItem('userProducts');
        }
      } else {
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userProducts');
      }
      
      setUserRole(null);
      setProducts([]);
    } catch (error) {
      console.error('Failed to clear user role data:', error);
    }
  }, []);

  // Dev menu functions
  const simulateSellerRole = useCallback(async (enabled: boolean) => {
    if (enabled) {
      await saveUserRole('seller');
    } else {
      await saveUserRole('buyer');
    }
  }, [saveUserRole]);

  const addDummyProducts = useCallback(async () => {
    if (userRole !== 'seller') return;
    
    const dummyProducts: Omit<Product, 'id' | 'createdAt'>[] = [
      { title: 'Premium Coffee Beans', price: 24.99, currency: 'EUR' },
      { title: 'Handmade Ceramic Mug', price: 18.50, currency: 'EUR' },
      { title: 'Organic Honey', price: 12.00, currency: 'EUR' },
    ];

    for (const product of dummyProducts) {
      try {
        await addProduct(product.title, product.price, product.currency);
      } catch (error) {
        // Skip if product already exists
        console.log(`Skipping duplicate product: ${product.title}`);
      }
    }
  }, [userRole, addProduct]);

  const clearAllProducts = useCallback(async () => {
    if (userRole !== 'seller') return;
    await saveProducts([]);
  }, [userRole, saveProducts]);

  return useMemo(() => ({
    userRole,
    products,
    isLoading,
    saveUserRole,
    addProduct,
    updateProduct,
    deleteProduct,
    reorderProducts,
    createProductMessage,
    clearUserData,
    // Dev functions
    simulateSellerRole,
    addDummyProducts,
    clearAllProducts,
  }), [
    userRole,
    products,
    isLoading,
    saveUserRole,
    addProduct,
    updateProduct,
    deleteProduct,
    reorderProducts,
    createProductMessage,
    clearUserData,
    simulateSellerRole,
    addDummyProducts,
    clearAllProducts,
  ]);
});