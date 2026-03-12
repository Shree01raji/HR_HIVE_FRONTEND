import React, { useEffect, useMemo, useState } from 'react';
import { managerAPI } from '../../services/api';

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

const formatTime = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDurationFromMinutes = (minutes) => {
  const safe = Number(minutes);
  if (!Number.isFinite(safe) || safe <= 0) return '0m';
  const hrs = Math.floor(safe / 60);
  const mins = Math.round(safe % 60);
  if (hrs <= 0) return `${mins}m`;
  if (mins <= 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

const pick = (...values) => {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
};

export default function Timesheet() {
  const [entries, setEntries] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const teamMap = useMemo(() => {
    const map = new Map();
    team.forEach((member) => {
      map.set(member.employee_id, `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email);
    });
    return map;
  }, [team]);

  const normalizedRows = useMemo(() => {
    return (entries || []).map((entry, index) => {
      const loginTime = pick(entry.login_time, entry.first_login, entry.start_time, entry.clock_in_time, entry.clock_in_at, entry.current_session_start);
      const logoutTime = pick(entry.logout_time, entry.last_logout, entry.end_time, entry.clock_out_time, entry.clock_out_at);
      const breakMinutes = pick(entry.break_duration, entry.break_minutes, entry.total_break_minutes, entry.break_time_minutes, entry.total_break_time);
      const workedHours = pick(entry.total_hours, entry.work_hours, entry.working_hours, entry.duration_hours);

      return {
        key: entry.entry_id || entry.id || `${entry.employee_id || 'emp'}-${entry.date || entry.attendance_date || index}`,
        employeeId: entry.employee_id,
        date: pick(entry.date, entry.attendance_date, entry.work_date, entry.entry_date),
        loginTime,
        logoutTime,
        breakMinutes,
        workedHours,
        status: pick(entry.status, entry.attendance_status, entry.session_status) || '-',
      };
    });
  }, [entries]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reports, data] = await Promise.all([
        managerAPI.getDirectReports(),
        managerAPI.getTeamTimesheets(startDate || null, endDate || null)
      ]);
      setTeam(reports || []);
      setEntries(data || []);
    } catch (err) {
      console.error('Failed to load team attendance:', err);
      setError('Failed to load attendance entries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div className="text-gray-600">Loading attendance...</div>;
  }

  if (error) {
    return <div className="bg-white p-4 rounded-lg shadow-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Team Attendance</h1>
        <p className="text-sm text-gray-600">View your team login time, logout time, and break time.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-[#181c52] text-white rounded-md text-sm hover:bg-[#2c2f70]"
        >
          Apply
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Login Time</th>
              <th className="px-4 py-3 text-left">Logout Time</th>
              <th className="px-4 py-3 text-left">Break Taken</th>
              <th className="px-4 py-3 text-left">Worked Hours</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {normalizedRows.length === 0 && (
              <tr>
                <td colSpan="8" className="px-4 py-6 text-center text-gray-500">
                  No attendance entries found.
                </td>
              </tr>
            )}
            {normalizedRows.map((entry) => {
              return (
                <tr className="border-t" key={entry.key}>
                  <td className="px-4 py-3">
                    {teamMap.get(entry.employeeId) || `Employee #${entry.employeeId}`}
                  </td>
                  <td className="px-4 py-3">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3">{formatTime(entry.loginTime)}</td>
                  <td className="px-4 py-3">{formatTime(entry.logoutTime)}</td>
                  <td className="px-4 py-3">{formatDurationFromMinutes(entry.breakMinutes)}</td>
                  <td className="px-4 py-3">{Number(entry.workedHours || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">{entry.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
