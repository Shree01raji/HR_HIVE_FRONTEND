import React, { useState, useEffect } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { calendarAPI } from '../../services/api';
import { useRealTime } from '../../contexts/RealTimeContext';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // Jan 2026
  const [leaves, setLeaves] = useState([]);
  const { realTimeData } = useRealTime();

  const fetchEvents = async () => {
  try {
    // Request events for the currently visible month to match the calendar view
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

    const res = await calendarAPI.getEvents(startDate, endDate);
    console.log("Calendar API response:", res);

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
      return {
        ...r,
        _start: start,
        _end: end,
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
  if (realTimeData?.type === "calendar_update") {
    fetchEvents();
  }
}, [realTimeData]);
 


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
);

};

export default Calendar;
