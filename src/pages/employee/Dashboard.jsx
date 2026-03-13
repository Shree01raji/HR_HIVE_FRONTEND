import React, { useState, useEffect } from 'react';
import { leaveAPI, onboardingAPI, chatAPI, employeeAPI, leaveTypesAPI, timesheetAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FiCalendar, 
  FiDollarSign, 
  FiMessageSquare, 
  FiClock,
  FiTrendingUp,
  FiFileText,
  FiCheckCircle,
  FiEdit3,
  FiChevronDown,
  FiMoreVertical,
  FiPlay,
  FiPause
} from 'react-icons/fi';
import CalendarWidget from '../../components/employee/CalendarWidget';
import ConnectionStatus from '../../components/ConnectionStatus';

export default function EmployeeDashboard() {
  const BREAK_LIMIT_SECONDS = 60 * 60;
  const getTodayKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDuration = (totalSeconds) => {
    const safeSeconds = Math.max(0, Number(totalSeconds) || 0);
    const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(safeSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const { user, updateProfile, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    leaveBalance: 0,
    pendingLeaves: 0,
    activeChats: 0,
    completedTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState({});
  const [todos, setTodos] = useState([]);
  const [managerName, setManagerName] = useState('');
  const [employeeData, setEmployeeData] = useState(null);
  const [birthdayEmployees, setBirthdayEmployees] = useState([]);
  const [birthdayWishMessages, setBirthdayWishMessages] = useState([]);
  const [sendingWishes, setSendingWishes] = useState({});
  const [wishedEmployees, setWishedEmployees] = useState({});
  const [wishesHiddenAfterThankYou, setWishesHiddenAfterThankYou] = useState(false);
  const [isLeaveBalanceExpanded, setIsLeaveBalanceExpanded] = useState(true);
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  const [timeTracking, setTimeTracking] = useState({
    dateKey: '',
    workAccumulatedSeconds: 0,
    workStartMs: null,
    breakAccumulatedSeconds: 0,
    breakStartMs: null
  });
  const [timerActionLoading, setTimerActionLoading] = useState(false);

  const getSafeDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const toTimestampMs = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  };

  const normalizeSessionToTracking = (sessionPayload) => {
    if (!sessionPayload || typeof sessionPayload !== 'object') return null;

    const payload = sessionPayload?.data && typeof sessionPayload.data === 'object'
      ? sessionPayload.data
      : sessionPayload;
    const session = payload?.session && typeof payload.session === 'object' ? payload.session : {};
    const active = Boolean(
      payload?.active ??
      payload?.is_active ??
      payload?.clocked_in ??
      payload?.is_clocked_in ??
      session?.active ??
      session?.is_active
    );

    const workSecondsRaw =
      payload?.work_seconds ??
      payload?.total_work_seconds ??
      payload?.today_work_seconds ??
      payload?.current_duration_seconds ??
      session?.work_seconds ??
      session?.total_work_seconds;

    const breakSecondsRaw =
      payload?.break_seconds ??
      payload?.total_break_seconds ??
      payload?.today_break_seconds ??
      session?.break_seconds ??
      session?.total_break_seconds;

    const hasDurationHours = Number.isFinite(Number(payload?.current_duration_hours));
    const inferredWorkSeconds = hasDurationHours
      ? Math.max(0, Math.round(Number(payload.current_duration_hours) * 3600))
      : 0;

    const workAccumulatedSeconds = Math.max(
      0,
      Number.isFinite(Number(workSecondsRaw)) ? Number(workSecondsRaw) : inferredWorkSeconds
    );
    const breakAccumulatedSeconds = Math.max(0, Number(breakSecondsRaw) || 0);

    const workStartMs =
      toTimestampMs(payload?.clock_in_at) ||
      toTimestampMs(payload?.clock_in_time) ||
      toTimestampMs(payload?.start_time) ||
      toTimestampMs(payload?.login_time) ||
      toTimestampMs(session?.clock_in_at) ||
      toTimestampMs(session?.clock_in_time) ||
      toTimestampMs(session?.start_time) ||
      toTimestampMs(session?.login_time);

    const breakStartMs =
      toTimestampMs(payload?.break_started_at) ||
      toTimestampMs(payload?.break_start_time) ||
      toTimestampMs(session?.break_started_at) ||
      toTimestampMs(session?.break_start_time);

    return {
      dateKey: getTodayKey(),
      workAccumulatedSeconds,
      // When explicit totals are returned, resume from now to avoid double-counting from historic timestamps.
      workStartMs: active && !breakStartMs ? (workAccumulatedSeconds > 0 ? Date.now() : (workStartMs || Date.now())) : null,
      breakAccumulatedSeconds,
      breakStartMs: breakStartMs ? Date.now() : null
    };
  };

  const syncTimerFromServer = async () => {
    try {
      const sessionData = await timesheetAPI.getTodaySession();
      const normalized = normalizeSessionToTracking(sessionData);
      if (normalized) {
        setTimeTracking((prev) => ({
          ...prev,
          ...normalized
        }));
      }
    } catch (err) {
      // Keep local timer running if API is unavailable; do not block dashboard.
      console.warn('Failed to sync timer from server:', err);
    }
  };

  const normalizeBirthdayEmployees = (birthdays) => {
    const safeBirthdays = Array.isArray(birthdays) ? birthdays : [];
    return safeBirthdays.map((employee) => ({
      id: employee?.id || employee?.employee_id || employee?.user_id,
      name: employee?.name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || employee?.email || 'Employee',
      isSelf: Boolean(employee?.is_self)
    }));
  };

  const getBirthdayWishMessages = (notifications) => {
    const safeNotifications = Array.isArray(notifications) ? notifications : [];
    return safeNotifications
      .filter((notification) => {
        const message = String(notification?.message || '').toLowerCase();
        return message.includes('birthday') || message.includes('wish');
      })
      .slice(0, 5)
      .map((notification) => ({
        id: notification?.notification_id,
        message: notification?.message || 'You have a birthday wish.',
        createdAt: notification?.created_at
      }));
  };

  const extractLeaveTypeRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.results)) return payload.results;
    const firstArray = Object.values(payload).find((value) => Array.isArray(value));
    return Array.isArray(firstArray) ? firstArray : [];
  };

  const normalizeLeaveTypeName = (value) => String(value || '').trim().toLowerCase();

  const getLeaveDurationDays = (leave) => {
    const notes = String(leave?.notes || '');
    const durationMatch = notes.match(/\[LEAVE_DURATION:\s*([A-Z_]+)\]/i);
    const rawDuration = String(durationMatch?.[1] || '').toUpperCase();
    const isHalfDay = rawDuration === 'FIRST_HALF' || rawDuration === 'SECOND_HALF';

    if (isHalfDay) return 0.5;

    const start = new Date(leave?.start_date);
    const end = new Date(leave?.end_date || leave?.start_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  };

  useEffect(() => {
    if (user?.employee_id) {
      fetchEmployeeData();
      fetchDashboardData();
    }
  }, [user?.employee_id]); // Only re-fetch when employee_id changes

  useEffect(() => {
    if (!user?.employee_id) return;

    const storageKey = `employee-dashboard-timers-${user.employee_id}`;
    const todayKey = getTodayKey();
    const nowMs = Date.now();
    const defaultTracking = {
      dateKey: todayKey,
      workAccumulatedSeconds: 0,
      workStartMs: nowMs,
      breakAccumulatedSeconds: 0,
      breakStartMs: null
    };

    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      const shouldReuse = parsed && parsed.dateKey === todayKey;
      const legacyLoginStartMs = Number(parsed?.loginStartMs) || null;
      const safeTracking = shouldReuse
        ? {
            dateKey: parsed.dateKey,
        workAccumulatedSeconds: Math.max(0, Number(parsed.workAccumulatedSeconds) || 0),
        workStartMs: parsed.workStartMs ? Number(parsed.workStartMs) : (legacyLoginStartMs || nowMs),
            breakAccumulatedSeconds: Math.max(0, Number(parsed.breakAccumulatedSeconds) || 0),
            breakStartMs: parsed.breakStartMs ? Number(parsed.breakStartMs) : null
          }
        : defaultTracking;

      setTimeTracking(safeTracking);
      localStorage.setItem(storageKey, JSON.stringify(safeTracking));
      syncTimerFromServer();
    } catch (err) {
      console.error('Failed to read employee timer state:', err);
      setTimeTracking(defaultTracking);
      localStorage.setItem(storageKey, JSON.stringify(defaultTracking));
      syncTimerFromServer();
    }
  }, [user?.employee_id]);

  useEffect(() => {
    if (!user?.employee_id || !timeTracking.dateKey) return;
    const storageKey = `employee-dashboard-timers-${user.employee_id}`;
    localStorage.setItem(storageKey, JSON.stringify(timeTracking));
  }, [timeTracking, user?.employee_id]);

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!user?.employee_id || !timeTracking.dateKey) return;
    const todayKey = getTodayKey();
    if (todayKey === timeTracking.dateKey) return;

    const nowMs = Date.now();
    setTimeTracking({
      dateKey: todayKey,
      workAccumulatedSeconds: 0,
      workStartMs: nowMs,
      breakAccumulatedSeconds: 0,
      breakStartMs: null
    });
  }, [currentTimeMs, timeTracking.dateKey, user?.employee_id]);

  const fetchEmployeeData = async () => {
    try {
      if (user?.employee_id) {
        const freshEmployeeData = await employeeAPI.get(user.employee_id);
        setEmployeeData(freshEmployeeData);
        
        // Fetch manager name if manager_id exists
        if (freshEmployeeData.manager_id) {
          const managerData = await employeeAPI.get(freshEmployeeData.manager_id);
          setManagerName(`${managerData.first_name || ''} ${managerData.last_name || ''}`.trim());
        } else {
          setManagerName('');
        }
        
        // Update AuthContext with fresh employee data - this ensures designation is updated
        if (updateProfile) {
          updateProfile({
            ...user,
            designation: freshEmployeeData.designation,
            department: freshEmployeeData.department,
            position: freshEmployeeData.designation,
            manager_id: freshEmployeeData.manager_id,
            profile_photo: freshEmployeeData.profile_photo
          });
        }
        
        // Also refresh the session to get latest data
        if (refreshUser) {
          await refreshUser();
        }
      }
    } catch (err) {
      console.error('Error fetching employee data:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching dashboard data...');
      
      const [leaves, chats, tasks, birthdays, notifications, leaveTypesPayload] = await Promise.all([
        leaveAPI.getMyLeaves().catch((err) => {
          console.error('Error fetching leaves:', err);
          return [];
        }),
        chatAPI.getSessions().catch((err) => {
          console.error('Error fetching chats:', err);
          return [];
        }),
        onboardingAPI.getMyTasks().catch((err) => {
          console.error('Error fetching tasks:', err);
          return [];
        }),
        employeeAPI.getTodaysBirthdays().catch((err) => {
          console.error('Error fetching birthdays:', err);
          return [];
        }),
        onboardingAPI.getNotifications().catch((err) => {
          console.error('Error fetching notifications:', err);
          return [];
        }),
        leaveTypesAPI.list().catch((err) => {
          console.error('Error fetching leave types:', err);
          return [];
        })
      ]);

      console.log('Dashboard data received:', { leaves, chats, tasks, birthdays, notifications });

      // Ensure all data is arrays before filtering
      const safeLeaves = Array.isArray(leaves) ? leaves : [];
      const safeChats = Array.isArray(chats) ? chats : [];
      const safeTasks = Array.isArray(tasks) ? tasks : [];
      const safeBirthdays = normalizeBirthdayEmployees(birthdays);

      const leaveTypeRows = extractLeaveTypeRows(leaveTypesPayload);
      const currentYear = new Date().getFullYear();

      const approvedLeaves = safeLeaves.filter((leave) => {
        const status = String(leave?.status || '').toUpperCase();
        const start = new Date(leave?.start_date || leave?.created_at || Date.now());
        return status === 'APPROVED' && start.getFullYear() === currentYear;
      });

      const usedByType = approvedLeaves.reduce((acc, leave) => {
        const key = normalizeLeaveTypeName(leave?.leave_type);
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + getLeaveDurationDays(leave);
        return acc;
      }, {});

      const computedLeaveBalance = {};
      leaveTypeRows.forEach((row) => {
        const rawName = row?.leave_type || row?.name || row?.type_name || row?.title || row?.label;
        const leaveTypeName = String(rawName || '').trim();
        if (!leaveTypeName) return;

        const totalRaw = row?.default_days_per_year ?? row?.days_per_year ?? row?.days ?? row?.allowed_days ?? 0;
        const total = Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : 0;
        const used = Number((usedByType[normalizeLeaveTypeName(leaveTypeName)] || 0).toFixed(1));

        computedLeaveBalance[leaveTypeName] = { used, total };
      });

      const fallbackUsedByType = safeLeaves.reduce((acc, leave) => {
        const key = String(leave?.leave_type || '').trim();
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + getLeaveDurationDays(leave);
        return acc;
      }, {});

      if (Object.keys(computedLeaveBalance).length === 0) {
        Object.entries(fallbackUsedByType).forEach(([type, used]) => {
          computedLeaveBalance[type] = { used: Number(used.toFixed(1)), total: Number(used.toFixed(1)) };
        });
      }

      const totalRemaining = Object.values(computedLeaveBalance).reduce((sum, item) => {
        const total = Number(item?.total || 0);
        const used = Number(item?.used || 0);
        return sum + Math.max(0, total - used);
      }, 0);

      setStats({
        leaveBalance: totalRemaining,
        pendingLeaves: safeLeaves.filter(l => l?.status === 'PENDING').length,
        activeChats: safeChats.length,
        completedTasks: safeTasks.filter(t => t?.status === 'COMPLETED').length
      });

      // Update leave balance from real leave types + leave history
      setLeaveBalance(computedLeaveBalance);
      
      // Fetch todos
      setTodos(safeTasks.slice(0, 5).map(task => ({
        id: task.id,
        title: task.title || task.name || 'Task',
        completed: task.status === 'COMPLETED'
      })));

      setBirthdayEmployees(safeBirthdays);
      setBirthdayWishMessages(getBirthdayWishMessages(notifications));
      setWishesHiddenAfterThankYou(false);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = () => {
    // This will be handled by the chat widget
    // The chat widget will detect leave-related messages and provide guidance
    const chatWidget = document.querySelector('[data-chat-widget]');
    if (chatWidget) {
      // Trigger chat widget to open and focus
      const chatButton = chatWidget.querySelector('button');
      if (chatButton) {
        chatButton.click();
      }
    }
  };

  const handleSendBirthdayWish = async (employee) => {
    if (!employee?.id || employee?.isSelf || sendingWishes[employee.id] || wishedEmployees[employee.id]) {
      return;
    }

    setSendingWishes((prev) => ({ ...prev, [employee.id]: true }));
    try {
      const senderName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Your teammate';
      await employeeAPI.sendBirthdayWish(
        employee.id,
        `🎉 Happy Birthday ${employee.name}! Best wishes from ${senderName}.`
      );
      setWishedEmployees((prev) => ({ ...prev, [employee.id]: true }));
    } catch (err) {
      console.error('Error sending birthday wish:', err);
      setError(err.response?.data?.detail || 'Failed to send birthday wish. Please try again.');
    } finally {
      setSendingWishes((prev) => ({ ...prev, [employee.id]: false }));
    }
  };

  const handleThankYouAllWishes = () => {
    setWishesHiddenAfterThankYou(true);
  };

  const handleToggleBreak = async () => {
    if (timerActionLoading) return;

    const isOnBreak = Boolean(timeTracking.breakStartMs);
    setTimerActionLoading(true);

    try {
      if (isOnBreak) {
        const response = await timesheetAPI.endBreak();
        const normalized = normalizeSessionToTracking(response);
        if (normalized) {
          setTimeTracking((prev) => ({ ...prev, ...normalized }));
        } else {
          await syncTimerFromServer();
        }
      } else {
        const response = await timesheetAPI.startBreak();
        const normalized = normalizeSessionToTracking(response);
        if (normalized) {
          setTimeTracking((prev) => ({ ...prev, ...normalized }));
        } else {
          await syncTimerFromServer();
        }
      }
    } catch (err) {
      console.warn('Failed to update break status via API, applying local fallback:', err);

      // Non-blocking fallback keeps timer usable if API call fails.
      setTimeTracking((prev) => {
        if (!prev.dateKey) return prev;
        const nowMs = Date.now();

        if (!prev.breakStartMs) {
          const activeWorkSeconds = prev.workStartMs
            ? Math.max(0, Math.floor((nowMs - prev.workStartMs) / 1000))
            : 0;

          return {
            ...prev,
            workAccumulatedSeconds: prev.workAccumulatedSeconds + activeWorkSeconds,
            workStartMs: null,
            breakStartMs: nowMs
          };
        }

        const elapsedSeconds = Math.max(0, Math.floor((nowMs - prev.breakStartMs) / 1000));
        return {
          ...prev,
          breakStartMs: null,
          breakAccumulatedSeconds: prev.breakAccumulatedSeconds + elapsedSeconds,
          workStartMs: nowMs
        };
      });
    } finally {
      setTimerActionLoading(false);
    }
  };


  // Work timer only runs if clocked in and not on break
  const isClockedIn = Boolean(timeTracking.workStartMs) && !timeTracking.breakStartMs;
  const isOnBreak = Boolean(timeTracking.breakStartMs);
  const workSeconds = timeTracking.workAccumulatedSeconds + (
    isClockedIn
      ? Math.max(0, Math.floor((currentTimeMs - timeTracking.workStartMs) / 1000))
      : 0
  );
  const breakSeconds = timeTracking.breakAccumulatedSeconds + (
    isOnBreak
      ? Math.max(0, Math.floor((currentTimeMs - timeTracking.breakStartMs) / 1000))
      : 0
  );
  const isBreakLimitExceeded = breakSeconds > BREAK_LIMIT_SECONDS;

  const userBirthday = getSafeDate(employeeData?.date_of_birth || user?.date_of_birth);
  const today = new Date();
  const isUsersBirthdayToday = Boolean(
    birthdayEmployees.some((employee) => employee?.isSelf) ||
    (userBirthday && userBirthday.getDate() === today.getDate() && userBirthday.getMonth() === today.getMonth())
  );

  return (
    <div className="h-full flex flex-col bg-[#e8f0f5]">
      {/* Dark Blue Header Section - Figma Design */}
      <div className="bg-[#1e3a5f] text-white px-6 py-6 mb-6 rounded-lg mx-6 relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-gray-800 text-2xl font-bold">
                {user?.first_name?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold mb-1 truncate">
                {user?.first_name} {user?.last_name}
              </h1>
              <p className="text-gray-300 text-sm truncate">
                {employeeData?.designation || 'Employee'}
              </p>
              {managerName && (
                <p className="text-gray-400 text-xs truncate mt-1">
                  Reporting Manager - {managerName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/employee/profile')}
            className="bg-yellow-400 text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors flex items-center space-x-2 flex-shrink-0 ml-4"
          >
            <FiEdit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        </div>
        {/* Decorative paper airplane */}
        <div className="absolute right-20 top-4 opacity-20 pointer-events-none">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
        </div>
      </div>

      {/* Connection Status - Only show if not fully connected */}
      {/* <div className="mx-6 mb-6">
        <ConnectionStatus showDetails={false} />
      </div> */}

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto">
        {/* Left Column - Available Leave Days */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Time Tracking */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Today's Timers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Work Timer</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl font-bold text-slate-900">{formatDuration(workSeconds)}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${isClockedIn ? 'text-green-600 bg-green-100' : 'text-slate-600 bg-slate-200'}`}>
                    {isClockedIn ? 'Running' : 'Paused'}
                  </span>
                  {/* Clock Out button: only show if clocked in and not on break */}
                  {isClockedIn && !isOnBreak && (
                    <button
                      onClick={async () => {
                        setTimerActionLoading(true);
                        try {
                          await timesheetAPI.pauseSession();
                          setTimeTracking((prev) => ({
                            ...prev,
                            workStartMs: null
                          }));
                        } catch (err) {
                          alert('Failed to clock out. Please try again.');
                        } finally {
                          setTimerActionLoading(false);
                        }
                      }}
                      disabled={timerActionLoading}
                      className="ml-2 px-3 py-1.5 rounded-md text-sm font-medium bg-red-800 text-white hover:bg-red-900 transition-colors disabled:opacity-60"
                    >
                      Clock Out
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">Starts at login, pauses during break, and resets daily. Clock out to stop work timer.</p>
              </div>

              <div className={`border rounded-lg p-4 ${isBreakLimitExceeded ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-200'}`}>
                <p className="text-xs uppercase tracking-wide font-semibold mb-2 text-amber-700">Break Timer (Daily 1h Limit)</p>
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-bold ${isBreakLimitExceeded ? 'text-red-600' : 'text-amber-900'}`}>
                    {formatDuration(breakSeconds)}
                  </span>
                  <button
                    onClick={handleToggleBreak}
                    disabled={timerActionLoading}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      timeTracking.breakStartMs
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    } ${timerActionLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {timeTracking.breakStartMs ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4" />}
                    {timeTracking.breakStartMs ? 'Stop Break' : 'Start Break'}
                  </button>
                </div>
                <p className={`text-xs mt-2 ${isBreakLimitExceeded ? 'text-red-600' : 'text-amber-700'}`}>
                  {isBreakLimitExceeded ? 'Break limit exceeded. Please resume work.' : 'Timer turns red if total break exceeds 1 hour.'}
                </p>
              </div>
        </div>
      </div>

          {/* Available Leave Days Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Available Leave Days</h3>
              <button 
                onClick={() => setIsLeaveBalanceExpanded(!isLeaveBalanceExpanded)}
                className="text-gray-600 hover:text-gray-900 transition-transform duration-300"
                style={{ transform: isLeaveBalanceExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
              >
                <FiChevronDown className="w-5 h-5" />
              </button>
            </div>
            {isLeaveBalanceExpanded && (
            <div className="space-y-4">
              {Object.keys(leaveBalance).length === 0 ? (
                <p className="text-sm text-gray-500">No leave balance data available.</p>
              ) : (
                Object.entries(leaveBalance).map(([leaveType, metrics]) => {
                  const used = Number(metrics?.used || 0);
                  const total = Number(metrics?.total || 0);
                  const percent = total > 0 ? Math.min(100, (used / total) * 100) : 0;
                  const isExhausted = total > 0 && used >= total;

                  return (
                    <div key={leaveType}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className={isExhausted ? 'text-red-600 font-semibold' : 'text-gray-700'}>{leaveType}</span>
                        <span className={isExhausted ? 'text-red-600 font-semibold' : 'text-gray-600'}>{used} of {total} day(s)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`${isExhausted ? 'bg-red-500' : 'bg-[#1e3a5f]'} h-2.5 rounded-full`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            )}
          </div>
        </div>

        {/* Right Column - Calendar Widget and To-dos */}
        <div className="space-y-6">
          {/* Calendar Widget */}
          <CalendarWidget compact={true} />

          <div className="lg:col-span-1">
      <div className="h-full flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">

     {/* Header */}
     <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
        🎂
      </div>
      <h2 className="text-sm font-bold text-gray-900">Birthdays Today</h2>
     </div>

     {/* Viewport */}
     <div className="w-full bg-white space-y-2">
      {birthdayEmployees.length > 0 ? (
        birthdayEmployees.map((emp) => (
          <div
            key={emp.id || emp.name}
            className="h-16 flex items-center gap-3 bg-pink-50 border border-pink-200 rounded-xl p-2"
          >
            <div className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center text-sm font-bold">
              {emp.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{emp.name}</p>
              <p className="text-xs">
                {emp.isSelf ? "🎉 Hey, it's your birthday!" : '🎉 Birthday Today'}
              </p>
            </div>
            {!emp.isSelf && (
              <button
                onClick={() => handleSendBirthdayWish(emp)}
                disabled={sendingWishes[emp.id] || wishedEmployees[emp.id]}
                className="text-xs bg-pink-500 hover:bg-pink-600 text-white px-2 py-1 rounded-md disabled:opacity-60"
              >
                {sendingWishes[emp.id] ? 'Sending...' : wishedEmployees[emp.id] ? 'Wished' : 'Send Wish'}
              </button>
            )}
          </div>
        ))
      ) : (
        <div className="h-16 flex items-center justify-center bg-pink-50 border border-pink-200 rounded-xl p-2">
          <p className="text-sm text-gray-500">No birthdays today</p>
        </div>
      )}
     </div>

     {isUsersBirthdayToday && (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-gray-900">Birthday Wishes For You</h3>
          {birthdayWishMessages.length > 0 && !wishesHiddenAfterThankYou && (
            <button
              onClick={handleThankYouAllWishes}
              className="text-[11px] bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md"
            >
              Thank You All
            </button>
          )}
        </div>
        {wishesHiddenAfterThankYou ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">You thanked everyone. Wishes are hidden.</p>
          </div>
        ) : birthdayWishMessages.length > 0 ? (
          <div className="space-y-2">
            {birthdayWishMessages.map((wish) => (
              <div key={wish.id || wish.message} className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-700">{wish.message}</p>
                {wish.createdAt && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    {new Date(wish.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">No birthday wishes yet.</p>
          </div>
        )}
      </div>
     )}
     </div>
      </div>
      </div>
      </div>
    </div>
  );
}
