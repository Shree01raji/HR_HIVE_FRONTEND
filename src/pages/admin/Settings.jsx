import React, { useState, useEffect ,useMemo, useRef} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealTime } from '../../contexts/RealTimeContext';
import { 
  FiSettings, 
  FiMail, 
  FiUsers, 
  FiSave, 
  FiEdit2, 
  FiCheck,
  FiX,
  FiPlus,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
  FiDollarSign,
  FiPackage,
  FiTrendingUp,
  FiAlertCircle,
  FiBarChart,
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiLogIn,
  FiCopy
} from 'react-icons/fi';
import api from '../../services/api';
import Organizations from './Organizations';
import { subscriptionAPI, organizationAPI ,calendarAPI, leaveTypesAPI } from '../../services/api';
import NearLimitWarning from '../../components/admin/NearLimitWarning';
import PlansModal from '../../components/admin/PlansModal';
import ConnectionStatus from '../../components/ConnectionStatus';
import { Link } from 'react-router-dom';

export default function Settings() {
  const leaveConfigSaveRequestRef = useRef(0);

  const parseJsonLike = (value) => {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        try {
          // Handle Python-style dict/list strings (single quotes, True/False/None).
          const normalized = value
            .replace(/\bNone\b/g, 'null')
            .replace(/\bTrue\b/g, 'true')
            .replace(/\bFalse\b/g, 'false')
            .replace(/'/g, '"');
          return JSON.parse(normalized);
        } catch {
          return null;
        }
      }
    }
    return null;
  };

  const normalizeLeaveConfig = (config) => {
    if (!config || typeof config !== 'object') return {};
    return Object.entries(config).reduce((acc, [key, rawValue]) => {
      const leaveType = String(key || '').trim();
      if (!leaveType) return acc;
      const parsed = Number(rawValue);
      acc[leaveType] = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      return acc;
    }, {});
  };

  const getLeaveConfigCacheKey = () => {
    const org = localStorage.getItem('selectedOrganization') || 'default';
    return `leave_config_cache:${org}`;
  };

  const persistLeaveConfigCache = (config) => {
    try {
      const normalized = normalizeLeaveConfig(config);
      localStorage.setItem(getLeaveConfigCacheKey(), JSON.stringify(normalized));
    } catch (e) {
      console.warn('Failed to persist leave config cache', e);
    }
  };

  const readLeaveConfigCache = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(getLeaveConfigCacheKey()) || '{}');
      return normalizeLeaveConfig(parsed);
    } catch (e) {
      console.warn('Failed to read leave config cache', e);
      return {};
    }
  };

  // Fetch calendar events for admin calendar/leave modal
    const fetchEvents = async () => {
      try {
        await calendarAPI.getEvents();
        // Optionally, update local state if you store events in this component
      } catch (err) {
        console.error('Failed to fetch calendar events:', err);
      }
    };
 
  const { user } = useAuth();
  const { isConnected, sendRealTimeMessage } = useRealTime();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLeaveConfig, setSavingLeaveConfig] = useState(false);
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [leaveFile, setLeaveFile] = useState(null);
const [uploadingLeaveFile, setUploadingLeaveFile] = useState(false);
const [leaveUploadError, setLeaveUploadError] = useState(null);
const [uploadedLeaveFile, setUploadedLeaveFile] = useState(null);
const [configuredLeaves, setConfiguredLeaves] = useState([]);
const [editingLeave, setEditingLeave] = useState(null);


const [showLeaveModal, setShowLeaveModal] = useState(false);
const [leaveDate, setLeaveDate] = useState(new Date());
const [leaveTitle, setLeaveTitle] = useState('');
const [leaveColor, setLeaveColor] = useState('');
const [leaveHolidayType, setLeaveHolidayType] = useState('');
const [holidayTypes, setHolidayTypes] = useState([]);
const [showHolidayTypeModal, setShowHolidayTypeModal] = useState(false);
const [holidayTypeColorInput, setHolidayTypeColorInput] = useState('#3B82F6');
const [newHolidayType, setNewHolidayType] = useState('');
const COLOR_MATRIX = useMemo(() => generateColorMatrix(), []);
const holidayTypeNames = useMemo(() => {
  return (holidayTypes || []).map((item) => String(item?.name || '').trim()).filter(Boolean);
}, [holidayTypes]);

// UI: control showing the configured leaves list
const [showConfiguredList, setShowConfiguredList] = useState(true);
const [leaveTypeRows, setLeaveTypeRows] = useState([]);

const normalizeHolidayTypes = (types) => {
  const list = Array.isArray(types) ? types : [];
  const map = new Map();

  const getExistingColor = (name) => {
    const normalizedName = String(name || '').trim().toLowerCase();
    if (!normalizedName) return null;
    const existing = (holidayTypes || []).find(
      (item) => String(item?.name || '').trim().toLowerCase() === normalizedName
    );
    return existing?.color || null;
  };

  list.forEach((item) => {
    if (typeof item === 'string') {
      const parsedItem = parseJsonLike(item);
      if (parsedItem && typeof parsedItem === 'object') {
        const parsedName = String(parsedItem?.name || parsedItem?.label || parsedItem?.type || '').trim();
        if (!parsedName) return;
        const parsedColor =
          String(parsedItem?.color || parsedItem?.colour || getExistingColor(parsedName) || '#3B82F6').trim() || '#3B82F6';
        map.set(parsedName.toLowerCase(), { name: parsedName, color: parsedColor });
        return;
      }

      const name = item.trim();
      if (!name) return;
      const color = getExistingColor(name) || '#3B82F6';
      map.set(name.toLowerCase(), { name, color });
      return;
    }

    const name = String(item?.name || item?.label || item?.type || '').trim();
    if (!name) return;
    const color = String(item?.color || item?.colour || getExistingColor(name) || '#3B82F6').trim() || '#3B82F6';
    map.set(name.toLowerCase(), { name, color });
  });

  return Array.from(map.values());
};

const normalizeHexColor = (value, fallback = '#3B82F6') => {
  const raw = String(value || '').trim();
  const shortHexMatch = raw.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHexMatch) {
    const expanded = shortHexMatch[1]
      .split('')
      .map((char) => `${char}${char}`)
      .join('')
      .toUpperCase();
    return `#${expanded}`;
  }

  const fullHexMatch = raw.match(/^#([0-9a-fA-F]{6})$/);
  if (fullHexMatch) {
    return `#${fullHexMatch[1].toUpperCase()}`;
  }

  return fallback;
};

