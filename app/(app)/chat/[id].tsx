import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Timer, AlertTriangle, Check, CheckCheck, Wifi, WifiOff } from 'lucide-react-native';
import { useChats } from '@/providers/ChatProvider';
import { formatTime } from '@/utils/time';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { getChat, sendMessage, panicWipe, isConnected, clearUnreadCount } = useChats();
  const [message, setMessage] = useState('');
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flatListRef = useRef<FlatList<any>>(null);
  
  const chat = id ? getChat(id as string) : null;

  // Clear unread count when entering chat
  useEffect(() => {
    if (id && chat && chat.unreadCount > 0) {
      clearUnreadCount(id as string);
    }
  }, [id, chat?.unreadCount, clearUnreadCount]);

  const handleHeaderTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    
    if (newCount >= 4) {
      Alert.alert(
        'Panic Wipe',
        'This will permanently delete this entire chat for both parties. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete Everything', 
            style: 'destructive',
            onPress: () => {
              if (id) {
                panicWipe(id as string);
                router.replace('/(app)/chats');
              }
            }
          }
        ]
      );
      setTapCount(0);
    } else {
      tapTimeoutRef.current = setTimeout(() => {
        setTapCount(0);
      }, 1200);
    }
  };

  const handleSend = () => {
    if (message.trim() && id) {
      sendMessage(id as string, message.trim());
      setMessage('');
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isOwn = item.sender === 'me';
    const showTimer = item.status === 'read' && item.deleteTimer;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwn ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwn ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwn ? styles.ownText : styles.otherText
          ]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isOwn ? styles.ownTime : styles.otherTime
            ]}>
              {formatTime(item.timestamp)}
            </Text>
            {isOwn && (
              <View style={styles.statusContainer}>
                {item.status === 'sent' && <Check size={12} color="#FFFFFF80" />}
                {item.status === 'delivered' && <CheckCheck size={12} color="#FFFFFF80" />}
                {item.status === 'read' && <CheckCheck size={12} color="#00FF00" />}
              </View>
            )}
            {showTimer && (
              <View style={styles.timerContainer}>
                <Timer size={12} color={isOwn ? '#FFFFFF80' : '#66666680'} />
                <Text style={[
                  styles.timerText,
                  isOwn ? styles.ownTime : styles.otherTime
                ]}>
                  {item.deleteTimer}s
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!chat) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Chat not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TouchableOpacity 
        style={styles.header}
        onPress={handleHeaderTap}
        activeOpacity={1}
      >
        <TouchableOpacity onPress={() => router.replace('/(app)/chats')}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerName}>{chat.name}</Text>
          <View style={styles.headerStatus}>
            {tapCount > 0 && (
              <View style={styles.tapIndicator}>
                <AlertTriangle size={12} color="#FF3B30" />
                <Text style={styles.tapText}>{tapCount}/4</Text>
              </View>
            )}
            <View style={[styles.connectionStatus, isConnected ? styles.connected : styles.disconnected]}>
              {isConnected ? (
                <Wifi size={10} color="#00FF00" />
              ) : (
                <WifiOff size={10} color="#FF3B30" />
              )}
              <Text style={[styles.connectionText, isConnected ? styles.connectedText : styles.disconnectedText]}>
                {isConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.headerSpacer} />
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={chat.messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted={false}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Message"
            placeholderTextColor="#666"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!message.trim()}
          >
            <Send size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  connected: {
    opacity: 1,
  },
  disconnected: {
    opacity: 0.8,
  },
  connectionText: {
    fontSize: 9,
    fontWeight: '500',
  },
  connectedText: {
    color: '#00FF00',
  },
  disconnectedText: {
    color: '#FF3B30',
  },
  headerSpacer: {
    width: 24,
  },
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tapText: {
    fontSize: 12,
    color: '#FF3B30',
  },
  messagesList: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginBottom: 8,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#2E7EFF',
  },
  otherBubble: {
    backgroundColor: '#1A1A1A',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownText: {
    color: '#FFFFFF',
  },
  otherText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownTime: {
    color: '#FFFFFF80',
  },
  otherTime: {
    color: '#66666680',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  timerText: {
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#FFFFFF',
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2E7EFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});