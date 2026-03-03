import React, { useEffect, useState } from 'react';
import { managerAPI } from '../../services/api';

export default function ChatMonitor() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await managerAPI.getTeamChatSessions();
        setSessions(data || []);
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

  if (loading) {
    return <div className="text-gray-600">Loading team chat sessions...</div>;
  }

  if (error) {
    return <div className="bg-white p-4 rounded-lg shadow-sm text-red-600">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow-sm p-4 max-h-[70vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Team Sessions</h2>
        {sessions.length === 0 && (
          <p className="text-sm text-gray-500">No team chat sessions yet.</p>
        )}
        <div className="space-y-2">
          {sessions.map((session) => (
            <button
              key={session.session_id}
              type="button"
              onClick={() => handleSelectSession(session)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedSession?.session_id === session.session_id
                  ? 'border-[#1e3a5f] bg-[#e8f0f5]'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-gray-800">{session.user_name}</div>
              <div className="text-xs text-gray-500 truncate">{session.last_message}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4 max-h-[70vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Conversation</h2>
        {!selectedSession && (
          <p className="text-sm text-gray-500">Select a session to view messages.</p>
        )}
        {selectedSession && loadingMessages && (
          <p className="text-sm text-gray-500">Loading messages...</p>
        )}
        {selectedSession && !loadingMessages && messages.length === 0 && (
          <p className="text-sm text-gray-500">No messages found.</p>
        )}
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg ${
                message.sender === 'user' ? 'bg-gray-100 text-gray-800' : 'bg-[#1e3a5f] text-white'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              <div className="text-[11px] opacity-70 mt-1">{new Date(message.timestamp).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
