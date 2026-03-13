// Helper to get all configured weekend holiday type names (case-insensitive)
const getConfiguredWeekendTypes = (configuredHolidayTypes) => {
  return new Set(
    (configuredHolidayTypes || [])
      .map(item => String(item?.name || '').trim().toLowerCase())
      .filter(name => name === 'weekend' || name === 'saturday' || name === 'sunday')
  );
};

// Helper to check if a holiday type is a weekend holiday (by name or config)
const isWeekendHolidayType = (type, weekendTypesSet) => {
  const t = String(type || '').toLowerCase();
  return weekendTypesSet.has(t);
};
import React, { useState, useEffect, useMemo } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import api, { calendarAPI } from '../../services/api';
import { useRealTime } from '../../contexts/RealTimeContext';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // Jan 2026
  const [leaves, setLeaves] = useState([]);
  const [configuredHolidayTypes, setConfiguredHolidayTypes] = useState([]);
  const { realTimeData } = useRealTime();

  const fetchEvents = async () => {
  try {
    // Request events for the currently visible month to match the calendar view
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

    const [res, settingsRes] = await Promise.all([
      calendarAPI.getEvents(startDate, endDate),
      api.get('/settings/').catch(() => ({ data: null }))
    ]);
    console.log("Calendar API response:", res);

    const parseJsonLike = (value) => {
      if (value == null) return null;
      if (typeof value === 'object') return value;
      if (typeof value === 'string') {
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
      }
      return null;
    };

    const normalizeHolidayTypes = (types) => {
      const list = Array.isArray(types) ? types : [];
      const map = new Map();
      list.forEach((item) => {
        if (typeof item === 'string') {
          const name = item.trim();
          if (!name) return;
          map.set(name.toLowerCase(), { name, color: '#3B82F6' });
          return;
        }
        const name = String(item?.name || item?.label || item?.type || '').trim();
        if (!name) return;
        const color = String(item?.color || item?.colour || '#3B82F6').trim() || '#3B82F6';
        map.set(name.toLowerCase(), { name, color });
      });
      return Array.from(map.values());
    };

    const parsedOtherSettings = parseJsonLike(settingsRes?.data?.other_settings) || {};
    setConfiguredHolidayTypes(normalizeHolidayTypes(parsedOtherSettings?.holiday_types));

    // Normalize leaves: backend may return leaves in `leaves` array
    // or as `events` where event_type === 'leave'. Also handle raw array responses.
    let normalized = [];

    if (Array.isArray(res)) {
      // Old clients might return an array of events
      normalized = res;
    } else if (res) {
      if (Array.isArray(res.leaves)) normalized = normalized.concat(res.leaves);
      if (Array.isArray(res.events)) {
        // Only include events explicitly created via the Leave Configuration UI
        const leaveFromEvents = res.events.filter(e => {
          const src = e.source_type || e.source || null;
          return src === 'leave_configuration' || (e.event_type && String(e.event_type).toLowerCase() === 'leave' && src === 'leave_configuration');
        });
        normalized = normalized.concat(leaveFromEvents);
      }
    }

    // Map to a predictable shape: { start: ISO, end: ISO|null, employee_name, title, raw }
    const mapped = normalized.map(r => {
      const start = r.start_date || r.start || r.date || r.startDate || null;
      const end = r.end_date || r.end || r.endDate || null;
      const status = String(r.status || '').toLowerCase();
      // Business rule: approved employee leaves should be shown in gray.
      const color = status === 'approved'
        ? '#9CA3AF'
        : (r.color || r.colour || r.backgroundColor || null);
      return {
        ...r,
        _start: start,
        _end: end,
        color,
      };
    });

    // Apply client-side fallbacks: hide events marked deleted locally and apply local edits
    const getClientDeletedIds = () => {
      try { return JSON.parse(localStorage.getItem('client_deleted_calendar_event_ids') || '[]'); } catch { return []; }
    };
    const getClientEdits = () => {
      try { return JSON.parse(localStorage.getItem('client_edited_calendar_events') || '{}'); } catch { return {}; }
    };

    const deleted = new Set(getClientDeletedIds().map(String));
    const edits = getClientEdits();

    const filtered = (mapped || []).filter(ev => {
      const sourceType = String(ev?.source_type || ev?.source || '').toLowerCase();
      const status = String(ev?.status || ev?.leave_status || '').toLowerCase();
      const isConfiguredCalendarLeave = sourceType === 'leave_configuration';

      // Show admin-configured calendar leaves always, but for employee-applied leaves
      // only include approved ones.
      if (!isConfiguredCalendarLeave && status && status !== 'approved') {
        return false;
      }

      const id = ev.event_id || ev.id || ev.eventId || ev._id;
      if (!id) return true;
      return !deleted.has(String(id));
    }).map(ev => {
      const id = ev.event_id || ev.id || ev.eventId || ev._id;
      if (id && edits[String(id)]) {
        return { ...ev, ...edits[String(id)] };
      }
      return ev;
    });

    setLeaves(filtered || []);
  } catch (err) {
    console.error("Failed to fetch calendar events", err);
  }
};


  useEffect(() => {
  fetchEvents();
 }, [currentDate]);

  useEffect(() => {
  console.log("Real-time update:", realTimeData);
    if (realTimeData?.type === "calendar_update" || realTimeData?.type === "settings_update") {
    fetchEvents();
  }
}, [realTimeData]);

  useEffect(() => {
    const handleSettingsEvent = (event) => {
      const eventType = event?.detail?.type;
      if (eventType === 'calendar_update' || eventType === 'settings_update') {
        fetchEvents();
      }
    };

    window.addEventListener('settings-update', handleSettingsEvent);
    return () => window.removeEventListener('settings-update', handleSettingsEvent);
  }, []);
 


  const navigateMonth = (dir) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const formatDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const getMonthLeaves = () => {
    if (!Array.isArray(leaves)) return [];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const weekendTypesSet = getConfiguredWeekendTypes(configuredHolidayTypes);

    // We will expand multi-day leaves into individual day entries within the month
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);

    const entries = [];

    for (const l of leaves) {
      const rawStart = l._start || l.start_date || l.start || l.date;
      if (!rawStart) continue;

      const startStr = String(rawStart).split('T')[0];
      const [sy, sm, sd] = startStr.split('-').map(x => parseInt(x, 10));
      const startDate = new Date(sy, sm - 1, sd);

      let endDate = startDate;
      const rawEnd = l._end || l.end_date || l.end;
      if (rawEnd) {
        const endStr = String(rawEnd).split('T')[0];
        const [ey, em, ed] = endStr.split('-').map(x => parseInt(x, 10));
        endDate = new Date(ey, em - 1, ed);
      }

      // clamp range to month
      const rangeStart = startDate > firstOfMonth ? startDate : firstOfMonth;
      const rangeEnd = endDate < lastOfMonth ? endDate : lastOfMonth;

      for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
        // copy date value (d will be mutated)
        const copied = new Date(d.getTime());
        // Check all possible type fields
        const leaveType = String(
          l.holiday_type ||
          l.holidayType ||
          (l.recurring_pattern && l.recurring_pattern.holiday_type) ||
          l.leave_type ||
          l.type ||
          ''
        ).toLowerCase();
        const isWeekend = copied.getDay() === 0 || copied.getDay() === 6;
        // Exclude if this is a weekend and the type is a configured weekend type
        if (isWeekend && isWeekendHolidayType(leaveType, weekendTypesSet)) continue;
        // Exclude if the type is a configured weekend type (regardless of date)
        if (isWeekendHolidayType(leaveType, weekendTypesSet)) continue;
        entries.push({ ...l, parsedDate: copied });
      }
    }

    // sort and dedupe by date
    const uniq = [];
    const seen = new Set();
    entries.sort((a, b) => a.parsedDate - b.parsedDate).forEach(e => {
      const key = formatDate(e.parsedDate);
      if (!seen.has(key)) {
        seen.add(key);
        uniq.push(e);
      }
    });

    return uniq;
  };


 const monthLeaves = getMonthLeaves();

