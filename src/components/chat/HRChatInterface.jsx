import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiUser, FiCalendar, FiClock, FiCheckCircle, FiAlertCircle, FiMessageCircle, FiRefreshCw, FiXCircle } from 'react-icons/fi';
// Leave Request Card Component
function LeaveRequestCard({ leave, onApprove, onReject }) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  return (
    <div className="border rounded-lg p-3 mb-2 bg-white shadow">
      <div className="font-semibold">{leave.leave_type}</div>
      <div>
        <span className="text-gray-700">Employee ID:</span> {leave.employee_id}
      </div>
      <div>
        <span className="text-gray-700">From:</span> {leave.start_date} <span className="text-gray-700">To:</span> {leave.end_date}
      </div>
      <div>
        <span className="text-gray-700">Status:</span> {leave.status}
      </div>
      <div>
        <span className="text-gray-700">Notes:</span> {leave.notes}
      </div>
      <div className="flex gap-2 mt-2">
        <button
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={() => onApprove(leave.leave_id)}
          disabled={leave.status !== 'Pending'}
        >
          Approve
        </button>
        <button
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => setShowRejectReason((v) => !v)}
          disabled={leave.status !== 'Pending'}
        >
          Reject
        </button>
      </div>
      {showRejectReason && (
        <div className="mt-2">
          <textarea
            className="w-full border rounded p-1 mb-1"
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <button
              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={() => { onReject(leave.leave_id, rejectReason); setShowRejectReason(false); setRejectReason(''); }}
              disabled={!rejectReason.trim()}
            >
              Confirm Reject
            </button>
            <button
              className="px-2 py-1 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              onClick={() => setShowRejectReason(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const HRChatInterface = ({ userRole = 'hr', department = 'HR' }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [currentAgent, setCurrentAgent] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Add welcome message
    setMessages([{
      id: 1,
      type: 'bot',
      content: '👋 Hello! I\'m your intelligent HR assistant. I can help you with:\n\n• 📅 Scheduling interviews\n• 📧 Sending reminders\n• 📊 Generating reports\n• 👥 Managing candidates\n• 🎓 Training & development\n• 📈 Analytics & insights\n\nWhat would you like me to help you with today?',
      timestamp: new Date(),
      agent: 'HR Assistant',
      confidence: 1.0,
      suggestedActions: [
        'Schedule an interview',
        'Send interview reminders',
        'Check interviewer availability',
        'Generate recruitment report',
        'Help with training programs'
      ]
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Approve leave handler
  const handleApproveLeave = async (leaveId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/leave/${leaveId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 2,
          type: 'bot',
          content: `Leave request #${leaveId} approved.`,
          timestamp: new Date(),
          agent: 'HR Assistant',
          confidence: 1.0,
        }
      ]);
      // Optionally refresh pending leaves
      fetchPendingLeaves();
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 2,
          type: 'bot',
          content: `Failed to approve leave request #${leaveId}.`,
          timestamp: new Date(),
          agent: 'HR Assistant',
          confidence: 0.0,
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Reject leave handler
  const handleRejectLeave = async (leaveId, reason) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/leave/${leaveId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await response.json();
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 3,
          type: 'bot',
          content: `Leave request #${leaveId} rejected. Reason: ${reason}`,
          timestamp: new Date(),
          agent: 'HR Assistant',
          confidence: 1.0,
        }
      ]);
      // Optionally refresh pending leaves
      fetchPendingLeaves();
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 3,
          type: 'bot',
          content: `Failed to reject leave request #${leaveId}.`,
          timestamp: new Date(),
          agent: 'HR Assistant',
          confidence: 0.0,
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch pending leaves for card rendering
  const fetchPendingLeaves = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/leave/pending');
      const data = await response.json();
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 4,
          type: 'bot',
          content: 'Pending leave requests:',
          timestamp: new Date(),
          agent: 'HR Assistant',
          confidence: 1.0,
          data: data
        }
      ]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 4,
          type: 'bot',
          content: 'Failed to fetch pending leave requests.',
          timestamp: new Date(),
          agent: 'HR Assistant',
          confidence: 0.0,
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // If user asks for pending leave requests, trigger fetchPendingLeaves
    if (/pending leave/i.test(inputMessage)) {
      await fetchPendingLeaves();
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/chat/route-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: inputMessage,
          user_role: userRole,
          department: department
        })
      });

      const data = await response.json();
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: data.response,
        timestamp: new Date(),
        agent: data.agent_type?.replace('_', ' ').toUpperCase() || 'HR Assistant',
        confidence: data.confidence || 0.8,
        suggestedActions: data.suggested_actions || [],
        data: data.data
      };

      setMessages(prev => [...prev, botMessage]);
      setSuggestedActions(data.suggested_actions || []);
      setCurrentAgent(data.agent_type);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        agent: 'System',
        confidence: 0.0,
        suggestedActions: ['Try again', 'Contact support']
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedAction = (action) => {
    setInputMessage(action);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getAgentIcon = (agentType) => {
    switch (agentType) {
      case 'INTERVIEW_SCHEDULING':
        return <FiCalendar className="w-4 h-4 text-blue-500" />;
      case 'HR_RECRUITMENT':
        return <FiUser className="w-4 h-4 text-green-500" />;
      case 'LEARNING_DEVELOPMENT':
        return <FiCheckCircle className="w-4 h-4 text-purple-500" />;
      case 'ANALYTICS_REPORTING':
        return <FiAlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <FiMessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <FiMessageCircle className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">HR Assistant</h3>
            <p className="text-sm text-gray-600">Intelligent Multi-Agent Support</p>
          </div>
        </div>
        {currentAgent && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 rounded-full">
            {getAgentIcon(currentAgent)}
            <span className="text-sm font-medium text-blue-700">
              {currentAgent.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'bot' && (
                  <div className="flex-shrink-0 mt-1">
                    {getAgentIcon(message.agent)}
                  </div>
                )}
                <div className="flex-1">
                  {Array.isArray(message.data) && message.data[0]?.leave_type ? (
                    <div>
                      {message.data.map((leave, idx) => (
                        <LeaveRequestCard
                          key={leave.leave_id || idx}
                          leave={leave}
                          onApprove={handleApproveLeave}
                          onReject={handleRejectLeave}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className={message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}>
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    {message.type === 'bot' && message.confidence && (
                      <span className={`font-medium ${getConfidenceColor(message.confidence)}`}>
                        {Math.round(message.confidence * 100)}% confidence
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <FiRefreshCw className="w-4 h-4 animate-spin text-gray-500" />
                <span className="text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Actions */}
      {suggestedActions.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">Quick Actions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedAction(action)}
                className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50 hover:border-blue-300 transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about HR, interviews, training, or analytics..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <FiSend className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HRChatInterface;
