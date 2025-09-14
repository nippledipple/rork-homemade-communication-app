import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { Share2 } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';

export default function QRDisplayScreen() {
  const { user } = useAuth();
  
  const qrData = JSON.stringify({
    id: user?.publicId,
    name: user?.displayName,
    key: user?.publicKey,
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Add me on HomeMade: ${qrData}`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your QR Code</Text>
        <Text style={styles.subtitle}>
          Let others scan this to add you as a contact
        </Text>
        
        <View style={styles.qrContainer}>
          <QRCode
            value={qrData}
            size={250}
            color="#FFFFFF"
            backgroundColor="#0A0A0A"
          />
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.userName}>{user?.displayName}</Text>
          <Text style={styles.userId}>ID: {user?.publicId?.slice(0, 12)}...</Text>
        </View>
        
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Share2 size={20} color="#FFFFFF" />
          <Text style={styles.shareButtonText}>Share QR Code</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  qrContainer: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 32,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: '#666',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2E7EFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});