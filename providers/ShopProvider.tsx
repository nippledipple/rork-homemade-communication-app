import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { iapService, getProductIdForPackage, IAPError } from '@/utils/iap';

export interface PremiumPackage {
  id: string;
  titleKey: string;
  descriptionKey: string;
  priceKey: string;
  icon: string;
  features: string[];
}

export const premiumPackages: PremiumPackage[] = [
  {
    id: 'pro_pack',
    titleKey: 'package.pro.title',
    descriptionKey: 'package.pro.description',
    priceKey: 'package.pro.price',
    icon: '⚡',
    features: ['unlimited_chats', 'large_images', 'variable_timer']
  },
  {
    id: 'stealth_pack',
    titleKey: 'package.stealth.title',
    descriptionKey: 'package.stealth.description',
    priceKey: 'package.stealth.price',
    icon: '🥷',
    features: ['decoy_pin', 'icon_disguise', 'quick_kill']
  },
  {
    id: 'power_pack',
    titleKey: 'package.power.title',
    descriptionKey: 'package.power.description',
    priceKey: 'package.power.price',
    icon: '🚀',
    features: ['multi_device', 'broadcast']
  },
  {
    id: 'vault_pack',
    titleKey: 'package.vault.title',
    descriptionKey: 'package.vault.description',
    priceKey: 'package.vault.price',
    icon: '🔐',
    features: ['shamir_backup', 'encrypted_export']
  },
  {
    id: 'media_pack',
    titleKey: 'package.media.title',
    descriptionKey: 'package.media.description',
    priceKey: 'package.media.price',
    icon: '🎵',
    features: ['voice_messages', 'gallery_locker']
  }
];

interface PurchaseState {
  [packageId: string]: boolean;
}

