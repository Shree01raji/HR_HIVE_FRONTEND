import React, { useState, useEffect } from 'react';
import { employeeAPI, leaveAPI, payrollAPI, chatAPI, documentsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { FiUsers, FiCalendar, FiMessageSquare, FiDollarSign, FiUserPlus, FiCheckSquare, FiMonitor, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';

function DashboardCard({ title, children }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 h-72">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">
        {title}
      </h3>
      <div className="h-[85%]">
        {children}
      </div>
    </div>
  );
}


function AttendanceChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip 
          formatter={(value, name) => [`${value}%`, name]}
        />

        <Legend verticalAlign="bottom" height={36} />

        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={4}
        >
          <Cell fill="#3B82F6" />   {/* Present */}
          <Cell fill="#F87171" />   {/* Absent */}
          <Cell fill="#FBBF24" />   {/* Leave */}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}


function LeaveTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />

        {/* Total - Blue */}
        <Line
          type="monotone"
          dataKey="total"
          stroke="#2563EB"
          strokeWidth={3}
          dot={{ r: 4 }}
          name="Total"
        />

        {/* Approved - Green */}
        <Line
          type="monotone"
          dataKey="approved"
          stroke="#16A34A"
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Approved"
        />

        {/* Pending - Orange */}
        <Line
          type="monotone"
          dataKey="pending"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Pending"
        />

        {/* Rejected - Red */}
        <Line
          type="monotone"
          dataKey="rejected"
          stroke="#DC2626"
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Rejected"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}



function DepartmentChart({ data }) {
  const colors = ['#6366F1','#22C55E','#F59E0B','#EF4444','#8B5CF6'];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip 
          formatter={(value, name) => [`${value}`, name]}
        />

        <Legend verticalAlign="bottom" height={36} />

        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          outerRadius={80}
          paddingAngle={3}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}



function OnboardingChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />

        {/* Completed */}
        <Bar
          dataKey="completed"
          fill="#16A34A"
          radius={[4, 4, 0, 0]}
          name="Completed"
        />

        {/* Pending */}
        <Bar
          dataKey="pending"
          fill="#F59E0B"
          radius={[4, 4, 0, 0]}
          name="Pending"
        />

        {/* Rejected */}
        <Bar
          dataKey="rejected"
          fill="#DC2626"
          radius={[4, 4, 0, 0]}
          name="Rejected"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}






export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeaves: 0,
    activeChatSessions: 0,
    pendingPayroll: 0,
    verifiedDocuments: 0,
    pendingVerifications: 0,
    onboardingInProgress: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const birthdayEmployees = [
  { id: 1, name: 'Arun Kumar' },
  { id: 2, name: 'Priya Sharma' },
  { id: 3, name: 'Rahul Verma' },
];

const attendanceData = [
  { name: "Present", value: 82 },
  { name: "Absent", value: 10 },
  { name: "On Leave", value: 8 }
];


const leaveTrendData = [
  { month: "Jan", approved: 8, rejected: 2, pending: 2, total: 12 },
  { month: "Feb", approved: 12, rejected: 3, pending: 3, total: 18 },
  { month: "Mar", approved: 6, rejected: 1, pending: 3, total: 10 },
  { month: "Apr", approved: 15, rejected: 2, pending: 5, total: 22 }
];



const departmentData = [
  { name: "Finance", value: 12 },
  { name: "Development", value: 25 },
  { name: "Design", value: 8 },
  { name: "HR", value: 15 },
  { name: "QA", value: 10 }
];


