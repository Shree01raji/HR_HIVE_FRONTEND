import React, { useState, useEffect } from 'react';
import { leaveAPI, onboardingAPI, chatAPI, employeeAPI } from '../../services/api';
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
  FiMoreVertical
} from 'react-icons/fi';
import CalendarWidget from '../../components/employee/CalendarWidget';
import ConnectionStatus from '../../components/ConnectionStatus';

export default function EmployeeDashboard() {
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
  const [leaveBalance, setLeaveBalance] = useState({
    annual: { used: 10, total: 60 },
    sick: { used: 0, total: 10 },
    compassionate: { used: 8, total: 15 }
  });
  const [todos, setTodos] = useState([]);
  const [managerName, setManagerName] = useState('');
  const [employeeData, setEmployeeData] = useState(null);

  const birthdayEmployees = [
  { id: 1, name: 'Arun Kumar' },
  { id: 2, name: 'Priya Sharma' },
  { id: 3, name: 'Rahul Verma' },
];

  useEffect(() => {
    if (user?.employee_id) {
      fetchEmployeeData();
      fetchDashboardData();
    }
  }, [user?.employee_id]); // Only re-fetch when employee_id changes

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
      
      const [leaves, chats, tasks] = await Promise.all([
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
        })
      ]);

      console.log('Dashboard data received:', { leaves, chats, tasks });

      // Ensure all data is arrays before filtering
      const safeLeaves = Array.isArray(leaves) ? leaves : [];
      const safeChats = Array.isArray(chats) ? chats : [];
      const safeTasks = Array.isArray(tasks) ? tasks : [];

      setStats({
        leaveBalance: 20, // Mock data - you can get this from API
        pendingLeaves: safeLeaves.filter(l => l?.status === 'PENDING').length,
        activeChats: safeChats.length,
        completedTasks: safeTasks.filter(t => t?.status === 'COMPLETED').length
      });

      // Update leave balance from actual data
      const annualUsed = safeLeaves.filter(l => l?.leave_type === 'Annual' || l?.leave_type === 'ANNUAL').length;
      const sickUsed = safeLeaves.filter(l => l?.leave_type === 'Sick' || l?.leave_type === 'SICK').length;
      setLeaveBalance({
        annual: { used: annualUsed || 10, total: 60 },
        sick: { used: sickUsed || 0, total: 10 },
        compassionate: { used: 8, total: 15 }
      });
      
      // Fetch todos
      setTodos(safeTasks.slice(0, 5).map(task => ({
        id: task.id,
        title: task.title || task.name || 'Task',
        completed: task.status === 'COMPLETED'
      })));
      
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
          {/* Quick Actions Section */}
          <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/employee/leaves')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition-colors text-sm"
          >
            Apply for Leave
          </button>
          <button
            onClick={() => navigate('/employee/payroll')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition-colors text-sm"
          >
            View Payslip
          </button>
          <button
            onClick={() => navigate('/employee/profile')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition-colors text-sm"
          >
            Update Profile
          </button>
          <button
            onClick={() => navigate('/employee/expenses')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-3 rounded-lg font-medium transition-colors text-sm"
          >
            Expenses
          </button>
        </div>
      </div>

          {/* Available Leave Days Card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Available Leave Days</h3>
              <button className="text-gray-400 hover:text-gray-600">
                <FiMoreVertical className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Annual Leave */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700">Annual Leave</span>
                  <span className="text-gray-600">{leaveBalance.annual.used} of {leaveBalance.annual.total} day(s)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-[#1e3a5f] h-2.5 rounded-full" 
                    style={{ width: `${(leaveBalance.annual.used / leaveBalance.annual.total) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Sick Leave */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700">Sick Leave</span>
                  <span className="text-gray-600">{leaveBalance.sick.used} of {leaveBalance.sick.total} day(s)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-gray-300 h-2.5 rounded-full" 
                    style={{ width: `${(leaveBalance.sick.used / leaveBalance.sick.total) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Compassionate Leave */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700">Compassionate Leave</span>
                  <span className="text-gray-600">{leaveBalance.compassionate.used} of {leaveBalance.compassionate.total} day(s)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-[#1e3a5f] h-2.5 rounded-full" 
                    style={{ width: `${(leaveBalance.compassionate.used / leaveBalance.compassionate.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
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
      </div>
    </div>
  );
}
