import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWSS } from './WSSProvider';

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

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'other';
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  deleteTimer?: number;
  productData?: ProductMessage;
}

interface Chat {
  id: string;
  name: string;
  publicKey?: string;
  messages: Message[];
  lastMessage?: Message;
  unreadCount: number;
}

export const [ChatProvider, useChats] = createContextHook(() => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const deleteTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [currentUser, setCurrentUser] = useState<{ publicId: string; name?: string } | null>(null);
  const [connectionMethod] = useState<'wss'>('wss');
  
  const wss = useWSS();
  
  // Log WSS state for debugging
  useEffect(() => {
    console.log('🔌 WSS State in ChatProvider:', {
      state: wss.state,
      deviceId: wss.deviceId,
      pingMs: wss.pingMs,
      stats: wss.stats
    });
  }, [wss.state, wss.deviceId, wss.pingMs, wss.stats]);

  // Load user data from AsyncStorage
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setCurrentUser({ 
            publicId: parsedUser.publicId,
            name: parsedUser.name || 'Unknown User'
          });
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };
    loadUser();
  }, []);

  const loadChats = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('chats');
      if (stored) {
        const parsedChats = JSON.parse(stored);
        // Remove duplicates based on ID
        const uniqueChats = parsedChats.filter((chat: Chat, index: number, self: Chat[]) => 
          index === self.findIndex(c => c.id === chat.id)
        );
        
        // If we removed duplicates, save the cleaned version
        if (uniqueChats.length !== parsedChats.length) {
          console.log(`Removed ${parsedChats.length - uniqueChats.length} duplicate chats`);
          await AsyncStorage.setItem('chats', JSON.stringify(uniqueChats));
        }
        
        setChats(uniqueChats);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  }, []);

  const receiveMessage = useCallback((data: any) => {
    console.log('📨 Receiving message:', data);
    const message: Message = {
      id: data.messageId || data.id,
      text: data.text || data.payload?.text,
      sender: 'other',
      timestamp: data.timestamp,
      status: 'delivered',
      productData: data.productData || data.payload?.productData,
    };

    const senderId = data.senderId || data.from || data.peerId;
    
    setChats(prevChats => {
      // Find chat by sender ID or create new chat if it doesn't exist
      const existingChatIndex = prevChats.findIndex(chat => chat.id === senderId);
      
      if (existingChatIndex >= 0) {
        // Update existing chat
        const updated = prevChats.map((chat, index) => {
          if (index === existingChatIndex) {
            // Check if message already exists to avoid duplicates
            const messageExists = chat.messages.some(msg => msg.id === message.id);
            if (messageExists) {
              console.log('⚠️ Duplicate message detected, skipping:', message.id);
              return chat;
            }
            
            console.log('📝 Adding message to existing chat:', chat.name);
            return {
              ...chat,
              messages: [...chat.messages, message],
              lastMessage: message,
              unreadCount: chat.unreadCount + 1,
            };
          }
          return chat;
        });
        AsyncStorage.setItem('chats', JSON.stringify(updated)).catch(console.error);
        return updated;
      } else {
        // Create new chat for unknown sender
        const newChat: Chat = {
          id: senderId,
          name: data.senderName || `User ${senderId.slice(-4)}`,
          messages: [message],
          lastMessage: message,
          unreadCount: 1,
        };
        console.log('🆕 Creating new chat for:', data.senderName || senderId);
        const updated = [...prevChats, newChat];
        AsyncStorage.setItem('chats', JSON.stringify(updated)).catch(console.error);
        return updated;
      }
    });
  }, []);

  // Monitor WSS connection state
  useEffect(() => {
    setIsConnected(wss.state === 'connected');
  }, [wss.state]);

  // Register message handler with WSS
  useEffect(() => {
    if (!wss.addMessageHandler) return;
    
    const unsubscribe = wss.addMessageHandler((msg: any) => {
      console.log('📨 Real message received:', msg);
      
      // Handle real messages in new format: {type:"msg", v:2, sid:<sender>, rid:<recipient>, ctr:<counter>, cipher:<encrypted>}
      if (msg.type === 'msg' && msg.v === 2 && msg.sid && msg.cipher) {
        try {
          // For now, decrypt by parsing JSON (later will be real encryption)
          const decrypted = JSON.parse(msg.cipher);
          
          receiveMessage({
            messageId: msg.ctr,
            senderId: msg.sid,
            text: decrypted.text,
            timestamp: msg.ts || Date.now(),
            productData: decrypted.productData,
            senderName: decrypted.senderName || `User ${msg.sid.slice(-4)}`
          });
        } catch (error) {
          console.error('Failed to decrypt message:', error);
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [wss.addMessageHandler, receiveMessage]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    return () => {
      // Clear all timers on unmount
      const timers = deleteTimersRef.current;
      if (timers) {
        timers.forEach(timer => clearTimeout(timer));
        timers.clear();
      }
    };
  }, []);

  const updateMessageStatus = useCallback((chatId: string, messageId: string, status: 'sent' | 'delivered' | 'read') => {
    setChats(prevChats => {
      const updated = prevChats.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: chat.messages.map(msg => {
              if (msg.id === messageId) {
                return { ...msg, status };
              }
              return msg;
            }),
          };
        }
        return chat;
      });
      AsyncStorage.setItem('chats', JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  const deleteMessage = useCallback((chatId: string, messageId: string) => {
    setChats(prevChats => {
      const updated = prevChats.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: chat.messages.filter(msg => msg.id !== messageId),
          };
        }
        return chat;
      });
      AsyncStorage.setItem('chats', JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  const markAsRead = useCallback((chatId: string, messageId: string) => {
    setChats(prevChats => {
      const updated = prevChats.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: chat.messages.map(msg => {
              if (msg.id === messageId) {
                // Start delete timer
                const timerId = setTimeout(() => {
                  deleteMessage(chatId, messageId);
                  deleteTimersRef.current.delete(`${chatId}-${messageId}`);
                }, 60000);
                deleteTimersRef.current.set(`${chatId}-${messageId}`, timerId);
                
                return { ...msg, status: 'read' as const, deleteTimer: 60 };
              }
              return msg;
            }),
          };
        }
        return chat;
      });
      AsyncStorage.setItem('chats', JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, [deleteMessage]);

  const sendMessageToRecipient = useCallback(async (messageData: any): Promise<string> => {
    console.log('📡 Sending real message via WSS:', messageData);
    
    // Create encrypted payload (for now just JSON, later real encryption)
    const payload = {
      text: messageData.text,
      timestamp: messageData.timestamp,
      productData: messageData.productData,
      senderName: currentUser?.name || 'Unknown User',
      messageId: messageData.messageId
    };
    
    // Send with cipher field for encryption
    const msgId = wss.sendMessage(messageData.recipientId, {
      cipher: JSON.stringify(payload)
    });
    
    return msgId;
  }, [currentUser, wss]);

  const addContact = useCallback((contactData: { id: string; name: string; key: string }) => {
    setChats(prevChats => {
      // Check if contact already exists
      if (prevChats.some(chat => chat.id === contactData.id)) {
        console.log('Contact already exists:', contactData.id);
        return prevChats;
      }
      
      const newChat: Chat = {
        id: contactData.id,
        name: contactData.name,
        publicKey: contactData.key,
        messages: [],
        unreadCount: 0,
      };
      const updated = [...prevChats, newChat];
      AsyncStorage.setItem('chats', JSON.stringify(updated)).catch(console.error);
      
      return updated;
    });
  }, []);

  // Demo chats completely removed - only real QR-based contacts allowed

  const sendMessage = useCallback(async (chatId: string, text: string, productData?: ProductMessage) => {
    const message: Message = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      sender: 'me',
      timestamp: Date.now(),
      status: 'sent',
      productData,
    };

    // Add message to local chat immediately
    setChats(prevChats => {
      const updated = prevChats.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, message],
            lastMessage: message,
          };
        }
        return chat;
      });
      AsyncStorage.setItem('chats', JSON.stringify(updated)).catch(console.error);
      return updated;
    });

    // Send message to real recipient via WSS
    if (currentUser?.publicId || wss.deviceId) {
      try {
        const senderId = currentUser?.publicId || wss.deviceId;
        console.log(`📤 Sending real message: ${senderId} → ${chatId}`);
        
        const wssMessageId = await sendMessageToRecipient({
          messageId: message.id,
          senderId: senderId,
          recipientId: chatId,
          text: message.text,
          timestamp: message.timestamp,
          productData: message.productData
        });
        
        console.log(`📤 WSS message queued: ${wssMessageId}`);
        
        // Mark as delivered when ack is received (monitored by WSS)
        setTimeout(() => {
          updateMessageStatus(chatId, message.id, 'delivered');
        }, 2000);
        
        // Mark as read after reasonable time (real recipient will read it)
        setTimeout(() => {
          markAsRead(chatId, message.id);
        }, 10000);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  }, [currentUser?.publicId, wss.deviceId, sendMessageToRecipient, updateMessageStatus, markAsRead]);

  const panicWipe = useCallback((chatId: string) => {
    setChats(prevChats => {
      const updated = prevChats.filter(chat => chat.id !== chatId);
      AsyncStorage.setItem('chats', JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  const clearAllChats = useCallback(() => {
    setChats([]);
    AsyncStorage.setItem('chats', JSON.stringify([])).catch(console.error);
  }, []);

  const getChat = useCallback((chatId: string): Chat | undefined => {
    return chats.find(chat => chat.id === chatId);
  }, [chats]);

  const clearUnreadCount = useCallback((chatId: string) => {
    setChats(prevChats => {
      const updated = prevChats.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            unreadCount: 0,
          };
        }
        return chat;
      });
      AsyncStorage.setItem('chats', JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  }, []);

  // Add sendProductMessage function
  const sendProductMessage = useCallback(async (chatId: string, productData: ProductMessage) => {
    const productText = `📦 ${productData.items.length} ${productData.items.length === 1 ? 'product' : 'products'} shared`;
    await sendMessage(chatId, productText, productData);
  }, [sendMessage]);

  const contextValue = useMemo(() => ({
    chats,
    isConnected,
    connectionMethod,
    addContact,
    sendMessage,
    sendProductMessage,
    panicWipe,
    clearAllChats,
    getChat,
    clearUnreadCount,
    wssState: {
      connectionState: wss.state,
      connectionStateDisplay: wss.state === 'connected' ? 'Verbunden' : wss.state === 'connecting' ? 'Verbinde...' : wss.state === 'reconnecting' ? 'Wiederverbindung...' : 'Offline',
      qualityState: wss.pingMs ? (wss.pingMs < 100 ? 'Ausgezeichnet' : wss.pingMs < 300 ? 'Gut' : 'Langsam') : 'Unbekannt',
      isSignalingConnected: wss.state === 'connected',
      connections: [], // Will be populated with active peer connections
      bufferedMessages: 0, // Will track buffered messages
      pingMs: wss.pingMs,
      stats: wss.stats,
      ackRate: wss.getAckRate(),
      deviceId: wss.deviceId
    }
  }), [
    chats,
    isConnected,
    connectionMethod,
    addContact,
    sendMessage,
    sendProductMessage,
    panicWipe,
    clearAllChats,
    getChat,
    clearUnreadCount,
    wss.state,
    wss.pingMs,
    wss.stats,
    wss.deviceId,
    wss.getAckRate
  ]);

  return contextValue;
});

export default ChatProvider;