export const [ShopProvider, useShop] = createContextHook(() => {
  const [purchases, setPurchases] = useState<PurchaseState>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});

  const loadPurchases = useCallback(async () => {
    try {
      // Initialize IAP service
      await iapService.initialize();
      
      // Load IAP purchases
      const iapPurchases = iapService.getPurchases();
      const purchaseState: PurchaseState = {};
      
      iapPurchases.forEach(purchase => {
        // Map product IDs back to package IDs
        const packageId = Object.entries({
          'pro_pack': 'com.homemade.pro_pack',
          'stealth_pack': 'com.homemade.stealth_pack',
          'power_pack': 'com.homemade.power_pack',
          'vault_pack': 'com.homemade.vault_pack',
          'media_pack': 'com.homemade.media_pack',
        }).find(([, productId]) => productId === purchase.productId)?.[0];
        
        if (packageId) {
          purchaseState[packageId] = true;
        }
      });
      
      // Use setTimeout to ensure state updates happen after component is mounted
      setTimeout(() => {
        setPurchases(purchaseState);
      }, 0);
      
      // Load localized prices
      const priceMap: Record<string, string> = {};
      for (const pkg of premiumPackages) {
        try {
          const products = await iapService.getProducts();
          const productId = getProductIdForPackage(pkg.id);
          const product = products.find(p => p.productId === productId);
          priceMap[pkg.id] = product?.localizedPrice || '$0.99';
        } catch (error) {
          console.error(`Failed to load price for ${pkg.id}:`, error);
          priceMap[pkg.id] = '$0.99';
        }
      }
      setTimeout(() => {
        setPrices(priceMap);
      }, 0);
      
      // Load test mode
      const testModeStored = await AsyncStorage.getItem('testMode');
      if (testModeStored) {
        setTimeout(() => {
          setTestMode(JSON.parse(testModeStored));
        }, 0);
      }
    } catch (error) {
      console.error('Failed to load purchases:', error);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);



  const enableTestMode = useCallback(async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem('testMode', JSON.stringify(enabled));
      setTestMode(enabled);
    } catch (error) {
      console.error('Failed to save test mode:', error);
    }
  }, []);

  const simulatePurchase = useCallback(async (packageId: string) => {
    if (!testMode) return false;
    
    try {
      const productId = getProductIdForPackage(packageId);
      await iapService.simulatePurchase(productId);
      
      const newPurchases = { ...purchases, [packageId]: true };
      setPurchases(newPurchases);
      
      Alert.alert(
        'Test Purchase Successful! 🧪',
        `Test mode: ${packageId} has been activated.`,
        [{ text: 'OK' }]
      );
      
      return true;
    } catch (error) {
      console.error('Test purchase failed:', error);
      return false;
    }
  }, [testMode, purchases]);

  const purchasePackage = useCallback(async (packageId: string): Promise<boolean> => {
    if (testMode) {
      return simulatePurchase(packageId);
    }

    setIsLoading(true);
    
    try {
      const productId = getProductIdForPackage(packageId);
      const purchase = await iapService.purchaseProduct(productId);
      
      if (purchase.purchaseState === 'purchased') {
        // Update local state
        const newPurchases = { ...purchases, [packageId]: true };
        setPurchases(newPurchases);
        
        console.log(`✅ Successfully purchased ${packageId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Purchase failed:', error);
      
      if (error instanceof IAPError) {
        if (error.userCancelled) {
          console.log('User cancelled purchase');
          return false;
        }
        
        if (error.code === 'ALREADY_PURCHASED') {
          Alert.alert(
            'Already Purchased',
            'You already own this premium pack! Try restoring your purchases if you don\'t see it.',
            [{ text: 'OK' }]
          );
          return false;
        }
        
        if (error.code === 'PLATFORM_NOT_SUPPORTED') {
          // Error already shown by IAP service
          return false;
        }
      }
      
      Alert.alert(
        'Purchase Failed',
        'Unable to complete your purchase. Please check your payment method and try again.',
        [{ text: 'OK' }]
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [testMode, purchases, simulatePurchase]);

  const resetPurchases = useCallback(async () => {
    try {
      await iapService.clearAllPurchases();
      setPurchases({});
      console.log('🧹 All purchases reset');
    } catch (error) {
      console.error('Failed to reset purchases:', error);
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const restoredPurchases = await iapService.restorePurchases();
      
      const purchaseState: PurchaseState = {};
      restoredPurchases.forEach(purchase => {
        // Map product IDs back to package IDs
        const packageId = Object.entries({
          'pro_pack': 'com.homemade.pro_pack',
          'stealth_pack': 'com.homemade.stealth_pack', 
          'power_pack': 'com.homemade.power_pack',
          'vault_pack': 'com.homemade.vault_pack',
          'media_pack': 'com.homemade.media_pack',
        }).find(([, productId]) => productId === purchase.productId)?.[0];
        
        if (packageId) {
          purchaseState[packageId] = true;
        }
      });
      
      setPurchases(purchaseState);
      
      if (restoredPurchases.length > 0) {
        Alert.alert(
          'Purchases Restored! ✅',
          `Successfully restored ${restoredPurchases.length} purchase${restoredPurchases.length === 1 ? '' : 's'}.`,
          [{ text: 'Great!' }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases were found to restore.',
          [{ text: 'OK' }]
        );
      }
      
      return restoredPurchases.length > 0;
    } catch (error) {
      console.error('Failed to restore purchases:', error);
      
      Alert.alert(
        'Restore Failed',
        'Unable to restore your purchases. Please try again later.',
        [{ text: 'OK' }]
      );
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isPurchased = useCallback((packageId: string): boolean => {
    return purchases[packageId] === true;
  }, [purchases]);

  const hasAnyPremium = useMemo(() => {
    return Object.values(purchases).some(purchased => purchased === true);
  }, [purchases]);

  const getLocalizedPrice = useCallback((packageId: string): string => {
    return prices[packageId] || '$0.99';
  }, [prices]);

  return useMemo(() => ({
    purchases,
    isLoading,
    testMode,
    prices,
    purchasePackage,
    resetPurchases,
    restorePurchases,
    isPurchased,
    hasAnyPremium,
    enableTestMode,
    simulatePurchase,
    getLocalizedPrice,
  }), [
    purchases,
    isLoading,
    testMode,
    prices,
    purchasePackage,
    resetPurchases,
    restorePurchases,
    isPurchased,
    hasAnyPremium,
    enableTestMode,
    simulatePurchase,
    getLocalizedPrice,
  ]);
});