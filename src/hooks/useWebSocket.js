import { useState, useEffect, useRef, useCallback } from "react";


export const useWebSocket = (url, token, orgName) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);

  // Use refs to avoid dependency issues and prevent infinite loops
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 2000; // Increased base delay
  const shouldStopReconnecting = useRef(false);
  const reconnectTimeoutRef = useRef(null);
  const isConnecting = useRef(false); // Prevent multiple simultaneous connections
  const pendingMessagesRef = useRef([]); // queue messages while connecting

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting.current) {
      console.log('⏳ [WebSocket] Connection already in progress, skipping');
      return;
    }

    // Don't attempt to connect if we've been told to stop
    if (shouldStopReconnecting.current) {
      console.warn('⚠️ [WebSocket] Reconnection stopped due to auth failure');
      return;
    }

    // Check if required params are missing - don't attempt connection and don't show errors
    if (!token || !url || !orgName) {
      // Only log once to avoid spam, and don't set error state
      if (reconnectAttempts.current === 0) {
        console.log('⏸️ [WebSocket] Waiting for required params (token, url, organization) before connecting');
      }
      // Clear any existing connection state
      setIsConnected(false);
      setError(null);
      return;
    }

    // Check if already connected
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log('✅ [WebSocket] Already connected, skipping');
      return;
    }

    // Clear any existing socket before creating a new one
    if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
      console.log('🔌 [WebSocket] Closing existing socket before reconnecting');
      socketRef.current.close();
      socketRef.current = null;
    }

    isConnecting.current = true;

    const wsUrl = `${url}?token=${encodeURIComponent(token)}&org=${encodeURIComponent(orgName)}`;
    console.log('🔌 [WebSocket] Connecting to:', wsUrl.replace(token, 'TOKEN_HIDDEN'));
    
    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('✅ [WebSocket] Connected successfully');
        isConnecting.current = false;
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        shouldStopReconnecting.current = false;
        // Flush any queued messages
        try {
          const pending = pendingMessagesRef.current || [];
          pending.forEach(msg => {
            try {
              ws.send(JSON.stringify(msg));
              console.log('📤 [WebSocket] Flushed queued message:', msg.type || 'unknown');
            } catch (e) {
              console.error('❌ [WebSocket] Failed to flush queued message:', e);
            }
          });
        } finally {
          pendingMessagesRef.current = [];
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 [WebSocket] Message received:', message.type || 'unknown');
          setLastMessage(message);
        } catch (err) {
          console.error('❌ [WebSocket] Invalid message:', err);
          setError("Invalid message");
        }
      };

      ws.onerror = (error) => {
        console.error('❌ [WebSocket] Connection error:', error);
        // Don't set error here - wait for onclose which has more details
      };
      
      ws.onclose = (event) => {
        isConnecting.current = false;
        setIsConnected(false);
        socketRef.current = null;
        
        // Don't log disconnection if it's due to missing params (prevent error spam)
        if (!token || !url || !orgName) {
          return;
        }
        
        // Interpret common close codes
        const closeCodeMeaning = {
          1000: 'Normal closure',
          1001: 'Going away (page unload)',
          1002: 'Protocol error',
          1003: 'Unsupported data',
          1005: 'No status received',
          1006: 'Abnormal closure (connection lost/server unreachable)',
          1007: 'Invalid frame payload',
          1008: 'Policy violation',
          1009: 'Message too big',
          1010: 'Mandatory extension',
          1011: 'Internal server error',
          1015: 'TLS handshake failure'
        };
        
        console.log('🔌 [WebSocket] Disconnected:', {
          code: event.code,
          meaning: closeCodeMeaning[event.code] || 'Unknown',
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean
        });
        
        // Stop reconnecting on authentication failures (403, 1008) or missing organization
        if (event.code === 1008 || event.code === 403 || 
            (event.reason && (
              event.reason.includes('Invalid token') || 
              event.reason.includes('organization required') ||
              event.reason.includes('Token & organization')
            ))) {
          console.warn('⚠️ [WebSocket] Auth/organization failure detected - stopping reconnection attempts');
          shouldStopReconnecting.current = true;
          if (event.reason && event.reason.includes('organization')) {
            setError('Organization required. Please select an organization and refresh.');
          } else {
            setError('Authentication failed. Please refresh the page.');
          }
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          return;
        }
        
        // Don't reconnect if we've been told to stop
        if (shouldStopReconnecting.current) {
          return;
        }

        // Set error for abnormal closures (code 1006 means server unreachable/connection failed)
        if (event.code === 1006) {
          setError('WebSocket connection failed - server unreachable');
        }
        
        // Only reconnect if we haven't exceeded max attempts
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current - 1);
          console.log(`🔄 [WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!shouldStopReconnecting.current && token && url && orgName) {
              connect();
            }
          }, delay);
        } else {
          console.error('❌ [WebSocket] Max reconnect attempts reached');
          setError('Connection failed after multiple attempts');
        }
      };
    } catch (err) {
      console.error('❌ [WebSocket] Failed to create WebSocket:', err);
      isConnecting.current = false;
      setError('Failed to create WebSocket connection');
    }
  }, [url, token, orgName]); // Removed socket from dependencies

  useEffect(() => {
    // Reset reconnection state when token or org changes (but only if we have all params)
    if (token && url && orgName) {
      shouldStopReconnecting.current = false;
      reconnectAttempts.current = 0;
    }
    
    // Only attempt connection if all params are available
    if (token && url && orgName) {
      connect();
    } else {
      // Clear connection state if params are missing
      setIsConnected(false);
      setError(null);
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      // Close socket on cleanup
      if (socketRef.current && socketRef.current.readyState !== WebSocket.CLOSED) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect, token, url, orgName]);

  const sendMessage = useCallback((message) => {
    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        console.log('📤 [WebSocket] Sending message:', message.type || 'unknown');
        socketRef.current.send(JSON.stringify(message));
        return true;
      }

      // If currently connecting, queue the message to be sent once open
      if (isConnecting.current) {
        console.log('⏳ [WebSocket] Connection in progress, queueing message:', message.type || 'unknown');
        pendingMessagesRef.current = pendingMessagesRef.current || [];
        pendingMessagesRef.current.push(message);
        return true;
      }

      // Not connected and not connecting -> attempt to connect then queue
      console.warn('⚠️ [WebSocket] Not connected, attempting to connect and queue message:', message.type || 'unknown');
      pendingMessagesRef.current = pendingMessagesRef.current || [];
      pendingMessagesRef.current.push(message);
      // try to reconnect
      connect();
      return true;
    } catch (err) {
      console.error('❌ [WebSocket] sendMessage error:', err);
      return false;
    }
  }, []);

  return { socket: socketRef.current, isConnected, lastMessage, error, reconnect: connect, sendMessage };
};
