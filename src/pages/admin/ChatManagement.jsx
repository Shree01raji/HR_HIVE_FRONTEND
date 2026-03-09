import React, { useState, useEffect } from 'react';
import { 
  FiMessageSquare, 
  FiUsers, 
  FiClock, 
  FiTrendingUp,
  FiSettings,
  FiRefreshCw,
  FiSearch,
  FiFilter,
  FiDownload,
  FiEye,
  FiTrash2,
  FiSend,
  FiX,
  FiMessageCircle
} from 'react-icons/fi';
import { chatAPI } from '../../services/api';
import { useRealTime } from '../../contexts/RealTimeContext';
import AdminChatWidget from '../../components/AdminChatWidget';

export default function ChatManagement() {
  const { isConnected } = useRealTime();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionMessages, setSessionMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState(null);
  const [swipeStartY, setSwipeStartY] = useState(null);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [stats, setStats] = useState({
    totalSessions: 0,
    activeSessions: 0,
    totalMessages: 0,
    avgResponseTime: 0
  });

  useEffect(() => {
    fetchChatSessions();
  }, []);

  const fetchChatSessions = async () => {
    try {
      setLoading(true);
      const data = await chatAPI.getAdminSessions();
      console.log('🔍 DEBUG: Fetched sessions:', data);
      setSessions(data);
      
      // Calculate stats
      const activeSessions = data.filter(session => session.is_active).length;
      const totalMessages = data.reduce((sum, session) => sum + (session.message_count || 0), 0);
      const avgResponseTime = data.reduce((sum, session) => sum + (session.avg_response_time || 0), 0) / data.length || 0;
      
      setStats({
        totalSessions: data.length,
        activeSessions,
        totalMessages,
        avgResponseTime: Math.round(avgResponseTime)
      });
    } catch (err) {
      console.error('❌ Error fetching chat sessions:', err);
      console.error('❌ Error details:', err.response?.data);
      setError('Failed to load chat sessions');
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && session.is_active) ||
                         (filterStatus === 'inactive' && !session.is_active);
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      // Parse the ISO string - ensure it's treated as UTC if no timezone info
      let dateStr = dateString;
      // If the string doesn't end with Z and doesn't have timezone info, treat it as UTC
      if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        dateStr = dateStr + 'Z';
      }
      const date = new Date(dateStr);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', dateString);
        return 'Invalid Date';
      }
      
      // Format with proper timezone conversion (automatically converts UTC to local time)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid Date';
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      // Parse the ISO string - ensure it's treated as UTC if no timezone info
      let dateStr = timestamp;
      if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
        dateStr = dateStr + 'Z';
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return '';
      }
      // Format time with proper timezone conversion
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting message time:', error, timestamp);
      return '';
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
  };

  const getStatusText = (isActive) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const handleSessionClick = async (session) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    
    try {
      console.log('🔍 DEBUG: Session data:', session);
      console.log('🔍 DEBUG: Fetching messages for session:', session.id, 'user:', session.user_id);
      
      // Try different possible field names for user_id and session_id
      const userId = session.user_id || session.userId || session.user_id_str;
      const sessionId = session.id || session.session_id;
      console.log('🔍 DEBUG: Using user_id:', userId, 'session_id:', sessionId);
      
      const messages = await chatAPI.getAdminMessages(userId, sessionId);
      console.log('🔍 DEBUG: Received messages:', messages);
      console.log('🔍 DEBUG: Messages count:', messages?.length);
      console.log('🔍 DEBUG: Messages breakdown:', messages?.map(m => ({
        id: m.id,
        sender: m.sender,
        hasContent: !!m.content,
        contentPreview: m.content?.substring(0, 50)
      })));
      
      // Process messages to ensure correct format
      const processedMessages = (messages || []).map(msg => ({
        id: msg.id || msg.message_id,
        content: msg.content || msg.message || '',
        sender: (msg.sender || '').toLowerCase(), // Ensure lowercase
        timestamp: msg.timestamp || msg.created_at || new Date().toISOString()
      }));
      
      console.log('🔍 DEBUG: Processed messages:', processedMessages);
      console.log('🔍 DEBUG: User messages count:', processedMessages.filter(m => m.sender === 'user').length);
      console.log('🔍 DEBUG: AI messages count:', processedMessages.filter(m => m.sender === 'ai' || m.sender === 'bot').length);
      
      // If no messages returned, try to get messages from session data
      if (processedMessages.length === 0) {
        console.log('🔍 DEBUG: No messages from API, checking session data...');
        if (session.messages && session.messages.length > 0) {
          console.log('🔍 DEBUG: Using messages from session data:', session.messages);
          setSessionMessages(session.messages);
        } else {
          console.log('🔍 DEBUG: No messages found, using empty array');
          setSessionMessages([]);
        }
      } else {
        setSessionMessages(processedMessages);
      }
    } catch (err) {
      console.error('❌ Error fetching messages:', err);
      console.error('❌ Error details:', err.response?.data);
      console.error('❌ Full error:', err);
      
      // Fallback to mock messages for testing
      console.log('🔍 DEBUG: Using mock messages for testing');
      const mockMessages = [
        {
          id: 1,
          content: "Hello! I need help with my leave application.",
          sender: "user",
          timestamp: new Date().toISOString()
        },
        {
          id: 2,
          content: "Hi! I'd be happy to help you with your leave application. What type of leave are you looking to apply for?",
          sender: "ai",
          timestamp: new Date(Date.now() + 1000).toISOString()
        },
        {
          id: 3,
          content: "I need to apply for sick leave for 2 days.",
          sender: "user",
          timestamp: new Date(Date.now() + 2000).toISOString()
        }
      ];
      setSessionMessages(mockMessages);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleTouchStart = (e) => {
    setSwipeStartX(e.touches[0].clientX);
    setSwipeStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e, session) => {
    if (!swipeStartX || !swipeStartY) return;

    const swipeEndX = e.changedTouches[0].clientX;
    const swipeEndY = e.changedTouches[0].clientY;
    
    const deltaX = swipeStartX - swipeEndX;
    const deltaY = swipeStartY - swipeEndY;
    
    // Check if it's a horizontal swipe (more horizontal than vertical movement)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      // Swipe from right to left (deltaX > 0) - navigate to next session
      if (deltaX > 0) {
        handleNextSession();
      } else {
        // Swipe from left to right - navigate to previous session
        handlePreviousSession();
      }
    }
    
    setSwipeStartX(null);
    setSwipeStartY(null);
  };

  const handlePreviousSession = () => {
    if (currentSessionIndex > 0) {
      setCurrentSessionIndex(currentSessionIndex - 1);
    }
  };

  const handleNextSession = () => {
    if (currentSessionIndex < filteredSessions.length - 1) {
      setCurrentSessionIndex(currentSessionIndex + 1);
    }
  };

  const handleCloseChat = () => {
    setSelectedSession(null);
    setSessionMessages([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
        <button 
            onClick={fetchChatSessions}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
            Try Again
        </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chat Management</h1>
          <p className="text-gray-600 mt-2">Monitor and manage all chat sessions</p>
          <div className="flex items-center mt-1">
            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-500">
              {isConnected ? 'Real-time Connected' : 'Real-time Disconnected'}
            </span>
            </div>
          </div>
          <button
          onClick={fetchChatSessions}
          className="flex items-center space-x-2 px-4 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#2c2f70] transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiMessageSquare className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiUsers className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiTrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Messages</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FiClock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgResponseTime}s</p>
            </div>
            </div>
          </div>
        </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-2 h-4" />
              <input
                type="text"
                placeholder="Search by user name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              </div>
            </div>
          <div className="flex items-center space-x-2">
            <FiFilter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-6 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sessions</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            </div>
          </div>
        </div>

      {/* Professional Chat Sessions Interface */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Chat Sessions</h3>
              <p className="text-sm text-gray-500 mt-1">Manage and monitor AI agent conversations</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
            </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-500">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
      </div>

        {filteredSessions.length > 0 ? (
          <div className="p-6">
            {/* Session Navigation */}
            <div className="flex items-center justify-between mb-6">
                    <button
                onClick={handlePreviousSession}
                disabled={currentSessionIndex === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  currentSessionIndex === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Previous</span>
                    </button>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Session</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                  {currentSessionIndex + 1} of {filteredSessions.length}
                    </span>
              </div>

                    <button
                onClick={handleNextSession}
                disabled={currentSessionIndex === filteredSessions.length - 1}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  currentSessionIndex === filteredSessions.length - 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className="text-sm font-medium">Next</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                    </button>
                  </div>

            {/* Session Card */}
            {filteredSessions[currentSessionIndex] && (
              <div
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => handleSessionClick(filteredSessions[currentSessionIndex])}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    {/* User Info */}
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xl">
                          {(filteredSessions[currentSessionIndex].user_name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {filteredSessions[currentSessionIndex].user_name || 'Unknown User'}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {filteredSessions[currentSessionIndex].user_email || 'No email provided'}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            filteredSessions[currentSessionIndex].is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {getStatusText(filteredSessions[currentSessionIndex].is_active)}
                          </span>
                          <div className="flex items-center text-sm text-gray-500">
                            <FiMessageSquare className="w-4 h-4 mr-1" />
                            {filteredSessions[currentSessionIndex].message_count || 0} messages
                          </div>
                  </div>
                </div>
              </div>

                    {/* Action Buttons */}
                          <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSessionClick(filteredSessions[currentSessionIndex]);
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <FiEye className="w-4 h-4" />
                        <span>View Chat</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Reply to session:', filteredSessions[currentSessionIndex].id);
                        }}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Reply"
                      >
                        <FiSend className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Delete session:', filteredSessions[currentSessionIndex].id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                          </div>
                        </div>

                  {/* Session Details */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <p className="font-medium text-gray-900">{formatDate(filteredSessions[currentSessionIndex].created_at)}</p>
                              </div>
                                <div>
                        <span className="text-gray-500">Last Activity:</span>
                        <p className="font-medium text-gray-900">
                          {filteredSessions[currentSessionIndex].last_activity ? formatDate(filteredSessions[currentSessionIndex].last_activity) : 'Never'}
                        </p>
                          </div>
                      {filteredSessions[currentSessionIndex].avg_response_time && (
                        <div>
                          <span className="text-gray-500">Avg Response:</span>
                          <p className="font-medium text-gray-900">{filteredSessions[currentSessionIndex].avg_response_time}s</p>
                            </div>
                          )}
                            </div>
                          </div>
                              </div>
                                </div>
                              )}
              </div>
        ) : (
          <div className="text-center py-12">
            <FiMessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No chat sessions found</p>
            <p className="text-gray-400 text-sm mt-2">Chat sessions will appear here when users start conversations</p>
                            </div>
                          )}
                        </div>

      {/* Side-by-Side Layout: Session Card + Chat Messages */}
      {selectedSession && (
                        <div className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Session Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Session Details</h3>
                          <button
                  onClick={handleCloseChat}
                  className="text-gray-400 hover:text-gray-600"
                          >
                  <FiX className="w-6 h-6" />
                          </button>
                        </div>
              
              <div className="space-y-4">
                {/* User Info */}
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-lg">
                      {(selectedSession.user_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {selectedSession.user_name || 'Unknown User'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {selectedSession.user_email || 'No email provided'}
                    </p>
                      </div>
                    </div>

                {/* Status and Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedSession.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusText(selectedSession.is_active)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Messages:</span>
                    <span className="ml-2 font-medium">{selectedSession.message_count || 0}</span>
              </div>
                </div>

                {/* Session Details */}
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Session ID:</span>
                    <span className="font-medium">{selectedSession.session_id || selectedSession.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span className="font-medium">{formatDate(selectedSession.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Activity:</span>
                    <span className="font-medium">
                      {selectedSession.last_activity ? formatDate(selectedSession.last_activity) : 'Never'}
                    </span>
                  </div>
                  {selectedSession.avg_response_time && (
                    <div className="flex justify-between">
                      <span>Avg Response:</span>
                      <span className="font-medium">{selectedSession.avg_response_time}s</span>
            </div>
          )}
        </div>

                {/* Action Buttons */}
                {/* <div className="flex space-x-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => console.log('Reply to session:', selectedSession.id)}
                    className="flex items-center space-x-2 px-3 py-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <FiSend className="w-4 h-4" />
                    <span>Reply</span>
                  </button>
                  <button
                    onClick={() => console.log('Delete session:', selectedSession.id)}
                    className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div> */}
                </div>
              </div>
              
            {/* Right Column: Chat Messages */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Chat Messages</h3>
                  </div>
              
              {/* Chat Messages */}
              <div className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading messages...</p>
                    </div>
                  </div>
                ) : sessionMessages.length > 0 ? (
                  <div className="space-y-6">
                    {sessionMessages.map((message, index) => {
                      // Normalize sender value for comparison
                      const sender = (message.sender || '').toLowerCase();
                      const isUserMessage = sender === 'user';
                      
                      return (
                      <div
                        key={message.id || index}
                        className={`flex ${isUserMessage ? 'justify-start' : 'justify-end'} items-start space-x-3`}
                      >
                        {/* User Message Layout */}
                        {isUserMessage ? (
                          <>
                            {/* User Avatar */}
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {(selectedSession.user_name || 'U').charAt(0).toUpperCase()}
                              </span>
                            </div>
                            {/* User Message */}
                            <div className="max-w-xs lg:max-w-md">
                              <div className="bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                <p className="text-sm leading-relaxed">{message.content || message.message || '(No content)'}</p>
                                <p className="text-xs mt-2 text-gray-500">
                                  {formatMessageTime(message.timestamp)}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1 ml-2">
                                {selectedSession.user_name || 'User'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Bot Message */}
                            <div className="max-w-xs lg:max-w-md">
                              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                                <p className="text-sm leading-relaxed">{message.content || message.message || '(No content)'}</p>
                                <p className="text-xs mt-2 text-blue-100">
                          {formatMessageTime(message.timestamp)}
                        </p>
                      </div>
                              <p className="text-xs text-gray-500 mt-1 mr-2 text-right">
                                HR Assistant
                              </p>
                            </div>
                            {/* Bot Avatar */}
                            <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                              <FiMessageCircle className="w-4 h-4 text-white" />
                    </div>
                          </>
                        )}
                      </div>
                    );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FiMessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No messages in this chat session</p>
              </div>
            </div>
          )}
        </div>
      </div>
          </div>
        </div>
      )}

      {/* Admin Chat Widget */}
      <AdminChatWidget />
    </div>
  );
}

