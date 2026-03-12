import React, { useEffect, useMemo, useState } from 'react';
import api, { leaveAPI, leaveTypesAPI, calendarAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const InlineLeaveForm = ({ onSubmit, onCancel, leaveConfig = null }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    leave_duration: 'full_day',
    leave_type: '',
    start_date: '',
    end_date: '',
    maternity_weeks: '',
    permission_hours: '',
    reason: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [remoteLeaveConfig, setRemoteLeaveConfig] = useState({});
  const [configuredDateSlots, setConfiguredDateSlots] = useState([]);
  const [selectedConfiguredSlot, setSelectedConfiguredSlot] = useState('');

  const parseJsonLike = (value) => {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;

    try {
      return JSON.parse(value);
    } catch {
      try {
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

  const toDateOnly = (value) => {
    if (!value) return '';
    const raw = String(value);
    return raw.includes('T') ? raw.split('T')[0] : raw;
  };

  const extractCalendarEvents = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload.events)) return payload.events;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
    const firstArray = Object.values(payload).find((value) => Array.isArray(value));
    return Array.isArray(firstArray) ? firstArray : [];
  };

  const normalizeTypeName = (s) => String(s || '').toLowerCase().replace(/[_\-]+/g, ' ').trim();

  const getConfiguredSlotKey = (slot) => `${slot.startDate}|${slot.endDate}`;

  const fetchConfiguredDateSlots = async () => {
    try {
      const start = new Date();
      start.setFullYear(start.getFullYear() - 1);
      const end = new Date();
      end.setFullYear(end.getFullYear() + 2);
      const response = await calendarAPI.getEvents(toDateOnly(start.toISOString()), toDateOnly(end.toISOString()));
      const events = extractCalendarEvents(response);

      const dedup = new Set();
      const slots = events
        .filter((entry) => {
          const sourceType = String(entry?.source_type || entry?.source || '').toLowerCase();
          return sourceType === 'leave_configuration';
        })
        .map((entry) => {
          const leaveType = String(
            entry?.holiday_type ||
            entry?.leave_type ||
            entry?.recurring_pattern?.holiday_type ||
            entry?.title ||
            ''
          ).trim();
          const startDate = toDateOnly(entry?.start_date || entry?.start || entry?.date);
          const endDate = toDateOnly(entry?.end_date || entry?.end || entry?.start_date || entry?.start || entry?.date);
          return {
            leaveType,
            normalizedLeaveType: normalizeTypeName(leaveType),
            startDate,
            endDate
          };
        })
        .filter((slot) => slot.leaveType && slot.startDate)
        .filter((slot) => {
          const key = `${slot.normalizedLeaveType}|${slot.startDate}|${slot.endDate}`;
          if (dedup.has(key)) return false;
          dedup.add(key);
          return true;
        })
        .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));

      setConfiguredDateSlots(slots);
    } catch (error) {
      console.warn('Failed to fetch configured leave slots:', error);
      setConfiguredDateSlots([]);
    }
  };

  const readLeaveConfigFromSettingsPayload = (settingsPayload) => {
    if (!settingsPayload || typeof settingsPayload !== 'object') return {};
    const parsedOtherSettings = parseJsonLike(settingsPayload.other_settings) || {};
    const parsedLeaveConfig = parseJsonLike(parsedOtherSettings.leave_config);
    return normalizeLeaveConfig(parsedLeaveConfig);
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

  const normalizeLeaveConfigFromLeaveTypeRows = (rows) => {
    const configFromRows = {};
    rows.forEach((row) => {
      const leaveType = String(row?.leave_type || row?.name || row?.type_name || row?.title || row?.label || '').trim();
      if (!leaveType) return;
      configFromRows[leaveType] = 0;
    });
    return configFromRows;
  };

  useEffect(() => {
    let isMounted = true;

    const fetchLeaveConfig = async () => {
      try {
        // Prefer DB-backed leave types API, fallback to settings-based config.
        let normalized = {};
        try {
          const typeRowsResponse = await leaveTypesAPI.list();
          const rows = extractLeaveTypeRows(typeRowsResponse);
          normalized = normalizeLeaveConfigFromLeaveTypeRows(rows);
        } catch {
          const response = await api.get('/settings/leave-config');
          normalized = normalizeLeaveConfig(response?.data?.leave_config);
        }

        if (!isMounted) return;
        setRemoteLeaveConfig(normalized);
      } catch (error) {
        console.warn('Failed to fetch leave config for inline leave form:', error);
      }
    };

    const handleSettingsUpdate = (event) => {
      const eventSettings = event?.detail?.settings;
      const fromEvent = readLeaveConfigFromSettingsPayload(eventSettings);
      fetchConfiguredDateSlots();

      if (Object.keys(fromEvent).length > 0) {
        setRemoteLeaveConfig(fromEvent);
        return;
      }

      // If payload does not include settings data, fetch fresh leave config.
      fetchLeaveConfig();
    };

    fetchLeaveConfig();
    fetchConfiguredDateSlots();
    window.addEventListener('settings-update', handleSettingsUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('settings-update', handleSettingsUpdate);
    };
  }, []);

  const leaveTypes = useMemo(() => {
    const configuredTypes = Object.keys(normalizeLeaveConfig(leaveConfig)).map((type) => ({
      value: type,
      label: type
    }));

    const remoteTypes = Object.keys(remoteLeaveConfig).map((type) => ({
      value: type,
      label: type
    }));

    const mergedByValue = new Map();
    [...remoteTypes, ...configuredTypes].forEach((type) => {
      mergedByValue.set(type.value, type);
    });

    return Array.from(mergedByValue.values());
  }, [leaveConfig, remoteLeaveConfig]);

  useEffect(() => {
    setFormData((prev) => {
      if (leaveTypes.length === 0) {
        return prev.leave_type ? { ...prev, leave_type: '' } : prev;
      }

      const selectedStillValid = leaveTypes.some((type) => type.value === prev.leave_type);
      if (selectedStillValid) return prev;

      return { ...prev, leave_type: leaveTypes[0].value };
    });
  }, [leaveTypes]);

  const PERMISSION_KEYWORDS = ['permission', 'permission required', 'permission_leave', 'permission-required'];

  const selectedLeaveTypeObj = leaveTypes.find((t) => t.value === formData.leave_type) || {};
  const selectedLeaveTypeName = normalizeTypeName(selectedLeaveTypeObj.value || selectedLeaveTypeObj.label || formData.leave_type);
  const selectedTypeConfiguredSlots = useMemo(
    () => configuredDateSlots.filter((slot) => slot.normalizedLeaveType === selectedLeaveTypeName),
    [configuredDateSlots, selectedLeaveTypeName]
  );
  const shouldRestrictToConfiguredSlots = selectedTypeConfiguredSlots.length > 0;

  const isPermissionLeave = PERMISSION_KEYWORDS.some((k) => selectedLeaveTypeName.includes(k));
  const isSickLeave = normalizeTypeName(formData.leave_type).includes('sick');
  const isWFHLeave = normalizeTypeName(formData.leave_type).includes('work from home') || normalizeTypeName(formData.leave_type).includes('wfh');
  const isMaternityLeave = normalizeTypeName(formData.leave_type).includes('maternity');
  const isSessionalLeave = ['first_half', 'second_half'].includes(String(formData.leave_duration || '').toLowerCase());

  const MIN_ADVANCE_DAYS = 3;
  const BACKFILL_WINDOW_DAYS = 3;
  const MAX_MATERNITY_WEEKS = 26;

  const addWorkingDays = (startDate, workingDays) => {
    const d = new Date(startDate);
    let remaining = workingDays;

    // Inclusive: start date counts as day 1 if it is a weekday
    while (remaining > 1) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay();
      if (day !== 0 && day !== 6) {
        remaining -= 1;
      }
    }

    return d;
  };

  const calculateMaternityEndDate = (startDateValue, maternityWeeksValue) => {
    if (!startDateValue || !maternityWeeksValue) return '';
    const startDate = new Date(startDateValue);
    const weeks = Number(maternityWeeksValue);
    if (Number.isNaN(startDate.getTime()) || !Number.isFinite(weeks) || weeks <= 0) return '';

    // Weekends are excluded for maternity leave calculation.
    const totalWorkingDays = Math.round(weeks * 5);
    const endDate = addWorkingDays(startDate, totalWorkingDays);
    return endDate.toISOString().split('T')[0];
  };

  const maternityEndDate = calculateMaternityEndDate(formData.start_date, formData.maternity_weeks);

  useEffect(() => {
    if (!shouldRestrictToConfiguredSlots) {
      setSelectedConfiguredSlot('');
      return;
    }

    const matching = selectedTypeConfiguredSlots.find(
      (slot) => getConfiguredSlotKey(slot) === selectedConfiguredSlot
    ) || selectedTypeConfiguredSlots[0];

    if (!matching) return;

    const nextKey = getConfiguredSlotKey(matching);
    setSelectedConfiguredSlot(nextKey);
    setFormData((prev) => ({
      ...prev,
      start_date: matching.startDate,
      end_date: (isPermissionLeave || isSessionalLeave) ? matching.startDate : matching.endDate
    }));
  }, [
    shouldRestrictToConfiguredSlots,
    selectedTypeConfiguredSlots,
    selectedConfiguredSlot,
    isPermissionLeave,
    isSessionalLeave
  ]);

  useEffect(() => {
    if (!isPermissionLeave) return;

    setFormData((prev) => {
      // For permission leaves, default to a session (first_half) and ensure end_date matches start_date
      if (['first_half', 'second_half'].includes(String(prev.leave_duration || '').toLowerCase())) return { ...prev, end_date: prev.start_date || prev.end_date };
      return { ...prev, leave_duration: 'first_half', end_date: prev.start_date || prev.end_date };
    });
  }, [isPermissionLeave]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'configured_slot') {
      setSelectedConfiguredSlot(value);
      const slot = selectedTypeConfiguredSlots.find((item) => getConfiguredSlotKey(item) === value);
      if (slot) {
        setFormData((prev) => ({
          ...prev,
          start_date: slot.startDate,
          end_date: (isPermissionLeave || isSessionalLeave) ? slot.startDate : slot.endDate
        }));
      }
      if (errors.start_date || errors.end_date || errors.submit) {
        setErrors((prev) => ({ ...prev, start_date: '', end_date: '', submit: '' }));
      }
      return;
    }

    // Intercept start_date selection to block upcoming MIN_ADVANCE_DAYS for non-exempt leave types
    if (name === 'start_date' && !shouldRestrictToConfiguredSlots) {
      const selected = new Date(value);
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysDiff = Math.ceil((selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const currentLeaveType = String(formData.leave_type || '').trim().toLowerCase();
      const selectingPermission = currentLeaveType.includes('permission');
      const selectingSick = currentLeaveType.includes('sick');

      if (!selectingPermission && !selectingSick && daysDiff > 0 && daysDiff < MIN_ADVANCE_DAYS) {
        // Block selection: auto-adjust to earliest allowed future date and show error
        const earliest = new Date(today);
        earliest.setDate(today.getDate() + MIN_ADVANCE_DAYS);
        const iso = earliest.toISOString().split('T')[0];
        setFormData(prev => ({
          ...prev,
          start_date: iso,
          ...(prev.leave_duration && ['first_half', 'second_half'].includes(String(prev.leave_duration).toLowerCase()) ? { end_date: iso } : {}),
          ...(String(prev.leave_type || '').trim().toLowerCase().includes('permission') ? { end_date: iso, leave_duration: 'full_day' } : {})
        }));
        setErrors(prev => ({ ...prev, start_date: `Except for Sick leave and Permission, all other leaves should be applied for at least ${MIN_ADVANCE_DAYS} days in advance` }));
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'leave_type' && normalizeTypeName(value).includes('permission')
        ? { end_date: prev.start_date || prev.end_date, leave_duration: 'first_half' }
        : {}),
      ...(name === 'leave_type' && normalizeTypeName(value).includes('maternity')
        ? { leave_duration: 'full_day', end_date: prev.end_date, maternity_weeks: '' }
        : {}),
      ...(name === 'leave_type' && !normalizeTypeName(value).includes('maternity')
        ? { maternity_weeks: '' }
        : {}),
      ...(name === 'leave_duration' && ['first_half', 'second_half'].includes(String(value || '').toLowerCase()) && prev.start_date
        ? { end_date: prev.start_date }
        : {}),
      ...(name === 'start_date' && String(prev.leave_type || '').trim().toLowerCase().includes('permission')
        ? { end_date: value }
        : {}),
      ...(name === 'start_date' && ['first_half', 'second_half'].includes(String(prev.leave_duration || '').toLowerCase())
        ? { end_date: value }
        : {}),
      ...(name === 'start_date' && normalizeTypeName(prev.leave_type).includes('maternity')
        ? { end_date: calculateMaternityEndDate(value, prev.maternity_weeks) }
        : {}),
      ...(name === 'maternity_weeks' && normalizeTypeName(prev.leave_type).includes('maternity')
        ? { end_date: calculateMaternityEndDate(prev.start_date, value) }
        : {})
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (leaveTypes.length === 0) {
      newErrors.leave_type = 'No leave types configured. Please contact your admin.';
    }
    
    if (!formData.leave_type) {
      newErrors.leave_type = 'Please select a leave type';
    }

    if (!isMaternityLeave && !formData.leave_duration) {
      newErrors.leave_duration = 'Please select leave duration';
    }

    if (isMaternityLeave) {
      const maternityWeeks = Number(formData.maternity_weeks || 0);
      if (!maternityWeeks || maternityWeeks <= 0) {
        newErrors.maternity_weeks = 'Please enter maternity leave in weeks';
      } else if (maternityWeeks > MAX_MATERNITY_WEEKS) {
        newErrors.maternity_weeks = `Maternity leave cannot exceed ${MAX_MATERNITY_WEEKS} weeks.`;
      }
    }
    
    if (!formData.start_date) {
      newErrors.start_date = 'Please select a start date';
    }

    if (shouldRestrictToConfiguredSlots) {
      if (!selectedConfiguredSlot) {
        newErrors.start_date = 'Please choose one of the admin-configured leave dates.';
      } else {
        const allowed = selectedTypeConfiguredSlots.some((slot) => {
          const startMatches = slot.startDate === formData.start_date;
          const effectiveEnd = isMaternityLeave
            ? maternityEndDate
            : (isPermissionLeave || isSessionalLeave)
              ? formData.start_date
              : formData.end_date;
          const endMatches = slot.endDate === effectiveEnd;
          return startMatches && endMatches;
        });

        if (!allowed) {
          newErrors.start_date = 'You can apply only on dates configured by admin for this leave type.';
        }
      }
    }
    
    if (!isPermissionLeave && !isSessionalLeave && !isMaternityLeave && !formData.end_date) {
      newErrors.end_date = 'Please select an end date';
    }

    if (isPermissionLeave) {
      const permissionHours = Number(formData.permission_hours || 0);
      if (!permissionHours || permissionHours <= 0) {
        newErrors.permission_hours = 'Please enter permission hours';
      } else if (permissionHours > 2) {
        newErrors.permission_hours = 'Permission hours cannot exceed 2 per month';
      }
    }

    if (isPermissionLeave && String(formData.leave_duration || '').toLowerCase() === 'full_day') {
      newErrors.leave_duration = 'Permission leave cannot be a full day; select a session (first/second half)';
    }

    // If WFH, requested days must be at least 1 and will be checked against monthly cap at submit-time
    if (isWFHLeave) {
      // ensure start/end provided (already enforced) and single/multi-day allowed
      if (!formData.start_date) {
        newErrors.start_date = 'Please select a start date for WFH';
      }
    }
    
    if (!formData.reason.trim()) {
      newErrors.reason = 'Please provide a reason for leave';
    }
    
    // Validate date range
    const effectiveEndDateValue = isMaternityLeave ? maternityEndDate : formData.end_date;
    if (formData.start_date && effectiveEndDateValue) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(effectiveEndDateValue);
      
      if (endDate < startDate) {
        newErrors.end_date = 'End date cannot be before start date';
      }

      if (isPermissionLeave && endDate.getTime() !== startDate.getTime()) {
        newErrors.end_date = 'Permission leave must be for a single date';
      }

      if (isSessionalLeave && endDate.getTime() !== startDate.getTime()) {
        newErrors.end_date = 'Half-day leave must be for a single date';
      }
      
      // Check if dates are in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const earliestAllowedPast = new Date(today);
      earliestAllowedPast.setDate(today.getDate() - BACKFILL_WINDOW_DAYS);

      const isYesterdayBackfill = startDate.getTime() === yesterday.getTime() && endDate.getTime() === startDate.getTime();
      const isWithinBackfillWindow = startDate.getTime() >= earliestAllowedPast.getTime() && endDate.getTime() <= today.getTime();

      if (startDate < earliestAllowedPast) {
        newErrors.start_date = `Backdated leave allowed only up to ${BACKFILL_WINDOW_DAYS} days.`;
      }

      // Require minimum advance for non-exempt leave types (block next MIN_ADVANCE_DAYS for future dates)
      if (!shouldRestrictToConfiguredSlots && !isPermissionLeave && !isSickLeave && !(isYesterdayBackfill || isWithinBackfillWindow)) {
        const daysDiff = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < MIN_ADVANCE_DAYS) {
          newErrors.start_date = `This leave type must be applied at least ${MIN_ADVANCE_DAYS} days in advance`;
        }
      }

      if (startDate < today && endDate.getTime() !== startDate.getTime()) {
        newErrors.end_date = 'Backdated leave can only be applied for a single day.';
      }

      // Maternity leave cap: maximum 26 weeks total
      if (isMaternityLeave) {
        const requestedWeeks = Number(formData.maternity_weeks || 0);
        if (requestedWeeks > MAX_MATERNITY_WEEKS) {
          newErrors.end_date = `Maternity leave can be applied for a maximum of ${MAX_MATERNITY_WEEKS} weeks in total (before and after childbirth).`;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Check for selectedOrganization in localStorage
    const selectedOrganization = localStorage.getItem('selectedOrganization');
    if (!selectedOrganization) {
      setErrors({ submit: 'No organization selected. Please log in again or select an organization before applying for leave.' });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const durationTag = String(formData.leave_duration || 'full_day').toUpperCase();
      const reasonText = String(formData.reason || '').trim();
      const maternityWeeksTag = isMaternityLeave && formData.maternity_weeks
        ? `\n[MATERNITY_WEEKS:${formData.maternity_weeks}]`
        : '';
      const notesWithTags = `${reasonText}\n\n[LEAVE_DURATION:${durationTag}]${maternityWeeksTag}`.trim();

      if (isMaternityLeave && !maternityEndDate) {
        setErrors({ submit: 'Please select start date and maternity weeks.' });
        setIsSubmitting(false);
        return;
      }

      const leaveData = {
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: isMaternityLeave
          ? maternityEndDate
          : (isPermissionLeave || isSessionalLeave)
            ? formData.start_date
            : formData.end_date,
        permission_hours: isPermissionLeave ? Number(formData.permission_hours) : null,
        notes: notesWithTags
      };

      // If this is a WFH request, enforce monthly cap (2 days/month)
      if (isWFHLeave) {
        try {
          const myLeaves = await leaveAPI.getMyLeaves();
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth();

          const usedWFHDaysThisMonth = (myLeaves || []).reduce((sum, r) => {
            try {
              const lt = String(r.leave_type || '').toLowerCase();
              if (!lt.includes('work from home') && !lt.includes('wfh')) return sum;
              const status = (r.status || '').toString().toLowerCase();
              if (!['pending', 'approved'].includes(status)) return sum;
              const s = new Date(r.start_date);
              const eDate = new Date(r.end_date);
              if (s.getFullYear() !== currentYear || s.getMonth() !== currentMonth) return sum;
              // compute days (inclusive)
              const days = Math.max(0, Math.round((eDate - s) / (1000 * 60 * 60 * 24)) + 1);
              return sum + days;
            } catch (err) {
              return sum;
            }
          }, 0);

          // compute requested days
          const sReq = new Date(leaveData.start_date);
          const eReq = new Date(leaveData.end_date);
          const requestedDays = Math.max(1, Math.round((eReq - sReq) / (1000 * 60 * 60 * 24)) + 1);

          const MAX_WFH_PER_MONTH = 2;
          if (usedWFHDaysThisMonth + requestedDays > MAX_WFH_PER_MONTH) {
            setErrors({ submit: `Work From Home can be applied for up to ${MAX_WFH_PER_MONTH} day(s) per month. You have already used ${usedWFHDaysThisMonth} day(s) this month.` });
            setIsSubmitting(false);
            return;
          }
        } catch (err) {
          console.warn('Failed to validate WFH monthly cap; proceeding and letting server enforce if needed', err);
        }
      }

      // Maternity leave cap enforcement before submit (defensive check)
      if (isMaternityLeave) {
        const requestedWeeks = Number(formData.maternity_weeks || 0);
        if (requestedWeeks > MAX_MATERNITY_WEEKS) {
          setErrors({ submit: `Maternity leave can be applied for a maximum of ${MAX_MATERNITY_WEEKS} weeks in total (before and after childbirth).` });
          setIsSubmitting(false);
          return;
        }
      }

      // If this is a backfill (past dates), check calendar for holidays/conflicts first
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(leaveData.start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(leaveData.end_date);
      endDate.setHours(0, 0, 0, 0);

      if (startDate.getTime() < today.getTime()) {
        try {
          const cal = await calendarAPI.getEvents(leaveData.start_date, leaveData.end_date, user?.employee_id);
          // cal.events contains uploaded calendar holidays/events; cal.leaves contains leave records
          const calendarEvents = cal?.events || [];
          const holidayFound = calendarEvents.some(ev => {
            const t = (ev.event_type || ev.type || '').toString().toLowerCase();
            return t === 'holiday' || t === 'holidays';
          });

          if (holidayFound) {
            setErrors({ submit: 'Cannot apply backdated leave for dates marked as holidays or calendar events.' });
            setIsSubmitting(false);
            return;
          }
        } catch (err) {
          // If calendar check fails, log and allow backend to enforce rules
          console.warn('Calendar check failed, proceeding to submit and let server validate:', err);
        }
      }

      console.log('Submitting leave data:', leaveData);
      console.log('Current user:', user);
      await leaveAPI.apply(leaveData);
      onSubmit({ ...leaveData, reason: reasonText, leave_duration: formData.leave_duration });

    } catch (error) {
      console.error('Error submitting leave application:', error);
      const response = error?.response;
      let message = 'Failed to submit leave application. Please try again.';
 
      if (response) {
        // Prefer structured error message from backend
        if (response.data && (response.data.detail || response.data.message)) {
          message = response.data.detail || response.data.message;
        } else if (response.statusText) {
          message = `${response.status} ${response.statusText}`;
        } else {
          message = `Request failed with status ${response.status}`;
        }
      } else if (error?.message) {
        message = error.message;
      }
 
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMinDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-2">
      {errors.submit && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-3">
          {errors.submit}
        </div>
      )}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-blue-800">📋 Leave Application Form</h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>
      <p className="text-xs text-blue-700 mb-2">Paid Leave: one day per month accrual. Permission Required: apply only in hours.</p>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        

        {/* Leave Type */}
        <div>
          <label htmlFor="leave_type" className="block text-sm font-medium text-gray-700 mb-1">
            Leave Type *
          </label>
          <select
            id="leave_type"
            name="leave_type"
            value={formData.leave_type}
            onChange={handleInputChange}
            disabled={leaveTypes.length === 0}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
              errors.leave_type ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            {leaveTypes.length === 0 && <option value="">No leave types available</option>}
            {leaveTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          {errors.leave_type && (
            <p className="text-red-500 text-xs mt-1">{errors.leave_type}</p>
          )}
        </div>

        {isPermissionLeave && (
          <div>
            <label htmlFor="permission_hours" className="block text-sm font-medium text-gray-700 mb-1">
              Permission Hours *
            </label>
            <input
              type="number"
              id="permission_hours"
              name="permission_hours"
              min="0.5"
              max="2"
              step="0.5"
              value={formData.permission_hours}
              onChange={handleInputChange}
              placeholder="e.g., 2"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                errors.permission_hours ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.permission_hours && (
              <p className="text-red-500 text-xs mt-1">{errors.permission_hours}</p>
            )}
          </div>
        )}

        {!isMaternityLeave && (
          <div>
            <label htmlFor="leave_duration" className="block text-sm font-medium text-gray-700 mb-1">
              Leave Duration *
            </label>
            <select
              id="leave_duration"
              name="leave_duration"
              value={formData.leave_duration}
              onChange={handleInputChange}
              disabled={false}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                errors.leave_duration ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {!isPermissionLeave && <option value="full_day">Full Day</option>}
              <option value="first_half">Sessional Leave - First Half</option>
              <option value="second_half">Sessional Leave - Second Half</option>
            </select>
            {errors.leave_duration && (
              <p className="text-red-500 text-xs mt-1">{errors.leave_duration}</p>
            )}
            {isPermissionLeave && (
              <p className="text-xs text-gray-500 mt-1">Permission leave is hour-based; select a session (first/second half) and enter hours.</p>
            )}
          </div>
        )}

        {isMaternityLeave && (
          <div>
            <label htmlFor="maternity_weeks" className="block text-sm font-medium text-gray-700 mb-1">
              Maternity Leave (Weeks) *
            </label>
            <input
              type="number"
              id="maternity_weeks"
              name="maternity_weeks"
              min="1"
              max={String(MAX_MATERNITY_WEEKS)}
              step="1"
              value={formData.maternity_weeks}
              onChange={handleInputChange}
              placeholder="Enter number of weeks (max 26)"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                errors.maternity_weeks ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.maternity_weeks && (
              <p className="text-red-500 text-xs mt-1">{errors.maternity_weeks}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Maximum maternity leave allowed: {MAX_MATERNITY_WEEKS} weeks. Weekends are excluded.</p>
          </div>
        )}

        {/* Date Row */}
        {shouldRestrictToConfiguredSlots && (
          <div>
            <label htmlFor="configured_slot" className="block text-sm font-medium text-gray-700 mb-1">
              Allowed Dates (Configured By Admin) *
            </label>
            <select
              id="configured_slot"
              name="configured_slot"
              value={selectedConfiguredSlot}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                errors.start_date ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {selectedTypeConfiguredSlots.map((slot) => {
                const slotKey = getConfiguredSlotKey(slot);
                const label = slot.startDate === slot.endDate
                  ? slot.startDate
                  : `${slot.startDate} to ${slot.endDate}`;
                return (
                  <option key={slotKey} value={slotKey}>
                    {label}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-gray-500 mt-1">Only these dates are enabled for this leave type.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Start Date */}
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              id="start_date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              min={getMinDate()}
              readOnly={shouldRestrictToConfiguredSlots}
              disabled={shouldRestrictToConfiguredSlots}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                errors.start_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.start_date && (
              <p className="text-red-500 text-xs mt-1">{errors.start_date}</p>
            )}
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date *
            </label>
            <input
              type="date"
              id="end_date"
              name="end_date"
              value={isMaternityLeave ? (maternityEndDate || '') : formData.end_date}
              onChange={handleInputChange}
              min={formData.start_date || getMinDate()}
              readOnly={shouldRestrictToConfiguredSlots}
              disabled={shouldRestrictToConfiguredSlots || isPermissionLeave || isSessionalLeave || isMaternityLeave}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                errors.end_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.end_date && (
              <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>
            )}
            {isPermissionLeave && (
              <p className="text-xs text-gray-500 mt-1">Permission leave is single-day. End date will match start date.</p>
            )}
            {isSessionalLeave && !isPermissionLeave && (
              <p className="text-xs text-gray-500 mt-1">Half-day leave is single-day. End date will match start date.</p>
            )}
            {isMaternityLeave && (
              <p className="text-xs text-gray-500 mt-1">End date is auto-calculated from start date + maternity weeks (weekends excluded).</p>
            )}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            Reason for Leave *
          </label>
          <textarea
            id="reason"
            name="reason"
            value={formData.reason}
            onChange={handleInputChange}
            rows={2}
            placeholder="Please provide a brief description of why you need this leave..."
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
              errors.reason ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.reason && (
            <p className="text-red-500 text-xs mt-1">{errors.reason}</p>
          )}
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-2">
            <p className="text-red-600 text-xs">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InlineLeaveForm;

