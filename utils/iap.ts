import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

export interface IAPProduct {
  productId: string;
  price: string;
  localizedPrice: string;
  currencyCode: string;
  title: string;
  description: string;
  type: 'consumable' | 'non_consumable' | 'subscription';
}

export interface IAPPurchase {
  productId: string;
  transactionId: string;
  purchaseTime: number;
  purchaseState: 'purchased' | 'pending' | 'cancelled';
  receipt: string;
}

export interface IAPErrorInterface {
  code: string;
  message: string;
  userCancelled?: boolean;
}

// Product IDs that match your App Store Connect / Google Play Console configuration
export const PRODUCT_IDS = {
  PRO_PACK: 'com.homemade.pro_pack',
  STEALTH_PACK: 'com.homemade.stealth_pack', 
  POWER_PACK: 'com.homemade.power_pack',
  VAULT_PACK: 'com.homemade.vault_pack',
  MEDIA_PACK: 'com.homemade.media_pack',
} as const;

// Mock products for development/testing
const MOCK_PRODUCTS: IAPProduct[] = [
  {
    productId: PRODUCT_IDS.PRO_PACK,
    price: '4.99',
    localizedPrice: '$4.99',
    currencyCode: 'USD',
    title: 'Pro Pack',
    description: 'Unlock unlimited chats and advanced features',
    type: 'non_consumable'
  },
  {
    productId: PRODUCT_IDS.STEALTH_PACK,
    price: '2.99',
    localizedPrice: '$2.99', 
    currencyCode: 'USD',
    title: 'Stealth Pack',
    description: 'Advanced privacy and security features',
    type: 'non_consumable'
  },
  {
    productId: PRODUCT_IDS.POWER_PACK,
    price: '6.99',
    localizedPrice: '$6.99',
    currencyCode: 'USD', 
    title: 'Power Pack',
    description: 'Multi-device sync and broadcast features',
    type: 'non_consumable'
  },
  {
    productId: PRODUCT_IDS.VAULT_PACK,
    price: '3.99',
    localizedPrice: '$3.99',
    currencyCode: 'USD',
    title: 'Vault Pack', 
    description: 'Advanced backup and export features',
    type: 'non_consumable'
  },
  {
    productId: PRODUCT_IDS.MEDIA_PACK,
    price: '1.99',
    localizedPrice: '$1.99',
    currencyCode: 'USD',
    title: 'Media Pack',
    description: 'Voice messages and gallery protection',
    type: 'non_consumable'
  }
];

class IAPService {
  private isInitialized = false;
  private products: IAPProduct[] = [];
  private purchases: IAPPurchase[] = [];
  private listeners: ((purchase: IAPPurchase) => void)[] = [];

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🛒 Initializing IAP Service...');
      
      if (Platform.OS === 'web') {
        console.log('🌐 Web platform detected - using mock IAP');
        this.products = MOCK_PRODUCTS;
        this.isInitialized = true;
        return;
      }

      // In a real app with custom dev client, you would initialize the actual IAP library here:
      // 
      // For expo-in-app-purchases:
      // await InAppPurchases.connectAsync();
      // 
      // For react-native-purchases (RevenueCat):
      // await Purchases.configure({ apiKey: 'your_revenuecat_api_key' });
      
      // Load mock products for Expo Go
      this.products = MOCK_PRODUCTS;
      
      // Load stored purchases
      await this.loadStoredPurchases();
      
