import React, { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiX, FiSend, FiMinimize2, FiUsers, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { chatAPI, leaveAPI } from '../services/api';

export default function AdminChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Don't auto-create sessions - only create when user actually starts chatting
    console.log('AdminChatWidget mounted');
    loadPendingLeaves();
  }, []);

  const initializeChat = async () => {
    try {
      const response = await chatAPI.createSession();
      const newSessionId = response.session_id;
      setSessionId(newSessionId);
      
      // Add welcome message for admin
      setMessages([
        {
          id: 1,
          type: 'bot',
          message: 'Hello! I\'m your HR Admin Assistant. I can help you with:\n\n• Leave approvals\n• Employee management\n• Payroll queries\n• HR analytics\n• Policy questions\n\nHow can I assist you today?',
          timestamp: new Date().toISOString()
        }
      ]);
      
      return newSessionId;
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setMessages([
        {
          id: 1,
          type: 'bot',
          message: 'Hello! I\'m your HR Admin Assistant. I can help you with leave approvals, employee management, and other HR tasks.',
          timestamp: new Date().toISOString()
        }
      ]);
      return null;
    }
  };

  const loadPendingLeaves = async () => {
    try {
      const leaves = await leaveAPI.getAll();
      setPendingLeaves(leaves.filter(leave => leave.status === 'Pending'));
    } catch (error) {
      console.error('Failed to load pending leaves:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage.toLowerCase();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Create session if it doesn't exist
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        currentSessionId = await initializeChat();
      }

      // Handle admin-specific queries
      if (currentInput.includes('pending') || currentInput.includes('leave')) {
        await handleLeaveQuery();
      } else if (currentInput.includes('approve') || currentInput.includes('reject')) {
        await handleLeaveAction(currentInput);
      } else {
        // Regular admin chat
        if (currentSessionId) {
          const response = await chatAPI.sendMessage(currentSessionId, inputMessage);
          const botResponse = {
            id: Date.now() + 1,
            type: 'bot',
            message: response.message || 'I understand your request. Let me help you with that.',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, botResponse]);
        } else {
          const botResponse = {
            id: Date.now() + 1,
            type: 'bot',
            message: 'I\'m here to help with HR management tasks. You can ask me about leave approvals, employee data, or other HR matters.',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, botResponse]);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: 'I apologize, but I\'m having trouble processing your request right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveQuery = async () => {
    if (pendingLeaves.length === 0) {
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: 'Great news! There are no pending leave applications at the moment.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      return;
    }

    let message = `📋   Pending Leave Applications (${pendingLeaves.length}):  \n\n`;
    pendingLeaves.forEach((leave, index) => {
      message += `${index + 1}.   ${leave.employee_name || 'Employee'}  \n`;
      message += `   • Type: ${leave.leave_type}\n`;
      message += `   • Dates: ${new Date(leave.start_date).toLocaleDateString()} - ${new Date(leave.end_date).toLocaleDateString()}\n`;
      message += `   • Reason: ${leave.reason || 'No reason provided'}\n`;
      message += `   • ID: #${leave.leave_id}\n\n`;
    });

    message += 'Type "approve [ID]" or "reject [ID]" to take action on any application.';

    const botResponse = {
      id: Date.now() + 1,
      type: 'bot',
      message: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, botResponse]);
  };

  const handleLeaveAction = async (input) => {
    const approveMatch = input.match(/approve\s+(\d+)/);
    const rejectMatch = input.match(/reject\s+(\d+)/);
    
    if (approveMatch) {
      const leaveId = parseInt(approveMatch[1]);
      await processLeaveAction(leaveId, 'approve');
    } else if (rejectMatch) {
      const leaveId = parseInt(rejectMatch[1]);
      await processLeaveAction(leaveId, 'reject');
    } else {
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: 'Please specify the leave ID. Example: "approve 123" or "reject 123"',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    }
  };

  const processLeaveAction = async (leaveId, action) => {
    try {
      let response;
      if (action === 'approve') {
        response = await leaveAPI.approve(leaveId);
      } else {
        response = await leaveAPI.reject(leaveId, 'Rejected by HR Admin');
      }

      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅   Leave Application ${action === 'approve' ? 'Approved' : 'Rejected'}!  \n\nApplication #${leaveId} has been ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);

      // Reload pending leaves
      await loadPendingLeaves();
    } catch (error) {
      console.error(`Failed to ${action} leave:`, error);
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `Sorry, I couldn't ${action} the leave application. Please try again or check the application ID.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { text: '📊 Dashboard', action: 'Show me the HR dashboard overview' },
    { text: '👥 Employees', action: 'Show me employee management options' },
    { text: '📋 Leave Requests', action: 'Show me pending leave requests for approval' },
    { text: '⏰ Timesheets', action: 'Show me timesheet overview and analytics' },
    { text: '🎯 Recruitment', action: 'Show me recruitment dashboard and candidates' },
    { text: '💰 Payroll', action: 'Show me payroll summary and reports' },
    { text: '📈 Analytics', action: 'Show me comprehensive HR analytics' },
    { text: '📄 Documents', action: 'Show me employee documents management' },
    { text: '🔍 Compliance', action: 'Show me compliance reports and audit logs' }
  ];

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <FiMessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
      isMinimized ? 'h-16' : 'h-[500px]'
    } w-96 bg-white rounded-lg shadow-xl border border-gray-200`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="font-semibold">HR Admin Assistant</span>
          {pendingLeaves.length > 0 && (
            <span className="text-xs bg-red-500 px-2 py-1 rounded-full">
              {pendingLeaves.length} Pending
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
          >
            <FiMinimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto h-80">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg ${
                      msg.type === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-gray-200 bg-gray-50">
            <div className="px-4 py-2 bg-gray-100 border-b border-gray-200">
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Quick Actions</div>
            </div>
            <div className="p-3 space-y-2">
              {/* Group 1: Core HR Functions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setInputMessage('Show me the HR dashboard overview')}
                  className="text-xs bg-white hover:bg-blue-50 text-gray-700 px-3 py-2 rounded-md transition-colors border border-gray-200 hover:border-blue-300 text-left"
                >
                  📊 Dashboard
                </button>
                <button
                  onClick={() => setInputMessage('Show me employee management options')}
                  className="text-xs bg-white hover:bg-blue-50 text-gray-700 px-3 py-2 rounded-md transition-colors border border-gray-200 hover:border-blue-300 text-left"
                >
                  👥 Employees
                </button>
              </div>
              
              {/* Group 2: Approvals & Tracking */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setInputMessage('Show me pending leave requests for approval')}
                  className="text-xs bg-white hover:bg-green-50 text-gray-700 px-3 py-2 rounded-md transition-colors border border-gray-200 hover:border-green-300 text-left"
                >
                  📋 Leave Requests
                </button>
                <button
                  onClick={() => setInputMessage('Show me timesheet overview and analytics')}
                  className="text-xs bg-white hover:bg-green-50 text-gray-700 px-3 py-2 rounded-md transition-colors border border-gray-200 hover:border-green-300 text-left"
                >
                  ⏰ Timesheets
                </button>
              </div>
              
              {/* Group 3: Operations */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setInputMessage('Show me recruitment dashboard and candidates')}
                  className="text-xs bg-white hover:bg-purple-50 text-gray-700 px-3 py-2 rounded-md transition-colors border border-gray-200 hover:border-purple-300 text-left"
                >
                  🎯 Recruitment
                </button>
                <button
                  onClick={() => setInputMessage('Show me payroll summary and reports')}
                  className="text-xs bg-white hover:bg-purple-50 text-gray-700 px-3 py-2 rounded-md transition-colors border border-gray-200 hover:border-purple-300 text-left"
                >
                  💰 Payroll
                </button>
              </div>
              
              {/* Group 4: Analytics & Compliance */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setInputMessage('Show me comprehensive HR analytics')}
                  className="text-xs bg-white hover:bg-orange-50 text-gray-700 px-3 py-2 rounded-md transition-colors border border-gray-200 hover:border-orange-300 text-left"
                >
                  📈 Analytics
                </button>
                <button
                  onClick={() => setInputMessage('Show me compliance reports and audit logs')}
                  className="text-xs bg-white hover:bg-orange-50 text-gray-700 px-3 py-2 rounded-md transition-colors border border-gray-200 hover:border-orange-300 text-left"
                >
                  🔍 Compliance
                </button>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base bg-white shadow-sm"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-4 py-3 rounded-lg transition-colors shadow-sm"
              >
                <FiSend className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
