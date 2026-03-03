import React, { useState, useRef, useEffect } from 'react';
import { 
  FiSend, 
  FiUser, 
  FiCalendar, 
  FiClock, 
  FiFileText, 
  FiUsers, 
  FiBriefcase,
  FiTrendingUp,
  FiSettings,
  FiX,
  FiMinimize2,
  FiMaximize2,
  FiMessageSquare,
  FiRefreshCw,
  FiChevronDown,
  FiChevronUp,
  FiMoreVertical,
  FiCheck,
  FiAlertCircle,
  FiBarChart,
  FiDollarSign,
  FiBookOpen,
  FiActivity
} from 'react-icons/fi';
import { 
  employeeAPI, 
  leaveAPI, 
  timesheetAPI, 
  recruitmentAPI, 
  applicationsAPI,
  adminChatAPI
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AdminChatBot = () => {
  const { user } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m your HR Admin Assistant. I can help you with:\n\n• Employee Management\n• Leave Approvals\n• Timesheet Oversight\n• Recruitment\n• Analytics & Reports\n• Document Management\n\nWhat would you like to do today?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLeaveCards, setShowLeaveCards] = useState(false);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [showCandidateButtons, setShowCandidateButtons] = useState(false);
  const [candidateButtons, setCandidateButtons] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  /** Ref for session id so sends use the latest value immediately after create (avoids stale state). */
  const sessionIdRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Candidate button functions
  const handleCandidateSelection = async (candidateButton) => {
    try {
      setIsLoading(true);
      
      // Add user message showing selection
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: `Schedule interview for ${candidateButton.candidate_name}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Process the scheduling request
      const response = await processAdminMessage(candidateButton.action);
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      
      // Hide candidate buttons after selection
      setShowCandidateButtons(false);
      setCandidateButtons([]);
      
    } catch (error) {
      console.error('Failed to schedule interview:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error scheduling the interview. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Leave card functions
  const handleLeaveAction = async (leaveId, action) => {
    try {
      setIsLoading(true);
      
      if (action === 'approve') {
        await leaveAPI.approve(leaveId);
      } else if (action === 'reject') {
        await leaveAPI.reject(leaveId, 'Rejected via chatbot');
      }
      
      // Remove the processed leave from the list
      const updatedLeaves = pendingLeaves.filter(leave => leave.leave_id !== leaveId);
      setPendingLeaves(updatedLeaves);
      
      // Add success message
      const actionText = action === 'approve' ? 'approved' : 'rejected';
      const newMessage = {
        id: Date.now(),
        type: 'bot',
        content: `✅ Leave request ${actionText} successfully!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      
      // If no more leaves, hide cards
      if (updatedLeaves.length === 0) {
        setShowLeaveCards(false);
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'bot',
          content: 'All leave requests have been processed!',
          timestamp: new Date()
        }]);
      } else {
        // Move to next card or previous if at end
        if (currentCardIndex >= updatedLeaves.length) {
          setCurrentCardIndex(updatedLeaves.length - 1);
        }
      }
      
    } catch (error) {
      console.error(`Failed to ${action} leave:`, error);
      const newMessage = {
        id: Date.now(),
        type: 'bot',
        content: `❌ Failed to ${action} leave request. Please try again.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const nextCard = () => {
    if (currentCardIndex < pendingLeaves.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  const closeLeaveCards = () => {
    setShowLeaveCards(false);
    setPendingLeaves([]);
    setCurrentCardIndex(0);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Don't auto-create sessions - only create when user actually opens the chat
    console.log('AdminChatBot mounted');
  }, []);

  // Keep ref in sync with state so we always have latest session id for sends
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const initializeAdminChatSession = async () => {
    try {
      const response = await adminChatAPI.createSession();
      const newSessionId = response.session_id != null ? Number(response.session_id) : null;
      setSessionId(newSessionId);
      sessionIdRef.current = newSessionId; // Use ref so next send uses this id before state updates
      console.log('Admin chat session created (new conversation):', newSessionId);
      return newSessionId;
    } catch (error) {
      console.error('Failed to create admin chat session:', error);
      return null;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Use ref first so we use the session created by clearChat/open before state has updated
      let currentSessionId = sessionIdRef.current ?? sessionId;
      if (!currentSessionId) {
        currentSessionId = await initializeAdminChatSession();
        if (!currentSessionId) throw new Error('Failed to create admin chat session');
      }
      // Send to this session so messages go to this conversation only
      const data = await adminChatAPI.sendQuery(currentInput, currentSessionId);
      if (data.session_id && data.session_id !== sessionId) setSessionId(data.session_id);
      
      const formatted = await formatAdvancedResponse(data);
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: formatted || 'I understand your request. Let me help you with that.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Fallback to admin-specific processing if chat API fails
      try {
        const response = await processAdminMessage(currentInput);
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
      } catch (fallbackError) {
        console.error('Fallback processing also failed:', fallbackError);
        const errorMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const processAdminMessage = async (message) => {
    try {
      console.log('Processing admin message:', message);
      const sid = sessionIdRef.current ?? sessionId;
      const data = await adminChatAPI.sendQuery(message, sid);
      console.log('🔍 DEBUG: Frontend received response:', data);
      return formatAdvancedResponse(data);
    } catch (error) {
      console.error('Error with advanced chat API:', error);
      // Fallback to basic processing
      return await processBasicMessage(message);
    }
  };

  const processBasicMessage = async (message) => {
    const lowerMessage = message.toLowerCase();

    // Employee Management
    if (lowerMessage.includes('employee') || lowerMessage.includes('staff')) {
      if (lowerMessage.includes('list') || lowerMessage.includes('all')) {
        const employees = await employeeAPI.getAll();
        const safeEmployees = Array.isArray(employees) ? employees : [];
        return formatEmployeeList(safeEmployees);
      } else if (lowerMessage.includes('how many') || lowerMessage.includes('count') || lowerMessage.includes('total')) {
        const employees = await employeeAPI.getAll();
        const safeEmployees = Array.isArray(employees) ? employees : [];
        return `**Employee Count** 👥\n\n**Total Employees:** ${safeEmployees.length}\n**Active Employees:** ${safeEmployees.filter(emp => emp?.status === 'ACTIVE').length}\n\n**By Department:**\n${getDepartmentBreakdown(safeEmployees)}`;
      } else if (lowerMessage.includes('department')) {
        const employees = await employeeAPI.getAll();
        const safeEmployees = Array.isArray(employees) ? employees : [];
        return formatDepartmentStats(safeEmployees);
      } else if (lowerMessage.includes('add') || lowerMessage.includes('create')) {
        return 'To add a new employee, please use the Employee Management section. I can help you with:\n\n• Viewing employee details\n• Checking employee status\n• Department information\n\nWhat specific employee information do you need?';
      }
    }

    // Leave Management
    if (lowerMessage.includes('leave') || lowerMessage.includes('vacation')) {
      if (lowerMessage.includes('pending') || lowerMessage.includes('approve')) {
        const pendingLeaves = await leaveAPI.getPending();
        return formatPendingLeaves(pendingLeaves);
      } else if (lowerMessage.includes('status') || lowerMessage.includes('summary') || lowerMessage.includes('how many')) {
        const allLeaves = await leaveAPI.getAll();
        return formatLeaveSummary(allLeaves);
      } else if (lowerMessage.includes('approve')) {
        return 'To approve leave requests, please use the Leave Management section. I can show you pending requests and their details.';
      }
    }

    // Timesheet Management
    if (lowerMessage.includes('timesheet') || lowerMessage.includes('hours') || lowerMessage.includes('attendance')) {
      // Check for summary keywords (including common typos)
      const summaryKeywords = ['summary', 'summery', 'sumary', 'suumary', 'summmary', 'sumary', 'overview', 'overveiw', 'overvew', 'summ', 'sum'];
      const isSummaryQuery = summaryKeywords.some(keyword => lowerMessage.includes(keyword));
      
      if (isSummaryQuery || lowerMessage.includes('how many')) {
        const timesheetData = await timesheetAPI.getTimesheetSummary();
        return formatTimesheetSummary(timesheetData);
      } else if (lowerMessage.includes('today') || lowerMessage.includes('current')) {
        return 'I can help you with timesheet information. Use the Timesheet Management section for detailed views, or ask me about:\n\n• Work hours summary\n• Attendance rates\n• Overtime tracking\n\nWhat timesheet information do you need?';
      } else if (lowerMessage.includes('status') && (lowerMessage.includes('my') || lowerMessage.includes('check'))) {
        return 'I can help you check your timesheet status. For detailed status information, please use the Timesheet Management section or ask me to "show my timesheet status".';
      }
    }

    // Recruitment
    if (lowerMessage.includes('recruitment') || lowerMessage.includes('hiring') || lowerMessage.includes('job')) {
      if (lowerMessage.includes('jobs') || lowerMessage.includes('openings')) {
        const jobs = await recruitmentAPI.getJobs();
        return formatJobList(jobs);
      } else if (lowerMessage.includes('applications') || lowerMessage.includes('candidates')) {
        return 'I can help you with recruitment information. Use the Recruitment section for detailed management, or ask me about:\n\n• Open job positions\n• Application status\n• Candidate pipeline\n\nWhat recruitment information do you need?';
      }
    }

    // Analytics & Reports
    if (lowerMessage.includes('analytics') || lowerMessage.includes('report') || lowerMessage.includes('dashboard')) {
      return 'I can help you with HR analytics and reports. Use the Analytics section for detailed charts and insights, or ask me about:\n\n• Employee statistics\n• Leave trends\n• Performance metrics\n• Department analysis\n\nWhat specific analytics do you need?';
    }

    // Payroll Management
    if (lowerMessage.includes('payroll') || lowerMessage.includes('salary')) {
      if (lowerMessage.includes('create') && (lowerMessage.includes('all') || lowerMessage.includes('everyone'))) {
        return 'I can help you create payroll for all employees. Let me process that request...';
      } else if (lowerMessage.includes('create')) {
        return 'To create payroll for specific employees, please specify the employee details or use the Payroll Management section for individual records.';
      } else if (lowerMessage.includes('summary') || lowerMessage.includes('overview')) {
        return 'I can provide payroll summaries. What specific payroll information do you need?';
      }
    }

    // General Help
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return `I'm your HR Admin Assistant! Here's what I can help you with:

**👥 Employee Management**
• View employee lists and details
• Check department statistics
• Monitor employee status

**📅 Leave Management**
• Show pending leave requests
• Display leave summaries
• Track leave trends

**⏰ Timesheet Oversight**
• View work hours summaries
• Check attendance rates
• Monitor overtime

**💼 Recruitment**
• List open job positions
• Track application status
• Manage candidate pipeline

**📊 Analytics & Reports**
• HR dashboard insights
• Performance metrics
• Department analysis

**📁 Document Management**
• Access HR documents
• Manage policies
• Track document categories

**💰 Payroll Management**
• Create payroll for all employees
• Generate salary summaries
• Process monthly payroll

Just ask me about any of these areas, and I'll provide the information you need!`;
    }

    // Try to get actual data for common questions
    if (lowerMessage.includes('how many') && (lowerMessage.includes('employee') || lowerMessage.includes('staff'))) {
      try {
        const employees = await employeeAPI.getAll();
        const safeEmployees = Array.isArray(employees) ? employees : [];
        return `**Employee Count** 👥\n\n**Total Employees:** ${safeEmployees.length}\n**Active Employees:** ${safeEmployees.filter(emp => emp?.status === 'ACTIVE').length}\n\n**By Department:**\n${getDepartmentBreakdown(safeEmployees)}`;
      } catch (error) {
        return `I can see you're asking about employee count, but I'm having trouble accessing the data right now. Please try again in a moment.`;
      }
    }

    // Handle other common "how many" questions
    if (lowerMessage.includes('how many')) {
      if (lowerMessage.includes('leave') || lowerMessage.includes('vacation')) {
        try {
          const allLeaves = await leaveAPI.getAll();
          const pendingLeaves = allLeaves.filter(leave => leave.status === 'Pending');
          return `**Leave Statistics** 📅\n\n**Total Leave Requests:** ${allLeaves.length}\n**Pending Requests:** ${pendingLeaves.length}\n**Approved:** ${allLeaves.filter(leave => leave.status === 'Approved').length}\n**Rejected:** ${allLeaves.filter(leave => leave.status === 'Rejected').length}`;
        } catch (error) {
          return `I can see you're asking about leave count, but I'm having trouble accessing the data right now. Please try again in a moment.`;
        }
      }
    }

    // Default response with more helpful guidance
    return `I understand you're asking about "${message}". Let me help you with that:

• **For employee data**: "How many employees are there?" or "Show me all employees"
• **For leave info**: "Show pending leave requests" or "Leave summary"  
• **For timesheet data**: "Show timesheet summary" or "How many hours today?"
• **For analytics**: "Show HR analytics" or "Department breakdown"

What specific information would you like to know?`;
  };

  const formatAdvancedResponse = (data) => {
    if (!data || typeof data !== 'object') {
      return 'Sorry, I encountered an issue understanding that. Please try again.';
    }
    const { response, type, data: responseData } = data;
    
    // Treat interview_candidates same as candidate_selection
    if ((type === 'candidate_selection' || type === 'interview_candidates') && responseData) {
      const { candidates, candidate_buttons, total_qualified } = responseData;
      setCandidateButtons(
        (candidate_buttons && candidate_buttons.length > 0)
          ? candidate_buttons
          : (candidates || []).slice(0, 10).map((c) => ({
              text: `Schedule ${c.candidate_name}`,
              action: `schedule interview for ${c.candidate_name}`,
              candidate_id: c.application_id,
              candidate_name: c.candidate_name,
              candidate_email: c.candidate_email,
            }))
      );
      setShowCandidateButtons(true);
      return response;
    }

    if (type === 'employee_list' && responseData) {
      console.log('🔍 DEBUG: Frontend received employee_list response');
      console.log('🔍 DEBUG: Employees data:', responseData);
      const { employees, total } = responseData;
      return `**Employee List** 👥\n\n**Total:** ${total} employees\n\n${employees.slice(0, 10).map(emp => 
        `• **${emp.name}** (${emp.department}) - ${emp.status}`
      ).join('\n')}${employees.length > 10 ? `\n\n... and ${employees.length - 10} more employees` : ''}`;
    }
    
    if (type === 'department_stats' && responseData) {
      const { departments } = responseData;
      return `**Department Statistics** 📊\n\n${departments.map(dept => 
        `• **${dept.department}**: ${dept.count} employees`
      ).join('\n')}`;
    }
    
    if (type === 'pending_leaves' && responseData) {
      const { leaves, count } = responseData;
      return `**Pending Leave Requests** ⏳\n\n**Total:** ${count}\n\n${leaves.slice(0, 5).map(leave => 
        `• **${leave.employee_name}** - ${leave.leave_type}\n  ${leave.start_date} to ${leave.end_date}`
      ).join('\n\n')}${leaves.length > 5 ? `\n\n... and ${leaves.length - 5} more requests` : ''}`;
    }
    
    if (type === 'leave_summary' && responseData) {
      const { total_requests, status_breakdown, type_breakdown } = responseData;
      return `**Leave Summary** 📅\n\n**Total Requests:** ${total_requests}\n\n**By Status:**\n${Object.entries(status_breakdown).map(([status, count]) => 
        `• ${status}: ${count}`
      ).join('\n')}\n\n**By Type:**\n${Object.entries(type_breakdown).map(([type, count]) => 
        `• ${type}: ${count}`
      ).join('\n')}`;
    }
    
    if (type === 'timesheet_summary' && responseData) {
      const { total_entries, total_hours, average_hours, active_sessions } = responseData;
      return `**Timesheet Summary** ⏰\n\n**Total Entries:** ${total_entries}\n**Total Hours:** ${total_hours}\n**Average Hours:** ${average_hours}\n**Active Sessions:** ${active_sessions}`;
    }
    
    if (type === 'analytics_summary' && responseData) {
      const { total_employees, active_employees, pending_leaves } = responseData;
      return `**HR Analytics Summary** 📊\n\n**Total Employees:** ${total_employees}\n**Active Employees:** ${active_employees}\n**Pending Leave Requests:** ${pending_leaves}`;
    }
    
    if (type === 'document_summary' && responseData) {
      const { total_documents, categories } = responseData;
      return `**Document Summary** 📁\n\n**Total Documents:** ${total_documents}\n\n**By Category:**\n${Object.entries(categories).map(([category, count]) => 
        `• ${category}: ${count}`
      ).join('\n')}`;
    }
    
    if (type === 'payroll_creation_result' && responseData) {
      const { created_count, skipped_count, errors, period } = responseData;
      let result = `**Payroll Creation Complete!** ✅\n\n**Created:** ${created_count} payroll records\n**Skipped:** ${skipped_count} (already exist)\n**Period:** ${period}\n\n`;
      
      if (errors && errors.length > 0) {
        result += `**Errors:** ${errors.length} records failed\n`;
        errors.slice(0, 3).forEach(error => {
          result += `• ${error}\n`;
        });
        if (errors.length > 3) {
          result += `• ... and ${errors.length - 3} more errors\n`;
        }
      }
      
      return result;
    }
    
    if (type === 'payroll_summary' && responseData) {
      const { total_records, current_month_records, current_month, current_year } = responseData;
      return `**Payroll Summary** 💰\n\n**Total Records:** ${total_records}\n**Current Month (${current_month}/${current_year}):** ${current_month_records} records`;
    }
    
    if (type === 'interview_scheduled' && responseData) {
      const { interview_id, candidate_name, candidate_email, scheduled_date, interviewer_name, meeting_link, status } = responseData;
      
      console.log('🔍 DEBUG: Frontend received interview_scheduled response');
      console.log('🔍 DEBUG: Interview data:', responseData);
      
      // Hide candidate buttons since interview is scheduled
      setShowCandidateButtons(false);
      setCandidateButtons([]);
      
      return response; // Return the formatted response from backend
    }
    
    if (type === 'pending_leaves_for_approval' && responseData) {
      const { leaves, count } = responseData;
      
      console.log('🔍 DEBUG: Frontend received pending_leaves_for_approval response');
      console.log('🔍 DEBUG: Leaves data:', leaves);
      console.log('🔍 DEBUG: Count:', count);
      
      // Store leaves for card display
      setPendingLeaves(leaves);
      setCurrentCardIndex(0);
      setShowLeaveCards(true);
      
      console.log('🔍 DEBUG: Set showLeaveCards to true, pendingLeaves:', leaves);
      
      return `**Pending Leave Requests** ⏳\n\n**Total:** ${count} requests\n\nSwipe through the cards below to review and approve/reject each leave request.`;
    }
    
    if (type === 'leave_approval_result' && responseData) {
      const { approved_count, errors } = responseData;
      let result = `**Leave Approval Complete!** ✅\n\n**Approved:** ${approved_count} leave requests\n`;
      
      if (errors && errors.length > 0) {
        result += `**Failed:** ${errors.length} requests\n\n**Errors:**\n`;
        errors.slice(0, 3).forEach(error => {
          result += `• ${error}\n`;
        });
        if (errors.length > 3) {
          result += `• ... and ${errors.length - 3} more errors\n`;
        }
      }
      
      return result;
    }
    
    // Default to the response text
    return response;
  };

  // Helper functions to format responses
  const getDepartmentBreakdown = (employees) => {
    // CRITICAL: Ensure employees is an array
    const safeEmployees = Array.isArray(employees) ? employees : [];
    if (safeEmployees.length === 0) {
      return 'No employees found.';
    }
    
    const deptStats = safeEmployees.reduce((acc, emp) => {
      if (!emp || typeof emp !== 'object') return acc;
      const dept = emp.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(deptStats)
      .sort(([,a], [,b]) => b - a)
      .map(([dept, count]) => `• **${dept}**: ${count} employees`)
      .join('\n');
  };

  const formatEmployeeList = (employees) => {
    // CRITICAL: Ensure employees is an array
    const safeEmployees = Array.isArray(employees) ? employees : [];
    if (safeEmployees.length === 0) {
      return 'No employees found.';
    }
    
    const activeEmployees = safeEmployees.filter(emp => emp?.status === 'ACTIVE');
    const departments = [...new Set(safeEmployees.map(emp => emp?.department).filter(Boolean))];
    
    return `**Employee Overview** 📊

**Total Employees:** ${safeEmployees.length}
**Active Employees:** ${activeEmployees.length}
**Departments:** ${departments.length}

**Department Breakdown:**
${departments.map(dept => {
  const count = safeEmployees.filter(emp => emp?.department === dept).length;
  return `• ${dept}: ${count} employees`;
}).join('\n')}

**Recent Employees:**
${safeEmployees.slice(0, 5).map(emp => 
  `• ${emp?.first_name || ''} ${emp?.last_name || ''} (${emp?.department || 'Unknown'})`
).join('\n')}

Use the Employee Management section for detailed information and management options.`;
  };

  const formatDepartmentStats = (employees) => {
    // CRITICAL: Ensure employees is an array
    const safeEmployees = Array.isArray(employees) ? employees : [];
    if (safeEmployees.length === 0) {
      return 'No employees found.';
    }
    
    const deptStats = safeEmployees.reduce((acc, emp) => {
      if (!emp || typeof emp !== 'object') return acc;
      const dept = emp.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    return `**Department Statistics** 📈

${Object.entries(deptStats)
  .sort(([,a], [,b]) => b - a)
  .map(([dept, count]) => `• **${dept}**: ${count} employees`)
  .join('\n')}

**Total Employees:** ${safeEmployees.length}
**Departments:** ${Object.keys(deptStats).length}`;
  };

  const formatPendingLeaves = (leaves) => {
    if (!leaves || leaves.length === 0) {
      return '**No pending leave requests** ✅\n\nAll leave requests have been processed.';
    }

    return `**Pending Leave Requests** ⏳

**Total Pending:** ${leaves.length}

${leaves.slice(0, 5).map(leave => 
  `• **${leave.employee?.first_name} ${leave.employee?.last_name}**
   - Type: ${leave.leave_type}
   - Dates: ${leave.start_date} to ${leave.end_date}
   - Reason: ${leave.notes || 'No reason provided'}`
).join('\n\n')}

${leaves.length > 5 ? `\n... and ${leaves.length - 5} more requests` : ''}

Use the Leave Management section to review and approve these requests.`;
  };

  const formatLeaveSummary = (leaves) => {
    const statusCounts = leaves.reduce((acc, leave) => {
      acc[leave.status] = (acc[leave.status] || 0) + 1;
      return acc;
    }, {});

    const typeCounts = leaves.reduce((acc, leave) => {
      acc[leave.leave_type] = (acc[leave.leave_type] || 0) + 1;
      return acc;
    }, {});

    return `**Leave Summary** 📅

**Total Requests:** ${leaves.length}

**By Status:**
${Object.entries(statusCounts).map(([status, count]) => 
  `• ${status}: ${count}`
).join('\n')}

**By Type:**
${Object.entries(typeCounts).map(([type, count]) => 
  `• ${type}: ${count}`
).join('\n')}`;
  };

  const formatTimesheetSummary = (data) => {
    const overview = data.overview || {};
    return `**Timesheet Summary** ⏰

**Total Hours:** ${overview.total_hours || 0}
**Average Hours/Employee:** ${overview.average_hours_per_employee || 0}
**Currently Working:** ${overview.currently_working || 0} employees
**Overtime Hours:** ${overview.overtime_hours || 0}

Use the Timesheet Management section for detailed views and individual employee tracking.`;
  };

  const formatJobList = (jobs) => {
    if (!jobs || jobs.length === 0) {
      return '**No open job positions** 📝\n\nAll positions have been filled or closed.';
    }

    const openJobs = jobs.filter(job => job.status === 'OPEN');
    
    return `**Open Job Positions** 💼

**Total Openings:** ${openJobs.length}

${openJobs.slice(0, 5).map(job => 
  `• **${job.title}** (${job.department})
   - Location: ${job.location}
   - Type: ${job.employment_type}
   - Applications: ${job.applications_count || 0}`
).join('\n\n')}

${openJobs.length > 5 ? `\n... and ${openJobs.length - 5} more positions` : ''}

Use the Recruitment section to manage these positions and applications.`;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = async () => {
    // Start a new conversation (new session); ref is set inside so next send uses new id
    await initializeAdminChatSession();
    setMessages([
      {
        id: 1,
        type: 'bot',
        content: 'Hello! I\'m your HR Admin Assistant. I can help you with:\n\n• Employee Management\n• Leave Approvals\n• Timesheet Oversight\n• Recruitment\n• Analytics & Reports\n• Document Management\n\nWhat would you like to do today?',
        timestamp: new Date()
      }
    ]);
  };

  const handleOpenChat = async () => {
    setIsOpen(true);
    // Create a new admin session for this conversation when opening the chat
    if (!sessionId) {
      await initializeAdminChatSession();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleOpenChat}
          className="group relative bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:from-blue-700 hover:to-indigo-700"
        >
          <FiMessageSquare className="w-6 h-6" />
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 transition-all duration-500 ease-in-out transform ${
      isMinimized ? 'w-80 h-16' : 'w-[420px] max-h-[85vh] flex flex-col'
    } ${isOpen ? 'animate-in slide-in-from-bottom-4 fade-in-0' : ''}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <FiMessageSquare className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          <div>
            <h3 className="font-semibold text-white">
              HR Admin Assistant
            </h3>
            <p className="text-xs text-slate-300">
              Always here to help
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={clearChat}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105"
            title="Clear chat"
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105"
            title="Toggle quick actions"
          >
            <FiMoreVertical className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-105"
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-all duration-200 hover:scale-105"
            title="Close"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 p-4 overflow-y-auto min-h-0 bg-gradient-to-b from-slate-50 to-white"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}
            onMouseLeave={async () => {
              // Fallback: if the latest bot message asks to select a candidate but no buttons are shown
              try {
                const last = messages[messages.length - 1];
                const needsButtons = last && last.type === 'bot' && /select a candidate to schedule/i.test(last.content);
                if (needsButtons && !showCandidateButtons) {
                  const qualified = await applicationsAPI.getQualifiedApplications();
                  const candidates = (qualified || []).map((app) => ({
                    text: `Schedule ${app.candidate_name || 'Candidate'}`,
                    action: `schedule interview for ${app.candidate_name || ''}`,
                    candidate_id: app.application_id,
                    candidate_name: app.candidate_name || 'Candidate',
                    candidate_email: app.candidate_email || '',
                  }));
                  if (candidates.length > 0) {
                    setCandidateButtons(candidates.slice(0, 10));
                    setShowCandidateButtons(true);
                  }
                }
              } catch (e) {
                // ignore fallback issues
              }
            }}
          >
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in-0 slide-in-from-bottom-2 duration-300`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white ml-8'
                        : 'bg-white text-gray-800 border border-gray-100 mr-8'
                    }`}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </div>
                    <div className={`text-xs mt-2 flex items-center space-x-1 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      <span>{message.timestamp.toLocaleTimeString()}</span>
                      {message.type === 'user' && (
                        <FiCheck className="w-3 h-3 text-blue-200" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                  <div className="bg-white text-gray-800 p-4 rounded-2xl border border-gray-100 shadow-sm mr-8">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-sm text-gray-600">Processing your request...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

           {/* Leave Cards */}
           {showLeaveCards && pendingLeaves.length > 0 && (
             <div className="border-t border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 animate-in slide-in-from-bottom-4 duration-500">
               <div className="p-4">
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center space-x-2">
                     <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                     <h3 className="text-sm font-semibold text-gray-800">Leave Approval Required</h3>
                   </div>
                   <button
                     onClick={closeLeaveCards}
                     className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-all duration-200"
                   >
                     <FiX className="w-4 h-4" />
                   </button>
                 </div>
                 
                 <div className="relative">
                   {/* Card Navigation */}
                   <div className="flex items-center justify-between mb-3">
                     <button
                       onClick={prevCard}
                       disabled={currentCardIndex === 0}
                       className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                     >
                       ←
                     </button>
                     <div className="flex items-center space-x-2">
                       <span className="text-xs font-medium text-gray-600 bg-white/50 px-2 py-1 rounded-full">
                         {currentCardIndex + 1} of {pendingLeaves.length}
                       </span>
                     </div>
                     <button
                       onClick={nextCard}
                       disabled={currentCardIndex === pendingLeaves.length - 1}
                       className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                     >
                       →
                     </button>
                   </div>

                   {/* Current Card */}
                   {pendingLeaves[currentCardIndex] && (
                     <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
                       <div className="space-y-4">
                         {/* Employee Info */}
                         <div className="flex items-center space-x-3">
                           <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
                             <FiUser className="w-6 h-6 text-white" />
                           </div>
                           <div>
                             <h4 className="font-semibold text-gray-900 text-base">
                               {pendingLeaves[currentCardIndex].employee_name}
                             </h4>
                             <p className="text-sm text-gray-500">Leave Request</p>
                           </div>
                         </div>

                         {/* Leave Details */}
                         <div className="space-y-3">
                           <div className="flex items-center space-x-3">
                             <FiCalendar className="w-5 h-5 text-blue-500" />
                             <span className="text-sm font-medium text-gray-700">
                               {pendingLeaves[currentCardIndex].leave_type}
                             </span>
                           </div>
                           
                           <div className="flex items-center space-x-3">
                             <FiClock className="w-5 h-5 text-green-500" />
                             <span className="text-sm text-gray-600">
                               {new Date(pendingLeaves[currentCardIndex].start_date).toLocaleDateString()} - {new Date(pendingLeaves[currentCardIndex].end_date).toLocaleDateString()}
                             </span>
                           </div>

                           {pendingLeaves[currentCardIndex].reason && (
                             <div className="flex items-start space-x-3">
                               <FiFileText className="w-5 h-5 text-purple-500 mt-0.5" />
                               <span className="text-sm text-gray-600 leading-relaxed">
                                 {pendingLeaves[currentCardIndex].reason}
                               </span>
                             </div>
                           )}
                         </div>

                         {/* Action Buttons */}
                         <div className="flex space-x-3 pt-3">
                           <button
                             onClick={() => handleLeaveAction(pendingLeaves[currentCardIndex].leave_id, 'approve')}
                             disabled={isLoading}
                             className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                           >
                             <div className="flex items-center justify-center space-x-2">
                               <FiCheck className="w-4 h-4" />
                               <span>Approve</span>
                             </div>
                           </button>
                           <button
                             onClick={() => handleLeaveAction(pendingLeaves[currentCardIndex].leave_id, 'reject')}
                             disabled={isLoading}
                             className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 text-white px-4 py-3 rounded-xl hover:from-red-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
                           >
                             <div className="flex items-center justify-center space-x-2">
                               <FiX className="w-4 h-4" />
                               <span>Reject</span>
                             </div>
                           </button>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             </div>
           )}

          {/* Candidate Selection Buttons */}
          {showCandidateButtons && candidateButtons.length > 0 && (
            <div className="border-t border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 animate-in slide-in-from-bottom-4 duration-500">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <h3 className="text-sm font-semibold text-gray-800">Select Candidate for Interview</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowCandidateButtons(false);
                      setCandidateButtons([]);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-all duration-200"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {candidateButtons.map((candidate, index) => (
                    <button
                      key={index}
                      onClick={() => handleCandidateSelection(candidate)}
                      disabled={isLoading}
                      className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 group-hover:text-blue-700">
                            {candidate.candidate_name}
                          </div>
                          <div className="text-sm text-gray-500 group-hover:text-blue-600">
                            {candidate.candidate_email}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FiCalendar className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                          <span className="text-xs text-gray-400 group-hover:text-blue-500">Schedule</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="mt-3 text-xs text-gray-500 text-center">
                  Click on a candidate to schedule their interview
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions - Redesigned */}
           {showQuickActions && (
             <div className="border-t border-gray-200 bg-gradient-to-br from-white via-slate-50 to-gray-50 animate-in slide-in-from-bottom-4 duration-500">
               <div className="px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-2">
                     <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                     <div className="text-xs font-bold text-white uppercase tracking-wider">Quick Actions</div>
                   </div>
                   <button
                     onClick={() => setShowQuickActions(false)}
                     className="text-slate-300 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-all duration-200"
                   >
                     <FiChevronDown className="w-4 h-4" />
                   </button>
                 </div>
               </div>
               <div className="p-4 space-y-3 max-h-80 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}>
                 {/* Group 1: Core HR Functions */}
                 <div className="grid grid-cols-2 gap-2.5">
                   <button
                     onClick={() => setInputMessage('Show me department analytics')}
                     className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-blue-200/50 hover:border-blue-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiBarChart className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Analytics</span>
                     </div>
                   </button>
                   <button
                     onClick={() => setInputMessage('Show me employee management options')}
                     className="group relative bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-emerald-200/50 hover:border-emerald-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiUsers className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Employees</span>
                     </div>
                   </button>
                 </div>
                 
                 {/* Group 2: Approvals & Tracking */}
                 <div className="grid grid-cols-2 gap-2.5">
                   <button
                     onClick={() => setInputMessage('Show me pending leave requests for approval')}
                     className="group relative bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-amber-200/50 hover:border-amber-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiCalendar className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Leave Requests</span>
                     </div>
                   </button>
                   <button
                     onClick={() => setInputMessage('Show me timesheet overview and analytics')}
                     className="group relative bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-purple-200/50 hover:border-purple-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiClock className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Timesheets</span>
                     </div>
                   </button>
                 </div>
                 
                 {/* Group 3: Operations */}
                 <div className="grid grid-cols-2 gap-2.5">
                   <button
                     onClick={() => setInputMessage('Show me recruitment dashboard and candidates')}
                     className="group relative bg-gradient-to-br from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-cyan-200/50 hover:border-cyan-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiBriefcase className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Recruitment</span>
                     </div>
                   </button>
                   <button
                     onClick={() => setInputMessage('Show me compliance reports and audit logs')}
                     className="group relative bg-gradient-to-br from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-red-200/50 hover:border-red-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiFileText className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Compliance</span>
                     </div>
                   </button>
                 </div>
                 
                 {/* Group 4: Payroll & Learning - Show for all */}
                 <div className="grid grid-cols-2 gap-2.5">
                   <button
                     onClick={() => setInputMessage('Show me payroll summary and reports')}
                     className="group relative bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-green-200/50 hover:border-green-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiDollarSign className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Payroll</span>
                     </div>
                   </button>
                   <button
                     onClick={() => setInputMessage('Show me learning progress')}
                     className="group relative bg-gradient-to-br from-violet-50 to-indigo-50 hover:from-violet-100 hover:to-indigo-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-violet-200/50 hover:border-violet-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-violet-400/20 to-indigo-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiBookOpen className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Learning</span>
                     </div>
                   </button>
                 </div>
                 
                 {/* Group 5: Documents - Show for all */}
                 <div className="grid grid-cols-2 gap-2.5">
                   <button
                     onClick={() => setInputMessage('Show me documents')}
                     className="group relative bg-gradient-to-br from-slate-50 to-gray-50 hover:from-slate-100 hover:to-gray-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-slate-200/50 hover:border-slate-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-slate-400/20 to-gray-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiFileText className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Documents</span>
                     </div>
                   </button>
                 </div>
                 
                 {/* Group 6: Survey & Engagement */}
                 <div className="grid grid-cols-2 gap-2.5">
                   <button
                     onClick={() => setInputMessage('Create a satisfaction survey')}
                     className="group relative bg-gradient-to-br from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-pink-200/50 hover:border-pink-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-pink-400/20 to-rose-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiFileText className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Satisfaction Survey</span>
                     </div>
                   </button>
                   <button
                     onClick={() => setInputMessage('Create an engagement survey')}
                     className="group relative bg-gradient-to-br from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-yellow-200/50 hover:border-yellow-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-amber-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiTrendingUp className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Engagement Survey</span>
                     </div>
                   </button>
                 </div>
                 
                 {/* Group 7: Survey Management */}
                 <div className="grid grid-cols-2 gap-2.5">
                   <button
                     onClick={() => setInputMessage('Create a pulse survey')}
                     className="group relative bg-gradient-to-br from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-orange-200/50 hover:border-orange-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiActivity className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Pulse Survey</span>
                     </div>
                   </button>
                   <button
                     onClick={() => setInputMessage('Show me engagement analytics')}
                     className="group relative bg-gradient-to-br from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 text-gray-800 px-3 py-3 rounded-xl transition-all duration-300 border border-teal-200/50 hover:border-teal-400 hover:shadow-lg transform hover:scale-[1.02] text-left overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:scale-150 transition-transform duration-500"></div>
                     <div className="relative flex items-center space-x-2.5">
                       <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-md group-hover:shadow-lg transition-all duration-300">
                         <FiBarChart className="w-4 h-4 text-white" />
                       </div>
                       <span className="text-sm font-semibold text-gray-800">Engagement Analytics</span>
                     </div>
                   </button>
                 </div>
               </div>
             </div>
           )}

           {/* Input */}
           <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about employees, leaves, timesheets..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50 hover:bg-white transition-all duration-200 placeholder-gray-400"
                  disabled={isLoading}
                />
                {inputMessage && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </div>
            {!showQuickActions && (
              <div className="mt-2 flex justify-center">
                <button
                  onClick={() => setShowQuickActions(true)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1 transition-colors duration-200"
                >
                  <FiChevronUp className="w-3 h-3" />
                  <span>Show Quick Actions</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminChatBot;
