import React, { useEffect, useState } from 'react';
import { FiEye, FiMessageCircle, FiMessageSquare, FiRefreshCw, FiUsers } from 'react-icons/fi';
import { managerAPI } from '../../services/api';

export default function ChatMonitor() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState(null);

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getStatusText = (isActive) => (isActive ? 'Active' : 'Inactive');

  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await managerAPI.getTeamChatSessions();
        setSessions(data || []);
        setCurrentSessionIndex(0);
      } catch (err) {
        console.error('Failed to load team chat sessions:', err);
        setError('Failed to load team chat sessions.');
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, []);

  const handleSelectSession = async (session) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    try {
      const data = await managerAPI.getTeamChatMessages(session.user_id, session.session_id);
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to load session messages:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const refreshSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await managerAPI.getTeamChatSessions();
      setSessions(data || []);
      setCurrentSessionIndex(0);
    } catch (err) {
      console.error('Failed to refresh team chat sessions:', err);
      setError('Failed to load team chat sessions.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading team chat sessions...</div>;
  }

  if (error) {
    return <div className="bg-white p-4 rounded-lg shadow-sm text-red-600">{error}</div>;
  }

  const handlePreviousSession = () => {
    if (currentSessionIndex > 0) {
      setCurrentSessionIndex(currentSessionIndex - 1);
    }
  };

  const handleNextSession = () => {
    if (currentSessionIndex < sessions.length - 1) {
      setCurrentSessionIndex(currentSessionIndex + 1);
    }
  };

  const currentSession = sessions[currentSessionIndex];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Chat Monitor</h1>
          <p className="text-gray-600 mt-2">Monitor and review your team chat sessions</p>
        </div>
        <button
          onClick={refreshSessions}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Chat Sessions</h3>
              <p className="text-sm text-gray-500 mt-1">Team conversations assigned to you</p>
            </div>
            <div className="text-sm text-gray-500">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {sessions.length > 0 ? (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
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
                    {currentSessionIndex + 1} of {sessions.length}
                  </span>
                </div>

                <button
                  onClick={handleNextSession}
                  disabled={currentSessionIndex === sessions.length - 1}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    currentSessionIndex === sessions.length - 1
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

              {currentSession && (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {(currentSession.user_name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{currentSession.user_name || 'Unknown User'}</h4>
                          <p className="text-sm text-gray-500 truncate max-w-[180px]">{currentSession.user_email || 'No email provided'}</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              currentSession.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {getStatusText(currentSession.is_active)}
                            </span>
                            <div className="flex items-center text-xs text-gray-500">
                              <FiUsers className="w-3 h-3 mr-1" />
                              {currentSession.message_count || 0} msgs
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectSession(currentSession)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                      >
                        <FiEye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Last Activity:</span>
                        <span className="font-medium text-gray-700">{formatDate(currentSession.last_activity || currentSession.updated_at)}</span>
                      </div>
                      <div className="mt-1 truncate">
                        <span className="text-gray-500">Latest:</span> {currentSession.last_message || 'No recent message'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Chat Messages</h3>
              </div>

              <div className="h-[60vh] overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
                {!selectedSession && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <FiMessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Select a session to view messages</p>
                    </div>
                  </div>
                )}

                {selectedSession && loadingMessages && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading messages...</p>
                    </div>
                  </div>
                )}

                {selectedSession && !loadingMessages && messages.length > 0 && (
                  <div className="space-y-6">
                    {messages.map((message, index) => {
                      const sender = (message.sender || '').toLowerCase();
                      const isUserMessage = sender === 'user';
                      return (
                        <div
                          key={message.id || index}
                          className={`flex ${isUserMessage ? 'justify-start' : 'justify-end'} items-start space-x-3`}
                        >
                          {isUserMessage ? (
                            <>
                              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {(selectedSession.user_name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="max-w-xs lg:max-w-md">
                                <div className="bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content || message.message || '(No content)'}</p>
                                  <p className="text-xs mt-2 text-gray-500">{formatMessageTime(message.timestamp)}</p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 ml-2">{selectedSession.user_name || 'User'}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="max-w-xs lg:max-w-md">
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content || message.message || '(No content)'}</p>
                                  <p className="text-xs mt-2 text-blue-100">{formatMessageTime(message.timestamp)}</p>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 mr-2 text-right">HR Assistant</p>
                              </div>
                              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                <FiMessageCircle className="w-4 h-4 text-white" />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedSession && !loadingMessages && messages.length === 0 && (
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
        ) : (
          <div className="text-center py-12">
            <FiMessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No team chat sessions found</p>
            <p className="text-gray-400 text-sm mt-2">Sessions will appear here when your team starts conversations</p>
          </div>
        )}
      </div>
    </div>
  );
}
