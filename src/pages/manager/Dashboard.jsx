import React, { useEffect, useMemo, useState } from 'react';
import { FiUsers, FiCalendar, FiShoppingBag, FiCreditCard, FiPieChart, FiUserPlus, FiCheckSquare, FiMonitor } from 'react-icons/fi';
import { managerAPI } from '../../services/api';
import {
  StatCard,
  QuickActionCard,
  DashboardCard,
  AttendanceChart,
  LeaveTrendChart,
  DepartmentChart,
  OnboardingChart
} from '../admin/Dashboard';

const toArray = (value) => (Array.isArray(value) ? value : []);

const statusEq = (value, expected) => String(value || '').toUpperCase() === expected;

const monthLabel = (date) =>
  new Date(date).toLocaleString('en-US', {
    month: 'short'
  });

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [teamTimesheets, setTeamTimesheets] = useState([]);
  const [sendingWishes, setSendingWishes] = useState({});
  const [wishedEmployees, setWishedEmployees] = useState({});

  const [stats, setStats] = useState({
    teamSize: 0,
    pendingLeaves: 0,
    pendingExpenses: 0,
    pendingReimbursements: 0,
    pendingDeclarations: 0
  });

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        directReports,
        allLeaves,
        pendingLeaves,
        allExpenses,
        allReimbursements,
        declarations,
        timesheets
      ] = await Promise.all([
        managerAPI.getDirectReports().catch(() => []),
        managerAPI.getTeamLeaves().catch(() => []),
        managerAPI.getTeamPendingLeaves().catch(() => []),
        managerAPI.getTeamExpenses().catch(() => []),
        managerAPI.getTeamReimbursements().catch(() => []),
        managerAPI.getTeamInvestmentDeclarations().catch(() => []),
        managerAPI.getTeamTimesheets().catch(() => [])
      ]);

      const safeReports = toArray(directReports);
      const safeAllLeaves = toArray(allLeaves);
      const safePendingLeaves = toArray(pendingLeaves);
      const safeExpenses = toArray(allExpenses);
      const safeReimbursements = toArray(allReimbursements);
      const safeDeclarations = toArray(declarations);
      const safeTimesheets = toArray(timesheets);

      const pendingExpenses = safeExpenses.filter((item) => statusEq(item.status, 'PENDING')).length;
      const pendingReimbursements = safeReimbursements.filter((item) => statusEq(item.status, 'PENDING')).length;
      const pendingDeclarations = safeDeclarations.filter((item) => {
        const status = String(item.status || item.verification_status || '').toUpperCase();
        return !status || status === 'PENDING' || status === 'SUBMITTED' || status === 'UNDER_REVIEW';
      }).length;

      setTeamMembers(safeReports);
      setTeamLeaves(safeAllLeaves);
      setTeamTimesheets(safeTimesheets);

      setStats({
        teamSize: safeReports.length,
        pendingLeaves: safePendingLeaves.length,
        pendingExpenses,
        pendingReimbursements,
        pendingDeclarations
      });
    } catch (err) {
      console.error('[ManagerDashboard] Error fetching team data', err);
      setError('Failed to load team overview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const birthdaysToday = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const date = now.getDate();

    return teamMembers
      .filter((member) => {
        const dobValue = member.date_of_birth || member.dob || member.birth_date;
        if (!dobValue) return false;
        const dob = new Date(dobValue);
        return dob.getMonth() + 1 === month && dob.getDate() === date;
      })
      .map((member, index) => ({
        id: member.employee_id || member.id || index,
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email || 'Team Member'
      }));
  }, [teamMembers]);

  const handleSendBirthdayWish = async (employee) => {
    if (!employee?.id || sendingWishes[employee.id] || wishedEmployees[employee.id]) {
      return;
    }

    setSendingWishes((prev) => ({ ...prev, [employee.id]: true }));
    try {
      await managerAPI.sendBirthdayWish(
        employee.id,
        `🎉 Happy Birthday ${employee.name}! Wishing you a fantastic year ahead from your manager.`
      );
      setWishedEmployees((prev) => ({ ...prev, [employee.id]: true }));
    } catch (err) {
      console.error('[ManagerDashboard] Error sending birthday wish', err);
      setError(err.response?.data?.detail || 'Failed to send birthday wish. Please try again.');
    } finally {
      setSendingWishes((prev) => ({ ...prev, [employee.id]: false }));
    }
  };

  const attendanceData = useMemo(() => {
    const teamSize = teamMembers.length;

    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);

    const onLeaveIds = new Set(
      teamLeaves
        .filter((leave) => {
          if (!statusEq(leave.status, 'APPROVED')) return false;
          const start = leave.start_date ? new Date(leave.start_date) : null;
          const end = leave.end_date ? new Date(leave.end_date) : null;
          if (!start || !end) return false;
          const startKey = start.toISOString().slice(0, 10);
          const endKey = end.toISOString().slice(0, 10);
          return todayKey >= startKey && todayKey <= endKey;
        })
        .map((leave) => leave.employee_id)
    );

    const presentIds = new Set(
      teamTimesheets
        .filter((entry) => {
          const entryDate = entry.date || entry.entry_date;
          if (!entryDate) return false;
          return new Date(entryDate).toISOString().slice(0, 10) === todayKey;
        })
        .map((entry) => entry.employee_id)
    );

    const onLeaveCount = onLeaveIds.size;
    const presentCount = Math.min(Math.max(presentIds.size, 0), Math.max(teamSize - onLeaveCount, 0));
    const absentCount = Math.max(teamSize - presentCount - onLeaveCount, 0);

    return [
      { name: 'Present', value: presentCount },
      { name: 'Absent', value: absentCount },
      { name: 'On Leave', value: onLeaveCount }
    ];
  }, [teamMembers, teamLeaves, teamTimesheets]);

  const leaveTrendData = useMemo(() => {
    const now = new Date();
    const months = [3, 2, 1, 0].map((offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return {
        key,
        month: monthLabel(date),
        approved: 0,
        pending: 0,
        rejected: 0,
        total: 0
      };
    });

    const monthMap = new Map(months.map((m) => [m.key, m]));

    teamLeaves.forEach((leave) => {
      const baseDate = leave.start_date || leave.created_at || leave.updated_at;
      if (!baseDate) return;
      const parsed = new Date(baseDate);
      if (Number.isNaN(parsed.getTime())) return;

      const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthMap.get(key);
      if (!bucket) return;

      const status = String(leave.status || '').toUpperCase();
      if (status === 'APPROVED') bucket.approved += 1;
      else if (status === 'REJECTED') bucket.rejected += 1;
      else bucket.pending += 1;
      bucket.total += 1;
    });

    return months;
  }, [teamLeaves]);

  const departmentData = useMemo(() => {
    const counts = new Map();

    teamMembers.forEach((member) => {
      const dept = member.department || member.department_name || 'Unassigned';
      counts.set(dept, (counts.get(dept) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [teamMembers]);

  const onboardingData = useMemo(() => {
    const now = new Date();
    const months = [3, 2, 1, 0].map((offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      return {
        month: monthLabel(date),
        completed: 0,
        pending: 0,
        rejected: 0
      };
    });

    const monthKeys = [3, 2, 1, 0].map((offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    });

    const indexByKey = new Map(monthKeys.map((key, idx) => [key, idx]));

    teamMembers.forEach((member) => {
      const baseDate = member.joining_date || member.created_at || member.hire_date;
      if (!baseDate) return;
      const parsed = new Date(baseDate);
      if (Number.isNaN(parsed.getTime())) return;

      const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
      const idx = indexByKey.get(key);
      if (idx === undefined) return;

      const status = String(member.onboarding_status || member.status || '').toUpperCase();
      if (status === 'COMPLETED' || status === 'ACTIVE') months[idx].completed += 1;
      else if (status === 'REJECTED') months[idx].rejected += 1;
      else months[idx].pending += 1;
    });

    return months;
  }, [teamMembers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600">
        Loading team overview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="h-full p-6 space-y-6 overflow-y-auto bg-[#eef4fa]">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-r from-green-500 to-emerald-500">
              <FiUsers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Team Overview
              </h1>
              <p className="text-gray-600 font-medium">
                Team-only summary • Leaves • Expenses • Reimbursements • Declarations
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 auto-rows-fr">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Direct Reports"
              value={stats.teamSize}
              icon={<FiUsers className="w-5 h-5" />}
              loading={loading}
              color="bg-blue-500"
            />
            <StatCard
              title="Pending Leaves"
              value={stats.pendingLeaves}
              icon={<FiCalendar className="w-5 h-5" />}
              loading={loading}
              color="bg-yellow-500"
            />
            <StatCard
              title="Pending Expenses"
              value={stats.pendingExpenses}
              icon={<FiShoppingBag className="w-5 h-5" />}
              loading={loading}
              color="bg-green-500"
            />
            <StatCard
              title="Pending Reimbursements"
              value={stats.pendingReimbursements}
              icon={<FiCreditCard className="w-5 h-5" />}
              loading={loading}
              color="bg-purple-500"
            />
            {/* <StatCard
              title="Pending Declarations"
              value={stats.pendingDeclarations}
              icon={<FiPieChart className="w-5 h-5" />}
              loading={loading}
              color="bg-gray-500"
            /> */}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="h-full flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 animate-in fade-in-0 slide-in-from-right-4 duration-500 delay-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-r from-blue-900 to-blue-400">
                <FiUserPlus className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
            </div>
            <div className="space-y-2">
              <QuickActionCard
                title="Approve Leaves"
                icon={<FiCheckSquare className="w-5 h-5" />}
                link="/manager/leaves"
              />
              <QuickActionCard
                title="Review Attendance"
                icon={<FiCalendar className="w-5 h-5" />}
                link="/manager/attendance"
              />
              <QuickActionCard
                title="Monitor Chats"
                icon={<FiMonitor className="w-5 h-5" />}
                link="/manager/chat"
              />
              {/* <QuickActionCard
                title="Review Expenses"
                icon={<FiShoppingBag className="w-5 h-5" />}
                link="/manager/expenses"
              /> */}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="h-full flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="flex items-center space-x-3 mb-4 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center">
                🎂
              </div>
              <h2 className="text-sm font-bold text-gray-900">Birthdays Today</h2>
            </div>

            <div className="w-full bg-white space-y-2">
              {birthdaysToday.length > 0 ? (
                birthdaysToday.map((emp, idx) => (
                    <div
                      key={`${emp.id}-${idx}`}
                      className="h-16 flex items-center gap-3 bg-pink-50 border border-pink-200 rounded-xl p-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center text-sm font-bold">
                        {emp.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{emp.name}</p>
                        <p className="text-xs">🎉 Birthday Today</p>
                      </div>
                      <button
                        onClick={() => handleSendBirthdayWish(emp)}
                        disabled={!emp.id || sendingWishes[emp.id] || wishedEmployees[emp.id]}
                        className="text-xs bg-pink-500 hover:bg-pink-600 text-white px-2 py-1 rounded-md disabled:opacity-60"
                      >
                        {sendingWishes[emp.id] ? 'Sending...' : wishedEmployees[emp.id] ? 'Wished' : 'Send Wish'}
                      </button>
                    </div>
                  ))
              ) : (
                <div className="h-16 flex items-center justify-center text-sm text-gray-500 bg-pink-50 border border-pink-200 rounded-xl p-2">
                  No birthdays in your team today
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <DashboardCard title="Attendance Overview">
          <AttendanceChart data={attendanceData} />
        </DashboardCard>

        <DashboardCard title="Leave Trend">
          <LeaveTrendChart data={leaveTrendData} />
        </DashboardCard>

        <DashboardCard title="Department Distribution">
          <DepartmentChart data={departmentData.length > 0 ? departmentData : [{ name: 'Team', value: stats.teamSize }]} />
        </DashboardCard>

        <DashboardCard title="Onboarding Status">
          <OnboardingChart data={onboardingData} />
        </DashboardCard>
      </div>
    </div>
  );
}