const onboardingData = [
  { month: "Jan", completed: 15, pending: 5, rejected: 2 },
  { month: "Feb", completed: 22, pending: 8, rejected: 3 },
  { month: "Mar", completed: 18, pending: 4, rejected: 1 },
  { month: "Apr", completed: 25, pending: 6, rejected: 2 }
];





  useEffect(() => {
    fetchDashboardData();
  }, []);


  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add error handling and timeouts
      const fetchWithTimeout = async (promise, timeout = 5000) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
          const response = await promise;
          clearTimeout(timeoutId);
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      };

      // Check if organization slug is set
      const selectedOrg = localStorage.getItem('selectedOrganization');
      console.log('[Dashboard] selectedOrganization from localStorage:', selectedOrg);
      if (!selectedOrg) {
        console.error('[Dashboard] ⚠️ WARNING: No selectedOrganization in localStorage!');
        console.error('[Dashboard] This will cause API calls to fail or return empty data.');
        setError('Organization not selected. Please log out and log back in.');
      }

      const [employees, leaves, sessions, docStats] = await Promise.all([
        fetchWithTimeout(employeeAPI.getAll()).catch((err) => {
          console.error('[Dashboard] ❌ Error fetching employees:', err);
          console.error('[Dashboard] Error details:', {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message
          });
          return [];
        }),
        fetchWithTimeout(leaveAPI.getPending()).catch((err) => {
          console.error('[Dashboard] ❌ Error fetching pending leaves:', err);
          console.error('[Dashboard] Error details:', {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message
          });
          return [];
        }),
        fetchWithTimeout(chatAPI.getSessions()).catch((err) => {
          console.error('[Dashboard] ❌ Error fetching chat sessions:', err);
          console.error('[Dashboard] Error details:', {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message
          });
          return [];
        }),
        fetchWithTimeout(documentsAPI.getDocumentStats()).catch((err) => {
          console.error('[Dashboard] ❌ Error fetching document stats:', err);
          console.error('[Dashboard] Error details:', {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message
          });
          return { verifiedDocuments: 0, pendingVerifications: 0, onboardingInProgress: 0, total_employees: 0 };
        })
      ]);

      console.log('[Dashboard] ✅ Fetched data:', {
        employees: employees?.length || 0,
        leaves: leaves?.length || 0,
        sessions: sessions?.length || 0,
        docStats: docStats
      });
      
      // Log detailed response data for debugging
      console.log('[Dashboard] 📊 Detailed data:', {
        employees: employees,
        leaves: leaves,
        sessions: sessions,
        docStats: docStats
      });
      
      // Check if all data is empty
      if ((!employees || employees.length === 0) && 
          (!leaves || leaves.length === 0) && 
          (!sessions || sessions.length === 0)) {
        console.warn('[Dashboard] ⚠️ All data is empty. This might mean:');
        console.warn('   1. The tenant database has no data yet');
        console.warn('   2. The user is not in the tenant database');
        console.warn('   3. API calls are failing silently');
        console.warn('   Check the Network tab for API response details.');
      }

      // Ensure all responses are arrays
      const safeEmployees = Array.isArray(employees) ? employees : [];
      const safeLeaves = Array.isArray(leaves) ? leaves : [];
      const safeSessions = Array.isArray(sessions) ? sessions : [];

      setStats({
        totalEmployees: safeEmployees.length,
        pendingLeaves: safeLeaves.length,
        activeChatSessions: safeSessions.length,
        pendingPayroll: 0,
        verifiedDocuments: docStats?.verified_documents || 0,
        pendingVerifications: docStats?.pending_verifications || 0,
        onboardingInProgress: docStats?.onboarding_in_progress || 0
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(
        err.response?.data?.detail || 
        'Failed to load dashboard data. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // HR_MANAGER always gets blue admin panel, not department panel
  // Department filtering is disabled - all HR managers have full access
  const isDepartmentHR = false; // Always false - HR managers use admin panel

  return (
    <div
      className={`h-full p-6 space-y-6 overflow-y-auto ${
      isDepartmentHR ? 'bg-[#e8f0f5]' : 'bg-[#eef4fa]'}`}>
      {/* Header Section - Professional */}
      {/* <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 animate-in fade-in-0 slide-in-from-top-4 duration-500"> */}
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                isDepartmentHR
                  ? 'bg-gradient-to-r from-gray-700 to-slate-700'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500'
              }`}>
                <FiUsers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Welcome back, {user?.first_name || 'Admin'}! 👋
                </h1>
                <p className="text-gray-600 font-medium">
                  {user?.department && user?.role?.toLowerCase() === 'hr_manager' ? (
                    <>
                      
                      <span className="text-gray-600">Manage your department • Employees • Payroll • Timesheets • Learning</span>
                    </>
                  ) : (
                    <>Manage your workforce • Track recruitment • Monitor payroll • Oversee operations</>
                  )}
                </p>
              </div>
            </div>
          </div>
          {/* <button
            onClick={fetchDashboardData}
            className={`group relative text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:opacity-50 ${
              isDepartmentHR
                ? 'bg-gradient-to-r from-gray-700 to-slate-700 hover:from-gray-800 hover:to-slate-800'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
            }`}
            disabled={loading}
          >
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}>
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FiUsers className="w-4 h-4" />
                )}
              </div>
              <span className="font-semibold">{loading ? 'Loading...' : 'Refresh'}</span>
            </div>
          </button> */}
        </div>
      {/* </div> */}

      {/* Error Display - Professional */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-2xl p-4 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-800">Connection Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid - Clean Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 auto-rows-fr">
        {/* Stats Cards - 3 columns */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              title="Employees"
              value={stats.totalEmployees}
              icon={<FiUsers className="w-5 h-5" />}
              loading={loading}
              color={isDepartmentHR ? "bg-gray-500" : "bg-blue-500"}
              // trend="+5%"
            />
            <StatCard
              title="Pending Leaves"
              value={stats.pendingLeaves}
              icon={<FiCalendar className="w-5 h-5" />}
              loading={loading}
              color="bg-yellow-500"
              // trend="3 urgent"
            />
            {/* <StatCard
              title="Active Chats"
              value={stats.activeChatSessions}
              icon={<FiMessageSquare className="w-5 h-5" />}
              loading={loading}
              color="bg-green-500"
              trend="2 new"
            /> */}
            {/* <StatCard
              title="Pending Payroll"
              value={stats.pendingPayroll}
              icon={<FiDollarSign className="w-5 h-5" />}
              loading={loading}
              color="bg-purple-500"
              trend="5 days"
            /> */}
            {/* <StatCard
              title="✅ Verified Documents"
              value={stats.verifiedDocuments}
              icon={<FiCheckCircle className="w-5 h-5" />}
              loading={loading}
              color="bg-green-500"
              trend={`${stats.totalEmployees > 0 ? Math.round((stats.verifiedDocuments / (stats.totalEmployees * 4)) * 100) : 0}% complete`}
            /> */}
            <StatCard
              title="⚠️ Pending Verifications"
              value={stats.pendingVerifications}
              icon={<FiAlertCircle className="w-5 h-5" />}
              loading={loading}
              color="bg-yellow-500"
              // trend="Needs review"
            />
            <StatCard
              title="⏳ Onboarding in Progress"
              value={stats.onboardingInProgress}
              icon={<FiClock className="w-5 h-5" />}
              loading={loading}
              color="bg-blue-500"
              // trend="Active"
            />
          </div>
        </div>

        {/* Quick Actions - Right Side */}
        <div className="lg:col-span-1 ">
          <div className="h-full flex flex-col bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 animate-in fade-in-0 slide-in-from-right-4 duration-500 delay-100 ">
          <div className="flex items-center space-x-3 mb-6">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDepartmentHR
                  ? 'bg-gradient-to-r from-gray-500 to-slate-500'
                  : 'bg-gradient-to-r from-blue-900 to-blue-400'
              }`}>
              <FiUserPlus className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
          </div>
            <div className="space-y-2">
            <QuickActionCard
              title="Add Employee"
              // description="Create new employee"
              icon={<FiUserPlus className="w-5 h-5" />}
              link="/admin/employees/new"
                isDepartmentHR={isDepartmentHR}
            />
            <QuickActionCard
              title="Approve Leaves"
              // description="Review requests"
              icon={<FiCheckSquare className="w-5 h-5" />}
              link="/admin/leaves"
                isDepartmentHR={isDepartmentHR}
            />
            <QuickActionCard
              title="Monitor Chats"
              // description="View sessions"
              icon={<FiMonitor className="w-5 h-5" />}
              link="/admin/chats"
                isDepartmentHR={isDepartmentHR}
            />
          </div>
        </div>
        </div>

        

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
     <div className="relative w-full h-36 overflow-hidden bg-white">
      <div className="animate-birthday-scroll h-96" style={{display: 'flex', flexDirection: 'column', willChange: 'transform'}}>
        {[...birthdayEmployees, ...birthdayEmployees, ...birthdayEmployees].map((emp, idx) => (
          <div
            key={idx}
            className="h-16 flex-shrink-0 flex items-center gap-3 bg-pink-50 border border-pink-200 rounded-xl p-2 mb-2"
          >
        <div className="w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center text-sm font-bold">
          {emp.name[0]}
        </div>
        <div>
          <p className="text-sm font-semibold">{emp.name}</p>
          <p className="text-xs">🎉 Birthday Today</p>
        </div>
      </div>
     ))}
     </div>
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
    <DepartmentChart data={departmentData} />
  </DashboardCard>

  <DashboardCard title="Onboarding Status">
    <OnboardingChart data={onboardingData} />
  </DashboardCard>

</div>


    </div>
  );
}  



