import { useState, useEffect, useRef, useCallback } from 'react';

export const useWebSocket = (url, token) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // Start with 1 second

  const connect = useCallback(() => {
    if (!token) {
      console.warn('⚠️ [WebSocket] No token provided, cannot connect');
      return;
    }
    
    if (!url) {
      console.warn('⚠️ [WebSocket] No URL provided, cannot connect');
      return;
    }

    try {
      const wsUrl = `${url}/${token}`;
      console.log('🔌 [WebSocket] Attempting to connect to:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ [WebSocket] Connected successfully to:', wsUrl);
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        
        // Send ping to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 [WebSocket] Raw message received:', event.data);
          console.log('📨 [WebSocket] Parsed message:', message);
          setLastMessage(message);
          
          // Handle pong responses
          if (message.type === 'pong') {
            console.log('🏓 [WebSocket] Received pong response');
            return;
          }
          
          // Handle connection established message
          if (message.type === 'connection_established') {
            console.log('✅ [WebSocket] Connection established:', message.data);
            return;
          }
          
          console.log('📨 [WebSocket] Message type:', message.type, 'Data:', message.data);
        } catch (err) {
          console.error('❌ [WebSocket] Error parsing message:', err);
          console.error('❌ [WebSocket] Raw message data:', event.data);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 [WebSocket] Disconnected:', { code: event.code, reason: event.reason, wasClean: event.wasClean });
        setIsConnected(false);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current - 1);
          console.log(`Attempting to reconnect in ${delay}ms... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('Max reconnection attempts reached. Manual reconnection required.');
          setError('Connection lost. Please refresh the page to reconnect.');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ [WebSocket] Connection error:', error);
        console.error('❌ [WebSocket] Error details:', {
          message: error.message,
          type: error.type,
          target: error.target?.url
        });
        setError(`WebSocket connection error: ${error.message || 'Unknown error'}`);
        setIsConnected(false);
      };

      setSocket(ws);
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
    }
  }, [url, token]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socket) {
      socket.close(1000, 'User disconnected');
      setSocket(null);
    }
    
    setIsConnected(false);
  }, [socket]);

  const sendMessage = useCallback((message) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, [socket]);

  const reconnect = useCallback(() => {
    console.log('Manual reconnection requested');
    reconnectAttempts.current = 0; // Reset attempts
    setError(null);
    connect();
  }, [connect]);

  // Connect on mount and when token or url changes
  useEffect(() => {
    if (token && url) {
      console.log('🔌 [WebSocket] useEffect triggered - connecting...', { hasToken: !!token, hasUrl: !!url });
      connect();
    } else {
      console.warn('⚠️ [WebSocket] useEffect - missing token or url', { hasToken: !!token, hasUrl: !!url });
    }

    return () => {
      disconnect();
    };
  }, [token, url, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket,
    isConnected,
    lastMessage,
    error,
    sendMessage,
    connect,
    disconnect,
    reconnect
  };
};

// Hook for real-time updates
export const useRealTimeUpdates = (token, onUpdate) => {
  // Use relative WebSocket URL - works with both dev and production
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = token ? `${wsProtocol}//${window.location.host}/api/ws/${token}` : null;
  const { lastMessage, isConnected } = useWebSocket(wsUrl, token);

  useEffect(() => {
    if (lastMessage && onUpdate) {
      onUpdate(lastMessage);
    }
  }, [lastMessage, onUpdate]);

  return { isConnected };
};

// Hook for chat functionality
export const useChatWebSocket = (token, chatId) => {
  // Use relative WebSocket URL - works with both dev and production
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = token ? `${wsProtocol}//${window.location.host}/api/ws/${token}` : null;
  const { sendMessage, lastMessage, isConnected } = useWebSocket(wsUrl, token);

  const sendChatMessage = useCallback((message) => {
    sendMessage({
      type: 'chat_message',
      data: {
        chat_id: chatId,
        message: message
      }
    });
  }, [sendMessage, chatId]);

  const sendTypingIndicator = useCallback((isTyping) => {
    sendMessage({
      type: 'typing',
      data: {
        chat_id: chatId,
        is_typing: isTyping
      }
    });
  }, [sendMessage, chatId]);

  return {
    sendChatMessage,
    sendTypingIndicator,
    lastMessage,
    isConnected
  };
};
