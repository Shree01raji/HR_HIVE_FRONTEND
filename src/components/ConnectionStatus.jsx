import React, { useState, useEffect } from 'react';
import { useRealTime } from '../contexts/RealTimeContext';
import { useAuth } from '../contexts/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { api } from '../services/api';

/**
 * ConnectionStatus Component
 * 
 * Shows WebSocket and Push Notification connection status
 * Allows users to manually connect/subscribe if needed
 */
const ConnectionStatus = ({ showDetails = false }) => {
  const { isConnected, reconnect } = useRealTime();
  const { user } = useAuth();
  const { 
    isSupported: pushSupported, 
    isRegistered: pushRegistered, 
    permission: pushPermission,
    requestPermission: requestPushPermission 
  } = usePushNotifications();
  
  const [token, setToken] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    websocket: 'checking',
    push: 'checking',
    issues: []
  });

  useEffect(() => {
    const checkStatus = () => {
      const storedToken = localStorage.getItem('token');
      const storedOrg = localStorage.getItem('selectedOrganization');
      
      setToken(storedToken);
      setOrganization(storedOrg);
      
      const issues = [];
      
      // Check WebSocket connection
      if (!storedToken) {
        issues.push('No authentication token found. Please log in.');
      }
      if (!storedOrg) {
        issues.push('No organization selected. Please select an organization.');
      }
      
      // Check Push Notification status
      if (!pushSupported) {
        issues.push('Push notifications are not supported in this browser.');
      } else if (pushPermission === 'denied') {
        issues.push('Push notification permission was denied. Please enable it in browser settings.');
      } else if (pushPermission === 'default' && !pushRegistered) {
        issues.push('Push notification permission not granted yet.');
      }
      
      setConnectionStatus({
        websocket: isConnected ? 'connected' : (storedToken && storedOrg ? 'disconnected' : 'not_ready'),
        push: pushRegistered ? 'subscribed' : (pushSupported ? (pushPermission === 'granted' ? 'not_subscribed' : 'permission_needed') : 'not_supported'),
        issues
      });
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [isConnected, pushSupported, pushRegistered, pushPermission]);

  const handleReconnectWebSocket = async () => {
    setIsChecking(true);
    try {
      if (!token) {
        alert('Please log in first.');
        return;
      }
      if (!organization) {
        alert('Please select an organization first.');
        return;
      }
      reconnect();
      setTimeout(() => setIsChecking(false), 2000);
    } catch (error) {
      console.error('Failed to reconnect WebSocket:', error);
      setIsChecking(false);
    }
  };

  const handleSubscribePush = async () => {
    setIsChecking(true);
    try {
      const result = await requestPushPermission();
      if (result) {
        alert('✅ Push notifications subscribed successfully!');
      } else {
        alert('⚠️ Failed to subscribe to push notifications. Please check browser permissions.');
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      alert('❌ Error subscribing to push notifications: ' + error.message);
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
      case 'subscribed':
        return '✅';
      case 'disconnected':
      case 'not_subscribed':
        return '⚠️';
      case 'not_ready':
      case 'permission_needed':
        return '❌';
      case 'not_supported':
        return '🚫';
      default:
        return '⏳';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'not_ready':
        return 'Not Ready';
      case 'subscribed':
        return 'Subscribed';
      case 'not_subscribed':
        return 'Not Subscribed';
      case 'permission_needed':
        return 'Permission Needed';
      case 'not_supported':
        return 'Not Supported';
      default:
        return 'Checking...';
    }
  };

  if (!showDetails && connectionStatus.websocket === 'connected' && connectionStatus.push === 'subscribed') {
    return null; // Don't show if everything is connected
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-blue-900">Connection Status</h3>
        {showDetails && (
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* WebSocket Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getStatusIcon(connectionStatus.websocket)}</span>
            <span className="font-medium">WebSocket:</span>
            <span className={connectionStatus.websocket === 'connected' ? 'text-green-600' : 'text-orange-600'}>
              {getStatusText(connectionStatus.websocket)}
            </span>
          </div>
          {connectionStatus.websocket !== 'connected' && (
            <button
              onClick={handleReconnectWebSocket}
              disabled={isChecking || !token || !organization}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? 'Connecting...' : 'Reconnect'}
            </button>
          )}
        </div>

        {/* Push Notification Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getStatusIcon(connectionStatus.push)}</span>
            <span className="font-medium">Push Notifications:</span>
            <span className={connectionStatus.push === 'subscribed' ? 'text-green-600' : 'text-orange-600'}>
              {getStatusText(connectionStatus.push)}
            </span>
          </div>
          {connectionStatus.push !== 'subscribed' && connectionStatus.push !== 'not_supported' && (
            <button
              onClick={handleSubscribePush}
              disabled={isChecking || !pushSupported}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? 'Subscribing...' : 'Subscribe'}
            </button>
          )}
        </div>

        {/* Issues List */}
        {showDetails && connectionStatus.issues.length > 0 && (
          <div className="mt-4 pt-3 border-t border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Issues:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              {connectionStatus.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Info */}
        {showDetails && (
          <div className="mt-4 pt-3 border-t border-blue-200 text-sm text-blue-700">
            <p><strong>Token:</strong> {token ? '✅ Present' : '❌ Missing'}</p>
            <p><strong>Organization:</strong> {organization || '❌ Not selected'}</p>
            <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
          </div>
        )}
      </div>

      {!showDetails && (connectionStatus.websocket !== 'connected' || connectionStatus.push !== 'subscribed') && (
        <div className="mt-3 text-sm text-blue-700">
          <p>⚠️ Notifications may not be received. Click buttons above to connect.</p>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
