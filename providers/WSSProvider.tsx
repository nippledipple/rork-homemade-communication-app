import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

type ConnState = 'connecting'|'connected'|'reconnecting'|'offline';

interface OutboxMessage {
  id: string;
  to: string;
  payload: any;
  timestamp: number;
  retries: number;
  nextRetry: number;
}

interface WSStats {
  totalSent: number;
  totalAcked: number;
  totalRetries: number;
}

function makeDeviceId(): string {
  return 'hm-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getCloseCodeName(code: number): string {
  const codes: { [key: number]: string } = {
    1000: 'Normal Closure',
    1001: 'Going Away',
    1002: 'Protocol Error',
    1003: 'Unsupported Data',
    1005: 'No Status Received',
    1006: 'Abnormal Closure',
    1007: 'Invalid Frame Payload Data',
    1008: 'Policy Violation',
    1009: 'Message Too Big',
    1010: 'Mandatory Extension',
    1011: 'Internal Server Error',
    1015: 'TLS Handshake'
  };
  return codes[code] || 'Unknown';
}



export const [WSSProvider, useWSS] = createContextHook(() => {
  const [state, setState] = useState<ConnState>('offline');
  const [pingMs, setPingMs] = useState<number|null>(null);
  const [stats, setStats] = useState<WSStats>({ totalSent: 0, totalAcked: 0, totalRetries: 0 });
  const [deviceId, setDeviceId] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const lockRef = useRef(false);
  const backoffRef = useRef(1000);
  const missedRef = useRef(0);
  const hbTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStateTs = useRef<number>(0);
  const outboxRef = useRef<Map<string, OutboxMessage>>(new Map());
  const messageHandlersRef = useRef<Set<(msg: any) => void>>(new Set());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load or create device ID
  useEffect(() => {
    const initDeviceId = async () => {
      try {
        let storedId = await AsyncStorage.getItem('deviceId');
        if (!storedId) {
          storedId = makeDeviceId();
          await AsyncStorage.setItem('deviceId', storedId);
        }
        setDeviceId(storedId);
        console.log('🔑 Device ID initialized:', storedId);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to load device ID:', error);
        const newId = makeDeviceId();
        setDeviceId(newId);
        setIsInitialized(true);
      }
    };
    initDeviceId();
  }, []);

  const setS = useCallback((s: ConnState) => {
    if (!s || typeof s !== 'string') return;
    const now = Date.now();
    // Anti-flap: minimum dwell time
    const dwell = state === 'connected' ? 2000 : 1000;
    if (now - lastStateTs.current < dwell && s !== state) return;
    if (state !== s) { 
      console.log(`🔄 WSS State: ${state} → ${s}`);
      setState(s); 
      lastStateTs.current = now; 
    }
  }, [state]);

  const startHB = useCallback(() => {
    if (hbTimer.current) clearInterval(hbTimer.current);
    missedRef.current = 0;
    
    // Send ping every ~15s ±20% (12-18s random interval)
    const scheduleNextPing = () => {
      const baseInterval = 15000; // 15 seconds
      const variance = baseInterval * 0.2; // ±20%
      const interval = baseInterval + (Math.random() - 0.5) * 2 * variance;
      
      hbTimer.current = setTimeout(() => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          const pingMsg = { type: 'ping', ts: Date.now() };
          ws.send(JSON.stringify(pingMsg));
          console.log('📡 Ping sent with timestamp');
          
          // Check for pong response after 5 seconds
          setTimeout(() => {
            if (missedRef.current < 2) { // Only increment if we haven't already detected the miss
              missedRef.current++;
              console.log(`⏰ Missed pongs: ${missedRef.current}/2`);
              if (missedRef.current >= 2) {
                console.log('💔 Too many missed pongs (2/2), closing connection for reconnect');
                try { 
                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.close(1000, 'Heartbeat timeout');
                  }
                } catch (e) {
                  console.log('Error closing connection after heartbeat timeout:', e);
                }
              }
            }
          }, 5000);
        }
        
        // Schedule next ping
        if (ws && ws.readyState === WebSocket.OPEN) {
          scheduleNextPing();
        }
      }, interval);
    };
    
    scheduleNextPing();
  }, []);
  
  const stopHB = useCallback(() => {
    if (hbTimer.current) {
      clearTimeout(hbTimer.current);
      hbTimer.current = null;
    }
  }, []);

  const startRetryLoop = useCallback(() => {
    if (retryTimer.current) clearInterval(retryTimer.current);
    retryTimer.current = setInterval(() => {
      const now = Date.now();
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      outboxRef.current.forEach((msg, ctr) => {
        if (now >= msg.nextRetry && msg.retries < 3) {
          console.log(`🔄 Retry ${ctr} (${msg.retries + 1}/3)`);
          ws.send(JSON.stringify({
            type: 'msg',
            v: 2,
            sid: deviceId,
            rid: msg.to,
            ts: now,
            ctr: ctr,
            cipher: msg.payload.cipher || JSON.stringify(msg.payload)
          }));
          
          msg.retries++;
          msg.nextRetry = now + (1000 * Math.pow(2, msg.retries)); // 1s, 2s, 4s
          
          setStats(prev => ({ ...prev, totalRetries: prev.totalRetries + 1 }));
        } else if (msg.retries >= 3) {
          console.log(`❌ Message ${ctr} failed - recipient offline`);
          outboxRef.current.delete(ctr);
        }
      });
    }, 1000);
  }, [deviceId]);

  const stopRetryLoop = useCallback(() => {
    if (retryTimer.current) {
      clearInterval(retryTimer.current);
      retryTimer.current = null;
    }
  }, []);

  const addMessageHandler = useCallback((handler: (msg: any) => void) => {
    messageHandlersRef.current.add(handler);
    return () => messageHandlersRef.current.delete(handler);
  }, []);

  const sendMessage = useCallback((to: string, payload: any): string => {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const ws = wsRef.current;
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log('❌ Cannot send message: WebSocket not connected');
      return msgId;
    }

    // Add to outbox for retry logic
    outboxRef.current.set(msgId, {
      id: msgId,
      to,
      payload,
      timestamp: Date.now(),
      retries: 0,
      nextRetry: Date.now() + 2000 // First retry after 2s
    });

    // Send in new format: {type:"msg", v:2, sid:<myId>, rid:<targetId>, ts:timestamp, ctr:<counter>, cipher:<encrypted>}
    const counter = Date.now() + Math.random().toString(36).slice(2);
    ws.send(JSON.stringify({
      type: 'msg',
      v: 2,
      sid: deviceId,
      rid: to,
      ts: Date.now(),
      ctr: counter,
      cipher: payload.cipher || JSON.stringify(payload) // For now, will be encrypted later
    }));
    
    // Store with counter for ack matching
    outboxRef.current.set(counter, {
      id: counter,
      to,
      payload,
      timestamp: Date.now(),
      retries: 0,
      nextRetry: Date.now() + 1000
    });
    
    console.log(`📤 Message sent: ${msgId} → ${to}`);
    setStats(prev => ({ ...prev, totalSent: prev.totalSent + 1 }));
    
    return msgId;
  }, [deviceId]);

  const sendRaw = useCallback((obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ ...obj, deviceId: deviceId }));
    }
  }, [deviceId]);

  const urlRef = useRef<string>('');
  
  const connect = useCallback(() => {
    if (lockRef.current || !deviceId) {
      console.log('⏸️ Connection blocked:', lockRef.current ? 'locked' : 'no deviceId');
      return;
    }
    lockRef.current = true;
    setS(state === 'offline' ? 'connecting' : 'reconnecting');

    // Connect to real relay server for device-to-device communication
    // Use exact URL format as specified: wss://relay.homemade.app/edge?deviceId=<DEVICE_ID_URLENCODED>&v=app
    const url = `wss://relay.homemade.app/edge?deviceId=${encodeURIComponent(deviceId)}&v=app`;
    urlRef.current = url;
    console.log('🔗 Connecting to WSS relay:', url);
    console.log('🔑 Device ID:', deviceId);
    
    // Add connection timeout tracking
    const connectionStart = Date.now();
    
    let ws: WebSocket;
    try {
      // Check if WebSocket is available (works on both web and native)
      if (typeof WebSocket === 'undefined' && typeof global !== 'undefined' && !global.WebSocket) {
        console.error('❌ WebSocket not available in this environment');
        lockRef.current = false;
        setS('offline');
        return;
      }
      
      // Create WebSocket connection with proper error handling
      console.log('🔧 Creating WebSocket connection...');
      ws = new WebSocket(url);
      console.log('✅ WebSocket instance created, readyState:', ws.readyState);
      
      // Immediately check if connection failed during creation
      if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        console.error('❌ WebSocket closed immediately after creation');
        lockRef.current = false;
        setS('offline');
        return;
      }
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        url: url
      });
      lockRef.current = false;
      setS('offline');
      return;
    }
    wsRef.current = ws;

    const openTimeout = setTimeout(() => {
      console.log('⏰ Connection timeout after 10s - server may be unreachable');
      console.log('🔧 Server status: relay.homemade.app may be down or misconfigured');
      console.log('🔧 Continuing with offline functionality');
      lockRef.current = false;
      setS('offline');
      try { 
        if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Connection timeout');
        }
      } catch (e) {
        console.log('Error closing timed out connection:', e);
      }
    }, 10000);

    ws.onopen = () => {
      const connectionTime = Date.now() - connectionStart;
      console.log(`✅ WSS Relay: Verbunden in ${connectionTime}ms`);
      console.log('🔗 Connection established to relay.homemade.app');
      clearTimeout(openTimeout);
      backoffRef.current = 1000;
      setS('connected');
      startHB();
      startRetryLoop();
      lockRef.current = false;
      
      // Send initial ping to establish connection and measure latency
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const pingMsg = { type: 'ping', ts: Date.now() };
          ws.send(JSON.stringify(pingMsg));
          console.log('📡 Initial ping sent with timestamp');
        }
      }, 100);
    };

    ws.onmessage = (ev) => {
      let txt: string;
      try {
        txt = typeof ev.data === 'string' ? ev.data : String(ev.data);
      } catch (error) {
        console.error('Failed to convert message data to string:', error);
        return;
      }
      
      if (!txt || txt.trim() === '') {
        console.log('⚠️ Received empty message');
        return;
      }
      
      console.log('📨 Raw WSS data received:', txt.substring(0, 200) + (txt.length > 200 ? '...' : ''));
      
      // Check if message looks like JSON before parsing
      const trimmed = txt.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        console.log('⚠️ Received non-JSON message, ignoring:', txt.substring(0, 100));
        // Check if it's an HTTP response (common WebSocket error)
        if (trimmed.startsWith('HTTP/') || trimmed.includes('Connection') || trimmed.includes('Request')) {
          console.error('❌ Received HTTP response instead of WebSocket data - server may not support WebSocket protocol');
        }
        return;
      }
      
      try {
        const msg = JSON.parse(trimmed);
        console.log('📨 WSS received:', msg.type, msg.id || msg.ctr || '');
        
        if (msg?.type === 'pong') {
          // Real pong response from relay server
          missedRef.current = 0;
          const latency = msg.ts ? Date.now() - msg.ts : 0;
          setPingMs(latency);
          console.log(`🏓 Pong received: ${latency}ms (${latency > 0 ? 'Ping' : 'Server'})`);

        } else if (msg?.type === 'msg' && msg.sid && msg.sid !== deviceId) {
          // Message from another device (not our own echo)
          console.log(`📨 Real message from ${msg.sid} → ${msg.rid}`);
          
          // Notify handlers (ChatProvider will decrypt and process)
          messageHandlersRef.current.forEach(handler => {
            try {
              handler(msg);
            } catch (error) {
              console.error('Message handler error:', error);
            }
          });
          
          // Send acknowledgment back to sender
          if (msg.ctr && msg.sid) {
            ws.send(JSON.stringify({
              type: 'ack',
              ctr: msg.ctr,
              to: msg.sid
            }));
            console.log(`📬 Ack sent: ctr=${msg.ctr} → ${msg.sid}`);
          }
        } else if (msg?.type === 'ack' && (msg.id || msg.ctr)) {
          // Message acknowledged - remove from outbox
          const ackId = msg.id || msg.ctr;
          if (outboxRef.current.delete(ackId)) {
            console.log(`✅ Ack received: ${ackId}`);
            setStats(prev => ({ ...prev, totalAcked: prev.totalAcked + 1 }));
          }
        } else {
          // Log unknown message types for debugging
          if (msg?.type && msg.type !== 'ping' && msg.type !== 'msg') {
            console.log('📨 Unknown message type:', msg.type);
          }
        }
      } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
        console.error('ERROR Failed to parse message:', errorMsg);
        console.log('Raw message that failed to parse:', txt.substring(0, 200));
        
        // Check for common parsing issues
        if (errorMsg.includes('Unexpected identifier') || errorMsg.includes('Unexpected character')) {
          console.error('❌ Server sent malformed data - this may indicate a server-side issue');
        }
        
        // Don't treat parse errors as fatal - just ignore malformed messages
        return;
      }
    };

    ws.onclose = (e) => {
      const closeReason = e.reason || 'No reason provided';
      const closeCodeName = getCloseCodeName(e.code);
      console.log(`🔌 WebSocket closed: ${e.code} (${closeCodeName}) - ${closeReason}`);
      console.log('🔧 Close event details:', {
        code: e.code,
        reason: e.reason,
        wasClean: e.wasClean,
        url: urlRef.current,
        timestamp: new Date().toISOString()
      });
      
      // Log specific close codes for debugging
      if (e.code === 1006) {
        console.error('❌ Abnormal Close - Connection lost unexpectedly');
        console.error('🔧 This usually indicates network issues or server problems');
      } else if (e.code === 1008) {
        console.error('❌ Policy Violation - Server rejected connection');
        console.error('🔧 Check if deviceId is properly formatted:', deviceId);
      } else if (e.code === 1015) {
        console.error('❌ TLS/Certificate Pinning failure');
        console.error('🔧 Certificate validation failed for relay.homemade.app');
      } else if (e.code === 1002) {
        console.error('❌ Protocol Error - Server doesn\'t support WebSocket properly');
      } else if (e.code === 1011) {
        console.error('❌ Internal Server Error - relay.homemade.app server issue');
      }
      
      clearTimeout(openTimeout);
      stopHB();
      stopRetryLoop();
      setS('offline');
      lockRef.current = false;
      
      // Only reconnect if not manually closed and not a permanent error
      const permanentErrors = [1008, 1002]; // Policy violation, protocol error
      if (e.code !== 1000 && !permanentErrors.includes(e.code)) {
        // Implement exponential backoff: 1s, 2s, 4s, 8s, 15s max
        const backoffDelays = [1000, 2000, 4000, 8000, 15000];
        const currentBackoffIndex = Math.min(backoffRef.current - 1000, backoffDelays.length - 1);
        const delay = backoffDelays[Math.max(0, Math.floor(currentBackoffIndex / 1000))] || 1000;
        
        console.log(`🔄 Reconnecting in ${delay}ms... (backoff level: ${Math.floor(currentBackoffIndex / 1000) + 1})`);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (wsRef.current === ws) { // Only reconnect if this is still the current connection
            backoffRef.current = Math.min(backoffRef.current * 1.5, 15000);
            connect();
          }
        }, delay);
      } else if (permanentErrors.includes(e.code)) {
        console.error('❌ Permanent error detected - not attempting reconnection');
        console.error('🔧 Please check server configuration and deviceId format');
      }
    };

    ws.onerror = (error) => {
      // Extract error details more safely
      let errorInfo = 'Connection failed';
      let errorDetails: any = {
        readyState: ws.readyState,
        url: urlRef.current,
        timestamp: new Date().toISOString()
      };
      
      try {
        if (error && typeof error === 'object') {
          // Handle different error types
          if ('message' in error && error.message) {
            errorInfo = String(error.message);
          } else if ('type' in error && error.type) {
            errorInfo = `Error type: ${error.type}`;
          }
          
          // Extract common error properties (but limit to avoid circular references)
          const errorProps = ['type', 'message', 'code', 'isTrusted'];
          errorProps.forEach(prop => {
            if (prop in error && (error as any)[prop] !== undefined) {
              errorDetails[prop] = (error as any)[prop];
            }
          });
        }
      } catch {
        errorInfo = 'Network connection failed';
      }
      
      console.error('🚨 WebSocket error:', errorInfo);
      console.error('ERROR Error details:', JSON.stringify(errorDetails, null, 2));
      
      // Check for specific error types
      if (errorInfo.includes('Invalid Sec-WebSocket-Accept')) {
        console.error('❌ Server WebSocket handshake failed - check server configuration');
      } else if (errorInfo.includes('TLS') || errorInfo.includes('certificate')) {
        console.error('❌ TLS_PIN_MISMATCH - Certificate pinning failed');
      }
      
      // Don't change state here, let onclose handle it
    };
  }, [state, setS, startHB, stopHB, startRetryLoop, stopRetryLoop, deviceId]);

  // Connect when device ID is ready
  useEffect(() => {
    if (isInitialized && deviceId) {
      console.log('🚀 Starting WebSocket connection...');
      connect();
    }
    
    return () => { 
      console.log('🛑 Cleaning up WebSocket...');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      try { wsRef.current?.close(); } catch {}
      stopHB();
      stopRetryLoop();
    };
  }, [isInitialized, deviceId, connect, stopHB, stopRetryLoop]);

  const getAckRate = useCallback(() => {
    if (stats.totalSent === 0) return 100;
    return Math.round((stats.totalAcked / stats.totalSent) * 100);
  }, [stats]);

  return useMemo(() => ({
    state,
    pingMs,
    stats,
    deviceId: deviceId,
    sendRaw,
    sendMessage,
    addMessageHandler,
    getAckRate
  }), [state, pingMs, stats, deviceId, sendRaw, sendMessage, addMessageHandler, getAckRate]);
});

export default WSSProvider;