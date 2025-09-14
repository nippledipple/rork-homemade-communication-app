import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type Language = 'de' | 'en';

interface Translations {
  [key: string]: {
    de: string;
    en: string;
  };
}

const translations: Translations = {
  // Navigation
  'nav.chats': { de: 'Chats', en: 'Chats' },
  'nav.shop': { de: 'Shop', en: 'Shop' },
  'nav.settings': { de: 'Einstellungen', en: 'Settings' },
  
  // Settings
  'settings.title': { de: 'Einstellungen', en: 'Settings' },
  'settings.myQrCode': { de: 'Mein QR-Code', en: 'My QR Code' },
  'settings.shareWithContacts': { de: 'Mit Kontakten teilen', en: 'Share with contacts' },
  'settings.changePIN': { de: 'PIN ändern', en: 'Change PIN' },
  'settings.updateSecurityPIN': { de: 'Sicherheits-PIN aktualisieren', en: 'Update your security PIN' },
  'settings.upgradeToPremiun': { de: 'Auf Premium upgraden', en: 'Upgrade to Premium' },
  'settings.premiumActive': { de: 'Premium aktiv', en: 'Premium Active' },
  'settings.unlockAllFeatures': { de: 'Alle Features freischalten', en: 'Unlock all features' },
  'settings.allFeaturesUnlocked': { de: 'Alle Features freigeschaltet', en: 'All features unlocked' },
  'settings.security': { de: 'Sicherheit', en: 'Security' },
  'settings.faceIdAutoLock': { de: 'Face ID, Auto-Sperre', en: 'Face ID, Auto-lock' },
  'settings.language': { de: 'Sprache', en: 'Language' },
  'settings.chooseLanguage': { de: 'Sprache wählen', en: 'Choose language' },
  'settings.clearAllData': { de: 'Alle Daten löschen', en: 'Clear All Data' },
  'settings.deleteEverythingAndReset': { de: 'Alles löschen und zurücksetzen', en: 'Delete everything and reset' },
  'settings.about': { de: 'Über', en: 'About' },
  'settings.version': { de: 'Version', en: 'Version' },
  'settings.build': { de: 'Build', en: 'Build' },
  'settings.tapsLeft': { de: 'Taps übrig', en: 'taps left' },
  'settings.tapMoreTimes': { de: 'Tippe noch', en: 'Tap' },
  'settings.moreTimesToEnable': { de: 'mal, um das Entwicklermenü zu aktivieren', en: 'more times to enable developer menu' },
  'settings.devMenu': { de: '🔧 Entwicklermenü', en: '🔧 Developer Menu' },
  'settings.testingFeatures': { de: 'Test-Features', en: 'Testing features' },
  
  // Security
  'security.title': { de: 'Sicherheit', en: 'Security' },
  'security.faceId': { de: 'Face ID', en: 'Face ID' },
  'security.useFaceId': { de: 'Face ID verwenden', en: 'Use Face ID to unlock' },
  'security.faceIdWarning': { de: 'Wenn Face ID aktiviert ist, können Sie die App auch mit Ihrem Geräte-PIN entsperren 😉', en: 'When Face ID is enabled, you can also unlock the app with your device PIN 😉' },
  'security.autoLock': { de: 'Auto-Sperre', en: 'Auto Lock' },
  'security.lockAfterInactivity': { de: 'Sperrt die App nach Inaktivität automatisch', en: 'Locks the app after inactivity automatically' },
  'security.after10sec': { de: 'Nach 10 Sekunden', en: 'After 10 seconds' },
  'security.after30sec': { de: 'Nach 30 Sekunden', en: 'After 30 seconds' },
  'security.after1min': { de: 'Nach 1 Minute', en: 'After 1 minute' },
  'security.after5min': { de: 'Nach 5 Minuten', en: 'After 5 minutes' },
  'security.never': { de: 'Nie', en: 'Never' },
  
  // Notification Privacy
  'security.notificationPrivacy': { de: 'Benachrichtigungs-Privatsphäre', en: 'Notification Privacy' },
  'security.notificationPrivacyDesc': { de: 'Zeigt nur "Neue Nachricht" (ohne Absender/Content)', en: 'Shows only "New Message" (without sender/content)' },
  
  // Decoy PIN (Premium)
  'security.decoyPin': { de: 'Decoy-PIN', en: 'Decoy PIN' },
  'security.decoyPinDesc': { de: 'Öffnet ein Köder-Profil ohne echte Chats', en: 'Opens a decoy profile without real chats' },
  'security.setupDecoyPin': { de: 'Decoy-PIN einrichten', en: 'Setup Decoy PIN' },
  'security.decoyPinEnabled': { de: 'Decoy-PIN aktiviert', en: 'Decoy PIN enabled' },
  'security.premiumRequired': { de: 'Premium erforderlich', en: 'Premium required' },
  
  // Wipe on Fail (Premium)
  'security.wipeOnFail': { de: 'Wipe-on-Fail', en: 'Wipe on Fail' },
  'security.wipeOnFailDesc': { de: 'Löscht bei 5 falschen PINs alle lokalen Daten. Nicht rückgängig.', en: 'Deletes all local data after 5 wrong PINs. Cannot be undone.' },
  'security.wipeOnFailWarning': { de: '⚠️ WARNUNG: Diese Funktion löscht ALLE Daten nach 5 falschen PIN-Versuchen. Dies kann NICHT rückgängig gemacht werden!', en: '⚠️ WARNING: This feature will delete ALL data after 5 wrong PIN attempts. This CANNOT be undone!' },
  'security.failedAttempts': { de: 'Fehlversuche', en: 'Failed attempts' },
  'security.attemptsRemaining': { de: 'Versuche übrig', en: 'attempts remaining' },
  
  // Screenshot Protection
  'security.screenshotProtection': { de: 'Screenshot-Schutz', en: 'Screenshot Protection' },
  'security.screenshotProtectionDesc': { de: 'Warnt bei Screenshots zum Schutz der Privatsphäre', en: 'Warns on screenshots to protect privacy' },
  'security.screenshotProtectionEnabled': { de: 'Screenshot-Warnung aktiviert', en: 'Screenshot warning enabled' },
  'security.screenshotProtectionDisabled': { de: 'Screenshot-Warnung deaktiviert', en: 'Screenshot warning disabled' },
  'security.screenshotProtectionWarning': { de: 'Screenshot-Schutz aktiviert. Bei Screenshots erscheint eine Warnung zum Schutz Ihrer und der Privatsphäre anderer.', en: 'Screenshot protection enabled. A warning will appear when screenshots are taken to protect your and others privacy.' },
  
  // Shop
  'shop.title': { de: 'Shop', en: 'Shop' },
  'shop.premiumPackages': { de: 'Premium-Pakete', en: 'Premium Packages' },
  'shop.unlockFeatures': { de: 'Schalte erweiterte Features frei', en: 'Unlock advanced features' },
  'shop.buy': { de: 'Kaufen', en: 'Buy' },
  'shop.owned': { de: 'Besitzt', en: 'Owned' },
  
  // Premium Packages
  'package.pro.title': { de: 'Pro Pack', en: 'Pro Pack' },
  'package.pro.description': { de: 'Unbegrenzte Chats, Bilder bis 20 MB, variable Auto-Delete-Timer (10-120s)', en: 'Unlimited chats, images up to 20 MB, variable auto-delete timer (10-120s)' },
  'package.pro.price': { de: '4,99 €', en: '$4.99' },
  
  'package.stealth.title': { de: 'Stealth Pack', en: 'Stealth Pack' },
  'package.stealth.description': { de: 'Decoy-PIN, App-Icon-Tarnung, Homescreen-Quick-Kill', en: 'Decoy PIN, app icon disguise, homescreen quick-kill' },
  'package.stealth.price': { de: '6,99 €', en: '$6.99' },
  
  'package.power.title': { de: 'Power Pack', en: 'Power Pack' },
  'package.power.description': { de: 'Multi-Device (bis 3 Geräte), Broadcast an 5 Kontakte', en: 'Multi-device (up to 3 devices), broadcast to 5 contacts' },
  'package.power.price': { de: '7,99 €', en: '$7.99' },
  
  'package.vault.title': { de: 'Vault Pack', en: 'Vault Pack' },
  'package.vault.description': { de: 'Shamir-Backup lokal, verschlüsselte Exports', en: 'Local Shamir backup, encrypted exports' },
  'package.vault.price': { de: '5,99 €', en: '$5.99' },
  
  'package.media.title': { de: 'Media Pack', en: 'Media Pack' },
  'package.media.description': { de: 'Sprachnachrichten & Galerie-Locker', en: 'Voice messages & gallery locker' },
  'package.media.price': { de: '3,99 €', en: '$3.99' },
  
  // Developer Menu
  'dev.title': { de: '🔧 Entwicklermenü', en: '🔧 Developer Menu' },
  'dev.subtitle': { de: 'Test- und Debug-Tools', en: 'Testing and debugging tools' },
  'dev.simulatePremium': { de: 'Premium simulieren', en: 'Simulate Premium' },
  'dev.togglePremiumFeatures': { de: 'Premium-Features umschalten', en: 'Toggle premium features' },
  'dev.addDemoChat': { de: 'Demo-Chat hinzufügen', en: 'Add Demo Chat' },
  'dev.createTestConversation': { de: 'Test-Unterhaltung erstellen', en: 'Create a test conversation' },
  'dev.resetIAPStatus': { de: 'IAP-Status zurücksetzen', en: 'Reset IAP Status' },
  'dev.clearAllPurchases': { de: 'Alle Käufe löschen', en: 'Clear all purchases' },
  'dev.shopTesting': { de: 'Shop testen', en: 'Test Shop' },
  'dev.simulatePurchases': { de: 'Käufe simulieren ohne echtes Geld', en: 'Simulate purchases without real money' },
  'dev.resetAllPurchases': { de: 'Alle Käufe zurücksetzen', en: 'Reset All Purchases' },
  'dev.forceOfflineMode': { de: 'Offline-Modus erzwingen', en: 'Force Offline Mode' },
  'dev.simulateConnectionLoss': { de: 'Verbindungsverlust simulieren', en: 'Simulate connection loss' },
  'dev.clearAllChats': { de: 'Alle Chats löschen', en: 'Clear All Chats' },
  'dev.deleteAllConversations': { de: 'Alle Unterhaltungen löschen', en: 'Delete all conversations' },
  'dev.warningText': { de: '⚠️ Diese Optionen sind nur zum Testen', en: '⚠️ These options are for testing only' },
  
  // Security QA (Dev Menu)
  'dev.securityQA': { de: 'Security QA', en: 'Security QA' },
  'dev.testDecoyPin': { de: 'Decoy-PIN sofort testen', en: 'Test Decoy PIN immediately' },
  'dev.enterDecoyMode': { de: 'In Decoy-Profil wechseln', en: 'Enter decoy profile' },
  'dev.testWipeOnFail': { de: 'Wipe-on-Fail testen', en: 'Test Wipe-on-Fail' },
  'dev.simulateWipe': { de: 'Nur Simulation', en: 'Simulation only' },
  'dev.triggerAutoLock': { de: 'Auto-Lock jetzt auslösen', en: 'Trigger Auto-Lock now' },
  'dev.lockAppNow': { de: 'App sofort sperren', en: 'Lock app immediately' },
  
  // Alerts
  'alert.success': { de: 'Erfolg', en: 'Success' },
  'alert.error': { de: 'Fehler', en: 'Error' },
  'alert.warning': { de: 'Warnung', en: 'Warning' },
  'alert.cancel': { de: 'Abbrechen', en: 'Cancel' },
  'alert.ok': { de: 'OK', en: 'OK' },
  'alert.yes': { de: 'Ja', en: 'Yes' },
  'alert.no': { de: 'Nein', en: 'No' },
  'alert.continue': { de: 'Fortfahren', en: 'Continue' },
  'alert.clear': { de: 'Löschen', en: 'Clear' },
  'alert.clearEverything': { de: 'Alles löschen', en: 'Clear Everything' },
  
  'alert.clearAllData.title': { de: 'Alle Daten löschen', en: 'Clear All Data' },
  'alert.clearAllData.message': { de: 'Dies wird alle Chats, Kontakte löschen und die App zurücksetzen. Dies kann nicht rückgängig gemacht werden.', en: 'This will delete all chats, contacts, and reset the app. This cannot be undone.' },
  
  'alert.clearAllChats.title': { de: 'Alle Chats löschen', en: 'Clear All Chats' },
  'alert.clearAllChats.message': { de: 'Dies wird alle Chats löschen. Fortfahren?', en: 'This will delete all chats. Continue?' },
  
  'alert.devMenu.enabled': { de: 'Entwicklermenü aktiviert', en: 'Developer menu enabled' },
  'alert.devMenu.disabled': { de: 'Entwicklermenü deaktiviert', en: 'Developer menu disabled' },
  
  'alert.demoChat.added': { de: 'Demo-Chat hinzugefügt', en: 'Demo chat added' },
  'alert.purchases.reset': { de: 'Käufe zurückgesetzt', en: 'Purchases reset' },
  'alert.chats.cleared': { de: 'Alle Chats gelöscht', en: 'All chats cleared' },
  
  'alert.premium.active': { de: 'Sie haben Premium-Zugang', en: 'You have premium access' },
  'alert.premium.comingSoon': { de: 'Premium-Upgrade kommt bald', en: 'Premium upgrade coming soon' },
  'alert.productAdded': { de: 'Produkt hinzugefügt', en: 'Product added' },
  'alert.productUpdated': { de: 'Produkt aktualisiert', en: 'Product updated' },
  'alert.productDeleted': { de: 'Produkt gelöscht', en: 'Product deleted' },
  'alert.productsSent': { de: 'Produkte gesendet', en: 'Products sent' },
  'alert.productsCopied': { de: 'In Zwischenablage kopiert', en: 'Copied to clipboard' },
  'alert.dummyProductsAdded': { de: 'Dummy-Produkte hinzugefügt', en: 'Dummy products added' },
  'alert.productsCleared': { de: 'Alle Produkte gelöscht', en: 'All products cleared' },
  'alert.feature.comingSoon': { de: 'Diese Funktion ist noch nicht implementiert', en: 'This feature is not yet implemented' },
  
  // Security Alerts
  'alert.decoyPin.setup': { de: 'Decoy-PIN einrichten', en: 'Setup Decoy PIN' },
  'alert.decoyPin.enter': { de: 'Geben Sie eine 4-8 stellige Decoy-PIN ein', en: 'Enter a 4-8 digit decoy PIN' },
  'alert.decoyPin.success': { de: 'Decoy-PIN erfolgreich eingerichtet', en: 'Decoy PIN setup successful' },
  'alert.decoyPin.failed': { de: 'Decoy-PIN konnte nicht eingerichtet werden', en: 'Failed to setup decoy PIN' },
  'alert.wipeOnFail.confirm': { de: 'Wipe-on-Fail aktivieren?', en: 'Enable Wipe-on-Fail?' },
  'alert.wipeOnFail.enabled': { de: 'Wipe-on-Fail aktiviert', en: 'Wipe-on-Fail enabled' },
  'alert.wipeOnFail.disabled': { de: 'Wipe-on-Fail deaktiviert', en: 'Wipe-on-Fail disabled' },
  'alert.autoLock.triggered': { de: 'App automatisch gesperrt', en: 'App automatically locked' },
  'alert.decoyMode.entered': { de: 'Decoy-Modus aktiviert', en: 'Decoy mode activated' },
  'alert.wipeTest.simulated': { de: 'Wipe-on-Fail Test: Würde nach 5 Fehlversuchen alle Daten löschen', en: 'Wipe-on-Fail Test: Would delete all data after 5 failed attempts' },
  'alert.enable': { de: 'Aktivieren', en: 'Enable' },
  'alert.disable': { de: 'Deaktivieren', en: 'Disable' },
  'alert.setup': { de: 'Einrichten', en: 'Setup' },
  'alert.confirm': { de: 'Bestätigen', en: 'Confirm' },
  'alert.delete': { de: 'Löschen', en: 'Delete' },
  'alert.edit': { de: 'Bearbeiten', en: 'Edit' },
  
  // Language Selection
  'language.title': { de: 'Sprache', en: 'Language' },
  'language.german': { de: 'Deutsch', en: 'German' },
  'language.english': { de: 'Englisch', en: 'English' },
  
  // Onboarding
  'onboarding.chooseName': { de: 'Wählen Sie Ihren Anzeigenamen', en: 'Choose your display name' },
  'onboarding.enterName': { de: 'Name eingeben', en: 'Enter name' },
  'onboarding.nameHint': { de: 'So werden Ihre Kontakte Sie sehen', en: 'This is how your contacts will see you' },
  'onboarding.nameRequired': { de: 'Bitte geben Sie mindestens 2 Zeichen ein', en: 'Please enter at least 2 characters' },
  'onboarding.chooseRole': { de: 'Wählen Sie Ihre Rolle', en: 'Choose your role' },
  'onboarding.buyer': { de: 'Käufer', en: 'Buyer' },
  'onboarding.seller': { de: 'Verkäufer', en: 'Seller' },
  'onboarding.buyerDescription': { de: 'Chatten und Produkte von Verkäufern erhalten', en: 'Chat and receive products from sellers' },
  'onboarding.sellerDescription': { de: 'Chatten und Produkte an Käufer senden', en: 'Chat and send products to buyers' },
  'onboarding.roleHint': { de: 'Sie können dies später nicht ändern', en: 'You cannot change this later' },
  'onboarding.setPin': { de: 'PIN festlegen', en: 'Set your PIN' },
  'onboarding.enterPin': { de: '4-8 stellige PIN eingeben', en: 'Enter 4-8 digit PIN' },
  'onboarding.confirmPin': { de: 'PIN bestätigen', en: 'Confirm PIN' },
  'onboarding.pinHint': { de: 'Sie verwenden diese zum Entsperren der App', en: 'You\'ll use this to unlock the app' },
  'onboarding.invalidPin': { de: 'PIN muss 4-8 Ziffern haben', en: 'PIN must be 4-8 digits' },
  'onboarding.pinMismatch': { de: 'PINs stimmen nicht überein', en: 'PINs do not match' },
  'onboarding.settingUp': { de: 'Einrichten...', en: 'Setting up...' },
  'onboarding.completeSetup': { de: 'Setup abschließen', en: 'Complete Setup' },
  'onboarding.setupFailed': { de: 'Setup konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.', en: 'Could not complete setup. Please try again.' },
  'onboarding.welcomeSeller': { de: 'Willkommen, Verkäufer!', en: 'Welcome, Seller!' },
  'onboarding.sellerHint': { de: 'Richten Sie Ihren Shop in den Einstellungen → Mein Shop ein', en: 'Set up your shop in Settings → My Shop' },
  'onboarding.back': { de: 'Zurück', en: 'Back' },
  
  // Shop Manager
  'shop.myShop': { de: 'Mein Shop', en: 'My Shop' },
  'shop.manageProducts': { de: 'Produkte verwalten', en: 'Manage Products' },
  'shop.addProduct': { de: 'Produkt hinzufügen', en: 'Add Product' },
  'shop.editProduct': { de: 'Produkt bearbeiten', en: 'Edit Product' },
  'shop.deleteProduct': { de: 'Produkt löschen', en: 'Delete Product' },
  'shop.productTitle': { de: 'Titel', en: 'Title' },
  'shop.productPrice': { de: 'Preis', en: 'Price' },
  'shop.productCurrency': { de: 'Währung', en: 'Currency' },
  'shop.save': { de: 'Speichern', en: 'Save' },
  'shop.cancel': { de: 'Abbrechen', en: 'Cancel' },
  'shop.noProducts': { de: 'Keine Produkte', en: 'No Products' },
  'shop.addFirstProduct': { de: 'Fügen Sie Ihr erstes Produkt hinzu', en: 'Add your first product' },
  'shop.sendProducts': { de: 'Produkte senden', en: 'Send Products' },
  'shop.sendAll': { de: 'Alle senden', en: 'Send All' },
  'shop.selectProducts': { de: 'Auswahl treffen', en: 'Select Products' },
  'shop.selectedProducts': { de: 'Ausgewählte Produkte', en: 'Selected Products' },
  'shop.send': { de: 'Senden', en: 'Send' },
  'shop.copy': { de: 'Kopieren', en: 'Copy' },
  'shop.limitReached': { de: 'Limit erreicht', en: 'Limit Reached' },
  'shop.limitReachedMessage': { de: 'Premium schaltet bis zu 100 Produkte frei.', en: 'Premium unlocks up to 100 products.' },
  'shop.toShop': { de: 'Zum Shop', en: 'To Shop' },
  'shop.onlyForSellers': { de: 'Nur für Verkäufer verfügbar', en: 'Only available for sellers' },
  
  // Product validation
  'shop.titleRequired': { de: 'Titel erforderlich', en: 'Title required' },
  'shop.titleTooShort': { de: 'Titel muss mindestens 2 Zeichen haben', en: 'Title must be at least 2 characters' },
  'shop.titleTooLong': { de: 'Titel darf maximal 60 Zeichen haben', en: 'Title must be at most 60 characters' },
  'shop.titleExists': { de: 'Titel bereits vorhanden', en: 'Title already exists' },
  'shop.priceInvalid': { de: 'Preis ungültig', en: 'Invalid price' },
  'shop.priceRange': { de: 'Preis muss zwischen 0 und 99999 liegen', en: 'Price must be between 0 and 99999' },
  'shop.currencyRequired': { de: 'Währung erforderlich', en: 'Currency required' },
  
  // Limits
  'shop.freeLimit': { de: 'Free: max. 4 Produkte', en: 'Free: max. 4 products' },
  'shop.premiumLimit': { de: 'Premium: max. 100 Produkte', en: 'Premium: max. 100 products' },
  'shop.productsCount': { de: 'Produkte', en: 'products' },
  
  // Dev Menu - Seller QA
  'dev.sellerQA': { de: 'Seller QA', en: 'Seller QA' },
  'dev.simulateSeller': { de: 'Als Seller simulieren', en: 'Simulate as Seller' },
  'dev.addDummyProducts': { de: 'Produkt-Dummy hinzufügen', en: 'Add Dummy Products' },
  'dev.clearProducts': { de: 'Produkte löschen (lokal)', en: 'Clear Products (local)' },
  'dev.simulatePremiumLimits': { de: 'Premium simulieren (Limits testen)', en: 'Simulate Premium (test limits)' },
};

export const [LanguageProvider, useLanguage] = createContextHook(() => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');

  const loadLanguage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('language');
      if (stored && (stored === 'de' || stored === 'en')) {
        setCurrentLanguage(stored as Language);
      } else {
        // Auto-detect based on device locale
        const deviceLanguage = Platform.select({
          ios: 'en', // Would use NativeModules.SettingsManager?.settings?.AppleLocale in real app
          android: 'en', // Would use NativeModules.I18nManager?.localeIdentifier in real app
          default: 'en'
        });
        const detectedLang = deviceLanguage?.startsWith('de') ? 'de' : 'en';
        setCurrentLanguage(detectedLang);
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  }, []);

  useEffect(() => {
    loadLanguage();
  }, [loadLanguage]);

  const changeLanguage = useCallback(async (language: Language) => {
    try {
      await AsyncStorage.setItem('language', language);
      setCurrentLanguage(language);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  }, []);

  const t = useCallback((key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[currentLanguage] || translation.en || key;
  }, [currentLanguage]);

  return useMemo(() => ({
    language: currentLanguage,
    changeLanguage,
    t,
  }), [currentLanguage, changeLanguage, t]);
});