      this.isInitialized = true;
      console.log('✅ IAP Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize IAP Service:', error);
      throw error;
    }
  }

  async getProducts(): Promise<IAPProduct[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.products;
  }

  async purchaseProduct(productId: string): Promise<IAPPurchase> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const product = this.products.find(p => p.productId === productId);
    if (!product) {
      throw new IAPError('PRODUCT_NOT_FOUND', `Product ${productId} not found`);
    }

    // Check if already purchased (for non-consumables)
    if (product.type === 'non_consumable') {
      const existingPurchase = this.purchases.find(p => p.productId === productId);
      if (existingPurchase && existingPurchase.purchaseState === 'purchased') {
        throw new IAPError('ALREADY_PURCHASED', 'Product already purchased');
      }
    }

    return new Promise((resolve, reject) => {
      if (Platform.OS === 'web') {
        Alert.alert(
          'Purchase Not Available',
          'In-App Purchases are only available on mobile devices. Please use the mobile app to make purchases.',
          [{ text: 'OK', onPress: () => reject(new IAPError('PLATFORM_NOT_SUPPORTED', 'Web platform not supported')) }]
        );
        return;
      }

      // Simulate App Store/Google Play purchase dialog
      Alert.alert(
        'Confirm Purchase',
        `Purchase ${product.title} for ${product.localizedPrice}?\n\n${product.description}`,
        [
          { 
            text: 'Cancel', 
            style: 'cancel', 
            onPress: () => reject(new IAPError('USER_CANCELLED', 'User cancelled purchase', true))
          },
          { 
            text: 'Buy', 
            onPress: async () => {
              try {
                // Simulate purchase processing
                const purchase: IAPPurchase = {
                  productId,
                  transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  purchaseTime: Date.now(),
                  purchaseState: 'purchased',
                  receipt: `receipt_${productId}_${Date.now()}`
                };

                // Store purchase
                this.purchases.push(purchase);
                await this.saveStoredPurchases();

                // Notify listeners
                this.listeners.forEach(listener => listener(purchase));

                // Show success message
                Alert.alert(
                  'Purchase Successful! 🎉',
                  `Thank you for purchasing ${product.title}! Your premium features are now active.`,
                  [{ text: 'Awesome!' }]
                );

                // Request app review after successful purchase
                if (await StoreReview.hasAction()) {
                  setTimeout(() => {
                    StoreReview.requestReview();
                  }, 2000);
                }

                resolve(purchase);
              } catch (error) {
                console.error('Purchase processing failed:', error);
                reject(new IAPError('PURCHASE_FAILED', 'Failed to process purchase'));
              }
            }
          }
        ]
      );
    });
  }

  async restorePurchases(): Promise<IAPPurchase[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      console.log('🔄 Restoring purchases...');
      
      // In a real app, this would call the actual IAP restore method:
      // const restoredPurchases = await InAppPurchases.getPurchaseHistoryAsync();
      // or
      // const restoredPurchases = await Purchases.restorePurchases();
      
      // For now, return stored purchases
      await this.loadStoredPurchases();
      
      console.log(`✅ Restored ${this.purchases.length} purchases`);
      return this.purchases.filter(p => p.purchaseState === 'purchased');
    } catch (error) {
      console.error('❌ Failed to restore purchases:', error);
      throw new IAPError('RESTORE_FAILED', 'Failed to restore purchases');
    }
  }

  getPurchases(): IAPPurchase[] {
    return this.purchases.filter(p => p.purchaseState === 'purchased');
  }

  isPurchased(productId: string): boolean {
    return this.purchases.some(p => p.productId === productId && p.purchaseState === 'purchased');
  }

  addPurchaseListener(listener: (purchase: IAPPurchase) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private async loadStoredPurchases(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('iap_purchases');
      if (stored) {
        this.purchases = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load stored purchases:', error);
    }
  }

  private async saveStoredPurchases(): Promise<void> {
    try {
      await AsyncStorage.setItem('iap_purchases', JSON.stringify(this.purchases));
    } catch (error) {
      console.error('Failed to save purchases:', error);
    }
  }

  // Development/testing methods
  async clearAllPurchases(): Promise<void> {
    this.purchases = [];
    await AsyncStorage.removeItem('iap_purchases');
    console.log('🧹 All purchases cleared');
  }

  async simulatePurchase(productId: string): Promise<void> {
    const product = this.products.find(p => p.productId === productId);
    if (!product) return;

    const purchase: IAPPurchase = {
      productId,
      transactionId: `sim_${Date.now()}`,
      purchaseTime: Date.now(),
      purchaseState: 'purchased',
      receipt: `sim_receipt_${productId}`
    };

    this.purchases.push(purchase);
    await this.saveStoredPurchases();
    this.listeners.forEach(listener => listener(purchase));
  }
}

class IAPError extends Error {
  code: string;
  userCancelled: boolean;

  constructor(code: string, message: string, userCancelled = false) {
    super(message);
    this.name = 'IAPError';
    this.code = code;
    this.userCancelled = userCancelled;
  }
}

// Export singleton instance
export const iapService = new IAPService();
export { IAPError };

// Utility function to map package IDs to product IDs
export function getProductIdForPackage(packageId: string): string {
  const mapping: Record<string, string> = {
    'pro_pack': PRODUCT_IDS.PRO_PACK,
    'stealth_pack': PRODUCT_IDS.STEALTH_PACK,
    'power_pack': PRODUCT_IDS.POWER_PACK,
    'vault_pack': PRODUCT_IDS.VAULT_PACK,
    'media_pack': PRODUCT_IDS.MEDIA_PACK,
  };
  return mapping[packageId] || packageId;
}

// Utility function to get localized price for a package
export async function getLocalizedPrice(packageId: string): Promise<string> {
  try {
    const products = await iapService.getProducts();
    const productId = getProductIdForPackage(packageId);
    const product = products.find(p => p.productId === productId);
    return product?.localizedPrice || '$0.99';
  } catch (error) {
    console.error('Failed to get localized price:', error);
    return '$0.99';
  }
}