// quick lookup set for rendering
const leaveDateSet = new Set(monthLeaves.map(l => formatDate(l.parsedDate)));
// map date -> leave entry (first one for that date)
const leaveMap = new Map(monthLeaves.map(l => [formatDate(l.parsedDate), l]));

const holidayLegendItems = useMemo(() => {
  const map = new Map();
  const weekendTypesSet = getConfiguredWeekendTypes(configuredHolidayTypes);
  (configuredHolidayTypes || []).forEach((item) => {
    const label = String(item?.name || '').trim();
    if (!label) return;
    // Exclude weekend holiday types from legend
    if (isWeekendHolidayType(label, weekendTypesSet)) return;
    map.set(label.toLowerCase(), {
      label,
      color: item?.color || '#d1d5db'
    });
  });

  (leaves || []).forEach((entry) => {
    const type = String(
      entry?.holiday_type ||
      entry?.holidayType ||
      entry?.recurring_pattern?.holiday_type ||
      ''
    ).trim();
    if (!type) return;
    if (isWeekendHolidayType(type, weekendTypesSet)) return;
    const key = type.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        label: type,
        color: entry?.color || entry?.colour || entry?.backgroundColor || '#d1d5db'
      });
    }
  });
  return Array.from(map.values());
}, [leaves, configuredHolidayTypes]);

