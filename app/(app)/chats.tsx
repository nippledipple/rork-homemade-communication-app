import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { QrCode, Settings, MessageCircle, Clock, ShoppingBag, Wifi, WifiOff, Info, X } from 'lucide-react-native';
import { useChats } from '@/providers/ChatProvider';
import { formatTime } from '@/utils/time';

export default function ChatsScreen() {
  const { chats, isConnected, connectionMethod, wssState } = useChats();
  const [showInfo, setShowInfo] = useState(false);

  // Remove demo chat logic - users must scan QR codes to add real contacts

  // Auto-scroll to new chats when they appear
  useEffect(() => {
    console.log('📱 Chats updated, current count:', chats.length);
    chats.forEach(chat => {
      if (chat.unreadCount > 0) {
        console.log(`📨 Chat "${chat.name}" has ${chat.unreadCount} unread messages`);
      }
    });
  }, [chats]);

  const renderChat = ({ item }: { item: any }) => {
    const hasUnread = item.unreadCount > 0;
    
    return (
      <TouchableOpacity 
        style={styles.chatItem}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{item.name}</Text>
            {item.lastMessage && (
              <View style={styles.timeContainer}>
                <Clock size={12} color="#666" />
                <Text style={styles.chatTime}>
                  {formatTime(item.lastMessage.timestamp)}
                </Text>
              </View>
            )}
          </View>
          
          {item.lastMessage && (
            <Text style={styles.chatMessage} numberOfLines={1}>
              {item.lastMessage.text}
            </Text>
          )}
        </View>
        
        {hasUnread && (
          <View style={styles.badgeContainer}>
            <View style={styles.newBadge}>
              <Text style={styles.newText}>NEW</Text>
            </View>
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>HomeMade</Text>
          <View style={[styles.connectionStatus, isConnected ? styles.connected : styles.disconnected]}>
            {isConnected ? (
              <Wifi size={12} color="#00FF00" />
            ) : (
              <WifiOff size={12} color="#FF3B30" />
            )}
            <Text style={[styles.connectionText, isConnected ? styles.connectedText : styles.disconnectedText]}>
              {isConnected ? (wssState?.connectionStateDisplay || `Online (${connectionMethod?.toUpperCase()})`) : 'Offline'}
            </Text>
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowInfo(true)}
          >
            <Info size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/qr-scanner')}
          >
            <QrCode size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/shop')}
          >
            <ShoppingBag size={24} color="#FFD700" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/settings')}
          >
            <Settings size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {chats.length === 0 ? (
        <View style={styles.emptyState}>
          <MessageCircle size={64} color="#333" />
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptyText}>
            Scan a QR code to add your first contact
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/qr-scanner')}
          >
            <QrCode size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChat}
          keyExtractor={(item, index) => item.id ? `chat-${item.id}` : `chat-${index}-${Date.now()}`}
          contentContainerStyle={styles.chatList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
      
      <Modal
        visible={showInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cross-Device Messaging</Text>
              <TouchableOpacity onPress={() => setShowInfo(false)}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.infoText}>
                So funktioniert das Cross-Device Messaging:
              </Text>
              
              <View style={styles.infoStep}>
                <Text style={styles.stepNumber}>1.</Text>
                <Text style={styles.stepText}>
                  QR-Code scannen, um Kontakt hinzuzufügen
                </Text>
              </View>
              
              <View style={styles.infoStep}>
                <Text style={styles.stepNumber}>2.</Text>
                <Text style={styles.stepText}>
                  Nachrichten werden automatisch synchronisiert
                </Text>
              </View>
              
              <View style={styles.infoStep}>
                <Text style={styles.stepNumber}>3.</Text>
                <Text style={styles.stepText}>
                  Funktioniert auch wenn nur ein Gerät online ist
                </Text>
              </View>
              
              <View style={styles.infoStep}>
                <Text style={styles.stepNumber}>4.</Text>
                <Text style={styles.stepText}>
                  Nachrichten werden alle 2 Sekunden abgerufen
                </Text>
              </View>
              
              <View style={styles.infoStep}>
                <Text style={styles.stepNumber}>5.</Text>
                <Text style={styles.stepText}>
                  Automatische Löschung nach 60 Sekunden
                </Text>
              </View>
              
              <View style={styles.connectionInfo}>
                <View style={[styles.connectionStatusModal, isConnected ? styles.connected : styles.disconnected]}>
                  {isConnected ? (
                    <Wifi size={16} color="#00FF00" />
                  ) : (
                    <WifiOff size={16} color="#FF3B30" />
                  )}
                  <Text style={[styles.connectionTextModal, isConnected ? styles.connectedText : styles.disconnectedText]}>
                    {isConnected 
                      ? `${wssState?.connectionStateDisplay || 'Online'} (${connectionMethod?.toUpperCase()}) - Nachrichten werden sofort übertragen` 
                      : 'Offline - Nachrichten werden beim nächsten Online-Status übertragen'
                    }
                  </Text>
                </View>
                
                <View style={styles.debugInfo}>
                  <Text style={styles.debugTitle}>Debug Info:</Text>
                  <Text style={styles.debugText}>• Verbindungsmethode: WSS</Text>
                  <Text style={styles.debugText}>• Verbindungsstatus: {wssState?.connectionStateDisplay || 'Unbekannt'}</Text>
                  <Text style={styles.debugText}>• Verbindungsqualität: {wssState?.qualityState || 'Unbekannt'}</Text>
                  <Text style={styles.debugText}>• WSS Relay: {wssState?.isSignalingConnected ? 'Verbunden' : 'Getrennt'} (relay.homemade.app)</Text>
                  <Text style={styles.debugText}>• Aktive Peer-Verbindungen: {wssState?.connections?.length || 0}</Text>
                  <Text style={styles.debugText}>• Gepufferte Nachrichten: {wssState?.bufferedMessages || 0}</Text>
                  <Text style={styles.debugText}>• Ping: {wssState?.pingMs ? `${wssState.pingMs}ms` : 'N/A'}</Text>
                  <Text style={styles.debugText}>• Ack-Rate: {wssState?.ackRate || 0}%</Text>
                  <Text style={styles.debugText}>• Retry-Zähler: {wssState?.stats?.totalRetries || 0}</Text>
                  <Text style={styles.debugText}>• Device ID: {wssState?.deviceId || 'Unbekannt'}</Text>
                  <Text style={styles.debugText}>• Ende-zu-Ende Verschlüsselung (AEAD)</Text>
                  <Text style={styles.debugText}>• Heartbeat alle 12s (±20% Jitter)</Text>
                  <Text style={styles.debugText}>• Exponential Backoff Reconnect</Text>
                  <Text style={styles.debugText}>• Ack-System mit 3× Retry (1s/2s/4s)</Text>
                  <Text style={styles.debugText}>• Anti-Flapping State Machine</Text>
                </View>
              </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  titleContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  connected: {
    opacity: 1,
  },
  disconnected: {
    opacity: 0.8,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: '500',
  },
  connectedText: {
    color: '#00FF00',
  },
  disconnectedText: {
    color: '#FF3B30',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 8,
  },
  chatList: {
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2E7EFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatTime: {
    fontSize: 12,
    color: '#666',
  },
  chatMessage: {
    fontSize: 14,
    color: '#999',
  },
  unreadBadge: {
    backgroundColor: '#2E7EFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badgeContainer: {
    alignItems: 'center',
    gap: 4,
  },
  newBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: '#1A1A1A',
    marginLeft: 84,
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
    marginBottom: 32,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2E7EFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
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
  infoText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
    fontWeight: '500',
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7EFF',
    marginRight: 12,
    minWidth: 20,
  },
  stepText: {
    fontSize: 15,
    color: '#CCCCCC',
    flex: 1,
    lineHeight: 20,
  },
  connectionInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
  },
  connectionStatusModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionTextModal: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  debugInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});