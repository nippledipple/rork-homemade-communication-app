import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { useLanguage, Language } from '@/providers/LanguageProvider';

export default function LanguageScreen() {
  const { language, changeLanguage, t } = useLanguage();

  const languages: { code: Language; nameKey: string; flag: string }[] = [
    { code: 'de', nameKey: 'language.german', flag: '🇩🇪' },
    { code: 'en', nameKey: 'language.english', flag: '🇺🇸' },
  ];

  const handleLanguageChange = (lang: Language) => {
    changeLanguage(lang);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={styles.languageItem}
            onPress={() => handleLanguageChange(lang.code)}
          >
            <View style={styles.languageInfo}>
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text style={styles.languageName}>{t(lang.nameKey)}</Text>
            </View>
            {language === lang.code && (
              <Check size={20} color="#2E7EFF" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});