const getHolidayTypeColor = (typeName) => {
  const normalized = String(typeName || '').trim().toLowerCase();
  const match = (holidayTypes || []).find((item) => String(item?.name || '').trim().toLowerCase() === normalized);
  return match?.color || '#3B82F6';
};

  const getLeaveTypeLabelFromRow = (row) =>
    String(row?.leave_type || row?.name || row?.type_name || row?.title || row?.label || '').trim();

  const getLeaveTypeIdFromRow = (row) => row?.type_id ?? row?.leave_type_id ?? row?.id ?? null;

  const extractLeaveTypeRows = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.results)) return payload.results;
    const firstArray = Object.values(payload).find((value) => Array.isArray(value));
    return Array.isArray(firstArray) ? firstArray : [];
  };

  const mergeLeaveConfigWithDbTypes = (baseConfig, rows = []) => {
    const merged = normalizeLeaveConfig(baseConfig);
    rows.forEach((row) => {
      const leaveTypeLabel = getLeaveTypeLabelFromRow(row);
      if (!leaveTypeLabel) return;
      if (!Object.prototype.hasOwnProperty.call(merged, leaveTypeLabel)) {
        merged[leaveTypeLabel] = 0;
      }
    });
    return merged;
  };

  const fetchLeaveTypesFromDb = async () => {
    try {
      const res = await leaveTypesAPI.list();
      const rows = extractLeaveTypeRows(res);
      setLeaveTypeRows(rows);
      setLeaveConfig((prev) => mergeLeaveConfigWithDbTypes(prev, rows));
    } catch (err) {
      console.warn('Failed to fetch leave types from leave-types API:', err);
    }
  };

  const buildLeaveTypePayloads = (leaveType, days) => {
    const safeDays = Number.isFinite(Number(days)) ? Number(days) : 0;
    return [
      { name: leaveType, default_days_per_year: safeDays },
      { leave_type: leaveType, default_days_per_year: safeDays },
      { name: leaveType, days_per_year: safeDays },
      { leave_type: leaveType, days_per_year: safeDays },
      { name: leaveType, days: safeDays },
      { leave_type: leaveType, days: safeDays },
      { name: leaveType, allowed_days: safeDays },
      { leave_type: leaveType, allowed_days: safeDays }
    ];
  };

  const syncLeaveTypesToDb = async (config) => {
    const normalizedConfig = normalizeLeaveConfig(config);
    const leaveTypeNames = Object.keys(normalizedConfig);
    if (leaveTypeNames.length === 0) return;

    let rows = [];
    try {
      const listed = await leaveTypesAPI.list();
      rows = extractLeaveTypeRows(listed);
    } catch (listError) {
      console.warn('Failed to list leave types before sync:', listError);
    }

    if (rows.length === 0) {
      try {
        await leaveTypesAPI.migrateFromSettings();
        const listedAfterMigrate = await leaveTypesAPI.list();
        rows = extractLeaveTypeRows(listedAfterMigrate);
      } catch (migrateError) {
        console.warn('leave-types migrate-from-settings failed:', migrateError);
      }
    }

    const rowByName = new Map();
    rows.forEach((row) => {
      const label = getLeaveTypeLabelFromRow(row).toLowerCase();
      if (!label) return;
      rowByName.set(label, row);
    });

    for (const [leaveType, days] of Object.entries(normalizedConfig)) {
      const matchedRow = rowByName.get(String(leaveType || '').toLowerCase());
      const payloads = buildLeaveTypePayloads(leaveType, days);

      if (matchedRow) {
        const typeId = getLeaveTypeIdFromRow(matchedRow);
        if (typeId == null) continue;

        let updated = false;
        let lastError = null;
        for (const payload of payloads) {
          try {
            await leaveTypesAPI.update(typeId, payload);
            updated = true;
            break;
          } catch (err) {
            lastError = err;
          }
        }
        if (!updated && lastError) {
          throw lastError;
        }
        continue;
      }

      let created = false;
      let createError = null;
      for (const payload of payloads) {
        try {
          await leaveTypesAPI.create(payload);
          created = true;
          break;
        } catch (err) {
          createError = err;
        }
      }
      if (!created && createError) {
        throw createError;
      }
    }

    await fetchLeaveTypesFromDb();
  };



  // Form states
  const [emailDomain, setEmailDomain] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [hrEmail, setHrEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [onboardingTasks, setOnboardingTasks] = useState([]);
  const [welcomeEmailTemplate, setWelcomeEmailTemplate] = useState('');
  const [onboardingDurationDays, setOnboardingDurationDays] = useState(30);
  const [autoAssignTasks, setAutoAssignTasks] = useState(true);
  const [featuresConfig, setFeaturesConfig] = useState({
    enable_ai_agents: true,
    enable_learning: true,
    enable_engagement: true,
    enable_performance: true,
    enable_recruitment: true,
    enable_timesheet: true,
    enable_agent_monitoring: true,
    enable_analytics: true,
    enable_chat_monitor: true,
    enable_compliance: true,
    enable_documents: true,
    enable_employees: true,
    enable_onboarding: true,
    enable_leaves: true,
    enable_payroll: true,
    enable_policies: true,
    enable_qualified_applications: true,
    enable_question_bank: true,
    enable_test_monitoring: true,
    enable_task_management: true,
    enable_benefits: true
  });
  const [lockedFeatures, setLockedFeatures] = useState([]);  // Features locked by organization admin
  
  // Leave Configuration
  const [leaveConfig, setLeaveConfig] = useState({});
  
  // Door Access Configuration
  const [doorAccessConfig, setDoorAccessConfig] = useState({
    enabled: false,
    webhook_url: typeof window !== 'undefined' ? `${window.location.origin}/api/timesheet/door-access` : '',
    api_key: '',
    auto_clock_in: true,
    auto_clock_out: true
  });
  
  // Plan & Usage states
  const [usageStats, setUsageStats] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [nearLimitWarnings, setNearLimitWarnings] = useState([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('settings');
  
  // Plans modal state
  const [showPlansModal, setShowPlansModal] = useState(false);
  
  // UI states
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_days: 1,
    document_required: false,
    category: 'General'
  });
  
  // Check if user is organization admin
  const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                               !user?.employee_id || 
                               user?.employee_id === 0 ||
                               (user?.employee_id && user?.department === null);
  
  // For organization admins, show only organization setup
  // NOTE: rendering of Organizations is performed later (after hooks)
  
  // Check if user has admin/HR manager access
  const hasAdminAccess = user?.role === 'ADMIN' || user?.role === 'HR_MANAGER';
  
  // Check if user is HR manager (not organization admin)
  const isHrManager = !isOrganizationAdmin && user?.role === 'HR_MANAGER';
  
  // Features that affect employee portal (HR can control these)
  // These are features that appear in the employee portal navigation
  const employeePortalFeatures = [
    'enable_employees',      // Employees tab (admin panel)
    'enable_leaves',          // Leave Management
    'enable_payroll',         // Payroll (includes investment, expenses, reimbursements)
    'enable_timesheet',       // Timesheet
    'enable_onboarding',      // Onboarding
    'enable_documents',       // Documents
    'enable_learning',        // Learning
    'enable_engagement',      // Engagement
    'enable_performance',     // Performance
    'enable_policies',        // HR Policy
    'enable_task_management', // My Tasks
    'enable_benefits',        // Insurance Cards
  ];

  function generateColorMatrix() {
  const colors = [];
  const hues = 12;        // columns
  const steps = 10;       // rows (light → dark)

  for (let h = 0; h < hues; h++) {
    const hue = Math.round((360 / hues) * h);

    for (let s = steps; s >= 1; s--) {
      const lightness = Math.round((s / steps) * 70 + 15);
      colors.push(`hsl(${hue}, 80%, ${lightness}%)`);
    }
  }

  return colors;
}



  
  // Features that are admin-only (HR should not see these)
  const adminOnlyFeatures = [
    'enable_recruitment',
    'enable_qualified_applications',
    'enable_question_bank',
    'enable_test_monitoring',
    'enable_ai_agents',
    'enable_agent_monitoring',
    'enable_chat_monitor',
    'enable_analytics',
    'enable_compliance'
  ];
  
  // Filter function to check if feature should be shown
  const shouldShowFeature = (featureKey) => {
    // Organization admins see all features
    if (isOrganizationAdmin) {
      return true;
    }
    // HR managers only see employee portal features
    if (isHrManager) {
      return employeePortalFeatures.includes(featureKey);
    }
    // Regular admins see all features
    return true;
  };
  
  useEffect(() => {
    if (hasAdminAccess) {
      fetchSettings();
      fetchUsageStats();
      fetchLeaveTypesFromDb();
    }
  }, [hasAdminAccess]);

  // useEffect(() => {
  // fetchConfiguredLeaves();
  // }, []);

  const handleAddHolidayType = async () => {
    const value = (newHolidayType || '').trim();
    if (!value) return;
    const normalizedName = value.toLowerCase();
    const duplicateExists = (holidayTypes || []).some(
      (item) => String(item?.name || '').trim().toLowerCase() === normalizedName
    );
    if (duplicateExists) {
      setError('This holiday type already exists.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      // const response = await calendarAPI.addHolidayType(value);
      // const dbHolidayTypeNames = Array.isArray(response?.holiday_types) ? response.holiday_types : [];
      // const existingColorMap = new Map(
      //   normalizeHolidayTypes(holidayTypes).map((item) => [
      //     String(item?.name || '').trim().toLowerCase(),
      //     item?.color || '#3B82F6'
      //   ])
      // );
      const selectedColor = String(holidayTypeColorInput || '#3B82F6').trim() || '#3B82F6';
      // existingColorMap.set(value.toLowerCase(), selectedColor);
      const response = await calendarAPI.addHolidayType(value, selectedColor);
      const dbHolidayTypeNames = Array.isArray(response?.holiday_types) ? response.holiday_types : [];
      const dbColorMap = response?.holiday_type_colors || {};

      const nextHolidayTypes = dbHolidayTypeNames.map((name) => ({
        name,
        color: dbColorMap[name] || '#3B82F6'
      }));

      setHolidayTypes(nextHolidayTypes);
      await saveHolidayTypes(nextHolidayTypes);
      setLeaveHolidayType(value);
      setLeaveColor(selectedColor);
      setHolidayTypeColorInput(selectedColor);
      setNewHolidayType('');
    } catch (err) {
      console.error('Failed to add holiday type:', err);
      setError(err?.response?.data?.detail || 'Failed to add holiday type');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleDeleteHolidayType = async (rawHolidayType) => {
    const value = String(rawHolidayType || leaveHolidayType || '').trim();
    if (!value) return;
    if (!window.confirm(`Delete holiday type "${value}"?`)) return;

    try {
      const response = await calendarAPI.deleteHolidayType(value);
      const dbHolidayTypeNames = Array.isArray(response?.holiday_types) ? response.holiday_types : [];
      const existingColorMap = new Map(
        normalizeHolidayTypes(holidayTypes).map((item) => [
          String(item?.name || '').trim().toLowerCase(),
          item?.color || '#3B82F6'
        ])
      );
      const nextHolidayTypes = dbHolidayTypeNames.map((name) => ({
        name,
        color: existingColorMap.get(String(name || '').trim().toLowerCase()) || '#3B82F6'
      }));

      setHolidayTypes(nextHolidayTypes);
      await saveHolidayTypes(nextHolidayTypes);

      if (String(leaveHolidayType || '').trim().toLowerCase() === value.toLowerCase()) {
        const nextSelectedType = nextHolidayTypes[0]?.name || '';
        setLeaveHolidayType(nextSelectedType);
        setLeaveColor(nextSelectedType ? getHolidayTypeColor(nextSelectedType) : '');
      }
    } catch (err) {
      console.error('Failed to delete holiday type:', err);
      setError(err?.response?.data?.detail || 'Failed to delete holiday type');
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleHolidayTypeColorInputChange = (rawValue) => {
    setHolidayTypeColorInput(normalizeHexColor(rawValue, '#3B82F6'));
  };

  const handleHolidayTypeColorInputBlur = () => {
    setHolidayTypeColorInput((prev) => normalizeHexColor(prev, '#3B82F6'));
  };

  const handleUpdateHolidayTypeColor = async (typeName, rawColor) => {
    const normalizedName = String(typeName || '').trim().toLowerCase();
    if (!normalizedName) return;

    const nextColor = normalizeHexColor(rawColor, '#3B82F6');
    const nextHolidayTypes = normalizeHolidayTypes(holidayTypes).map((item) => {
      const currentName = String(item?.name || '').trim();
      if (currentName.toLowerCase() !== normalizedName) return item;
      return { ...item, color: nextColor };
    });

    setHolidayTypes(nextHolidayTypes);
    if (String(leaveHolidayType || '').trim().toLowerCase() === normalizedName) {
      setLeaveColor(nextColor);
    }
    await saveHolidayTypes(nextHolidayTypes);
  };
 

  
  const fetchUsageStats = async () => {
    try {
      setLoadingUsage(true);
      const usageData = await subscriptionAPI.getMyOrganizationUsage();
      console.log('📊 Usage data received:', usageData);
      console.log('📊 Current plan:', usageData?.current_plan);
      console.log('📊 Has current plan?', !!usageData?.current_plan);
      console.log('📊 Plan name:', usageData?.current_plan?.name);
      
      // Check if we have plan data
      if (usageData && usageData.current_plan) {
        console.log('✅ Plan data found, setting usage stats');
        console.log('📊 Organization ID:', usageData?.organization_id);
        setUsageStats(usageData);
        setNearLimitWarnings(usageData?.near_limit_warnings || []);
      } else {
        console.warn('⚠️ No plan data in response:', usageData);
        // Still set the data, but log the issue
        setUsageStats(usageData || {
          current_plan: null,
          usage: [],
          limits: [],
          near_limit_warnings: []
        });
      }
    } catch (err) {
      console.error('❌ Failed to fetch usage stats:', err);
      console.error('Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        stack: err.stack
      });
      // Set empty stats so UI can still render
      setUsageStats({
        current_plan: null,
        usage: [],
        limits: [],
        near_limit_warnings: []
      });
    } finally {
      setLoadingUsage(false);
    }
  };
  
  // Listen for real-time settings updates
  useEffect(() => {
    const handleSettingsUpdate = (event) => {
      const { data } = event.detail;
      if (data && data.type === 'settings_update') {
        console.log('🔄 Real-time settings update received:', data);
        // Refresh settings when updated by another admin
        fetchSettings();
        fetchLeaveTypesFromDb();
        setSuccess('Settings updated in real-time!');
        setTimeout(() => setSuccess(null), 3000);
      }
    };
    
    window.addEventListener('settings-update', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('settings-update', handleSettingsUpdate);
    };
  }, []);

  // Fetch configured leave events for the admin settings list
  const fetchConfiguredLeaves = async () => {
    try {
      // Request a wide date range to ensure events around today are returned
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      const end = new Date();
      end.setFullYear(end.getFullYear() + 1);
      const toDateOnly = (d) => d.toISOString().split('T')[0];
      const res = await calendarAPI.getEvents(toDateOnly(start), toDateOnly(end));

      // Normalize possible response shapes to an array of events
      let eventsArray = [];
      if (Array.isArray(res)) {
        eventsArray = res;
      } else if (res && Array.isArray(res.data)) {
        eventsArray = res.data;
      } else if (res && Array.isArray(res.events)) {
        eventsArray = res.events;
      } else if (res && Array.isArray(res.items)) {
        eventsArray = res.items;
      } else if (res && typeof res === 'object') {
        // Try to find the first array property
        const firstArray = Object.values(res).find(v => Array.isArray(v));
        if (Array.isArray(firstArray)) eventsArray = firstArray;
      }

      // Relaxed filter: include any event that looks like a leave (various backend shapes)
      const events = (eventsArray || []).filter((e) => {
        if (!e) return false;
        const et = String(e.event_type || e.type || e.eventType || '').toLowerCase();
        const hasLeaveType = Boolean(e.leave_type || e.leaveType || e.title || e.label);
        const isLeave = et === 'leave' || et === 'holiday' || hasLeaveType;
        return isLeave;
      });

      // Merge locally-created fallback entries when create endpoint is unavailable.
      const createdFallback = getClientCreatedEvents();
      const dedupMap = new Map();
      [...events, ...createdFallback].forEach((eventItem) => {
        const key = String(eventItem?.event_id || eventItem?.id || `${eventItem?.title || 'leave'}-${eventItem?.start_date || ''}`);
        dedupMap.set(key, eventItem);
      });
      const mergedEvents = Array.from(dedupMap.values());

      console.debug('[Settings] fetched configured leaves count=', mergedEvents.length, 'raw=', res, 'parsed=', mergedEvents);
      setConfiguredLeaves(mergedEvents);
    } catch (err) {
      console.error('Failed to fetch leave configuration events:', err);
      setConfiguredLeaves(getClientCreatedEvents());
    }
  };

  // Local client-side fallback storage for deletes/edits when backend fails
  const CLIENT_DELETED_KEY = 'client_deleted_calendar_event_ids';
  const CLIENT_EDIT_KEY = 'client_edited_calendar_events';
  const CLIENT_CREATED_KEY = 'client_created_calendar_events';

  const getClientDeletedIds = () => {
    try { return JSON.parse(localStorage.getItem(CLIENT_DELETED_KEY) || '[]'); } catch { return []; }
  };
  const addClientDeletedId = (id) => {
    const ids = new Set(getClientDeletedIds());
    ids.add(String(id));
    localStorage.setItem(CLIENT_DELETED_KEY, JSON.stringify(Array.from(ids)));
  };

  const getClientEdits = () => {
    try { return JSON.parse(localStorage.getItem(CLIENT_EDIT_KEY) || '{}'); } catch { return {}; }
  };
  const setClientEdit = (id, data) => {
    const edits = getClientEdits();
    edits[String(id)] = data;
    localStorage.setItem(CLIENT_EDIT_KEY, JSON.stringify(edits));
  };

  const getClientCreatedEvents = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(CLIENT_CREATED_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const upsertClientCreatedEvent = (eventData) => {
    const current = getClientCreatedEvents();
    const eventId = String(eventData?.event_id || eventData?.id || `manual-${Date.now()}`);
    const nextEvent = {
      ...eventData,
      event_id: eventId,
      id: eventId,
      source_type: eventData?.source_type || 'leave_configuration',
      event_type: eventData?.event_type || 'leave'
    };
    const withoutCurrent = current.filter((e) => String(e?.event_id || e?.id) !== eventId);
    const merged = [nextEvent, ...withoutCurrent];
    localStorage.setItem(CLIENT_CREATED_KEY, JSON.stringify(merged));
    return nextEvent;
  };

  const removeClientCreatedEvent = (id) => {
    const targetId = String(id);
    const current = getClientCreatedEvents();
    const filtered = current.filter((e) => String(e?.event_id || e?.id) !== targetId);
    localStorage.setItem(CLIENT_CREATED_KEY, JSON.stringify(filtered));
  };

  useEffect(() => {
    if (hasAdminAccess) {
      fetchConfiguredLeaves();
    }
  }, [hasAdminAccess]);
  
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/settings/');
      const data = response.data;
      
      setSettings(data);
      setEmailDomain(data.company_email_domain || '');
      setCompanyName(data.company_name || '');
      setHrEmail(data.hr_email || '');
      
      // Fetch organization logo
      try {
        const selectedOrganization = localStorage.getItem('selectedOrganization');
        if (selectedOrganization) {
          const orgData = await organizationAPI.get(selectedOrganization);
          setLogoUrl(orgData.logo_url || null);
        }
      } catch (err) {
        console.error('Failed to fetch organization logo:', err);
      }
      
      // Set onboarding config
      if (data.onboarding_config) {
        setOnboardingTasks(data.onboarding_config.default_tasks || []);
        setWelcomeEmailTemplate(data.onboarding_config.welcome_email_template || '');
        setOnboardingDurationDays(data.onboarding_config.onboarding_duration_days || 30);
        setAutoAssignTasks(data.onboarding_config.auto_assign_tasks !== false);
      }
      
      // Set features config
      // IMPORTANT: When super admin disables a feature, it's explicitly set to false
      // We need to preserve false values and only default to true if the key doesn't exist
      if (data.features_config) {
        const config = data.features_config;
        setFeaturesConfig({
          // Only default to true if key doesn't exist, preserve false values explicitly set
          enable_dashboard: config.hasOwnProperty('enable_dashboard') ? config.enable_dashboard !== false : true,
          enable_settings: config.hasOwnProperty('enable_settings') ? config.enable_settings !== false : true,
          enable_finance: config.hasOwnProperty('enable_finance') ? config.enable_finance !== false : true,
          enable_ai_agents: config.hasOwnProperty('enable_ai_agents') ? config.enable_ai_agents !== false : true,
          enable_learning: config.hasOwnProperty('enable_learning') ? config.enable_learning !== false : true,
          enable_engagement: config.hasOwnProperty('enable_engagement') ? config.enable_engagement !== false : true,
          enable_performance: config.hasOwnProperty('enable_performance') ? config.enable_performance !== false : true,
          enable_recruitment: config.hasOwnProperty('enable_recruitment') ? config.enable_recruitment !== false : true,
          enable_timesheet: config.hasOwnProperty('enable_timesheet') ? config.enable_timesheet !== false : true,
          enable_agent_monitoring: config.hasOwnProperty('enable_agent_monitoring') ? config.enable_agent_monitoring !== false : true,
          enable_analytics: config.hasOwnProperty('enable_analytics') ? config.enable_analytics !== false : true,
          enable_chat_monitor: config.hasOwnProperty('enable_chat_monitor') ? config.enable_chat_monitor !== false : true,
          enable_compliance: config.hasOwnProperty('enable_compliance') ? config.enable_compliance !== false : true,
          enable_documents: config.hasOwnProperty('enable_documents') ? config.enable_documents !== false : true,
          enable_employees: config.hasOwnProperty('enable_employees') ? config.enable_employees !== false : false,
          enable_onboarding: config.hasOwnProperty('enable_onboarding') ? config.enable_onboarding !== false : true,
          enable_leaves: config.hasOwnProperty('enable_leaves') ? config.enable_leaves !== false : true,
          enable_payroll: config.hasOwnProperty('enable_payroll') ? config.enable_payroll !== false : true,
          enable_policies: config.hasOwnProperty('enable_policies') ? config.enable_policies !== false : true,
          enable_qualified_applications: config.hasOwnProperty('enable_qualified_applications') ? config.enable_qualified_applications !== false : true,
          enable_question_bank: config.hasOwnProperty('enable_question_bank') ? config.enable_question_bank !== false : true,
          enable_test_monitoring: config.hasOwnProperty('enable_test_monitoring') ? config.enable_test_monitoring !== false : true,
          enable_task_management: config.hasOwnProperty('enable_task_management') ? config.enable_task_management !== false : true,
          enable_benefits: config.hasOwnProperty('enable_benefits') ? config.enable_benefits !== false : true
        });
      }
      
      // Set locked features (features set by organization admin that HR cannot change)
      if (data.locked_features && Array.isArray(data.locked_features)) {
        setLockedFeatures(data.locked_features);
      } else {
        setLockedFeatures([]);
      }
      
      // Set leave configuration from other_settings (supports object or serialized string)
      const parsedOtherSettings = parseJsonLike(data?.other_settings) || {};
      const parsedLeaveConfig = parseJsonLike(parsedOtherSettings?.leave_config);
      const normalizedLeaveConfig = normalizeLeaveConfig(parsedLeaveConfig);
      const cachedLeaveConfig = readLeaveConfigCache();
      if (Object.prototype.hasOwnProperty.call(parsedOtherSettings, 'leave_config')) {
        // Guard against stale/empty fetch responses wiping locally-added leave types.
        const resolvedLeaveConfig = Object.keys(normalizedLeaveConfig).length > 0
          ? normalizedLeaveConfig
          : (Object.keys(cachedLeaveConfig).length > 0
              ? cachedLeaveConfig
              : normalizeLeaveConfig(leaveConfig));

        setLeaveConfig(mergeLeaveConfigWithDbTypes(resolvedLeaveConfig, leaveTypeRows));
        if (Object.keys(resolvedLeaveConfig).length > 0) {
          persistLeaveConfigCache(resolvedLeaveConfig);
        }
      } else if (Object.keys(leaveConfig || {}).length === 0) {
        // Initialize only when no local leave config exists yet.
        if (Object.keys(cachedLeaveConfig).length > 0) {
          setLeaveConfig(mergeLeaveConfigWithDbTypes(cachedLeaveConfig, leaveTypeRows));
        } else {
          setLeaveConfig(mergeLeaveConfigWithDbTypes({}, leaveTypeRows));
          persistLeaveConfigCache({});
        }
      }
      
      // Set door access configuration from other_settings
      if (parsedOtherSettings && parsedOtherSettings.door_access_config) {
        setDoorAccessConfig(parsedOtherSettings.door_access_config);
      } else {
        // Initialize with default config
        const webhookUrl = `${window.location.origin}/api/timesheet/door-access`;
        setDoorAccessConfig({
          enabled: false,
          webhook_url: webhookUrl,
          api_key: '',
          auto_clock_in: true,
          auto_clock_out: true
        });
      }

      const parsedHolidayTypes = normalizeHolidayTypes(parsedOtherSettings?.holiday_types);
      let resolvedHolidayTypes = parsedHolidayTypes;
      try {
        const holidayTypeResponse = await calendarAPI.getHolidayTypes();
        const dbHolidayTypeNames = Array.isArray(holidayTypeResponse?.holiday_types)
          ? holidayTypeResponse.holiday_types
          : [];
        const dbColorMap = holidayTypeResponse?.holiday_type_colors || {};  
        if (dbHolidayTypeNames.length > 0) {
          // const existingColorMap = new Map(
          //   parsedHolidayTypes.map((item) => [
          //     String(item?.name || '').trim().toLowerCase(),
          //     item?.color || '#3B82F6'
          //   ])
          // );
          resolvedHolidayTypes = dbHolidayTypeNames.map((name) => ({
            name,
            color: dbColorMap[name] || '#3B82F6'
          }));
        }
      } catch (holidayTypesErr) {
        console.warn('Failed to load table-backed holiday types:', holidayTypesErr);
      }

      setHolidayTypes(resolvedHolidayTypes);
      if (resolvedHolidayTypes.length > 0 && !resolvedHolidayTypes.some((item) => String(item?.name || '').trim() === String(leaveHolidayType || '').trim())) {
        setLeaveHolidayType(resolvedHolidayTypes[0].name);
      }
      
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err.response?.data?.detail || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a PNG, JPG, GIF, SVG, or WebP image.');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit.');
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    try {
      setLogoUploading(true);
      setError(null);
      
      const selectedOrganization = localStorage.getItem('selectedOrganization');
      if (!selectedOrganization) {
        throw new Error('Organization not selected');
      }
      
      const orgData = await organizationAPI.uploadLogo(selectedOrganization, file);
      setLogoUrl(orgData.logo_url);
      setSuccess('Logo uploaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to upload logo:', err);
      const d = err?.response?.data?.detail;
      let msg = 'Failed to upload logo.';
      if (err?.message === 'Organization not selected') {
        msg = 'Organization not selected. Use the org switcher or log in with your organization code, then try again.';
      } else if (typeof d === 'string') {
        msg = d;
      } else if (Array.isArray(d)) {
        msg = d.map((x) => (x.msg || x.message || JSON.stringify(x))).join('; ') || msg;
      }
      setError(msg);
      setTimeout(() => setError(null), 8000);
    } finally {
      setLogoUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    try {
      if (savingLeaveConfig) {
        setError('Leave configuration is still saving. Please wait and click Save Changes again.');
        return;
      }

      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Get existing other_settings to preserve other configurations (including payroll_config)
      const existingOtherSettings = parseJsonLike(settings?.other_settings) || {};
      
      const normalizedLeaveConfig = normalizeLeaveConfig(leaveConfig);

      const updateData = {
        company_email_domain: emailDomain,
        company_name: companyName || null,
        hr_email: hrEmail || null,
        onboarding_config: {
          default_tasks: onboardingTasks,
          welcome_email_template: welcomeEmailTemplate,
          onboarding_duration_days: onboardingDurationDays,
          auto_assign_tasks: autoAssignTasks
        },
        features_config: featuresConfig,
        other_settings: {
          ...existingOtherSettings,
          leave_config: normalizedLeaveConfig,
          holiday_types: normalizeHolidayTypes(holidayTypes),
          door_access_config: doorAccessConfig
          // Payroll config is now managed in accountant Settings, so we preserve it but don't modify it here
        }
      };
      
      const response = await api.put('/settings/', updateData);
      await syncLeaveTypesToDb(normalizedLeaveConfig);
      
      // Update local settings state immediately to prevent state loss
      setSettings(response.data);
      persistLeaveConfigCache(normalizedLeaveConfig);
      
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Broadcast settings update via WebSocket for real-time sync
      if (isConnected) {
        sendRealTimeMessage('settings_update', {
          type: 'settings_update',
          settings: response.data,
          updated_by: user?.email || user?.first_name,
          timestamp: new Date().toISOString()
        });
      }
      
      // Also dispatch a custom event for local real-time updates
      window.dispatchEvent(new CustomEvent('settings-update', {
        detail: {
          type: 'settings_update',
          settings: response.data
        }
      }));
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const saveLeaveConfig = async (nextLeaveConfig, successMessage = 'Leave configuration updated successfully!') => {
    try {
      setSavingLeaveConfig(true);
      const saveRequestId = ++leaveConfigSaveRequestRef.current;
      setError(null);
      const existingOtherSettings = parseJsonLike(settings?.other_settings) || {};
      const normalizedLeaveConfig = normalizeLeaveConfig(nextLeaveConfig);
      const resolvedHolidayTypes = normalizeHolidayTypes(
        Array.isArray(holidayTypes) && holidayTypes.length > 0
          ? holidayTypes
          : existingOtherSettings?.holiday_types
      );
      // Optimistic update to keep UI stable while request is in flight.
      setLeaveConfig(normalizedLeaveConfig);
      persistLeaveConfigCache(normalizedLeaveConfig);
      const response = await api.put('/settings/', {
        other_settings: {
          ...existingOtherSettings,
          leave_config: normalizedLeaveConfig,
          holiday_types: resolvedHolidayTypes,
          door_access_config: doorAccessConfig
        }
      });
      await syncLeaveTypesToDb(normalizedLeaveConfig);

      const parsedOtherSettings = parseJsonLike(response?.data?.other_settings) || {};
      const parsedLeaveConfig = parseJsonLike(parsedOtherSettings?.leave_config);

      // Ignore stale responses from older save requests.
      if (saveRequestId !== leaveConfigSaveRequestRef.current) {
        return;
      }

      const normalizedResponseLeaveConfig = normalizeLeaveConfig(parsedLeaveConfig || normalizedLeaveConfig);
      setLeaveConfig(normalizedResponseLeaveConfig);
      setSettings(response.data);
      persistLeaveConfigCache(normalizedResponseLeaveConfig);
      setSuccess(successMessage);
      setTimeout(() => setSuccess(null), 3000);

      if (isConnected) {
        sendRealTimeMessage('settings_update', {
          type: 'settings_update',
          settings: response.data,
          updated_by: user?.email || user?.first_name,
          timestamp: new Date().toISOString()
        });
        sendRealTimeMessage('calendar_update', {
          type: 'calendar_update',
          action: 'holiday_types_updated',
          updated_by: user?.email || user?.first_name,
          timestamp: new Date().toISOString()
        });
      }

      window.dispatchEvent(new CustomEvent('settings-update', {
        detail: {
          type: 'settings_update',
          settings: response.data
        }
      }));

      window.dispatchEvent(new CustomEvent('settings-update', {
        detail: {
          type: 'calendar_update',
          action: 'holiday_types_updated'
        }
      }));
    } catch (err) {
      console.error('Error updating leave configuration:', err);
      setError(err.response?.data?.detail || 'Failed to update leave configuration');
    } finally {
      setSavingLeaveConfig(false);
    }
  };

  const saveHolidayTypes = async (nextHolidayTypes) => {
    try {
      setSaving(true);
      setError(null);
      const normalizedHolidayTypes = normalizeHolidayTypes(nextHolidayTypes);
      const existingOtherSettings = parseJsonLike(settings?.other_settings) || {};
      const normalizedLeaveConfig = normalizeLeaveConfig(leaveConfig);

      const response = await api.put('/settings/', {
        other_settings: {
          ...existingOtherSettings,
          leave_config: normalizedLeaveConfig,
          holiday_types: normalizedHolidayTypes,
          door_access_config: doorAccessConfig
        }
      });

      // Use backend response as source of truth to ensure values are truly persisted in DB.
      const parsedOtherSettings = parseJsonLike(response?.data?.other_settings) || {};
      const persistedHolidayTypes = normalizeHolidayTypes(parsedOtherSettings?.holiday_types);
      setHolidayTypes(persistedHolidayTypes.length > 0 ? persistedHolidayTypes : normalizedHolidayTypes);
      if (
        leaveHolidayType &&
        !persistedHolidayTypes.some(
          (item) => String(item?.name || '').trim().toLowerCase() === String(leaveHolidayType || '').trim().toLowerCase()
        )
      ) {
        setLeaveHolidayType(persistedHolidayTypes[0]?.name || '');
      }
      setSettings(response.data);
      setSuccess('Holiday types updated successfully!');
      setTimeout(() => setSuccess(null), 3000);

      if (isConnected) {
        sendRealTimeMessage('settings_update', {
          type: 'settings_update',
          settings: response.data,
          updated_by: user?.email || user?.first_name,
          timestamp: new Date().toISOString()
        });
        sendRealTimeMessage('calendar_update', {
          type: 'calendar_update',
          action: 'holiday_types_updated',
          updated_by: user?.email || user?.first_name,
          timestamp: new Date().toISOString()
        });
      }

      window.dispatchEvent(new CustomEvent('settings-update', {
        detail: {
          type: 'settings_update',
          settings: response.data
        }
      }));

      window.dispatchEvent(new CustomEvent('settings-update', {
        detail: {
          type: 'calendar_update',
          action: 'holiday_types_updated'
        }
      }));
    } catch (err) {
      console.error('Error updating holiday types:', err);
      setError(err.response?.data?.detail || 'Failed to update holiday types');
    } finally {
      setSaving(false);
    }
  };

  const handleAddLeaveType = async (rawLeaveType) => {
    const leaveType = String(rawLeaveType || '').trim();
    if (!leaveType) return;
    if (leaveConfig[leaveType] !== undefined) {
      setError('This leave type already exists.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      try {
        await leaveTypesAPI.create({ name: leaveType });
      } catch {
        // Backward compatibility if API expects leave_type field.
        await leaveTypesAPI.create({ leave_type: leaveType });
      }
      await fetchLeaveTypesFromDb();
    } catch (createError) {
      console.error('Failed to create leave type via leave-types API:', createError);
      setError(createError?.response?.data?.detail || 'Failed to create leave type in database');
      setTimeout(() => setError(null), 4000);
      return;
    }

    const nextLeaveConfig = {
      ...leaveConfig,
      [leaveType]: 0
    };
    await saveLeaveConfig(nextLeaveConfig, `${leaveType} added successfully!`);
  };

  const handleDeleteLeaveType = async (leaveType) => {
    const normalizedTarget = String(leaveType || '').trim().toLowerCase();
    let matchingRow = leaveTypeRows.find((row) => getLeaveTypeLabelFromRow(row).toLowerCase() === normalizedTarget);

    if (!matchingRow) {
      try {
        await leaveTypesAPI.migrateFromSettings();
      } catch (migrateError) {
        console.warn('Leave type migration before delete failed:', migrateError);
      }

      try {
        const res = await leaveTypesAPI.list();
        const rows = extractLeaveTypeRows(res);
        setLeaveTypeRows(rows);
        matchingRow = rows.find((row) => getLeaveTypeLabelFromRow(row).toLowerCase() === normalizedTarget);
      } catch (fetchError) {
        console.warn('Failed to refetch leave types before delete:', fetchError);
      }
    }

    const typeId = getLeaveTypeIdFromRow(matchingRow);
    if (typeId == null) {
      setError('Could not find leave type in database. Please refresh and try again.');
      setTimeout(() => setError(null), 4000);
      return;
    }

    try {
      await leaveTypesAPI.delete(typeId);
      await fetchLeaveTypesFromDb();
    } catch (deleteError) {
      console.error('Failed to delete leave type via leave-types API:', deleteError);
      setError(deleteError?.response?.data?.detail || 'Failed to delete leave type from database');
      setTimeout(() => setError(null), 4000);
      return;
    }

    const nextLeaveConfig = { ...leaveConfig };
    delete nextLeaveConfig[leaveType];
    await saveLeaveConfig(nextLeaveConfig, `${leaveType} removed successfully!`);
  };

  const isPermissionLeaveType = (leaveType) =>
    String(leaveType || '').trim().toLowerCase().includes('permission');
  
  const handleAddTask = () => {
    if (newTask.title && newTask.description) {
      setOnboardingTasks([...onboardingTasks, { ...newTask }]);
      setNewTask({
        title: '',
        description: '',
        due_days: 1,
        document_required: false,
        category: 'General'
      });
    }
  };
  
  const handleEditTask = (index) => {
    setEditingTaskIndex(index);
    setNewTask({ ...onboardingTasks[index] });
  };
  
  const handleUpdateTask = () => {
    if (editingTaskIndex !== null && newTask.title && newTask.description) {
      const updated = [...onboardingTasks];
      updated[editingTaskIndex] = { ...newTask };
      setOnboardingTasks(updated);
      setEditingTaskIndex(null);
      setNewTask({
        title: '',
        description: '',
        due_days: 1,
        document_required: false,
        category: 'General'
      });
    }
  };
  
  const handleDeleteTask = (index) => {
    setOnboardingTasks(onboardingTasks.filter((_, i) => i !== index));
  };
  
  // Get plan features to determine if a feature can be toggled
  const planFeatures = usageStats?.current_plan?.features || [];
  
  // Helper to check if a feature is available in the plan
  const isFeatureInPlan = (featureKey) => {
    // If no plan features, allow all (for backward compatibility)
    if (!planFeatures || planFeatures.length === 0) {
      return true;
    }
    
    // Map feature keys to plan feature strings
    const featureToPlanMap = {
      'enable_employees': ['employees', 'Employee Management'],
      'enable_payroll': ['payroll', 'basic_payroll'],
      'enable_timesheet': ['attendance', 'timesheet'],
      'enable_leaves': ['leaves', 'leave_management'],
      'enable_onboarding': ['onboarding', 'onboard'],
      'enable_documents': ['documents', 'document'],
      'enable_recruitment': ['recruitment', 'recruit'],
      'enable_learning': ['learning', 'course'],
      'enable_analytics': ['analytics', 'advanced_analytics'],
      'enable_engagement': ['engagement'],
      'enable_performance': ['performance'],
      'enable_compliance': ['compliance'],
      'enable_policies': ['policies', 'policy'],
      'enable_task_management': ['tasks', 'task_management', 'task'],
      'enable_chat_monitor': ['chat', 'chat_monitor'],
      'enable_agent_monitoring': ['agents', 'agent_monitoring'],
      'enable_benefits': ['benefits', 'insurance', 'insurance_cards'],
      'enable_ai_agents': ['ai_agents', 'custom_integrations'],
      'enable_qualified_applications': ['recruitment', 'qualified_applications'],
      'enable_question_bank': ['recruitment', 'question_bank'],
      'enable_test_monitoring': ['recruitment', 'test_monitoring'],
    };
    
    const planFeatureStrings = featureToPlanMap[featureKey] || [];
    return planFeatures.some(planFeature => 
      planFeatureStrings.some(mapFeature => 
        planFeature.toLowerCase().includes(mapFeature.toLowerCase())
      )
    );
  };
  
  const toggleFeature = (feature) => {
    // Check if user is HR_MANAGER (not organization admin) and feature is locked
    const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                                 !user?.employee_id || 
                                 user?.employee_id === 0 ||
                                 (user?.employee_id && user?.department === null);
    const isHrManager = !isOrganizationAdmin && user?.role === 'HR_MANAGER';
    
    // CRITICAL: HR managers can always toggle enable_employees, even if locked
    // This allows HR to control employee management features
    if (isHrManager && lockedFeatures.includes(feature) && feature !== 'enable_employees') {
      setError(`This feature is locked by the organization admin and cannot be changed.`);
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    // Check if feature is in plan before allowing toggle
    // Allow toggling if:
    // 1. Feature is in plan, OR
    // 2. Feature exists in featuresConfig (was previously configured, even if disabled)
    // Only prevent enabling if feature is not in plan AND doesn't exist in config (new feature)
    const featureExists = featuresConfig.hasOwnProperty(feature);
    const isCurrentlyEnabled = featuresConfig[feature] === true;
    
    // If trying to enable a feature that's not in plan and doesn't exist in config
    if (!isFeatureInPlan(feature) && !featureExists && !isCurrentlyEnabled) {
      setError(`This feature is not available in your current plan. Please upgrade to access this feature.`);
      setTimeout(() => setError(null), 5000);
      return;
    }
    
    // Allow toggling if feature exists in config (was previously configured) or is in plan
    setFeaturesConfig({
      ...featuresConfig,
      [feature]: !featuresConfig[feature]
    });
  };
  
  // Check if a feature is locked (for UI display)
  const isFeatureLocked = (feature) => {
    const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                                 !user?.employee_id || 
                                 user?.employee_id === 0 ||
                                 (user?.employee_id && user?.department === null);
    const isHrManager = !isOrganizationAdmin && user?.role === 'HR_MANAGER';
    // CRITICAL: enable_employees is never locked for HR managers - they can always control it
    if (feature === 'enable_employees' && isHrManager) {
      return false;
    }
    return isHrManager && lockedFeatures.includes(feature);
  };
  
  if (!hasAdminAccess) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <FiSettings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin or HR manager privileges to access settings.</p>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  // For organization admins, show only organization setup
  if (isOrganizationAdmin && user?.role === 'ADMIN') {
    return <Organizations />;
  }

  const handleLeaveFileUpload = async () => {
  if (!leaveFile) {
    setLeaveUploadError('Please select a file first');
    return;
  }

  try {
    setUploadingLeaveFile(true);
    setLeaveUploadError(null);

    const result = await calendarAPI.uploadCalendarFile(leaveFile);

    // ✅ NORMALIZE BACKEND RESPONSE HERE (THIS IS THE PLACE)
    setUploadedLeaveFile({
      id: result.file.id,
      fileName: result.file.file_name,
      fileUrl: result.file.file_url,
    });

    alert(`Leave calendar uploaded successfully! Created ${result.events_created} events.`);

    setLeaveFile(null);
  } catch (err) {
    console.error(err);
    setLeaveUploadError(
      err?.response?.data?.detail ||
      err.message ||
      'Failed to upload leave file'
    );
  } finally {
    setUploadingLeaveFile(false);
  }
};



const handleDeleteLeaveFile = async (fileId) => {
  if (!window.confirm('Are you sure you want to delete this file?')) return;

  try {
    await leaveAPI.deleteLeaveCalendarFile(fileId);
    setUploadedLeaveFile(null);
    setLeaveFile(null);
  } catch (err) {
    setLeaveUploadError(
      err?.response?.data?.detail || 'Failed to delete file'
    );
  }
};






  return (
    <div className="h-full p-6 space-y-6 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FiSettings className="w-8 h-8 text-[#ffbd59]" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Admin Settings</h2>
              <p className="text-gray-600">Configure system-wide settings and features</p>
            </div>
          </div>
          {activeTab === 'settings' && (
            <button
              onClick={handleSave}
              disabled={saving || savingLeaveConfig}
              className="flex items-center space-x-2 px-6 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#2c2f70] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiSave className="w-5 h-5" />
              <span>{saving ? 'Saving...' : savingLeaveConfig ? 'Please wait...' : 'Save Changes'}</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Connection Status */}
      <ConnectionStatus showDetails={true} />
      
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-[#ffbd59] text-[#181c52]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiSettings className="w-5 h-5" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'usage'
                  ? 'border-[#ffbd59] text-[#181c52]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiBarChart className="w-5 h-5" />
              <span>Plan & Usage</span>
              {nearLimitWarnings && nearLimitWarnings.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-600 rounded-full">
                  {nearLimitWarnings.length}
                </span>
              )}
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {/* Settings Tab Content */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
      
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center space-x-2">
          <FiCheck className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center space-x-2">
          <FiX className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Email Configuration */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FiMail className="w-6 h-6 text-[#ffbd59]" />
          <h3 className="text-xl font-semibold text-gray-900">Email Configuration</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Email Domain
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">@</span>
              <input
                type="text"
                value={emailDomain}
                onChange={(e) => setEmailDomain(e.target.value)}
                placeholder="example.com"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              New employees will be assigned email addresses using this domain (e.g., john.doe@{emailDomain || 'example.com'})
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company Name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="mt-2 text-sm text-gray-500">
              This name will appear in all emails sent from the system
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Logo
            </label>
            <div className="flex items-center space-x-4">
              {logoUrl && (
                <div className="flex-shrink-0">
                  <img 
                    src={logoUrl} 
                    alt="Company logo" 
                    className="w-20 h-20 object-contain border border-gray-300 rounded-lg p-2 bg-white"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={logoUploading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Upload your company logo (PNG, JPG, GIF, SVG - Max 5MB). This will appear on your public careers page.
                </p>
                {logoUploading && (
                  <p className="mt-1 text-sm text-blue-600">Uploading logo...</p>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              HR Email Address
            </label>
            <input
              type="email"
              value={hrEmail}
              onChange={(e) => setHrEmail(e.target.value)}
              placeholder="hr@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="mt-2 text-sm text-gray-500">
              All emails will be sent from this address. Make sure SMTP credentials are configured for this email.
            </p>
          </div>
        </div>
      </div>
      
      {/* Onboarding Configuration */}
      {/* <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FiUsers className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900">Onboarding Configuration</h3>
        </div>
        
        <div className="space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Welcome Email Template
            </label>
            <textarea
              value={welcomeEmailTemplate}
              onChange={(e) => setWelcomeEmailTemplate(e.target.value)}
              placeholder="Welcome to {company_name}! We're excited to have you on board..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="mt-2 text-sm text-gray-500">
              Use {'{company_name}'} as a placeholder for the company name
            </p>
          </div>
          

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Onboarding Duration (Days)
              </label>
              <input
                type="number"
                value={onboardingDurationDays}
                onChange={(e) => setOnboardingDurationDays(parseInt(e.target.value) || 30)}
                min="1"
                max="365"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-3 pt-8">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAssignTasks}
                  onChange={(e) => setAutoAssignTasks(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Auto-assign default tasks</span>
              </label>
            </div>
          </div>
          

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Default Onboarding Tasks
            </label>
            

            <div className="space-y-3 mb-4">
              {onboardingTasks.map((task, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{task.title}</h4>
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          {task.category}
                        </span>
                        {task.document_required && (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                            Document Required
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      <p className="text-xs text-gray-500">Due: {task.due_days} day(s) after start date</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditTask(index)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold text-gray-900 mb-4">
                {editingTaskIndex !== null ? 'Edit Task' : 'Add New Task'}
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="e.g., Complete Employee Profile"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Task description..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Days</label>
                    <input
                      type="number"
                      value={newTask.due_days}
                      onChange={(e) => setNewTask({ ...newTask, due_days: parseInt(e.target.value) || 1 })}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                      type="text"
                      value={newTask.category}
                      onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                      placeholder="General"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTask.document_required}
                        onChange={(e) => setNewTask({ ...newTask, document_required: e.target.checked })}
                        className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Document Required</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {editingTaskIndex !== null ? (
                    <>
                      <button
                        onClick={handleUpdateTask}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        <FiCheck className="w-4 h-4" />
                        <span>Update Task</span>
                      </button>
                      <button
                        onClick={() => {
                          setEditingTaskIndex(null);
                          setNewTask({
                            title: '',
                            description: '',
                            due_days: 1,
                            document_required: false,
                            category: 'General'
                          });
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        <FiX className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleAddTask}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <FiPlus className="w-4 h-4" />
                      <span>Add Task</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> */}
      
      {/* Door Access Configuration */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FiLogIn className="w-6 h-6 text-[#ffbd59]" />
          <h3 className="text-xl font-semibold text-gray-900">Door Access Integration</h3>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Configure door access control system integration for automatic clock in/out tracking. When employees enter or exit through doors, the system will automatically record their attendance.
          </p>
          
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div>
              <label className="text-sm font-medium text-gray-900">Enable Door Access Integration</label>
              <p className="text-xs text-gray-500 mt-1">Automatically track clock in/out from door access events</p>
            </div>
            <button
              onClick={() => setDoorAccessConfig({ ...doorAccessConfig, enabled: !doorAccessConfig.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                doorAccessConfig.enabled ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  doorAccessConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {doorAccessConfig.enabled && (
            <>
              {/* Webhook URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={doorAccessConfig.webhook_url || `${window.location.origin}/api/timesheet/door-access`}
                    onChange={(e) => setDoorAccessConfig({ ...doorAccessConfig, webhook_url: e.target.value })}
                    placeholder="https://your-domain.com/api/timesheet/door-access"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                    readOnly
                  />
                  <button
                    onClick={() => {
                      const url = doorAccessConfig.webhook_url || `${window.location.origin}/api/timesheet/door-access`;
                      navigator.clipboard.writeText(url);
                      setSuccess('Webhook URL copied to clipboard!');
                      setTimeout(() => setSuccess(null), 2000);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                    title="Copy to clipboard"
                  >
                    <FiCopy className="w-4 h-4" />
                    <span>Copy</span>
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Configure your door access control system to send POST requests to this URL when employees enter/exit.
                </p>
              </div>

              {/* API Key (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key (Optional)
                </label>
                <input
                  type="password"
                  value={doorAccessConfig.api_key}
                  onChange={(e) => setDoorAccessConfig({ ...doorAccessConfig, api_key: e.target.value })}
                  placeholder="Enter API key for authentication"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Optional: Add an API key for additional security. Include it in the Authorization header when sending webhook requests.
                </p>
              </div>

              {/* Auto Clock In/Out Options */}
              <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Automatic Processing</h4>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doorAccessConfig.auto_clock_in}
                    onChange={(e) => setDoorAccessConfig({ ...doorAccessConfig, auto_clock_in: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Auto Clock In on Entry</span>
                    <p className="text-xs text-gray-500">Automatically create clock in records when ENTRY events are received</p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={doorAccessConfig.auto_clock_out}
                    onChange={(e) => setDoorAccessConfig({ ...doorAccessConfig, auto_clock_out: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Auto Clock Out on Exit</span>
                    <p className="text-xs text-gray-500">Automatically create clock out records when EXIT events are received</p>
                  </div>
                </label>
              </div>

              {/* Integration Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Integration Instructions</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>Copy the webhook URL above</li>
                  <li>Configure your door access control system to send POST requests to this URL</li>
                  <li>Send events in this format:
                    <pre className="mt-2 p-3 bg-blue-100 rounded text-xs overflow-x-auto">
{`{
  "employee_id": 123,
  "access_type": "ENTRY",  // or "EXIT"
  "access_timestamp": "2026-01-26T09:00:00Z",
  "door_id": "DOOR-001",
  "door_name": "Main Entrance",
  "card_id": "CARD-12345",
  "location": "Building A"
}`}
                    </pre>
                  </li>
                  <li>Test the integration by sending a test event</li>
                  <li>View door access logs in the Timesheet page</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
      
         
      
      {/* Leave Configuration */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FiCalendar className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900">Leave Configuration</h3>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Configure the number of leave days allowed per leave type for your company. These values will be used to calculate leave balances for all employees.
            <br />
            Note: Leave types that include the word "permission" are treated as hour-based and will show values in hours here.
          </p>
          {Object.keys(leaveConfig).length === 0 ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    No leave types configured yet
                  </p>
                  <p className="text-sm text-blue-700">
                    Configure leave types for your company. You can add custom leave types or use the quick setup below.
                  </p>
                </div>
                <button
                  onClick={() => {
                    
                    setLeaveConfig({
                      // 'Casual Leave': 6,
                      // 'Earned Leave': 12,
                      // 'Sick Leave': 6,
                      // 'Compensatory Off': "",
                      // 'Loss Of Pay': "",
                      // 'Maternity Leave': "",
                      // 'Paternity Leave': "",
                      // 'Bereavement Leave': "",
                      // 'Marriage Leave': "",
                      // 'Work From Home': "",
                    });
                  }}
                  className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Quick Setup
                </button>
              </div>
            </div>
          ) : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {Object.entries(leaveConfig).map(([leaveType, days]) => {
              const normalized = String(leaveType || '').toLowerCase().replace(/[_\-]+/g, ' ').trim();
              const isPermission = normalized.includes('permission');
              return (
                <div key={leaveType} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <label className="text-sm font-medium text-gray-700 flex-1">
                    {leaveType}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={isPermission ? '0' : '0'}
                      max={isPermission ? '24' : '365'}
                      step={isPermission ? '0.5' : '1'}
                      value={days}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const newValue = isPermission ? parseFloat(raw) || 0 : parseInt(raw) || 0;
                        setLeaveConfig({
                          ...leaveConfig,
                          [leaveType]: newValue
                        });
                      }}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-right"
                    />
                    <span className="text-sm text-gray-500">{isPermission ? 'hours' : 'days'}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteLeaveType(leaveType)}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Add Leave Type</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Leave Type Name (e.g., Casual Leave)"
                id="newLeaveType"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target;
                    const leaveType = input.value.trim();
                    if (leaveType && !leaveConfig[leaveType]) {
                      handleAddLeaveType(leaveType);
                      input.value = '';
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById('newLeaveType');
                  const leaveType = input?.value.trim();
                  if (leaveType && !leaveConfig[leaveType]) {
                    handleAddLeaveType(leaveType);
                    if (input) input.value = '';
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <FiPlus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter or click the + button to add a new leave type
            </p>
          </div> 

         
{/* <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
  <h4 className="text-sm font-semibold text-purple-900 mb-2">
    Upload Leave Calendar (OCR)
  </h4>

  <p className="text-sm text-purple-700 mb-3">
    Upload an official leave calendar or policy document (PDF/Image).
    The system will extract holidays and update the leave calendar automatically.
  </p>

  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
    <input
      type="file"
      accept=".pdf,image/png,image/jpeg,image/jpg"
      onChange={(e) => setLeaveFile(e.target.files?.[0] || null)}
      className="block w-full text-sm text-gray-700
        file:mr-4 file:py-2 file:px-4
        file:rounded-lg file:border-0
        file:text-sm file:font-medium
        file:bg-purple-600 file:text-white
        hover:file:bg-purple-700
        cursor-pointer"
    />

    <button
      onClick={handleLeaveFileUpload}
      disabled={!leaveFile || uploadingLeaveFile}
      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {uploadingLeaveFile ? 'Uploading...' : 'Upload & Process'}
    </button>
  </div>

  
  {uploadedLeaveFile && (
    <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <span className="text-sm text-gray-700 font-medium">
        Uploaded: {uploadedLeaveFile.fileName}
      </span>


        <button
          // onClick={() => window.open(uploadedLeaveFile.fileUrl, '_blank')}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          View
        </button>

        <button
          // onClick={() => handleDeleteLeaveFile(uploadedLeaveFile.id)}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Delete
        </button>
      </div>

  )}


  {leaveUploadError && (
    <p className="mt-2 text-sm text-red-600">{leaveUploadError}</p>
  )}
</div>  */}

        </div>
      </div>


      {/* Calendar Configuration */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FiCalendar className="w-6 h-6 text-[#ffbd59]" />
          <h3 className="text-xl font-semibold text-gray-900">Calendar Configuration</h3>
        </div>
        <div>
           <button
    onClick={() => {
      setEditingLeave(null);
      setLeaveTitle('');
      setLeaveDate(new Date());
      setLeaveColor('');
      const firstType = holidayTypes?.[0]?.name || '';
      setLeaveHolidayType(firstType);
      if (firstType) {
        setLeaveColor(getHolidayTypeColor(firstType));
      }
      setShowLeaveModal(true);
    }}
    className="bg-[#181c52] text-white px-4 py-2 rounded-lg hover:bg-[#2c2f72]"
  >
    ➕ Add Leave
  </button>
  <button
    onClick={() => {
      setNewHolidayType('');
      setHolidayTypeColorInput('#3B82F6');
      setShowHolidayTypeModal(true);
    }}
    className="ml-2 bg-white text-[#181c52] border border-[#181c52] px-4 py-2 rounded-lg hover:bg-gray-50"
  >
    Manage Holiday Types
  </button>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4 py-4">
            Configure the leave days in the organization calendar. 
          </p>
        </div>
        <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <button
              className="p-1 mr-2 text-gray-600 hover:text-gray-800"
              onClick={() => setShowConfiguredList(v => !v)}
              aria-expanded={showConfiguredList}
              aria-label={showConfiguredList ? 'Collapse configured leaves' : 'Expand configured leaves'}
            >
              {showConfiguredList ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            <h3 className="text-lg font-medium">Configured Leaves</h3>
          </div>
          {/* <button
            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800"
            onClick={() => setShowLeaveModal(true)}
          >
            Add Leave
          </button> */}
        </div>
  
       </div> 

      
        {showConfiguredList && (
          (configuredLeaves && configuredLeaves.length > 0) ? (
            <div className="space-y-3">
              {configuredLeaves
                .filter(event => {
                  // Exclude weekends (Saturday=6, Sunday=0)
                  if (!event.start_date) return true;
                  const date = new Date(event.start_date);
                  const day = date.getDay();
                  return day !== 0 && day !== 6;
                })
                .map((event) => (
                  <div
                    key={event.event_id || event.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: event.color || '#3B82F6' }}
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{event.title}</div>
                        <div className="text-sm text-gray-500">
                          {event.start_date ? new Date(event.start_date).toLocaleDateString('en-GB') : ''}
                        </div>
                        {/* Show holiday type if present */}
                        {event.holiday_type && (
                          <div className="text-xs text-gray-400">Type: {event.holiday_type}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingLeave(event);
                          setLeaveTitle(event.title);
                          setLeaveDate(event.start_date ? new Date(event.start_date) : new Date());
                          setLeaveColor(event.color || '');
                          const eventHolidayType =
                            event.holiday_type ||
                            event?.recurring_pattern?.holiday_type ||
                            holidayTypes?.[0]?.name ||
                            '';
                          setLeaveHolidayType(eventHolidayType);
                          setShowLeaveModal(true);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Edit
                      </button>

                      <button
                        onClick={async () => {
                          if (!window.confirm('Delete this leave?')) return;

                          try {
                            const id = event.event_id || event.id;
                            const isLocalOnlyEvent = String(id).startsWith('manual-');

                            if (isLocalOnlyEvent) {
                              removeClientCreatedEvent(id);
                              setConfiguredLeaves(prev => prev.filter(e => String(e.event_id || e.id) !== String(id)));
                              alert('Leave removed successfully!');
                              return;
                            }

                            console.debug('[Settings] deleting event id=', id, 'event=', event);
                            const res = await calendarAPI.deleteEvent(id);
                            console.debug('[Settings] delete response=', res);

                            // Optimistically remove from UI
                            setConfiguredLeaves(prev => prev.filter(e => (e.event_id || e.id) !== id));

                            // Broadcast deletion so other clients refresh
                            try {
                              if (sendRealTimeMessage) {
                                sendRealTimeMessage('calendar_update', { action: 'deleted', event_id: id });
                              }
                              window.dispatchEvent(new CustomEvent('settings-update', { detail: { type: 'calendar_update', action: 'deleted', event_id: id } }));
                            } catch (e) {
                              console.warn('Failed to broadcast calendar deletion', e);
                            }

                            // Try to refetch to ensure consistency
                            try { await fetchConfiguredLeaves(); } catch (e) { console.warn('Refetch after delete failed', e); }
                          } catch (err) {
                            // Log full error details for debugging
                            console.error('Delete leave failed', err);
                            const status = err?.response?.status;
                            const data = err?.response?.data;

                            // If it's a server error, show a friendly message and attempt client-side fallback
                            if (status === 500) {
                              console.error('Server error deleting calendar event:', data);
                              alert('Failed to delete calendar event due to a server error. Using client-side fallback to hide it locally. Please contact your administrator to fix the server issue.');

                              // client-side fallback: persist deletion id so employee Calendar hides it
                              try {
                                addClientDeletedId(id);
                                setConfiguredLeaves(prev => prev.filter(e => (e.event_id || e.id) !== id));
                                // broadcast local event so Calendar.jsx refreshes
                                window.dispatchEvent(new CustomEvent('settings-update', { detail: { type: 'calendar_update', action: 'deleted', event_id: id } }));
                              } catch (e) {
                                console.warn('Client-side fallback failed', e);
                              }
                            } else {
                              if (status === 404) {
                                addClientDeletedId(id);
                                setConfiguredLeaves(prev => prev.filter(e => String(e.event_id || e.id) !== String(id)));
                                alert('Calendar delete endpoint is unavailable (404). The leave has been hidden locally.');
                                return;
                              }
                              const msg = (data && (data.detail || data.message)) || err?.message || 'Failed to delete leave';
                              alert(msg);
                            }
                          }
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No configured leaves</div>
          )
        )}
      </div>


        {showLeaveModal && (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
    <div className="bg-white rounded-xl shadow-xl w-[420px] p-6">
      
      <h3 className="text-lg font-semibold mb-4">
        Select Leave Date
      </h3>

      {/* Month Picker */}
      <input
        type="date"
        value={leaveDate.toISOString().split('T')[0]}
        onChange={(e) => setLeaveDate(new Date(e.target.value))}
        className="w-full border rounded-lg px-3 py-2 mb-4"
      />

      {/* Leave title */}
      <input
        type="text"
        placeholder="Event (e.g. Festival Holiday)"
        value={leaveTitle}
        onChange={(e) => setLeaveTitle(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 mb-4"
      />

      <label className="block text-sm font-medium text-gray-700 mb-2">
        Holiday Type
      </label>
      <select
        value={leaveHolidayType}
        onChange={(e) => {
          const selectedType = e.target.value;
          setLeaveHolidayType(selectedType);
          setLeaveColor(getHolidayTypeColor(selectedType));
        }}
        className="w-full border rounded-lg px-3 py-2 mb-2"
      >
        {holidayTypeNames.length === 0 ? (
          <option value="" disabled>
            No holiday types configured
          </option>
        ) : (
          holidayTypeNames.map((type) => (
            <option key={type} value={type}>
              {String(type).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </option>
          ))
        )}
      </select>

      <p className="text-xs text-gray-500 mb-4">To add or delete holiday types, use the "Manage Holiday Types" button.</p>
 

      {/* <label className="block text-sm font-medium text-gray-700 mb-2">
  Leave Color
</label>

<div className="grid grid-cols-12 gap-1 mb-4">
  {COLOR_MATRIX.map((color) => (
    <button
      key={color}
      type="button"
      onClick={() => setLeaveColor(color)}
      className={`w-6 h-6 rounded-sm border transition
        ${
          leaveColor === color
            ? 'border-black ring-2 ring-black'
            : 'border-gray-300 hover:scale-110'
        }
      `}
      style={{ backgroundColor: color }}
      aria-label={`Select color ${color}`}
    />
  ))}
</div> */}

{/* Selected color preview */}
<div className="flex items-center gap-2 text-sm text-gray-600">
  <span>Selected:</span>
  <span
    className="w-4 h-4 rounded border"
    style={{ backgroundColor: leaveColor }}
  />
  <span className="font-mono">{leaveColor}</span>
</div>



      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowLeaveModal(false)}
          className="px-4 py-2 border rounded-lg"
        >
          Cancel
        </button>

        <button
          onClick={async () => {
            if (!leaveTitle) {
              alert('Leave title required');
              return;
            }

            if (!leaveHolidayType) {
              alert('Holiday type required. Please select a holiday type.');
              return;
            }

            const toDateOnly = (d) => d.toISOString().split('T')[0];

            const payload = {
              event_type: 'holiday',
              title: leaveTitle,
              // label the leave type so frontend can show it in lists
              leave_type: leaveTitle,
                holiday_type: leaveHolidayType,
                  start_date: toDateOnly(leaveDate),
              end_date: null,
              all_day: true,
              color: leaveColor || '#3B82F6',
              description: null,
              location: null,
              // mark this event as created via Leave Configuration (admin settings)
              source_type: 'leave_configuration',
              source_id: null,
              is_recurring: false,
              // Persist holiday type in DB using JSON field (no schema migration needed).
              recurring_pattern: {
                holiday_type: leaveHolidayType
              },
            };

            try {
              // If we are editing an existing leave, call update
              let saved = null;
              if (editingLeave && (editingLeave.event_id || editingLeave.id)) {
                const eventId = editingLeave.event_id || editingLeave.id;
                saved = await calendarAPI.updateEvent(eventId, payload);
                console.debug('[Settings] updated event response=', saved);
              } else {
                saved = await calendarAPI.createEvent(payload); // create new
                console.debug('[Settings] created event response=', saved);
              }

              try {
                if (sendRealTimeMessage) {
                  const action = editingLeave ? 'updated' : 'created';
                  sendRealTimeMessage('calendar_update', { action, event: saved || payload });
                }
                // also dispatch local event for same-window listeners
                window.dispatchEvent(new CustomEvent('settings-update', { detail: { type: 'calendar_update', action: editingLeave ? 'updated' : 'created', event: saved || payload } }));
              } catch (wsErr) {
                console.warn('Failed to send real-time calendar update from admin client:', wsErr);
              }

              setShowLeaveModal(false);
              setLeaveTitle('');
              setLeaveDate(new Date());
              setLeaveColor('');
              setLeaveHolidayType(holidayTypes?.[0]?.name || '');
              setEditingLeave(null);
              // Refresh both calendar and configured list
              fetchEvents && fetchEvents();
              // If API returned the saved event, try to extract and show it immediately
              try {
                let newEvent = null;
                if (saved) {
                  if (Array.isArray(saved)) {
                    newEvent = saved.find(e => e && (e.event_type === 'leave' || e.leave_type));
                  } else if (saved && (saved.event_type || saved.leave_type || saved.event_id || saved.id)) {
                    newEvent = saved;
                  } else if (saved.data) {
                    if (Array.isArray(saved.data)) newEvent = saved.data.find(e => e && (e.event_type === 'leave' || e.leave_type));
                    else if (saved.data.event) newEvent = saved.data.event;
                  } else if (saved.events && Array.isArray(saved.events)) {
                    newEvent = saved.events.find(e => e && (e.event_type === 'leave' || e.leave_type));
                  }
                }
                if (newEvent) {
                  setConfiguredLeaves(prev => [newEvent, ...prev.filter(e => (e.event_id || e.id) !== (newEvent.event_id || newEvent.id))]);
                }
              } catch (e) {
                console.warn('Failed to extract new event from response', e, saved);
              }

              fetchConfiguredLeaves();
              alert('Leave/holiday event saved successfully!');
            } catch (err) {
              const status = err?.response?.status;
              if (status === 404) {
                const localId = editingLeave?.event_id || editingLeave?.id || `manual-${Date.now()}`;
                const localEvent = upsertClientCreatedEvent({
                  ...payload,
                  event_id: localId,
                  id: localId
                });

                setConfiguredLeaves((prev) => {
                  const filtered = prev.filter((e) => String(e.event_id || e.id) !== String(localId));
                  return [localEvent, ...filtered];
                });

                setShowLeaveModal(false);
                setLeaveTitle('');
                setLeaveDate(new Date());
                setLeaveColor('');
                setLeaveHolidayType(holidayTypes?.[0]?.name || '');
                setEditingLeave(null);
                alert('Calendar endpoint is unavailable (404). Leave saved locally in this browser as a fallback.');
                return;
              }

              let msg = 'Failed to save leave/holiday event.';
              if (err && err.response && err.response.data && err.response.data.detail) {
                msg += '\n' + err.response.data.detail;
              } else if (err && err.message) {
                msg += '\n' + err.message;
              }
              alert(msg);
              console.error('Error saving leave/holiday event:', err);
            }
            }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
        >
          Save Leave
        </button>
      </div>
    </div>

    {/* <div
  className="text-xs px-2 py-1 rounded font-medium"
  style={{
    backgroundColor: event.color,
    color: '#fff', // we can auto-fix this later
  }}
>
  {event.title}
</div> */}



  </div>
)}

{showHolidayTypeModal && (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
    <div className="bg-white rounded-xl shadow-xl w-[520px] max-w-[95vw] p-6">
      <h3 className="text-lg font-semibold mb-4">Manage Holiday Types</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <input
          type="text"
          value={newHolidayType}
          onChange={(e) => setNewHolidayType(e.target.value)}
          placeholder="Holiday type name"
          className="md:col-span-2 border rounded-lg px-3 py-2"
        />
        <input
          type="color"
          value={holidayTypeColorInput}
          onChange={(e) => handleHolidayTypeColorInputChange(e.target.value)}
          className="h-10 w-full border rounded-lg px-1 py-1"
          aria-label="Holiday type color"
        />
      </div>

      <input
        type="text"
        value={holidayTypeColorInput}
        onChange={(e) => setHolidayTypeColorInput(e.target.value)}
        onBlur={handleHolidayTypeColorInputBlur}
        placeholder="#3B82F6"
        className="w-full border rounded-lg px-3 py-2 mb-4 font-mono uppercase"
        aria-label="Holiday type hex color code"
      />

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={handleAddHolidayType}
          className="px-4 py-2 bg-[#181c52] text-white rounded-lg hover:bg-[#2c2f72]"
        >
          Add Type
        </button>
      </div>

      <div className="max-h-56 overflow-y-auto border rounded-lg p-2 mb-4">
        {holidayTypes.length === 0 ? (
          <p className="text-sm text-gray-500 p-2">No holiday types added yet.</p>
        ) : (
          holidayTypes.map((item) => (
            <div key={item.name} className="flex items-center justify-between p-2 border-b last:border-b-0">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-sm border" style={{ backgroundColor: item.color || '#3B82F6' }} />
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-xs font-mono text-gray-500">{normalizeHexColor(item.color || '#3B82F6')}</span>
                <input
                  type="color"
                  value={normalizeHexColor(item.color || '#3B82F6')}
                  onChange={(e) => handleUpdateHolidayTypeColor(item.name, e.target.value)}
                  className="h-7 w-10 border rounded"
                  aria-label={`Change color for ${item.name}`}
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  await handleDeleteHolidayType(item.name);
                }}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowHolidayTypeModal(false)}
          className="px-4 py-2 border rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      
      {/* Feature Toggles */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FiSettings className="w-6 h-6 text-[#ffbd59]" />
          <h3 className="text-xl font-semibold text-gray-900">Feature Management</h3>
        </div>
        
        {/* Feature Categories */}
        <div className="space-y-6">
          {/* Core HR Features */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Core HR Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'enable_employees', label: 'Employees', desc: 'Employee management and profiles' },
                { key: 'enable_payroll', label: 'Payroll', desc: 'Salary and benefits management' },
                { key: 'enable_timesheet', label: 'Timesheet', desc: 'Time tracking and attendance' },
                { key: 'enable_leaves', label: 'Leave Management', desc: 'Leave requests and approvals' },
                { key: 'enable_onboarding', label: 'Onboarding', desc: 'New employee onboarding workflow' },
                { key: 'enable_documents', label: 'Documents', desc: 'Employee document management' },
                { key: 'enable_benefits', label: 'Insurance Cards', desc: 'Employee insurance card management' },
              ].filter(({ key }) => shouldShowFeature(key)).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{label}</h5>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  <button
                    onClick={() => toggleFeature(key)}
                    disabled={isFeatureLocked(key)}
                    className={`ml-4 flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isFeatureLocked(key)
                        ? 'bg-yellow-50 text-yellow-700 cursor-not-allowed opacity-75 border border-yellow-200'
                        : featuresConfig[key]
                        ? 'bg-yellow-100 text-black-700 hover:bg-yellow-200'
                        : !isFeatureInPlan(key)
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={
                      isFeatureLocked(key)
                        ? 'This feature is locked by the organization admin and cannot be changed.'
                        : ''
                    }
                  >
                    {isFeatureLocked(key) && <FiAlertCircle className="w-4 h-4 mr-1" />}
                    {featuresConfig[key] ? (
                      <>
                        <FiToggleRight className="w-5 h-5" />
                        <span className="text-sm">Enabled</span>
                      </>
                    ) : (
                      <>
                        <FiToggleLeft className="w-5 h-5" />
                        <span className="text-sm">Disabled</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Talent Management */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Talent Management</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'enable_recruitment', label: 'Recruitment', desc: 'Job postings and candidate management' },
                { key: 'enable_qualified_applications', label: 'Qualified Applications', desc: 'AI-screened applications' },
                { key: 'enable_question_bank', label: 'Question Bank', desc: 'Aptitude test questions' },
                { key: 'enable_test_monitoring', label: 'Test Monitoring', desc: 'Monitor candidate tests' },
                { key: 'enable_performance', label: 'Performance', desc: 'Goals and performance reviews' },
                { key: 'enable_learning', label: 'Learning', desc: 'Courses and development' },
                { key: 'enable_engagement', label: 'Engagement', desc: 'Surveys and recognition' },
              ].filter(({ key }) => shouldShowFeature(key)).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{label}</h5>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  <button
                    onClick={() => toggleFeature(key)}
                    disabled={isFeatureLocked(key)}
                    className={`ml-4 flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isFeatureLocked(key)
                        ? 'bg-yellow-50 text-yellow-700 cursor-not-allowed opacity-75 border border-yellow-200'
                        : featuresConfig[key]
                        ? 'bg-yellow-100 text-black-700 hover:bg-yellow-200'
                        : !isFeatureInPlan(key)
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={
                      isFeatureLocked(key)
                        ? 'This feature is locked by the organization admin and cannot be changed.'
                        : ''
                    }
                  >
                    {isFeatureLocked(key) && <FiAlertCircle className="w-4 h-4 mr-1" />}
                    {featuresConfig[key] ? (
                      <>
                        <FiToggleRight className="w-5 h-5" />
                        <span className="text-sm">Enabled</span>
                      </>
                    ) : (
                      <>
                        <FiToggleLeft className="w-5 h-5" />
                        <span className="text-sm">Disabled</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* AI & Analytics */}
          {!isHrManager && (
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">AI & Analytics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'enable_ai_agents', label: 'AI Agents', desc: 'AI-powered HR assistants' },
                { key: 'enable_agent_monitoring', label: 'Agent Monitoring', desc: 'AI agents performance tracking' },
                { key: 'enable_chat_monitor', label: 'Chat Monitor', desc: 'AI agent conversations' },
                { key: 'enable_analytics', label: 'Analytics', desc: 'Reports and insights' },
              ].filter(({ key }) => shouldShowFeature(key)).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{label}</h5>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  <button
                    onClick={() => toggleFeature(key)}
                    disabled={isFeatureLocked(key)}
                    className={`ml-4 flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isFeatureLocked(key)
                        ? 'bg-yellow-50 text-yellow-700 cursor-not-allowed opacity-75 border border-yellow-200'
                        : featuresConfig[key]
                        ? 'bg-yellow-100 text-black-700 hover:bg-yellow-200'
                        : !isFeatureInPlan(key)
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={
                      isFeatureLocked(key)
                        ? 'This feature is locked by the organization admin and cannot be changed.'
                        : ''
                    }
                  >
                    {isFeatureLocked(key) && <FiAlertCircle className="w-4 h-4 mr-1" />}
                    {featuresConfig[key] ? (
                      <>
                        <FiToggleRight className="w-5 h-5" />
                        <span className="text-sm">Enabled</span>
                      </>
                    ) : (
                      <>
                        <FiToggleLeft className="w-5 h-5" />
                        <span className="text-sm">Disabled</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Administration */}
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Administration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'enable_compliance', label: 'Compliance', desc: 'Reports and audit logs' },
                { key: 'enable_policies', label: 'Policies', desc: 'Company policy documents' },
                { key: 'enable_task_management', label: 'Task Management', desc: 'Create and manage tasks' },
              ].filter(({ key }) => shouldShowFeature(key)).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{label}</h5>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  <button
                    onClick={() => toggleFeature(key)}
                    disabled={isFeatureLocked(key)}
                    className={`ml-4 flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isFeatureLocked(key)
                        ? 'bg-yellow-50 text-yellow-700 cursor-not-allowed opacity-75 border border-yellow-200'
                        : featuresConfig[key]
                        ? 'bg-yellow-100 text-black-700 hover:bg-yellow-200'
                        : !isFeatureInPlan(key)
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={
                      isFeatureLocked(key)
                        ? 'This feature is locked by the organization admin and cannot be changed.'
                        : ''
                    }
                  >
                    {isFeatureLocked(key) && <FiAlertCircle className="w-4 h-4 mr-1" />}
                    {featuresConfig[key] ? (
                      <>
                        <FiToggleRight className="w-5 h-5" />
                        <span className="text-sm">Enabled</span>
                      </>
                    ) : (
                      <>
                        <FiToggleLeft className="w-5 h-5" />
                        <span className="text-sm">Disabled</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
            </div>
          )}
          
          {/* Usage Tab Content */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              {/* Plan & Usage Section */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <FiPackage className="w-6 h-6 text-[#ffbd59]" />
                  <h3 className="text-xl font-semibold text-gray-900">Plan & Usage</h3>
                </div>
                <button
                  onClick={() => setShowPlansModal(true)}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  View Plans →
                </button>
              </div>
              
              {loadingUsage ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : usageStats && usageStats.current_plan && usageStats.current_plan.name ? (
          <div className="space-y-6">
            {/* Current Plan Card */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    {usageStats.current_plan.name}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {usageStats.current_plan.description}
                  </p>
                  <div className="flex items-center space-x-4">
                    {usageStats.current_plan.price_per_month > 0 && (
                      <div>
                        <span className="text-2xl font-bold text-purple-600">
                          ₹{usageStats.current_plan.price_per_month}
                        </span>
                        <span className="text-gray-600 text-sm">/month</span>
                      </div>
                    )}
                    {usageStats.current_plan.price_per_month === 0 && (
                      <span className="text-lg font-semibold text-green-600">Free Plan</span>
                    )}
                  </div>
                  {usageStats.current_plan.is_trial && usageStats.current_plan.trial_end_date && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>🕐 Trial Period Active</strong>
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Trial ends on: {new Date(usageStats.current_plan.trial_end_date).toLocaleDateString('en-IN', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  )}
                </div>
                {(usageStats.current_plan.price_per_month > 0 || usageStats.current_plan.is_trial) && (
                  <button
                    onClick={() => setShowPlansModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    {usageStats.current_plan.is_trial ? 'View Plans' : 'Upgrade'}
                  </button>
                )}
              </div>
            </div>
            
            {/* Near Limit Warnings */}
            {nearLimitWarnings && nearLimitWarnings.length > 0 && (
              <div className="space-y-2">
                {nearLimitWarnings.map((warning, idx) => (
                  <NearLimitWarning
                    key={idx}
                    warnings={[warning]}
                    onDismiss={() => {
                      setNearLimitWarnings(prev => prev.filter((_, i) => i !== idx));
                    }}
                    onUpgrade={() => {
                      setShowPlansModal(true);
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Usage Statistics */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FiBarChart className="w-5 h-5 mr-2 text-[#ffbd59]" />
                Usage Statistics
              </h4>
              <div className="space-y-4">
                {usageStats.usage && usageStats.usage.length > 0 ? (
                  usageStats.usage.map((usageItem, idx) => {
                    const limit = usageStats.limits?.find(l => l.limit_type === usageItem.limit_type);
                    const usagePercent = limit && limit.limit_value > 0
                      ? (usageItem.current_usage / limit.limit_value) * 100
                      : 0;
                    const isNearLimit = usagePercent >= 80;
                    const isAtLimit = usagePercent >= 100;
                    
                    return (
                      <div key={idx} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {usageItem.limit_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </h5>
                            {limit?.description && (
                              <p className="text-sm text-gray-500">{limit.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`text-lg font-semibold ${
                              isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-900'
                            }`}>
                              {usageItem.current_usage}
                            </span>
                            <span className="text-gray-600"> / {limit?.limit_value || 'Unlimited'}</span>
                          </div>
                        </div>
                        {limit && limit.limit_value > 0 && (
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full transition-all ${
                                isAtLimit
                                  ? 'bg-red-500'
                                  : isNearLimit
                                  ? 'bg-yellow-500'
                                  : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(usagePercent, 100)}%` }}
                            ></div>
                          </div>
                        )}
                        {limit && limit.limit_value > 0 && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">
                              {usagePercent.toFixed(1)}% used
                            </span>
                            {isNearLimit && !isAtLimit && (
                              <span className="text-xs text-yellow-600 flex items-center">
                                <FiAlertCircle className="w-3 h-3 mr-1" />
                                Near limit
                              </span>
                            )}
                            {isAtLimit && (
                              <span className="text-xs text-red-600 flex items-center">
                                <FiAlertCircle className="w-3 h-3 mr-1" />
                                Limit reached
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No usage statistics available
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No plan information available</p>
            {usageStats && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left max-w-md mx-auto">
                <p className="text-sm font-semibold text-yellow-800 mb-2">Debug Information:</p>
                <pre className="text-xs text-yellow-700 overflow-auto">
                  {JSON.stringify(usageStats, null, 2)}
                </pre>
              </div>
            )}
            <button
              onClick={() => setShowPlansModal(true)}
              className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              View Plans
            </button>
          </div>
        )}
            </div>
          )}
        </div>
      </div>
      
      {/* Plans Modal */}
      <PlansModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        currentPlanId={usageStats?.current_plan?.plan_id}
        organizationId={usageStats?.organization_id}
      />
    </div>
  );
}

