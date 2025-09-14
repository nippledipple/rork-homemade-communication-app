import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Camera, RotateCcw, AlertTriangle } from 'lucide-react-native';
import { useSecurity } from '@/providers/SecurityProvider';

export default function ScreenshotBanScreen() {
  const { resetScreenshotBanSimulation, screenshotBanState } = useSecurity();

  const handleResetSimulation = () => {
    Alert.alert(
      'Simulation zurücksetzen',
      'Möchten Sie die Screenshot-Bann Simulation zurücksetzen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Zurücksetzen',
          style: 'default',
          onPress: () => {
            resetScreenshotBanSimulation();
            router.replace('/(app)/chats');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <AlertTriangle size={80} color="#FF3B30" />
        </View>
        
        <Text style={styles.title}>Simulation: Zugang gesperrt</Text>
        
        <Text style={styles.message}>
          Dies ist eine Simulation des Screenshot-Banns.
          {"\n\n"}
          In der echten App wäre Ihr Zugang nach {screenshotBanState.screenshotCount} Screenshots dauerhaft gesperrt.
          {"\n\n"}
          Diese Sperre dient dem Schutz der Privatsphäre aller Nutzer.
        </Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Camera size={24} color="#666" />
            <Text style={styles.statLabel}>Screenshots erkannt</Text>
            <Text style={styles.statValue}>{screenshotBanState.screenshotCount}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={handleResetSimulation}
        >
          <RotateCcw size={20} color="#FFFFFF" />
          <Text style={styles.resetButtonText}>Simulation zurücksetzen</Text>
        </TouchableOpacity>
        
        <Text style={styles.disclaimer}>
          Dies ist nur eine Test-Simulation. Keine echten Daten wurden gelöscht oder gesperrt.
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF3B3020',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  statsContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    minWidth: 200,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7EFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});