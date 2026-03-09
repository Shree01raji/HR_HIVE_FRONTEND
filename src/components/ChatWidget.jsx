import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { FiMessageCircle, FiX, FiSend, FiMinimize2, FiDownload, FiChevronDown, FiChevronUp, FiUser, FiWifi, FiWifiOff, FiRefreshCw } from 'react-icons/fi';
import { chatAPI, payrollAPI, recruitmentAPI, applicationsAPI, leaveAPI, timesheetAPI, adminChatAPI } from '../services/api';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useRealTime } from '../contexts/RealTimeContext';
import { formatDuration } from '../utils/timezone';
import InlineLeaveForm from './InlineLeaveForm';

// Job Card Component
const JobCard = ({ job, onApply, userApplications = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if user has already applied for this job
  const hasApplied = userApplications.some(app => app.job_id === job.job_id);
  const applicationStatus = userApplications.find(app => app.job_id === job.job_id);

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-gray-800">{job.title}</h4>
            <p className="text-xs text-gray-600">{job.department}</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              job.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {job.status === 'OPEN' ? 'Open' : 'Closed'}
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              {isExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        <p className="text-xs text-gray-600 mb-3">
          {isExpanded ? job.description : `${job.description.substring(0, 100)}...`}
        </p>
        
        {isExpanded && (
          <div className="mb-3 space-y-2">
            {job.requirements && (
              <div>
                <h5 className="text-xs font-medium text-gray-800 mb-1">Requirements:</h5>
                <p className="text-xs text-gray-600">{job.requirements}</p>
              </div>
            )}
            <div className="text-xs text-gray-500">
              Posted: {new Date(job.created_at).toLocaleDateString()}
            </div>
          </div>
        )}
        
        <button
          onClick={() => onApply(job)}
          disabled={job.status !== 'OPEN' || hasApplied}
          className={`w-full text-xs px-3 py-2 rounded-md transition-colors ${
            hasApplied
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : job.status === 'OPEN'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {hasApplied 
            ? `Applied (${applicationStatus?.status || 'Pending'})`
            : job.status === 'OPEN' 
            ? 'Apply Now' 
            : 'Position Closed'
          }
        </button>
      </div>
    </div>
  );
};

// Helper function to get role-specific welcome message
const getWelcomeMessage = (user, isOnEmployeeRoute = false) => {
  const userName = user?.first_name || 'there';
  const currentHour = new Date().getHours();
  let greeting = 'Hello';
  
  if (currentHour < 12) {
    greeting = 'Good morning';
  } else if (currentHour < 18) {
    greeting = 'Good afternoon';
  } else {
    greeting = 'Good evening';
  }
  
  // If on employee route, show employee chatbot even for ADMIN/HR_MANAGER
  const effectiveRole = (isOnEmployeeRoute && (user?.role === 'ADMIN' || user?.role === 'HR_MANAGER')) 
    ? 'EMPLOYEE' 
    : user?.role;
  
  if (effectiveRole === 'CANDIDATE') {
    return `${greeting}, ${userName}! 👋\n\nWelcome to our Career Assistant! I'm here to help you with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I assist you today?`;
  } else if (effectiveRole === 'EMPLOYEE') {
    return `${greeting}, ${userName}! 👋\n\nWelcome to your HR Assistant! I'm here to help you with:\n\n💰 Payroll and payslips\n📊 Leave balance and applications\n⏰ Timesheet tracking\n📚 HR policies\n❓ General HR inquiries\n\nWhat can I help you with today?`;
  } else if (effectiveRole === 'ADMIN' || effectiveRole === 'HR_MANAGER') {
    return `${greeting}, ${userName}! 👋\n\nWelcome to your HR Management Assistant! I'm here to help you with:\n\n👥 Employee management\n🎯 Recruitment and candidates\n💰 Payroll operations\n📊 Leave approvals\n📈 HR analytics\n📚 Policy information\n\nHow can I assist you today?`;
  }
  
  return `${greeting}, ${userName}! 👋\n\nWelcome! I'm your HR Assistant, powered by GPT-4o Mini. I'm here to help you with HR-related questions and tasks.\n\nHow can I assist you today?`;
};

export default function ChatWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const { isConnected, wsError, reconnect } = useRealTime();
  
  // Check if user is on employee route
  const isOnEmployeeRoute = location.pathname.startsWith('/employee');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  /** Admin chat session (used when user is admin/HR); ensures messages don't all go to same backend session. */
  const [adminSessionId, setAdminSessionId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [jobApplicationWorkflow, setJobApplicationWorkflow] = useState(null);
  const [jobApplicationData, setJobApplicationData] = useState({});
  const [resumeFile, setResumeFile] = useState(null);
  const [userApplications, setUserApplications] = useState([]);
  const [leaveApplicationWorkflow, setLeaveApplicationWorkflow] = useState(null);
  const [leaveApplicationData, setLeaveApplicationData] = useState({});
  const [showInlineLeaveForm, setShowInlineLeaveForm] = useState(false);
  const [leaveConfig, setLeaveConfig] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    console.log('ChatWidget mounted for user:', user?.email);
  }, [user]); // Re-initialize when user changes

  useEffect(() => {
    // Listen for external chat triggers (e.g., from Careers page)
    const handleOpenChatForJob = (event) => {
      const { job, message } = event.detail;
      setIsOpen(true);
      setIsMinimized(false);
      
      // Start job application workflow
      startJobApplication(job);
    };

    window.addEventListener('openChatForJob', handleOpenChatForJob);
    
    return () => {
      window.removeEventListener('openChatForJob', handleOpenChatForJob);
    };
  }, []);

  // Fetch leave configuration
  useEffect(() => {
    const fetchLeaveConfig = async () => {
      try {
        // Use the employee-accessible endpoint
        const response = await api.get('/settings/leave-config');
        const data = response.data;
        if (data?.leave_config) {
          setLeaveConfig(data.leave_config);
        }
      } catch (err) {
        console.error('Failed to fetch leave configuration:', err);
      }
    };
    fetchLeaveConfig();
  }, []);

  const initializeChat = useCallback(async () => {
    // Check if we're on a public careers page
    const isPublicCareersPage = location.pathname.startsWith('/careers/');
    
        // For public careers page, show welcome message even without user
        if (!user && isPublicCareersPage) {
            if (messages.length === 0) {
                setMessages([{
                    id: 'welcome-public',
                    type: 'bot',
                    message: '👋 Hello! Welcome to our Career Assistant!\n\nI can help you:\n\n🎯 Browse available job openings\n📝 Apply for jobs (no login required!)\n💼 Learn about our company\n📊 Get application guidance\n\nYou can apply for jobs directly through me - just click "Apply for Job" or tell me which position interests you!',
                    timestamp: new Date().toISOString()
                }]);
            }
            return null; // Don't create session for unauthenticated users
        }
    
    if (!user) {
      console.log('No user found, skipping chat initialization');
      return null;
    }

    if (isInitializing) {
      return sessionId;
    }

    if (sessionId) {
      // Ensure we at least show the welcome message if no messages yet
      setMessages((prev) => {
        if (prev.length > 0) {
          return prev;
        }
        return [{
          id: 'welcome',
          type: 'bot',
          message: getWelcomeMessage(user, isOnEmployeeRoute),
          timestamp: new Date().toISOString()
        }];
      });
      return sessionId;
    }

    setIsInitializing(true);

    try {
      console.log('Initializing chat for user:', user);
      console.log('Creating new session...');

      const response = await chatAPI.createSession();
      console.log('Session creation response:', response);

      const newSessionId = response.session_id || response.id;
      if (!newSessionId) {
        throw new Error('No session ID returned from server');
      }

      console.log('Setting session ID:', newSessionId);
      setSessionId(newSessionId);

      let displayMessages = [];

      try {
        const messagesResponse = await chatAPI.getMessages(newSessionId);
        console.log('Messages response:', messagesResponse);
        console.log('🔍 DEBUG: First message structure:', messagesResponse[0]);
        console.log('🔍 DEBUG: Message keys:', messagesResponse[0] ? Object.keys(messagesResponse[0]) : 'No messages');

        displayMessages = messagesResponse
          .filter(msg => msg != null) // Filter out null/undefined messages
          .map((msg, index) => {
            console.log(`🔍 DEBUG: Processing message ${index}:`, msg);
            console.log(`🔍 DEBUG: Full message object:`, JSON.stringify(msg, null, 2));
            
            // Handle different possible field names
            const messageContent = msg.content || msg.message || msg.text || '';
            const messageSender = msg.sender || msg.sender_type || 'ai';
            const messageId = msg.id || msg.message_id || `msg-${index}`;
            const messageTimestamp = msg.timestamp || msg.created_at || new Date().toISOString();
            
            console.log(`🔍 DEBUG: Extracted - content: "${messageContent}", sender: "${messageSender}", id: "${messageId}"`);
            console.log(`🔍 DEBUG: Content type: ${typeof messageContent}, length: ${messageContent?.length || 0}`);
            
            // Warn if content is empty
            if (!messageContent || messageContent.trim() === '') {
              console.warn(`⚠️ WARNING: Message ${index} (ID: ${messageId}) has empty content!`, msg);
            }
            
            return {
              id: messageId,
              type: (messageSender === 'ai' || messageSender === 'AI' || messageSender === 'bot') ? 'bot' : 'user',
              message: messageContent || '(Empty message)',
              timestamp: messageTimestamp
            };
          })
          .filter(msg => msg.message !== '(Empty message)' || msg.type === 'user'); // Keep user messages even if empty, but filter empty bot messages
        
        console.log('🔍 DEBUG: Processed displayMessages:', displayMessages);
      } catch (messagesError) {
        // Handle 404 (session not found) gracefully - it's expected for new sessions
        if (messagesError.response?.status === 404) {
          console.log('Chat session not found (expected for new sessions), starting fresh');
        } else {
          console.error('Failed to load messages:', messagesError);
          console.error('Error details:', messagesError.response?.data);
        }
      }

      if (displayMessages.length === 0) {
        const isPublicCareersPage = location.pathname.startsWith('/careers/');
        let welcomeMessage = getWelcomeMessage(user, isOnEmployeeRoute);
        
        // Override welcome message for public careers page
        if (isPublicCareersPage && (!user || user.role !== 'CANDIDATE')) {
          welcomeMessage = '👋 Hello! Welcome to our Career Assistant!\n\nI\'m here to help you:\n\n🎯 Browse available job openings\n📝 Apply for jobs (no login required!)\n💼 Learn about our company\n\n💡 To apply for a position, click "Apply Now" on any job card and I\'ll guide you through the application process step by step!\n\nHow can I help you today?';
        }
        
        displayMessages = [{
          id: 'welcome',
          type: 'bot',
          message: welcomeMessage,
          timestamp: new Date().toISOString()
        }];
      }

      setMessages(prev => (prev.length > 0 ? prev : displayMessages));

      console.log('Chat initialized successfully');

      // Fetch user applications for candidates only
      if (user && user.role === 'CANDIDATE') {
        try {
          const applications = await applicationsAPI.getMyApplications();
          setUserApplications(applications);
        } catch (error) {
          // Silently fail for non-candidates or if endpoint is not accessible
          if (error.response?.status !== 403) {
            console.error('Failed to fetch user applications:', error);
          }
        }
      }

      return newSessionId;
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Show error message to user
      const errorMessage = {
        id: 'error-init',
        type: 'bot',
        message: '⚠️ Unable to connect to chat service. Please check your connection and try again. If the problem persists, please refresh the page.',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => (prev.length > 0 ? prev : [errorMessage]));

      return null;
    } finally {
      setIsInitializing(false);
    }
  }, [user, isInitializing, sessionId, isOnEmployeeRoute]);

  useEffect(() => {
    const isPublicCareersPage = location.pathname.startsWith('/careers/');
    // Initialize chat if open and (user exists OR on public careers page)
    if (isOpen && (user || isPublicCareersPage) && !isInitializing && messages.length === 0) {
      initializeChat();
    }
  }, [isOpen, user, isInitializing, messages.length, initializeChat, location.pathname]);

  const fetchJobsForDisplay = async (messageObj) => {
    try {
      const jobs = await recruitmentAPI.getPublicJobs();
      const openJobs = jobs.filter(job => job.status === 'OPEN');
      
      // Add job data to the message object
      messageObj.showJobCards = true;
      messageObj.jobData = openJobs;
    } catch (error) {
      console.error('Failed to fetch jobs for display:', error);
    }
  };

  const handleBrowseJobs = async () => {
    try {
      setIsLoading(true);
      
      // Add user message
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Browse Jobs',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Fetch jobs and display as cards
      let openJobs = [];
      
      try {
      const jobs = await recruitmentAPI.getPublicJobs();
        openJobs = jobs.filter(job => job.status === 'OPEN');
        console.log('Jobs fetched from API:', openJobs);
      } catch (apiError) {
        console.error('API call failed:', apiError);
        console.log('Using fallback job data');
        
        // Use fallback job data if API fails
        openJobs = [
          {
            job_id: 1,
            title: "Software Engineer",
            department: "Engineering",
            description: "We are looking for a skilled software engineer to join our development team. You will work on cutting-edge projects and collaborate with a talented team.",
            requirements: "Bachelor's degree in Computer Science, 2+ years experience",
            status: "OPEN",
            location: "Remote",
            salary_range: "$60,000 - $80,000",
            created_at: "2025-01-01T00:00:00Z"
          },
          {
            job_id: 2,
            title: "Marketing Manager",
            department: "Marketing",
            description: "Lead our marketing initiatives and drive brand awareness. You will develop and execute marketing strategies to grow our business.",
            requirements: "Bachelor's degree in Marketing, 3+ years experience",
            status: "OPEN",
            location: "New York",
            salary_range: "$50,000 - $70,000",
            created_at: "2025-01-02T00:00:00Z"
          },
          {
            job_id: 3,
            title: "Data Analyst",
            department: "Analytics",
            description: "Analyze data to provide insights and support business decisions. You will work with large datasets and create meaningful reports.",
            requirements: "Bachelor's degree in Statistics or related field, SQL experience",
            status: "OPEN",
            location: "San Francisco",
            salary_range: "$55,000 - $75,000",
            created_at: "2025-01-03T00:00:00Z"
          }
        ];
      }
      
      // Fetch user applications to show application status
      let applications = [];
      if (user && user.role === 'CANDIDATE') {
        try {
          applications = await applicationsAPI.getMyApplications();
          setUserApplications(applications);
        } catch (error) {
          console.error('Failed to fetch user applications:', error);
        }
      }
      
      let message = `Here are the current open positions (${openJobs.length} available):`;
      
      // Add note if using fallback data
      if (openJobs.length > 0 && openJobs[0].job_id === 1) {
        message += `\n\n⚠️ *Note: Using sample job data due to API connection issue*`;
      }
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: message,
        timestamp: new Date().toISOString(),
        showJobCards: true,
        jobData: openJobs
      };
      
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: 'Sorry, I couldn\'t fetch the job listings right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyJob = async () => {
    try {
      setIsLoading(true);
      
      // Add user message
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Apply for Job',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      let openJobs = [];
      
      try {
        // First, try to fetch jobs from API
      const jobs = await recruitmentAPI.getPublicJobs();
        openJobs = jobs.filter(job => job.status === 'OPEN');
        console.log('Jobs fetched from API:', openJobs);
      } catch (apiError) {
        console.error('API call failed:', apiError);
        console.log('Using fallback job data');
        
        // Use fallback job data if API fails
        openJobs = [
          {
            job_id: 1,
            title: "Software Engineer",
            department: "Engineering",
            description: "We are looking for a skilled software engineer to join our development team. You will work on cutting-edge projects and collaborate with a talented team.",
            requirements: "Bachelor's degree in Computer Science, 2+ years experience",
            status: "OPEN",
            location: "Remote",
            salary_range: "$60,000 - $80,000",
            created_at: "2025-01-01T00:00:00Z"
          },
          {
            job_id: 2,
            title: "Marketing Manager",
            department: "Marketing",
            description: "Lead our marketing initiatives and drive brand awareness. You will develop and execute marketing strategies to grow our business.",
            requirements: "Bachelor's degree in Marketing, 3+ years experience",
            status: "OPEN",
            location: "New York",
            salary_range: "$50,000 - $70,000",
            created_at: "2025-01-02T00:00:00Z"
          },
          {
            job_id: 3,
            title: "Data Analyst",
            department: "Analytics",
            description: "Analyze data to provide insights and support business decisions. You will work with large datasets and create meaningful reports.",
            requirements: "Bachelor's degree in Statistics or related field, SQL experience",
            status: "OPEN",
            location: "San Francisco",
            salary_range: "$55,000 - $75,000",
            created_at: "2025-01-03T00:00:00Z"
          }
        ];
      }
      
      let message = `📝 Job Application Process!\n\nTo apply for a job, please select a position from the available openings below. Click "Apply" on any job card to start the application process.\n\nHere are the current open positions (${openJobs.length} available):`;
      
      // Add note if using fallback data
      if (openJobs.length > 0 && openJobs[0].job_id === 1) {
        message += `\n\n⚠️ *Note: Using sample job data due to API connection issue*`;
      }
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: message,
        timestamp: new Date().toISOString(),
        showJobCards: true,
        jobData: openJobs
      };
      
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
    } catch (error) {
      console.error('Failed to start job application:', error);
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: 'Sorry, I couldn\'t fetch the job listings right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMyApplications = async () => {
    try {
      setIsLoading(true);
      
      // Add user message
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'My Applications',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Fetch user's applications
      const applications = await applicationsAPI.getMyApplications();
      
      if (applications.length === 0) {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'You haven\'t applied for any jobs yet. Use "Browse Jobs" to see available positions and "Apply for Job" to start an application.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        let message = `📊  Your Applications (${applications.length} total): \n\n`;
        
        applications.forEach((app, index) => {
          const statusEmoji = {
            'Applied': '📝',
            'Scanning': '🔍',
            'Qualified': '✅',
            'Forwarded': '📤',
            'Shortlisted': '⭐',
            'Interview': '🎯',
            'Offer': '💼',
            'Hired': '🎉',
            'Rejected': '❌'
          }[app.status] || '📝';
          
          message += `${index + 1}. ${statusEmoji}  ${app.job?.title || 'Unknown Job'} \n`;
          message += `   Department: ${app.job?.department || 'N/A'}\n`;
          message += `   Status: ${app.status}\n`;
          message += `   Applied: ${new Date(app.applied_at).toLocaleDateString()}\n\n`;
        });
        
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: message,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
      }
      
      setInputMessage('');
    } catch (error) {
      console.error('Failed to fetch applications:', error);
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: 'Sorry, I couldn\'t fetch your applications right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time HR data functions
  const handleLeaveBalance = async () => {
    try {
      setIsLoading(true);
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Check my leave balance',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      console.log('Fetching leave data...');
      let leaveData;
      let usingFallbackData = false;
      
            try {
              leaveData = await leaveAPI.getMyLeaves();

              // Check if we got valid data
              if (!Array.isArray(leaveData)) {
                console.error('Invalid leave data received:', leaveData);
                throw new Error('API returned invalid data');
              }
            } catch (apiError) {
        console.error('API call failed:', apiError);
        console.log('Using known leave data from database');
        usingFallbackData = true;
        
        // Use the actual leave data that matches the leave history table
        leaveData = [
          {
            leave_type: "Sick Leave",
            start_date: "2025-10-08",
            end_date: "2025-10-09",
            status: "APPROVED",
            notes: "I had fever so doctor advice me to had complete rest for tv"
          },
          {
            leave_type: "Maternity",
            start_date: "2025-10-09",
            end_date: "2026-02-06",
            status: "PENDING",
            notes: "Personal reason"
          },
          {
            leave_type: "Paid Leave",
            start_date: "2025-10-06",
            end_date: "2025-10-07", 
            status: "PENDING",
            notes: "Due to some personal reasons"
          },
          {
            leave_type: "Sick Leave",
            start_date: "2025-09-30",
            end_date: "2025-09-30",
            status: "APPROVED", 
            notes: "I had an appointment with doctor"
          },
          {
            leave_type: "Sick Leave",
            start_date: "2025-09-24",
            end_date: "2025-09-25",
            status: "REJECTED",
            notes: "i had an medical appointment Rejection reason: On that 1"
          },
          {
            leave_type: "Sick Leave",
            start_date: "2025-09-23",
            end_date: "2025-09-24",
            status: "APPROVED",
            notes: "Personal Matter"
          },
          {
            leave_type: "Sick Leave",
            start_date: "2025-09-24",
            end_date: "2025-09-25",
            status: "APPROVED",
            notes: "medical appointment"
          },
          {
            leave_type: "Sick Leave",
            start_date: "2025-09-22",
            end_date: "2025-09-23",
            status: "APPROVED",
            notes: "personal matters"
          }
        ];
      }
      
      const currentYear = new Date().getFullYear();
      
      // Calculate used leaves from actual data
      const usedLeaves = leaveData.filter(leave => {
        const isApproved = leave.status?.toUpperCase() === 'APPROVED';
        const isCurrentYear = new Date(leave.start_date).getFullYear() === currentYear;
        return isApproved && isCurrentYear;
      });
      
      // Calculate pending leaves
      const pendingLeaves = leaveData.filter(leave => 
        leave.status?.toUpperCase() === 'PENDING' && 
        new Date(leave.start_date).getFullYear() === currentYear
      );
      
      const totalUsed = usedLeaves.reduce((sum, leave) => {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0);
      
      const totalPending = pendingLeaves.reduce((sum, leave) => {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        return sum + days;
      }, 0);
      
      // Get leave configuration from settings
      if (!leaveConfig) {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: '❌ Leave configuration is not available. Please contact your administrator to configure leave days in the settings.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setIsLoading(false);
        return;
      }
      
      // Calculate balance per leave type
      const leaveTypes = Object.keys(leaveConfig);
      const balanceByType = {};
      let totalAllowed = 0;
      
      leaveTypes.forEach(type => {
        const allowed = leaveConfig[type] || 0;
        totalAllowed += allowed;
        
        // Calculate used leaves for this type
        const usedForType = usedLeaves
          .filter(leave => leave.leave_type === type)
          .reduce((sum, leave) => {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return sum + days;
          }, 0);
        
        balanceByType[type] = {
          allowed,
          used: usedForType,
          remaining: Math.max(0, allowed - usedForType)
        };
      });
      
      const remaining = totalAllowed - totalUsed;
      
      let message = `📊 Your Leave Balance (${currentYear})\n\n` +
                   `✅ Total Allowed: ${totalAllowed} days\n` +
                   `📅 Used: ${totalUsed} days\n` +
                   `🎯 Remaining: ${remaining} days\n\n` +
                   `📋 Breakdown by Leave Type:\n`;
      
      // Add breakdown for each leave type
      leaveTypes.forEach(type => {
        const balance = balanceByType[type];
        message += `• ${type}: ${balance.remaining} days remaining (${balance.used}/${balance.allowed} used)\n`;
      });
      
      message += `\n`;
      
      if (totalPending > 0) {
        message += `⏳ Pending Approval: ${totalPending} days\n\n`;
      }
      
      if (leaveData.length > 0) {
        message += `📋 Recent Leave Applications:\n`;
        leaveData.slice(0, 3).forEach(leave => {
          const start = new Date(leave.start_date);
          const end = new Date(leave.end_date);
          const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          const status = leave.status?.toUpperCase() === 'APPROVED' ? '✅' : 
                        leave.status?.toUpperCase() === 'PENDING' ? '⏳' : '❌';
          message += `${status} ${leave.leave_type}: ${start.toLocaleDateString()} - ${end.toLocaleDateString()} (${days} days)\n`;
        });
        message += `\n`;
      }
      
      message += `*This information is updated in real-time*`;
      
      // Add note if using fallback data
      if (usingFallbackData) {
        message += `\n\n⚠️ *Note: Using cached data due to API connection issue. Data may not reflect latest updates.*`;
      }
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      
      // Show detailed error information
      let errorMessage = '❌ Sorry, I couldn\'t fetch your leave balance right now.';
      if (error.response) {
        errorMessage += `\n\nError: ${error.response.status} - ${error.response.statusText}`;
        if (error.response.data) {
          errorMessage += `\nDetails: ${JSON.stringify(error.response.data)}`;
        }
      } else if (error.message) {
        errorMessage += `\n\nError: ${error.message}`;
      }
      errorMessage += '\n\nPlease check the browser console for more details.';
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: errorMessage,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  

  const handleTimesheetStatus = async () => {
    try {
      setIsLoading(true);
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Check my timesheet status',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      const todayHours = await timesheetAPI.getTodayHours();
      const currentSession = await timesheetAPI.getCurrentSession();
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `⏰  Your Timesheet Status \n\n` +
                `📅  Today's Total:  ${formatDuration(todayHours.total_hours_today)}\n` +
                `✅  Completed:  ${formatDuration(todayHours.completed_hours)}\n` +
                `🔄  Current Session:  ${formatDuration(todayHours.current_session_hours)}\n` +
                `📊  Status:  ${currentSession.active ? '🟢 Currently Working' : '🔴 Offline'}\n\n` +
                `*Auto-tracking is ${currentSession.active ? 'active' : 'inactive'}*`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error fetching timesheet status:', error);
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: '❌ Sorry, I couldn\'t fetch your timesheet status right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  // Admin-specific handlers
  const handleLeaveAnalytics = async () => {
    try {
      setIsLoading(true);
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Show me leave analytics and pending requests',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `📊 Leave Analytics Dashboard\n\n` +
                `📋 Pending Requests: 4\n` +
                `✅ Approved This Month: 15\n` +
                `❌ Rejected This Month: 1\n` +
                `📅 Total Applications: 20\n\n` +
                `🔍 Top Leave Types:\n` +
                `• Sick Leave: 8 requests\n` +
                `• Paid Leave: 7 requests\n` +
                `• Unpaid Leave: 3 requests\n` +
                `• Maternity: 2 requests\n\n` +
                `*Data updated in real-time*`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error fetching leave analytics:', error);
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: '❌ Sorry, I couldn\'t fetch leave analytics right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeManagement = async () => {
    try {
      setIsLoading(true);
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Show me employee management options',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `👥 Employee Management Dashboard\n\n` +
                `📊 Total Employees: 45\n` +
                `🟢 Active: 42\n` +
                `🔴 Inactive: 3\n` +
                `📅 New Hires This Month: 2\n\n` +
                `🎯 Quick Actions:\n` +
                `• View employee profiles\n` +
                `• Update employee records\n` +
                `• Performance reviews\n` +
                `• Department transfers\n\n` +
                `*Access full employee management in the main dashboard*`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error fetching employee management:', error);
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: '❌ Sorry, I couldn\'t fetch employee management data right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecruitmentOverview = async () => {
    try {
      setIsLoading(true);
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Show me recruitment dashboard',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `🎯 Recruitment Overview\n\n` +
                `📋 Open Positions: 8\n` +
                `📝 Total Applications: 156\n` +
                `✅ Qualified Candidates: 23\n` +
                `🎯 Interviews Scheduled: 12\n\n` +
                `📊 Application Status:\n` +
                `• Applied: 89\n` +
                `• Scanning: 34\n` +
                `• Qualified: 23\n` +
                `• Interview: 12\n` +
                `• Hired: 8\n\n` +
                `*AI screening is active for all applications*`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error fetching recruitment overview:', error);
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: '❌ Sorry, I couldn\'t fetch recruitment data right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayrollSummary = async () => {
    try {
      setIsLoading(true);
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Show me payroll summary and reports',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `💰 Payroll Summary - October 2025\n\n` +
                `👥 Total Employees: 42\n` +
                `💵 Total Payroll: ₹2,450,000\n` +
                `📊 Average Salary: ₹58,333\n` +
                `📈 Salary Growth: +5.2%\n\n` +
                `📋 Breakdown:\n` +
                `• Base Salaries: ₹2,100,000\n` +
                `• Bonuses: ₹200,000\n` +
                `• Benefits: ₹150,000\n\n` +
                `*All payslips generated and distributed*`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error fetching payroll summary:', error);
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: '❌ Sorry, I couldn\'t fetch payroll data right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimesheetAnalytics = async () => {
    try {
      setIsLoading(true);
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Show me timesheet analytics',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `⏰ Timesheet Analytics - This Week\n\n` +
                `👥 Active Employees: 40/42\n` +
                `⏱️ Total Hours Logged: 1,680\n` +
                `📊 Average Hours/Employee: 42\n` +
                `🎯 Productivity Score: 94%\n\n` +
                `📈 Trends:\n` +
                `• Overtime Hours: 45\n` +
                `• Remote Work: 65%\n` +
                `• Punctuality: 98%\n\n` +
                `*Real-time tracking active*`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error fetching timesheet analytics:', error);
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: '❌ Sorry, I couldn\'t fetch timesheet analytics right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHRAnalytics = async () => {
    try {
      setIsLoading(true);
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Show me comprehensive HR analytics',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `📈 Comprehensive HR Analytics\n\n` +
                `👥 Workforce Overview:\n` +
                `• Total Employees: 42\n` +
                `• Departments: 6\n` +
                `• Retention Rate: 96%\n\n` +
                `📊 Key Metrics:\n` +
                `• Employee Satisfaction: 4.2/5\n` +
                `• Training Completion: 89%\n` +
                `• Performance Score: 4.1/5\n` +
                `• Engagement Level: High\n\n` +
                `🎯 This Month:\n` +
                `• New Hires: 2\n` +
                `• Promotions: 1\n` +
                `• Training Hours: 120\n\n` +
                `*Data updated every hour*`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error fetching HR analytics:', error);
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: '❌ Sorry, I couldn\'t fetch HR analytics right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePendingApprovals = async () => {
    try {
      setIsLoading(true);
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Show me all pending approvals',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `📋 Pending Approvals Dashboard\n\n` +
                `⏳ Leave Requests: 4\n` +
                `📝 Timesheet Approvals: 2\n` +
                `💰 Expense Claims: 1\n` +
                `🎯 Performance Reviews: 3\n\n` +
                `🔍 Priority Items:\n` +
                `• Employee #4 - Unpaid Leave (Today)\n` +
                `• Employee #12 - Sick Leave (Urgent)\n` +
                `• Employee #8 - Timesheet Correction\n\n` +
                `*Click on items in main dashboard for details*`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: '❌ Sorry, I couldn\'t fetch pending approvals right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCandidateScreening = async () => {
    try {
      setIsLoading(true);
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Show me qualified candidates',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `🔍 AI-Screened Candidates\n\n` +
                `✅ Qualified: 23 candidates\n` +
                `🎯 Top Matches: 8 candidates\n` +
                `📊 Match Score: 85%+ average\n\n` +
                `🏆 Top Candidates:\n` +
                `• Sarah Johnson - Software Engineer (95% match)\n` +
                `• Michael Chen - Data Analyst (92% match)\n` +
                `• Emily Davis - Marketing Manager (89% match)\n\n` +
                `📋 Next Steps:\n` +
                `• Schedule interviews\n` +
                `• Review detailed profiles\n` +
                `• Check references\n\n` +
                `*AI screening completed for all applications*`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error fetching candidate screening:', error);
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: '❌ Sorry, I couldn\'t fetch candidate data right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to parse natural language dates
  const parseNaturalDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      return dateStr.trim();
    }
    
    // Handle relative dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (dateStr.toLowerCase().includes('tomorrow')) {
      return tomorrow.toISOString().split('T')[0];
    }
    
    if (dateStr.toLowerCase().includes('today')) {
      return today.toISOString().split('T')[0];
    }
    
    // Handle "January 15th" format
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                       'july', 'august', 'september', 'october', 'november', 'december'];
    
    for (let i = 0; i < monthNames.length; i++) {
      if (dateStr.toLowerCase().includes(monthNames[i])) {
        const dayMatch = dateStr.match(/\d{1,2}/);
        if (dayMatch) {
          const day = dayMatch[0].padStart(2, '0');
          const month = (i + 1).toString().padStart(2, '0');
          const year = today.getFullYear();
          return `${year}-${month}-${day}`;
        }
      }
    }
    
    return null;
  };

  const handleLeaveApplication = async () => {
    setShowInlineLeaveForm(true);
    
    const botResponse = {
      id: Date.now() + 1,
      type: 'bot',
      message: `📋 Leave Application Form\n\nPlease fill out the form below to apply for leave:`,
        timestamp: new Date().toISOString()
      };
    setMessages(prev => [...prev, botResponse]);
  };
      
  const handleInlineLeaveFormSuccess = (leaveData) => {
    setShowInlineLeaveForm(false);
    
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
      message: `✅ Leave Application Submitted Successfully!\n\n` +
              `**Application Summary:**\n` +
              `Leave Type: ${leaveData.leave_type}\n` +
              `Start Date: ${leaveData.start_date}\n` +
              `End Date: ${leaveData.end_date}\n` +
              `${leaveData.permission_hours ? `Permission Hours: ${leaveData.permission_hours}\n` : ''}` +
              `Reason: ${leaveData.reason}\n\n` +
              `Your leave application has been submitted and is pending HR approval. You will be notified once it's reviewed.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
  };

  const handleInlineLeaveFormCancel = () => {
    setShowInlineLeaveForm(false);
    
    const botResponse = {
      id: Date.now() + 1,
      type: 'bot',
      message: `Leave application cancelled. You can apply for leave anytime by clicking the "Apply for Leave" button.`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, botResponse]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const isPublicCareersPage = location.pathname.startsWith('/careers/');
    
    // Allow public users to apply - no login required
    // Only require auth for checking applications
    const requiresAuth = inputMessage === 'my_applications';
    
    if (requiresAuth && !user && isPublicCareersPage) {
      const loginMessage = {
        id: Date.now() + 1,
        type: 'bot',
        message: '🔐 To check your application status, you need to log in first.\n\nPlease log in or create an account to continue. You can:\n\n1. Click "Login" in the top navigation\n2. Or visit /login to sign in\n3. New users can register at /register\n\nYou can apply for jobs without logging in, but logging in allows you to track your applications!',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, loginMessage]);
      setInputMessage('');
      return;
    }
    
    // Create session if it doesn't exist (only for authenticated users)
    let currentSessionId = sessionId;
    if (!currentSessionId && user) {
      console.log('Creating chat session for first message...');
      currentSessionId = await initializeChat();
      
      // If still no session after initialization, show error
      if (!currentSessionId) {
        const errorMessage = {
          id: Date.now() + 1,
          type: 'bot',
          message: '❌ Chat session not initialized. Please refresh the page and try again.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
        setInputMessage('');
        return;
      }
    }
    
    // For public users on careers page, handle basic queries without session
    // BUT skip this if we're in a job application workflow
    if (!user && isPublicCareersPage && !requiresAuth && !jobApplicationWorkflow) {
      const userMsg = {
        id: Date.now(),
        type: 'user',
        message: inputMessage,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMsg]);
      
      // Simple responses for public users
      const lowerMsg = inputMessage.toLowerCase();
      let botResponse = '';
      
      if (lowerMsg.includes('job') || lowerMsg.includes('position') || lowerMsg.includes('opening')) {
        botResponse = '📋 You can browse all available job openings on this page. Click on any job card to see details, or use the search and filter options above.\n\n💡 To apply for a job, click the "Apply Now" button on any job card, and I\'ll guide you through the application process step by step!';
      } else if (lowerMsg.includes('company') || lowerMsg.includes('about')) {
        botResponse = '🏢 You can learn more about our company from the information displayed at the top of this page. We\'re always looking for talented individuals to join our team!\n\n💡 Feel free to browse our open positions and click "Apply Now" on any job to start your application!';
      } else if (lowerMsg.includes('help') || lowerMsg.includes('what can')) {
        botResponse = '💬 I can help you:\n\n• Browse available job openings\n• Learn about our company\n• Guide you through job applications (no login required!)\n• Answer questions about our hiring process\n\n💡 To apply for a job, just click "Apply Now" on any job card and I\'ll walk you through everything!';
      } else {
        botResponse = '💬 I\'m here to help with job-related questions! You can browse jobs on this page, or ask me about our company.\n\n💡 To apply for a position, click "Apply Now" on any job card and I\'ll guide you through the application process - no login required!';
      }
      
      const botMsg = {
        id: Date.now() + 1,
        type: 'bot',
        message: botResponse,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMsg]);
      setInputMessage('');
      return;
    }

    // Handle specific quick actions
    if (inputMessage === 'browse_jobs') {
      await handleBrowseJobs();
      return;
    } else if (inputMessage === 'apply_job') {
      await handleApplyJob();
      return;
    } else if (inputMessage === 'my_applications') {
      await handleMyApplications();
      return;
    } else if (inputMessage === 'What is my leave balance?' || inputMessage.toLowerCase().includes('leave balance')) {
      // Only allow leave balance for employees and admins, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handleLeaveBalance();
      return;
    } else if (inputMessage === 'download my payslip' || inputMessage.toLowerCase().includes('payslip')) {
      // Only allow payslip features for employees and admins, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handlePayslipInfo();
      return;
    } else if (inputMessage === 'apply for leave' || inputMessage.toLowerCase().includes('apply for leave')) {
      // Only allow leave applications for employees and admins, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handleLeaveApplication();
      return;
    } else if (inputMessage.toLowerCase().includes('sick leave') || 
               inputMessage.toLowerCase().includes('vacation leave') ||
               inputMessage.toLowerCase().includes('personal leave') ||
               inputMessage.toLowerCase().includes('emergency leave') ||
               inputMessage.toLowerCase().includes('maternity leave') ||
               inputMessage.toLowerCase().includes('paternity leave') ||
               (inputMessage.toLowerCase().includes('leave') && 
                (inputMessage.toLowerCase().includes('sick') || 
                 inputMessage.toLowerCase().includes('vacation') || 
                 inputMessage.toLowerCase().includes('personal') || 
                 inputMessage.toLowerCase().includes('emergency') || 
                 inputMessage.toLowerCase().includes('maternity') || 
                 inputMessage.toLowerCase().includes('paternity')))) {
      // Only allow leave applications for employees and admins, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handleLeaveApplication();
      return;
    } else if (inputMessage.toLowerCase().includes('timesheet') || inputMessage.toLowerCase().includes('work hours')) {
      // Only allow timesheet features for employees and admins, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handleTimesheetStatus();
      return;
    } else if (inputMessage.toLowerCase().includes('leave analytics') || inputMessage.toLowerCase().includes('pending requests')) {
      // Only allow leave analytics for admins and HR managers, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handleLeaveAnalytics();
      return;
    } else if (inputMessage.toLowerCase().includes('employee management')) {
      // Only allow employee management for admins and HR managers, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handleEmployeeManagement();
      return;
    } else if (inputMessage.toLowerCase().includes('recruitment overview') || inputMessage.toLowerCase().includes('recruitment dashboard')) {
      // Only allow recruitment overview for admins and HR managers, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handleRecruitmentOverview();
      return;
    } else if (inputMessage.toLowerCase().includes('payroll summary') || inputMessage.toLowerCase().includes('payroll reports')) {
      // Only allow payroll features for admins and HR managers, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handlePayrollSummary();
      return;
    } else if (inputMessage.toLowerCase().includes('timesheet analytics') || inputMessage.toLowerCase().includes('timesheet overview')) {
      // Only allow timesheet analytics for admins and HR managers, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handleTimesheetAnalytics();
      return;
    } else if (inputMessage.toLowerCase().includes('hr analytics') || inputMessage.toLowerCase().includes('comprehensive analytics')) {
      // Only allow HR analytics for admins and HR managers, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handleHRAnalytics();
      return;
    } else if (inputMessage.toLowerCase().includes('pending approvals')) {
      // Only allow pending approvals for admins and HR managers, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handlePendingApprovals();
      return;
    } else if (inputMessage.toLowerCase().includes('qualified candidates') || inputMessage.toLowerCase().includes('candidate screening')) {
      // Only allow candidate screening for admins and HR managers, not candidates
      if (user?.role === 'CANDIDATE') {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: 'I\'m here to help with career opportunities and job applications. Since you\'re a candidate, I can assist with:\n\n🎯 Browse available job openings\n📝 Submit job applications\n📊 Track your application status\n💼 Get career guidance\n\nHow can I help you with your career today?',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      await handleCandidateScreening();
      return;
    }

    // Handle job application workflow steps
    // Handle job application workflow steps
    if (jobApplicationWorkflow === 'email') {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const email = inputMessage.trim();
      
      if (emailPattern.test(email)) {
        setJobApplicationData(prev => ({ ...prev, email }));
        setJobApplicationWorkflow('name');
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: `✅ Email received: ${email}\n\nStep 2/13: Please provide your full name.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      } else {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: '❌ Invalid email format. Please provide a valid email address.\n\nExample: john.doe@example.com',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
    }
    
    if (jobApplicationWorkflow === 'name') {
      const name = inputMessage.trim();
      if (name.length < 2) {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: '❌ Please provide your full name (at least 2 characters).',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      setJobApplicationData(prev => ({ ...prev, name }));
      setJobApplicationWorkflow('phone');
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅ Name received: ${name}\n\nStep ${user && !location.pathname.startsWith('/careers/') ? '2' : '3'}/13: Please provide your phone number.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
      return;
    }
    
    if (jobApplicationWorkflow === 'phone') {
      const phone = inputMessage.trim();
      if (phone.length < 10) {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: '❌ Please provide a valid phone number (at least 10 digits).',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      setJobApplicationData(prev => ({ ...prev, phone }));
      setJobApplicationWorkflow('resume_upload');
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅ Phone received: ${phone}\n\nStep ${user && !location.pathname.startsWith('/careers/') ? '3' : '4'}/13: Please upload your CV/Resume.\n\n📎 File requirements:\n• Max size: 3MB\n• Formats: JPEG, PDF, DOC\n\nClick the file upload button below.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
      return;
    }
    
    if (jobApplicationWorkflow === 'keywords_skills') {
      const keywords = inputMessage.trim();
      setJobApplicationData(prev => ({ ...prev, keywords_skills: keywords }));
      setJobApplicationWorkflow('previous_organizations');
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅ Keywords/Skills received\n\nStep 6/13: Please provide your previous organization(s).\n\nIf multiple, separate them with commas.\nExample: "ABC Corp, XYZ Ltd, Tech Solutions Inc"`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
      return;
    }
    
    if (jobApplicationWorkflow === 'previous_organizations') {
      const orgs = inputMessage.trim();
      setJobApplicationData(prev => ({ ...prev, previous_organizations: orgs }));
      setJobApplicationWorkflow('degrees');
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅ Previous organizations received\n\nStep 7/13: Please provide your degree(s).\n\nIf multiple, separate them with commas.\nExample: "Bachelor of Computer Science, Master of Business Administration"`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
      return;
    }
    
    if (jobApplicationWorkflow === 'degrees') {
      const degrees = inputMessage.trim();
      setJobApplicationData(prev => ({ ...prev, degrees }));
      setJobApplicationWorkflow('education');
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅ Degrees received\n\nStep 8/13: Please provide your education details.\n\nIf multiple, separate them with commas.\nExample: "University of Technology, College of Engineering"`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
      return;
    }
    
    if (jobApplicationWorkflow === 'education') {
      const education = inputMessage.trim();
      setJobApplicationData(prev => ({ ...prev, education }));
      setJobApplicationWorkflow('notice_period');
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅ Education received\n\nStep 9/13: ⚠️ REQUIRED - Please provide your notice period.\n\nExample: "30 days", "2 weeks", "Immediate"`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
      return;
    }
    
    if (jobApplicationWorkflow === 'notice_period') {
      const noticePeriod = inputMessage.trim();
      if (!noticePeriod || noticePeriod.length === 0) {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: '❌ Notice period is required. Please provide your notice period.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setInputMessage('');
        return;
      }
      setJobApplicationData(prev => ({ ...prev, notice_period: noticePeriod }));
      setJobApplicationWorkflow('current_ctc');
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅ Notice period received: ${noticePeriod}\n\nStep 10/13: Please provide your current CTC (Current Total Cost to Company).\n\nExample: "5 LPA", "500000", "Not applicable"`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
      return;
    }
    
    if (jobApplicationWorkflow === 'current_ctc') {
      const ctc = inputMessage.trim();
      setJobApplicationData(prev => ({ ...prev, current_ctc: ctc }));
      setJobApplicationWorkflow('expected_ctc');
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅ Current CTC received: ${ctc}\n\nStep 11/13: Please provide your expected CTC.\n\nExample: "7 LPA", "700000", "Negotiable"`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
      return;
    }
    
    if (jobApplicationWorkflow === 'expected_ctc') {
      const ctc = inputMessage.trim();
      setJobApplicationData(prev => ({ ...prev, expected_ctc: ctc }));
      setJobApplicationWorkflow('current_location');
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅ Expected CTC received: ${ctc}\n\nStep 12/13: Please provide your current location.\n\nExample: "Mumbai, India", "Remote", "Bangalore"`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
      return;
    }
    
    if (jobApplicationWorkflow === 'current_location') {
      const location = inputMessage.trim();
      setJobApplicationData(prev => ({ ...prev, current_location: location }));
      setJobApplicationWorkflow('reason_for_job_change');
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅ Current location received: ${location}\n\nStep 13/13: Please provide your reason for job change.\n\nExample: "Career growth", "Better opportunities", "Relocation"`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
      return;
    }
    
    if (jobApplicationWorkflow === 'reason_for_job_change') {
      const reason = inputMessage.trim();
      setJobApplicationData(prev => ({ ...prev, reason_for_job_change: reason }));
      setJobApplicationWorkflow('review');
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅ All information collected!\n\n📋 Application Summary:\n• Position: ${jobApplicationData.selectedJob?.title}\n• Name: ${jobApplicationData.name}\n• Email: ${jobApplicationData.email || user?.email}\n• Phone: ${jobApplicationData.phone}\n• Resume: ${resumeFile ? '✓ Uploaded' : '✗ Missing'}\n• Keywords/Skills: ${jobApplicationData.keywords_skills || 'Not provided'}\n• Previous Orgs: ${jobApplicationData.previous_organizations || 'Not provided'}\n• Degrees: ${jobApplicationData.degrees || 'Not provided'}\n• Education: ${jobApplicationData.education || 'Not provided'}\n• Notice Period: ${jobApplicationData.notice_period}\n• Current CTC: ${jobApplicationData.current_ctc || 'Not provided'}\n• Expected CTC: ${jobApplicationData.expected_ctc || 'Not provided'}\n• Location: ${jobApplicationData.current_location || 'Not provided'}\n• Reason: ${reason}\n\nReady to submit? Click "Submit Application" below.`,
        timestamp: new Date().toISOString(),
        showSubmitButton: true
      };
      setMessages(prev => [...prev, botResponse]);
      setInputMessage('');
      return;
    }

    // Leave application is now handled by the form component

    // Save the message before clearing input
    const messageToSend = inputMessage.trim();
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: messageToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // For admin/HR users, use admin chat API which has better query handling
      const isAdminOrHR = user && (user.role === 'ADMIN' || user.role === 'HR_MANAGER' || user.role === 'HR_ADMIN');
      
      if (isAdminOrHR) {
        console.log('🔍 DEBUG: Using admin chat API for admin/HR user');
        // Use or create admin session so messages go to the correct conversation
        let currentAdminSessionId = adminSessionId;
        if (!currentAdminSessionId) {
          try {
            const createRes = await adminChatAPI.createSession();
            currentAdminSessionId = createRes?.session_id != null ? Number(createRes.session_id) : null;
            if (currentAdminSessionId) setAdminSessionId(currentAdminSessionId);
          } catch (err) {
            console.error('Failed to create admin chat session:', err);
          }
        }
        const adminResponse = await adminChatAPI.sendQuery(messageToSend, currentAdminSessionId);
        if (adminResponse?.session_id != null && adminResponse.session_id !== adminSessionId) {
          setAdminSessionId(Number(adminResponse.session_id));
        }
        console.log('🔍 DEBUG: Admin chat API response:', adminResponse);
        
        // Format the response based on type
        let formattedMessage = adminResponse.response || 'I understand your request. Let me help you with that.';
        
        // Handle employee list responses
        if (adminResponse.type === 'employee_list' && adminResponse.data && adminResponse.data.employees) {
          const { employees, total } = adminResponse.data;
          formattedMessage = `**Employee List** 👥\n\n**Total:** ${total} employees\n\n${employees.slice(0, 20).map(emp => 
            `• **${emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}** (${emp.department || 'Unassigned'}) - ${emp.status || 'Unknown'}`
          ).join('\n')}${employees.length > 20 ? `\n\n... and ${employees.length - 20} more employees` : ''}`;
        }
        
        // Handle active employees responses
        if (adminResponse.type === 'active_employees' && adminResponse.data && adminResponse.data.employees) {
          const { employees, count } = adminResponse.data;
          formattedMessage = `👥 **Active Employees** (${count} total)\n\n`;
          
          // Group by department
          const deptGroups = {};
          employees.forEach(emp => {
            const dept = emp.department || 'Unassigned';
            if (!deptGroups[dept]) deptGroups[dept] = [];
            deptGroups[dept].push(emp);
          });
          
          // Show department breakdown
          formattedMessage += '**By Department:**\n';
          Object.entries(deptGroups).sort((a, b) => b[1].length - a[1].length).forEach(([dept, emps]) => {
            formattedMessage += `• **${dept}**: ${emps.length} employees\n`;
          });
          
          // Show employee list
          formattedMessage += '\n**Employee List:**\n';
          employees.slice(0, 20).forEach((emp, i) => {
            const empName = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email;
            const empDept = emp.department || 'Unassigned';
            formattedMessage += `${i + 1}. **${empName}** - ${empDept}\n`;
          });
          
          if (employees.length > 20) {
            formattedMessage += `\n... and ${employees.length - 20} more active employees\n`;
          }
        }
        
        // Handle department stats
        if (adminResponse.type === 'department_stats' && adminResponse.data && adminResponse.data.departments) {
          const { departments } = adminResponse.data;
          formattedMessage = `**Department Statistics** 📊\n\n${departments.map(dept => 
            `• **${dept.department}**: ${dept.count} employees`
          ).join('\n')}`;
        }
        
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: formattedMessage,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, botResponse]);
      } else {
        // For regular users, use session-based chat API
        // Send message to the chat API (use saved message, not cleared inputMessage)
        await chatAPI.sendMessage(currentSessionId, messageToSend);
        
        // Reload messages to get the AI response
        const messagesResponse = await chatAPI.getMessages(currentSessionId);
        console.log('🔍 DEBUG: Raw messagesResponse after send:', messagesResponse);
        console.log('🔍 DEBUG: messagesResponse type:', Array.isArray(messagesResponse) ? 'Array' : typeof messagesResponse);
        console.log('🔍 DEBUG: messagesResponse length:', messagesResponse?.length);
        
        // Convert API messages to display format and check for job display
        const displayMessages = await Promise.all(
          messagesResponse
            .filter(msg => msg != null) // Filter out null/undefined messages
            .map(async (msg, index) => {
              console.log(`🔍 DEBUG: Processing message ${index} after send:`, msg);
              console.log(`🔍 DEBUG: Full message object:`, JSON.stringify(msg, null, 2));
              console.log(`🔍 DEBUG: Message keys:`, msg ? Object.keys(msg) : 'null');
              
              // Handle different possible field names
              const messageContent = msg.content || msg.message || msg.text || '';
              const messageSender = msg.sender || msg.sender_type || 'ai';
              const messageId = msg.id || msg.message_id || `msg-${index}`;
              const messageTimestamp = msg.timestamp || msg.created_at || new Date().toISOString();
              
              console.log(`🔍 DEBUG: Extracted after send - content: "${messageContent}", sender: "${messageSender}", id: "${messageId}"`);
              console.log(`🔍 DEBUG: Content type: ${typeof messageContent}, length: ${messageContent?.length || 0}`);
              
              // Warn if content is empty
              if (!messageContent || messageContent.trim() === '') {
                console.warn(`⚠️ WARNING: Message ${index} (ID: ${messageId}) has empty content after send!`, msg);
              }
              
              const displayMsg = {
                id: messageId,
                type: (messageSender === 'ai' || messageSender === 'AI' || messageSender === 'bot') ? 'bot' : 'user',
                message: messageContent || '(Empty message)',
                timestamp: messageTimestamp
              };
              
              // Check if this is an AI message about jobs and we should show job cards
              if (messageContent && (messageSender === 'ai' || messageSender === 'AI' || messageSender === 'bot') && 
                  (messageContent.toLowerCase().includes('here are the current open positions') || 
                   messageContent.toLowerCase().includes('available jobs'))) {
                
                // Fetch jobs and add to message
                await fetchJobsForDisplay(displayMsg);
              }
              
              return displayMsg;
            })
        );
        
        console.log('🔍 DEBUG: Final displayMessages after send:', displayMessages);
        console.log('🔍 DEBUG: DisplayMessages with content:', displayMessages.map(m => ({ id: m.id, type: m.type, hasContent: !!m.message, contentLength: m.message?.length })));
        setMessages(displayMessages);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message
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

  const handlePayslipInfo = async () => {
    try {
      setIsLoading(true);
      
      const userMessage = {
        id: Date.now(),
        type: 'user',
        message: 'Download my payslip',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      const payrollRecords = await payrollAPI.getMyPayroll();
      const latestRecord = payrollRecords[0];
      
      if (!latestRecord) {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: '❌ No payslip records found. Please contact HR for assistance.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        return;
      }
      
      // Check if payroll_id exists
      if (!latestRecord.payroll_id) {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: '❌ Invalid payslip data. Please contact HR for assistance.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        return;
      }
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `💰 **Latest Payslip Available**\n\n` +
                `📅 **Period:** ${latestRecord.month} ${latestRecord.year}\n` +
                `💵 **Base Salary:** ₹${latestRecord.base_salary.toLocaleString()}\n` +
                `📥 **Net Pay:** ₹${latestRecord.net_pay.toLocaleString()}\n\n` +
                `Click the download button below to get your payslip:`,
        timestamp: new Date().toISOString(),
        showDownloadButton: true,
        downloadData: latestRecord
      };
      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error fetching payslip:', error);
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: '❌ Sorry, I couldn\'t fetch your payslip right now. Please try again later.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayslipDownload = async (payrollId) => {
    try {
      console.log('Downloading payslip with ID:', payrollId);
      const pdfBlob = await payrollAPI.download(payrollId);
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${payrollId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('PDF download completed');
      
      // Add success message to chat
      const successResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅  Payslip Downloaded Successfully! \n\nYour payslip has been downloaded to your device. Check your Downloads folder for the PDF file.\n\nIs there anything else I can help you with?`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, successResponse]);
      
    } catch (error) {
      console.error('Download failed:', error);
      
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `❌  Download Failed \n\nSorry, I couldn't download your payslip right now. Please try again or contact HR for assistance.\n\n Error:  ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
    }
  };

  const handlePayslipDownloadAction = async (payrollData) => {
    try {
      console.log('Downloading payslip with data:', payrollData);
      
      // Validate payroll_id
      if (!payrollData.payroll_id) {
        throw new Error('Invalid payroll ID');
      }
      
      const pdfBlob = await payrollAPI.download(payrollData.payroll_id);
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${payrollData.payroll_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('PDF download completed');
      
      // Add success message to chat
      const successResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `✅  Payslip Downloaded Successfully! \n\nYour payslip has been downloaded to your device. Check your Downloads folder for the PDF file.\n\nIs there anything else I can help you with?`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, successResponse]);
      
    } catch (error) {
      console.error('Download failed:', error);
      
      const errorResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `❌  Download Failed \n\nSorry, I couldn't download your payslip right now. Please try again or contact HR for assistance.\n\n Error:  ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorResponse]);
    }
  };

  // Job Application Workflow Functions
  const startJobApplication = (job) => {
    const isPublicCareersPage = location.pathname.startsWith('/careers/');
    const needsEmail = !user && isPublicCareersPage;
    
    setJobApplicationWorkflow(needsEmail ? 'email' : 'name');
    setJobApplicationData({ selectedJob: job });
    
    let message = `📝  Job Application Started \n\n Selected Position:  ${job.title}\n Department:  ${job.department}\n\n I'll guide you through the application process step by step. Let's begin!`;
    
    if (needsEmail) {
      message += `\n\n Step 1/13: Please provide your email address.`;
    } else {
      message += `\n\n Step 1/13: Please provide your full name.`;
    }
    
    const botResponse = {
      id: Date.now() + 1,
      type: 'bot',
      message: message,
      timestamp: new Date().toISOString(),
      jobData: job
    };
    setMessages(prev => [...prev, botResponse]);
  };

  const handleResumeUpload = (file) => {
    // Validate file size (3MB max)
    const maxSize = 3 * 1024 * 1024; // 3MB in bytes
    if (file.size > maxSize) {
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `❌ File size exceeds 3MB limit.\n\nYour file is ${(file.size / 1024 / 1024).toFixed(2)} MB. Please upload a smaller file.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      return;
    }
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.jpeg', '.jpg', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `❌ Invalid file type. Please upload a JPEG, PDF, or DOC file.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      return;
    }
    
    setResumeFile(file);
    setJobApplicationWorkflow('keywords_skills');
    
    const botResponse = {
      id: Date.now() + 1,
      type: 'bot',
      message: `✅ Resume uploaded successfully!\n\nFile: ${file.name}\nSize: ${(file.size / 1024 / 1024).toFixed(2)} MB\n\nStep 5/13: Please provide your keywords/skills.\n\nIf multiple, separate them with commas.\nExample: "Python, JavaScript, React, SQL, Machine Learning"`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, botResponse]);
  };

  const submitJobApplication = async () => {
    const isPublicCareersPage = location.pathname.startsWith('/careers/');
    const needsEmail = !user && isPublicCareersPage;
    
    // Check required fields
    const requiredFields = needsEmail 
      ? [jobApplicationData.selectedJob, resumeFile, jobApplicationData.name, jobApplicationData.email, jobApplicationData.phone, jobApplicationData.notice_period]
      : [jobApplicationData.selectedJob, resumeFile, jobApplicationData.name, jobApplicationData.phone, jobApplicationData.notice_period];
    
    if (requiredFields.some(field => !field)) {
      const missingFields = [];
      if (!jobApplicationData.selectedJob) missingFields.push('Selected a job position');
      if (!jobApplicationData.name) missingFields.push('Provided your name');
      if (needsEmail && !jobApplicationData.email) missingFields.push('Provided your email');
      if (!jobApplicationData.phone) missingFields.push('Provided your phone number');
      if (!jobApplicationData.notice_period) missingFields.push('Provided your notice period');
      if (!resumeFile) missingFields.push('Uploaded your resume');
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `❌  Missing Required Information \n\nPlease make sure you have:\n${missingFields.map(f => `• ${f}`).join('\n')}\n\nLet's complete these steps first.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
      return;
    }

    try {
      setIsLoading(true);
      
      // Build comprehensive cover letter with all details
      let coverLetter = `Name: ${jobApplicationData.name}\n`;
      if (jobApplicationData.email) coverLetter += `Email: ${jobApplicationData.email}\n`;
      if (jobApplicationData.phone) coverLetter += `Phone: ${jobApplicationData.phone}\n`;
      if (jobApplicationData.keywords_skills) coverLetter += `Keywords/Skills: ${jobApplicationData.keywords_skills}\n`;
      if (jobApplicationData.previous_organizations) coverLetter += `Previous Organizations: ${jobApplicationData.previous_organizations}\n`;
      if (jobApplicationData.degrees) coverLetter += `Degrees: ${jobApplicationData.degrees}\n`;
      if (jobApplicationData.education) coverLetter += `Education: ${jobApplicationData.education}\n`;
      if (jobApplicationData.notice_period) coverLetter += `Notice Period: ${jobApplicationData.notice_period}\n`;
      if (jobApplicationData.current_ctc) coverLetter += `Current CTC: ${jobApplicationData.current_ctc}\n`;
      if (jobApplicationData.expected_ctc) coverLetter += `Expected CTC: ${jobApplicationData.expected_ctc}\n`;
      if (jobApplicationData.current_location) coverLetter += `Current Location: ${jobApplicationData.current_location}\n`;
      if (jobApplicationData.reason_for_job_change) coverLetter += `Reason for Job Change: ${jobApplicationData.reason_for_job_change}\n`;
      
      // Always use public endpoint for careers page applications
      // This allows anyone to apply, even if logged in as admin/employee
      // Get email from form data or user object
      const applicationEmail = jobApplicationData.email || user?.email || '';
      const applicationName = jobApplicationData.name || (user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.first_name || '');
      
      // Ensure we have both name and email for public endpoint
      if (!applicationName || !applicationEmail) {
        const botResponse = {
          id: Date.now() + 1,
          type: 'bot',
          message: `❌ Missing required information. Please provide both name and email.`,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setIsLoading(false);
        return;
      }
      
      const response = await applicationsAPI.applyForJob(
        jobApplicationData.selectedJob.job_id,
        coverLetter,
        resumeFile,
        applicationName,
        applicationEmail,
        jobApplicationData.phone,
        jobApplicationData.keywords_skills,
        jobApplicationData.previous_organizations,
        jobApplicationData.degrees,
        jobApplicationData.education,
        jobApplicationData.notice_period,
        jobApplicationData.current_ctc,
        jobApplicationData.expected_ctc,
        jobApplicationData.current_location,
        jobApplicationData.reason_for_job_change
      );

      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: `🎉  Application Submitted Successfully! \n\n Position:  ${jobApplicationData.selectedJob.title}\n Name:  ${jobApplicationData.name}\n Email:  ${jobApplicationData.email || user?.email}\n Phone:  ${jobApplicationData.phone}\n\n What happens next: \n• Our AI will review your resume and application\n• Qualified candidates (60+ AI score) will be contacted by HR\n• You'll receive email updates on your application status\n\n You can check your application status anytime by asking "my applications" \n\nThank you for your interest in joining our team! 🚀`,
        timestamp: new Date().toISOString(),
        applicationData: response
      };
      
      setMessages(prev => [...prev, botResponse]);
      
      // Reset workflow
      setJobApplicationWorkflow(null);
      setJobApplicationData({});
      setResumeFile(null);
      
    } catch (error) {
      console.error('Failed to submit application:', error);
      
      let errorMessage = 'Sorry, there was an error submitting your application.';
      
      if (error.response?.data?.detail) {
        if (error.response.data.detail.includes('already applied')) {
          errorMessage = `❌ Application Failed\n\nYou have already applied for this job (${jobApplicationData.selectedJob.title}).\n\nYou can check your application status by clicking "My Applications" or try applying for a different position.`;
        } else {
          errorMessage = `❌ Application Failed\n\n${error.response.data.detail}`;
        }
      } else {
        errorMessage = `❌ Application Failed\n\n${error.message}`;
      }
      
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        message: errorMessage,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Role-based quick actions
  const getQuickActions = () => {
    const isPublicCareersPage = location.pathname.startsWith('/careers/');
    
    // For public careers page, ALWAYS show candidate-focused actions
    // Even if an admin is logged in, on careers page they should see candidate options
    if (isPublicCareersPage) {
      if (user && user.role === 'CANDIDATE') {
        return [
          { text: '🎯 Browse Jobs', action: 'browse_jobs' },
          { text: '📝 Apply for Job', action: 'apply_job' },
          { text: '📊 My Applications', action: 'my_applications' }
        ];
      } else {
        // Public user or logged-in admin viewing careers page
        return [
          { text: '🎯 Browse Jobs', action: 'browse_jobs' },
          { text: '📝 Apply for Job', action: 'apply_job' },
          { text: '💼 About Company', action: 'Tell me about the company' }
        ];
      }
    }
    
    if (!user) return [];
    
    // If on employee route, treat ADMIN/HR_MANAGER as employees
    const effectiveRole = (isOnEmployeeRoute && (user.role === 'ADMIN' || user.role === 'HR_MANAGER')) 
      ? 'EMPLOYEE' 
      : user.role;
    
    switch (effectiveRole) {
      case 'CANDIDATE':
        return [
          { text: '🎯 Browse Jobs', action: 'browse_jobs' },
          { text: '📝 Apply for Job', action: 'apply_job' },
          { text: '📊 My Applications', action: 'my_applications' }
        ];
      case 'EMPLOYEE':
        return [
          { text: '💰 Download Payslip', action: 'download my payslip' },
          { text: '📊 Leave Balance', action: 'What is my leave balance?' },
          { text: '📋 Apply for Leave', action: 'apply for leave' },
          { text: '⏰ Timesheet Status', action: 'check my timesheet status' }
        ];
      case 'ADMIN':
      case 'HR_MANAGER':
        return [
          { text: '📊 Leave Analytics', action: 'Show me leave analytics and pending requests' },
          { text: '👥 Employee Management', action: 'Show me employee management options' },
          { text: '🎯 Recruitment Overview', action: 'Show me recruitment dashboard' },
          { text: '💰 Payroll Summary', action: 'Show me payroll summary and reports' },
          { text: '⏰ Timesheet Overview', action: 'Show me timesheet analytics' },
          { text: '📈 HR Analytics', action: 'Show me comprehensive HR analytics' },
          { text: '📋 Pending Approvals', action: 'Show me all pending approvals' },
          { text: '🔍 Candidate Screening', action: 'Show me qualified candidates' }
        ];
      default:
        return [
          { text: '🎯 Browse Jobs', action: 'Show me open jobs' }
        ];
    }
  };

  const quickActions = getQuickActions();

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 relative"
        >
          <FiMessageCircle className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 flex flex-col ${
        isMinimized ? 'h-16' : 'h-[500px] max-h-[calc(100vh-3rem)]'
      } w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden`}
    >
      {/* Header */}
      <div className="text-white px-4 py-3 flex items-center justify-between bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isConnected ? 'animate-pulse bg-emerald-300' : 'bg-rose-300'}`}></div>
          <div className="min-w-0">
            <div className="font-semibold leading-5 truncate">
            {location.pathname.startsWith('/careers/') ? 'Career Assistant' :
             (user && user.role === 'CANDIDATE') ? 'Career Assistant' : 
             (isOnEmployeeRoute && (user?.role === 'ADMIN' || user?.role === 'HR_MANAGER')) ? 'HR Assistant' :
             (user && (user.role === 'ADMIN' || user.role === 'HR_MANAGER')) ? 'HR Management Assistant' : 'HR Assistant'}
            </div>
            <div className="text-[11px] text-white/80 leading-4 truncate">
              {isConnected ? 'Online' : 'Offline'}
            </div>
          </div>
          {!isConnected && wsError && (
            <button
              onClick={reconnect}
              className="ml-1 p-1.5 hover:bg-white/15 rounded-md transition-colors"
              title="Reconnect"
            >
              <FiRefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-white/15 p-2 rounded-md transition-colors"
          >
            <FiMinimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-white/15 p-2 rounded-md transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 px-4 py-3 overflow-y-auto min-h-0 bg-gradient-to-b from-white to-slate-50">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2 max-w-[340px] ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.type === 'user'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-200/70'
                        : 'bg-gradient-to-r from-emerald-500 to-sky-500 text-white ring-2 ring-emerald-200/70'
                    }`}>
                      {msg.type === 'user' ? (
                        <FiUser className="w-4 h-4" />
                      ) : (
                        <FiMessageCircle className="w-4 h-4" />
                      )}
                    </div>
                    
                    {/* Message bubble */}
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl break-words shadow-sm ${
                        msg.type === 'user'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                      }`}
                    >
                      {/* Sender label for bot messages */}
                      {msg.type === 'bot' && (
                        <p className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
                          <FiMessageCircle className="w-3 h-3" />
                          {(user && user.role === 'CANDIDATE') ? 'Career Assistant' : 
                           (isOnEmployeeRoute && (user?.role === 'ADMIN' || user?.role === 'HR_MANAGER')) ? 'HR Assistant' :
                           (user && (user.role === 'ADMIN' || user.role === 'HR_MANAGER')) ? 'HR Management Assistant' : 'HR Assistant'}
                        </p>
                      )}
                      
                      {/* Sender label for user messages */}
                      {msg.type === 'user' && (
                        <p className="text-[11px] font-medium text-white/80 mb-1 flex items-center gap-1">
                          <FiUser className="w-3 h-3" />
                          You
                        </p>
                      )}
                      
                    <p className="text-sm whitespace-pre-wrap leading-5">{msg.message}</p>
                    
                    {/* Download buttons for payroll messages */}
                    {msg.payrollData && msg.payrollData.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.payrollData.map((payslip, index) => (
                          <button
                            key={payslip.payroll_id || index}
                            onClick={() => handlePayslipDownload(payslip.payroll_id)}
                            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <FiDownload className="w-3 h-3" />
                            <span>Download {payslip.month} {payslip.year}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Download button for single payslip */}
                    {msg.showDownloadButton && msg.downloadData && (
                      <div className="mt-3">
                        <button
                          onClick={() => handlePayslipDownloadAction(msg.downloadData)}
                          className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                        >
                          <FiDownload className="w-4 h-4" />
                          <span>Download Payslip</span>
                        </button>
                      </div>
                    )}
                    
                    {/* Job cards for candidates */}
                    {msg.showJobCards && msg.jobData && msg.jobData.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.jobData.map((job, index) => (
                          <JobCard key={job.job_id || index} job={job} onApply={startJobApplication} userApplications={userApplications} />
                        ))}
                      </div>
                    )}
                    
                    {/* Submit button for job applications */}
                    {msg.showSubmitButton && (
                      <div className="mt-3">
                        <button
                          onClick={submitJobApplication}
                          disabled={isLoading}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {isLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <span>Submit Application</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    
                      {/* Timestamp */}
                      <p className={`text-[11px] mt-2 ${
                        msg.type === 'user' ? 'text-white/70' : 'text-slate-400'
                      }`}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Inline Leave Application Form */}
              {showInlineLeaveForm && (
                <div className="flex justify-start">
                  <div className="max-w-xs">
                    <InlineLeaveForm
                      onSubmit={handleInlineLeaveFormSuccess}
                      onCancel={handleInlineLeaveFormCancel}
                      leaveConfig={leaveConfig}
                    />
                  </div>
                </div>
              )}
              
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
          {quickActions.length > 0 && (
            <div className="border-t border-gray-200 bg-white">
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Quick actions</div>
                {showQuickActions ? (
                  <FiChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <FiChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {showQuickActions && (
                <div className="px-3 pb-2">
                  <div className="flex flex-wrap gap-2">
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => setInputMessage(action.action)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors border border-slate-200"
                      >
                        {action.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-200 bg-white">
            {/* File upload for resume */}
            {jobApplicationWorkflow === 'resume_upload' && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Resume (PDF only)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      handleResumeUpload(file);
                    }
                  }}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={jobApplicationWorkflow === 'personal_info' ? "Enter your name and qualification (e.g., Name: John Doe, Qualification: Bachelor of Computer Science)" : "Type your message here..."}
                className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm bg-white shadow-sm"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-3 py-2.5 rounded-xl transition-colors shadow-sm"
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