// choose readable text color for a background hex (simple luminance)
const getTextColorForBg = (hex) => {
  if (!hex) return '#000';
  let c = String(hex).trim();
  if (c.startsWith('#')) c = c.slice(1);
  if (c.length === 3) c = c.split('').map(ch => ch+ch).join('');
  const r = parseInt(c.substr(0,2),16);
  const g = parseInt(c.substr(2,2),16);
  const b = parseInt(c.substr(4,2),16);
  // relative luminance
  const lum = 0.2126*r + 0.7152*g + 0.0722*b;
  return lum > 180 ? '#000' : '#fff';
};


  const renderMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Convert Sunday(0) → Monday(0)
    const startOffset = (firstDay.getDay() + 6) % 7;

    const weeks = [];
    let week = [];
    let weekNo = 1;

    for (let i = 0; i < startOffset; i++) week.push(null);

    for (let d = 1; d <= lastDay.getDate(); d++) {
      week.push(new Date(year, month, d));
      if (week.length === 7) {
        weeks.push({ weekNo, days: week });
        week = [];
        weekNo++;
      }
    }

    if (week.length) {
      while (week.length < 7) week.push(null);
      weeks.push({ weekNo, days: week });
    }

    return (
      <table className="w-full table-fixed border-collapse border-4 border-black text-center">
        <thead>
          <tr className="bg-[#e6e2cf] text-2xl font-bold">
            <th className="w-[6%] border-4 border-black">WK</th>
            <th className="w-[13.4%] border-4 border-black">Mon</th>
            <th className="w-[13.4%] border-4 border-black">Tue</th>
            <th className="w-[13.4%] border-4 border-black">Wed</th>
            <th className="w-[13.4%] border-4 border-black">Thu</th>
            <th className="w-[13.4%] border-4 border-black">Fri</th>
            <th className="w-[13.4%] border-4 border-black">Sat</th>
            <th className="w-[13.4%] border-4 border-black text-red-600">Sun</th>
          </tr>
        </thead>

        <tbody>
          {weeks.map((w, i) => (
            <tr key={i}>
              <td className="border-4 border-black text-blue-700 font-bold text-xl">
                {w.weekNo}
              </td>

              {w.days.map((date, j) => {
                if (!date)
                  return (
                    <td
                      key={j}
                      className="border-4 border-black h-20"
                    />
                  );

                const day = date.getDate();
                const dow = date.getDay();

                let bg = "";
                if ([15, 16].includes(day)) bg = "";
                if ([1, 26].includes(day)) bg = "";

                // mark if this date is a leave
                const dateStr = formatDate(date);
                const leave = leaveMap.get(dateStr);
                const isLeave = Boolean(leave);
                const leaveColor = leave?.color || leave?.colour || leave?.backgroundColor || null;
                const textColor = isLeave ? getTextColorForBg(leaveColor) : undefined;

                return (
                  <td
                    key={j}
                    className={`border-4 border-black h-20 text-3xl font-bold
                      ${bg}
                      ${dow === 0 ? "text-red-600" : ""}
                      ${dow === 6 ? "text-green-600" : ""}
                    `}
                    style={{ backgroundColor: isLeave ? leaveColor : undefined, color: textColor }}
                  >
                    {day}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
  <div className="min-h-screen bg-white flex">
    

    {/* RIGHT CALENDAR PANEL (75%) */}
    <div className="w-3/4 p-6">
      {/* TITLE BAR */}
      <div className="bg-[#0b2545] text-yellow-400 text-5xl font-bold text-center py-6 mb-6">
        {currentDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
      </div>

      {/* CONTROLS */}
      <div className="flex justify-between mb-4">
        <button
          onClick={() => navigateMonth(-1)}
          className="border-2 border-black p-2"
        >
          <FiChevronLeft />
        </button>

        <button
          onClick={() => navigateMonth(1)}
          className="border-2 border-black p-2"
        >
          <FiChevronRight />
        </button>
      </div>

      {/* CALENDAR TABLE */}
      {renderMonth()}
    </div>

    {/* LEFT EMPTY / CONTENT PANEL (25%) */}
    <div className="w-1/4 border-r border-gray-300 p-4 bg-gray-50">
  <h2 className="text-xl font-bold mb-4 border-b pb-2">
    Leave Days - {currentDate.toLocaleString('default', { month: 'long' })}
  </h2>

  <div className="mb-4 p-3 bg-white rounded border">
    <h3 className="text-sm font-semibold text-gray-700 mb-2">Legends</h3>
    <div className="space-y-2 text-xs">
      {holidayLegendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-sm border" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded-sm border" style={{ backgroundColor: '#9CA3AF' }} />
        <span>On Leave</span>
      </div>
    </div>
  </div>

      <div className="max-h-[50vh] overflow-y-auto pr-1">
        {monthLeaves.length === 0 ? (
          <p className="text-gray-500 text-sm">No leaves this month</p>
        ) : (
          <ul className="space-y-3">
            {monthLeaves.map((leave, idx) => (
              <li
                key={idx}
                className="p-3 bg-white rounded shadow-sm border flex items-center justify-between"
              >
                <div>
                  <div className="text-xs text-gray-500">
                    {leave.parsedDate.toLocaleDateString("en-GB")}
                  </div>
                  <div className="font-semibold">
                    {leave.leave_type || leave.type || leave.title || "Leave"}
                  </div>
                  <div className="text-xl text-gray-500">
                    {leave.reason || leave.description || ""}
                  </div>
                </div>

                <div className="ml-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-sm border" style={{ backgroundColor: leave.color || leave.colour || '#eee' }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
</div>

  </div>
);

};

export default Calendar;