function StatCard({ title, value, icon, loading, color, trend }) {
  const colorClasses = {
    'bg-blue-500': 'from-violet-500 to-violet-600',
    'bg-gray-500': 'from-gray-500 to-gray-600',
    'bg-yellow-500': 'from-yellow-500 to-orange-500',
    'bg-green-500': 'from-green-500 to-emerald-500',
    'bg-purple-500': 'from-purple-500 to-indigo-500'
  };

  const gradientClass = colorClasses[color] || 'from-blue-500 to-blue-600';

  return (
    <div className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl border border-white/20 p-6 transition-all duration-300 hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-r ${gradientClass} shadow-lg group-hover:shadow-xl transition-all duration-300`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
        {loading ? (
          <div className="animate-pulse h-4 w-16 bg-gray-200 rounded-full"></div>
        ) : (
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{trend}</span>
        )}
      </div>
      <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">{title}</h3>
      {loading ? (
        <div className="animate-pulse h-8 w-20 bg-gray-200 rounded-lg"></div>
      ) : (
        <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{value}</p>
      )}
    </div>
  );
}

  
function QuickActionCard({ title, description, icon, link, isDepartmentHR = false }) {
  return (
    <Link
      to={link}
      className={`group block p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105 border border-gray-200 ${
        isDepartmentHR 
          ? 'hover:from-gray-100 hover:to-slate-100 hover:border-gray-300'
          : 'hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200'
      }`}
    >
      <div className="flex items-center mb-3">
        <div className={`p-2 rounded-lg text-white group-hover:shadow-lg transition-all duration-300 ${
          isDepartmentHR
            ? 'bg-gradient-to-r from-gray-500 to-slate-500'
            : 'bg-gradient-to-r from-blue-500 to-indigo-500'
        }`}>
          {icon}
        </div>
        <h3 className={`text-sm font-bold text-gray-900 ml-3 transition-colors ${
          isDepartmentHR
            ? 'group-hover:text-gray-700'
            : 'group-hover:text-blue-700'
        }`}>{title}</h3>
      </div>
      <p className="text-xs text-gray-600 group-hover:text-gray-700 transition-colors">{description}</p>
    </Link>
  );
}


