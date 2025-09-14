import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Crown, Check } from 'lucide-react-native';
import { useLanguage } from '@/providers/LanguageProvider';
import { useShop, premiumPackages } from '@/providers/ShopProvider';

export default function ShopScreen() {
  const { t } = useLanguage();
  const { purchasePackage, isPurchased, isLoading, restorePurchases, getLocalizedPrice } = useShop();

  const handlePurchase = async (packageId: string) => {
    if (isPurchased(packageId)) return;
    
    const success = await purchasePackage(packageId);
    if (success) {
      console.log(`Successfully purchased ${packageId}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Crown size={32} color="#FFD700" />
        <Text style={styles.title}>{t('shop.title')}</Text>
        <Text style={styles.subtitle}>{t('shop.unlockFeatures')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{t('shop.premiumPackages')}</Text>
        
        {premiumPackages.map((pkg) => {
          const purchased = isPurchased(pkg.id);
          
          return (
            <View key={pkg.id} style={styles.packageCard}>
              <View style={styles.packageHeader}>
                <View style={styles.packageIcon}>
                  <Text style={styles.packageEmoji}>{pkg.icon}</Text>
                </View>
                <View style={styles.packageInfo}>
                  <Text style={styles.packageTitle}>{t(pkg.titleKey)}</Text>
                  <Text style={styles.packageDescription}>{t(pkg.descriptionKey)}</Text>
                </View>
                <View style={styles.packagePrice}>
                  <Text style={styles.priceText}>{getLocalizedPrice(pkg.id)}</Text>
                </View>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  purchased && styles.purchasedButton,
                  isLoading && styles.disabledButton
                ]}
                onPress={() => handlePurchase(pkg.id)}
                disabled={purchased || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    {purchased ? (
                      <Check size={16} color="#FFFFFF" />
                    ) : (
                      <Crown size={16} color="#FFFFFF" />
                    )}
                    <Text style={styles.purchaseButtonText}>
                      {purchased ? t('shop.owned') : t('shop.buy')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={restorePurchases}
          disabled={isLoading}
        >
          <Text style={styles.restoreButtonText}>
            {t('language') === 'de' ? 'Käufe wiederherstellen' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.footerText}>
          💡 {t('language') === 'de' 
            ? 'Einmalige Käufe, keine Abonnements' 
            : 'One-time purchases, no subscriptions'}
        </Text>
        
        <Text style={styles.footerSubtext}>
          {t('language') === 'de' 
            ? 'Zahlungen werden über App Store/Google Play abgewickelt' 
            : 'Payments processed through App Store/Google Play'}
        </Text>
      </View>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 16,
  },
  packageCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  packageIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  packageEmoji: {
    fontSize: 24,
  },
  packageInfo: {
    flex: 1,
    marginRight: 12,
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  packagePrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7EFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  purchasedButton: {
    backgroundColor: '#28A745',
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#555',
    textAlign: 'center',
  },
  restoreButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});