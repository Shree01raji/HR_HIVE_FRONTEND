import React, { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../../services/api';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatSessions, setChatSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChatSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages();
    }
  }, [selectedSession]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChatSessions = async () => {
    try {
      setLoading(true);
      const sessions = await chatAPI.getSessions();
      setChatSessions(sessions);
      if (sessions.length > 0) {
        setSelectedSession(sessions[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const messages = await chatAPI.getMessages(selectedSession);
      setMessages(messages);
    } catch (err) {
      setError(err.message);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedSession) return;

    try {
      const response = await chatAPI.sendMessage(selectedSession, newMessage);
      setMessages(prev => [...prev, response]);
      setNewMessage('');
    } catch (err) {
      setError(err.message);
    };
  };

  const createNewSession = async () => {
    try {
      const newSession = await chatAPI.createSession();
      setChatSessions(prev => [newSession, ...prev]);
      setSelectedSession(newSession.id);
      setMessages([]);
    } catch (err) {
      setError(err.message);
    };
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Chat Sessions Sidebar */}
      <div className="w-64 bg-white border-r">
        <div className="p-4 border-b">
          <button
            onClick={createNewSession}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            New Chat
          </button>
        </div>
        <div className="overflow-y-auto h-full">
          {chatSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setSelectedSession(session.id)}
              className={`w-full p-4 text-left hover:bg-gray-50 ${
                selectedSession === session.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="font-medium">{session.title}</div>
              <div className="text-sm text-gray-500">
                {session.createdAt.toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900'
                  }`}
                >
                  <p>{message.content}</p>
                  <div
                    className={`text-xs mt-1 ${
                      message.isUser ? 'text-blue-200' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white border-t">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
