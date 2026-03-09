import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useFeatureToggle } from '../../contexts/FeatureToggleContext';
import { useRealTime } from '../../contexts/RealTimeContext';
import PanelSwitcher from '../common/PanelSwitcher';
import api from '../../services/api';
import Logo from '../Logo';
import {
  FiHome,
  FiUsers,
  FiCalendar,
  FiDollarSign,
  FiBriefcase,
  FiSettings,
  FiBarChart,
  FiMessageSquare,
  FiShield,
  FiCheckCircle,
  FiClock,
  FiTarget,
  FiFileText,
  FiFolder,
  FiBookOpen,
  FiHeart,
  FiTrendingUp,
  FiActivity,
  FiLayers,
  FiEye,
  FiLogOut,
  FiUser,
  FiGitBranch,
  FiMenu,
  FiX
} from 'react-icons/fi';

const menuItems = [
  // Dashboard always stays at the top
  { 
    path: '/admin', 
    icon: FiHome, 
    label: 'Dashboard',
    description: 'Overview & Analytics'
  },
  // All other items in alphabetical order
  { 
    path: '/admin/agents', 
    icon: FiActivity, 
    label: 'Agent Monitoring',
    description: 'AI Agents Performance'
  },
  { 
    path: '/admin/analytics', 
    icon: FiBarChart, 
    label: 'Analytics',
    description: 'Reports & Insights'
  },
  { 
    path: '/admin/chats', 
    icon: FiMessageSquare, 
    label: 'Chat Monitor',
    description: 'AI Agent Conversations'
  },
  { 
    path: '/admin/compliance', 
    icon: FiFileText, 
    label: 'Compliance',
    description: 'Reports & Audit Logs'
  },
  { 
    path: '/admin/documents', 
    icon: FiFolder, 
    label: 'Documents',
    description: 'Employee Document Management'
  },
  { 
    path: '/admin/employees', 
    icon: FiUsers, 
    label: 'Employees',
    description: 'Manage Team Members'
  },
  { 
    path: '/admin/engagement', 
    icon: FiHeart, 
    label: 'Engagement',
    description: 'Surveys & Recognition'
  },
  { 
    path: '/admin/learning', 
    icon: FiBookOpen, 
    label: 'Learning',
    description: 'Courses & Development'
  },
  { 
    path: '/admin/onboarding', 
    icon: FiTarget, 
    label: 'Onboarding',
    description: 'New hire workflow'
  },
  { 
    path: '/admin/leaves', 
    icon: FiCalendar, 
    label: 'Leave Requests',
    description: 'Approve & Track Leaves'
  },
  { 
    path: '/admin/leave-policies', 
    icon: FiSettings, 
    label: 'Leave Policies',
    description: 'Configure Leave Rules'
  },
  { 
    path: '/admin/payroll', 
    icon: FiDollarSign, 
    label: 'Payroll',
    description: 'Salary & Benefits'
  },
  { 
    path: '/admin/investment-declarations', 
    icon: FiDollarSign, 
    label: 'Investment Declarations',
    description: 'Tax Declarations'
  },
  { 
    path: '/admin/expenses', 
    icon: FiDollarSign, 
    label: 'Expenses',
    description: 'Expense Approvals'
  },
  { 
    path: '/admin/reimbursements', 
    icon: FiDollarSign, 
    label: 'Reimbursements',
    description: 'Reimbursement Processing'
  },
  { 
    path: '/admin/performance', 
    icon: FiTrendingUp, 
    label: 'Performance',
    description: 'Goals & Reviews'
  },
  { 
    path: '/admin/policies', 
    icon: FiShield, 
    label: 'Policies',
    description: 'Company Policy Documents'
  },
  { 
    path: '/admin/insurance-cards', 
    icon: FiShield, 
    label: 'Insurance Cards',
    description: 'Employee Insurance Management'
  },
  { 
    path: '/admin/qualified-applications', 
    icon: FiCheckCircle, 
    label: 'Qualified Apps',
    description: 'AI-Screened Applications'
  },
  { 
    path: '/admin/question-bank', 
    icon: FiLayers, 
    label: 'Question Bank',
    description: 'Aptitude Test Questions'
  },
  { 
    path: '/admin/test-monitoring', 
    icon: FiEye, 
    label: 'Test Monitoring',
    description: 'Monitor Candidate Tests'
  },
  { 
    path: '/admin/recruitment', 
    icon: FiBriefcase, 
    label: 'Job Posting',
    description: 'Jobs & Candidates'
  },
  { 
    path: '/admin/offer-letters', 
    icon: FiFileText, 
    label: 'Offer Letters',
    description: 'Generate & Send Offers'
  },
  { 
    path: '/admin/pre-employment-forms', 
    icon: FiFileText, 
    label: 'Pre-employment Forms',
    description: 'Candidate Onboarding Forms'
  },
  { 
    path: '/admin/settings', 
    icon: FiSettings, 
    label: 'Settings',
    description: 'System Configuration'
  },
  { 
    path: '/admin/tasks', 
    icon: FiTarget, 
    label: 'Task Management',
    description: 'Create & Manage Tasks'
  },
  { 
    path: '/admin/team', 
    icon: FiGitBranch, 
    label: 'Team',
    description: 'Org Structure & Hierarchy'
  },
  {
    path: '/admin/branches',
    icon: FiGitBranch,
    label: 'Branches',
    description: 'Create & Select Branch'
  },
  { 
    path: '/admin/timesheet', 
    icon: FiClock, 
    label: 'Timesheet',
    description: 'Employee Hours & Attendance'
  },
  { 
    path: '/admin/realtime-dashboard', 
    icon: FiActivity, 
    label: 'Real-Time Dashboard',
    description: 'Live Activity Monitoring'
  },
  {
  path: '/admin/assets',
  icon: FiDollarSign,
  label: 'Assets',
  description: 'Company Asset Management'
}

  
];

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isEnabled, loading: featuresLoading, features } = useFeatureToggle();
  const { notifications } = useRealTime();
  const [showAptitude, setShowAptitude] = useState(false);
  const [showBoardingProcess, setShowBoardingProcess] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [openSections, setOpenSections] = useState({
  features: true,
  organization: false,
  leave: false,
  finance: false,
  appraisals: false,
  content: false,
  recruitment: false,
  audit: false,
  settings: false
});

const toggleSection = (key) => {
  setOpenSections(prev => ({
    ...prev,
    [key]: !prev[key]
  }));
};

  
  // Debug: Log feature toggle state
  useEffect(() => {
    console.log('🔧 [Sidebar] Feature toggle state:', {
      loading: featuresLoading,
      features: features,
      isEnabled_recruitment: isEnabled('enable_recruitment'),
      isEnabled_analytics: isEnabled('enable_analytics'),
    });
  }, [featuresLoading, features, isEnabled]);
  
  // Check if user is department HR manager
  const userRole = user?.role?.toUpperCase() || '';
  // HR_MANAGER always gets full admin access, not department-restricted
  // Department filtering is disabled - all HR managers have full access
  const isDepartmentHR = false; // Always false - HR managers use admin panel
  
  // Check if user is organization admin
  const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                               !user?.employee_id || 
                               user?.employee_id === 0 ||
                               (user?.employee_id && user?.department === null);
  
  // Map route paths to feature keys
  const getFeatureKeyForPath = (path) => {
    const featureMap = {
      '/admin': null, // Dashboard - always enabled
      '/admin/agents': 'enable_agent_monitoring', // Agent Monitoring
      '/admin/analytics': 'enable_analytics', // Analytics
      '/admin/chats': 'enable_chat_monitor', // Chat Monitor
      '/admin/compliance': 'enable_compliance', // Compliance
      '/admin/documents': 'enable_documents', // Documents
      '/admin/employees': 'enable_employees', // Employees
      '/admin/engagement': 'enable_engagement', // Engagement
      '/admin/learning': 'enable_learning', // Learning
      '/admin/onboarding': 'enable_onboarding', // Onboarding
      '/admin/leaves': 'enable_leaves', // Leave Management
      '/admin/payroll': 'enable_payroll', // Payroll
      '/admin/investment-declarations': 'enable_payroll', // Investment Declarations
      '/admin/expenses': 'enable_payroll', // Expenses
      '/admin/reimbursements': 'enable_payroll', // Reimbursements
      '/admin/offer-letters': 'enable_recruitment', // Offer Letters
      '/admin/pre-employment-forms': 'enable_recruitment', // Pre-employment Forms
      '/admin/leave-policies': 'enable_leaves', // Leave Policies
      '/admin/insurance-cards': 'enable_benefits', // Insurance Cards
      '/admin/performance': 'enable_performance', // Performance
      '/admin/policies': 'enable_policies', // Policies
      '/admin/qualified-applications': 'enable_qualified_applications', // Qualified Applications
      '/admin/question-bank': 'enable_question_bank', // Question Bank
      '/admin/test-monitoring': 'enable_test_monitoring', // Test Monitoring
      '/admin/recruitment': 'enable_recruitment', // Recruitment
      '/admin/settings': null, // Settings - always enabled
      '/admin/tasks': 'enable_task_management', // Task Management
      '/admin/team': null, // Team - always enabled (no feature toggle)
      '/admin/branches': null, // Branches - always enabled
      '/admin/timesheet': 'enable_timesheet', // Timesheet
      '/admin/realtime-dashboard': 'enable_timesheet', // Real-Time Dashboard (uses timesheet feature)
      '/admin/assets': 'enable_payroll', // Assets (finance module under payroll)
    };
    return featureMap[path];
  };
  
  // Filter menu items based on user role and feature toggles
  const filteredMenuItems = useMemo(() => {
    if (!user) return menuItems;
    
    // If organization admin, don't show any menu items (they should use OrganizationsAdminLayout)
    if (isOrganizationAdmin && user.role === 'ADMIN') {
      return [];
    }
    
    const isAdmin = userRole === 'ADMIN' || userRole === 'HR_ADMIN';

    if (userRole === 'ORG_ADMIN') {
      return menuItems.filter(item => item.path === '/admin/branches');
    }
    
    // For department HR managers, show only these 8 tabs + Dashboard
    if (isDepartmentHR) {
      const allowedPaths = [
        '/admin',              // Dashboard
        '/admin/employees',    // Employees
        '/admin/payroll',      // Payroll
        '/admin/timesheet',    // Timesheet
        '/admin/leaves',       // Leave Management
        '/admin/learning',     // Learning
        // '/admin/analytics',    // Analytics
        '/admin/documents',    // Documents
        '/admin/policies',     // Policies
        '/admin/chats'         // Chat Monitor
      ];
      
      return menuItems.filter(item => allowedPaths.includes(item.path));
    }
    
    // For admins, filter by feature toggles
    const filtered = menuItems.filter(item => {
      const featureKey = getFeatureKeyForPath(item.path);
      // If no feature key (Dashboard/Settings/Team), always show
      if (featureKey === null || featureKey === undefined) return true;
      // Check if feature is enabled
      const enabled = isEnabled(featureKey);
      if (!enabled) {
        console.log(`🚫 [Sidebar] Filtering out ${item.label} (${item.path}) - feature ${featureKey} is disabled`);
      }
      return enabled;
    });
    
    console.log(`📊 [Sidebar] Filtered menu items: ${filtered.length} of ${menuItems.length} shown`);
    console.log(`📊 [Sidebar] Visible items:`, filtered.map(i => i.label));
    
    return filtered;
  }, [user, isOrganizationAdmin, isEnabled]);


  // Organize menu items into sections - all items must be categorized
  // 1. Dashboard
const featuresItems = filteredMenuItems.filter(item => 
  item.path === '/admin' ||
  item.path === '/admin/chats' || 
  item.path === '/admin/agents' || 
  // item.path === '/admin/analytics' || 
  item.path === '/admin/realtime-dashboard' 
);

// 2. Organization
const organizationItems = filteredMenuItems.filter(item =>
  item.path === '/admin/employees' ||
  item.path === '/admin/onboarding' ||
  item.path === '/admin/documents' ||
  item.path === '/admin/team' 
  // item.path === '/admin/branches'
);

// 3. Leave Management
const leaveItems = filteredMenuItems.filter(item =>
  item.path === '/admin/leaves' ||
  item.path === '/admin/leave-policies'
);

// 4. Finance
const financeItems = filteredMenuItems.filter(item =>
  item.path === '/admin/timesheet' ||
  item.path === '/admin/payroll' ||
  item.path === '/admin/investment-declarations' ||
  item.path === '/admin/reimbursements' ||
  item.path === '/admin/expenses' ||
  item.path === "/admin/assets"
);

// 5. Appraisals
const appraisalItems = filteredMenuItems.filter(item =>
  item.path === '/admin/tasks' ||
  item.path === '/admin/performance'
);

// 6. Content & Policies
const contentItems = filteredMenuItems.filter(item =>
  item.path === '/admin/learning' ||
  item.path === '/admin/engagement' ||
  item.path === '/admin/policies'
);

// 7. Recruitment
const recruitmentItems = filteredMenuItems.filter(item =>
  item.path === '/admin/recruitment' ||
  item.path === '/admin/question-bank' ||
  item.path === '/admin/test-monitoring' ||
  item.path === '/admin/offer-letters' ||
  item.path === '/admin/pre-employment-forms'
);

// 8. Audit
const auditItems = filteredMenuItems.filter(item =>
  item.path === '/admin/compliance'
);

  
  const settingsItems = filteredMenuItems.filter(item => 
    item.path === '/admin/settings'
  );

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Top bar: three-dash (left), Logo, Logout (right) */}
      <div className="flex items-center h-14 bg-[#1e3a5f] text-white px-4 shadow flex-shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="p-2 -ml-2 mr-2 rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label="Open menu"
        >
          <FiMenu className="w-6 h-6" />
        </button>
        <Link to="/admin" className="flex items-center">
          <Logo size="sm" showTagline={false} dark={true} />
        </Link>
        <div className="flex-1" />
        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-medium"
        >
          <FiLogOut className="w-5 h-5" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
      

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMenuOpen(false)} aria-hidden="true" />
      )}

      <div
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-[#1e3a5f] text-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-600/50">
          <span className="font-semibold text-white">Menu</span>
          <button type="button" onClick={() => setMenuOpen(false)} className="p-2 rounded-lg text-white hover:bg-white/10" aria-label="Close menu">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#4b5563 #1f2937' }}
          onClick={(e) => { if (e.target.closest('a')) setMenuOpen(false); }}
        >
        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-600/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
              <FiUser className="w-6 h-6 text-gray-800" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-gray-300 capitalize">
                {user?.role === 'ADMIN' ? 'Admin' : user?.role || 'User'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-6">
        {/* Features Section */}
  {featuresItems.length > 0 && (
    <div>
      <button
      type="button"
      onClick={() => toggleSection('features')}
      className="w-full flex items-center justify-between text-xs font-semibold
                 text-gray-400 uppercase mb-2 px-2 hover:text-white"
    >
      <span>Features</span>
      <span>{openSections.features ? '▾' : '▸'}</span>
    </button>
    {openSections.features && (
      <div className="space-y-1">
        {featuresItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      )}
    </div>
  )}

  {/* Organization */}
  {/* Organization */}
{organizationItems.length > 0 && (
  <div>
    <button
      type="button"
      onClick={() => toggleSection('organization')}
      className="w-full flex items-center justify-between text-xs font-semibold
                 text-gray-400 uppercase mb-2 px-2 hover:text-white"
    >
      <span>Organization</span>
      <span>{openSections.organization ? '▾' : '▸'}</span>
    </button>
     {openSections.organization && (
    <>
    <div className="space-y-1">

      {/* Employees */}
      {organizationItems
        .filter(item => item.path === '/admin/employees')
        .map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

      {/* Boarding Process Placeholder */}
      <button
        type="button"
        onClick={() => setShowBoardingProcess(prev => !prev)}
        className="group flex items-center space-x-3 px-3 py-2.5 rounded-lg w-full text-left
                   text-gray-300 hover:bg-gray-700/50 hover:text-white"
      >
        <FiTarget className="w-5 h-5 text-gray-400" />
        <span className="font-medium flex-1">Boarding Process</span>
        <span className="text-xs">{showBoardingProcess ? '▾' : '▸'}</span>
      </button>

      {/* Boarding Process Children */}
      {showBoardingProcess && (
        <div className="ml-6 space-y-1">
          {organizationItems
            .filter(item =>
              item.path === '/admin/onboarding' ||
              item.path === '/admin/documents'
            )
            .map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-yellow-400 text-gray-900'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
        </div>
      )}

      {/* Team */}
      {organizationItems
        .filter(item => item.path === '/admin/team' || item.path === '/admin/branches')
        .map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

    </div>
    </>
     )}
  </div>
)}


  {/* Leave Management */}
  {leaveItems.length > 0 && (
    <div>
      <button
      type="button"
      onClick={() => toggleSection('leave')}
      className="w-full flex items-center justify-between text-xs font-semibold
                 text-gray-400 uppercase mb-2 px-2 hover:text-white"
    >
      <span>Leave Management</span>
      <span>{openSections.leave ? '▾' : '▸'}</span>
    </button>
      {openSections.leave && (

      <div className="space-y-1">
        {leaveItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      )}
    </div>
  )}

  {/* Finance */}
  {financeItems.length > 0 && (
    <div>
      <button
      type="button"
      onClick={() => toggleSection('finance')}
      className="w-full flex items-center justify-between text-xs font-semibold
                 text-gray-400 uppercase mb-2 px-2 hover:text-white"
    >
      <span>Finance</span>
      <span>{openSections.finance ? '▾' : '▸'}</span>
    </button>
      {openSections.finance && (
      <div className="space-y-1">
        {financeItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      )}
    </div>
  )}

  {/* Appraisals */}
  {appraisalItems.length > 0 && (
    <div>
      <button
      type="button"
      onClick={() => toggleSection('appraisal')}
      className="w-full flex items-center justify-between text-xs font-semibold
                 text-gray-400 uppercase mb-2 px-2 hover:text-white"
    >
      <span>Appraisals</span>
      <span>{openSections.appraisal ? '▾' : '▸'}</span>
    </button>
      {openSections.appraisal && (
      <div className="space-y-1">
        {appraisalItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      )}
    </div>
  )}

  {/* Content & Policies */}
  {contentItems.length > 0 && (
    <div>
      <button
      type="button"
      onClick={() => toggleSection('content')}
      className="w-full flex items-center justify-between text-xs font-semibold
                 text-gray-400 uppercase mb-2 px-2 hover:text-white"
    >
      <span>Content & Policies</span>
      <span>{openSections.content ? '▾' : '▸'}</span>
    </button>
      {openSections.content && (
      <div className="space-y-1">
        {contentItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      )}
    </div>
  )}

  
  {/* Recruitment */}
{recruitmentItems.length > 0 && (
  <div>
    <button
      type="button"
      onClick={() => toggleSection('recruitement')}
      className="w-full flex items-center justify-between text-xs font-semibold
                 text-gray-400 uppercase mb-2 px-2 hover:text-white"
    >
      <span>Recruitement</span>
      <span>{openSections.recruitement ? '▾' : '▸'}</span>
    </button>
     {openSections.recruitement && (
    <>

    <div className="space-y-1">

      {/* Job Posting */}
      {recruitmentItems
        .filter(item => item.path === '/admin/recruitment')
        .map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

      {/* Aptitude Placeholder */}
      <button
        type="button"
        onClick={() => setShowAptitude(prev => !prev)}
        className="group flex items-center space-x-3 px-3 py-2.5 rounded-lg w-full text-left
                   text-gray-300 hover:bg-gray-700/50 hover:text-white"
      >
        <FiLayers className="w-5 h-5 text-gray-400" />
        <span className="font-medium flex-1">Aptitude</span>
        <span className="text-xs">{showAptitude ? '▾' : '▸'}</span>
      </button>

      {/* Aptitude Children */}
      {showAptitude && (
        <div className="ml-6 space-y-1">
          {recruitmentItems
            .filter(item =>
              item.path === '/admin/question-bank' ||
              item.path === '/admin/test-monitoring'
            )
            .map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-yellow-400 text-gray-900'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
        </div>
      )}

      {/* Offer Letters & Pre-Employment */}
      {recruitmentItems
        .filter(item =>
          item.path === '/admin/offer-letters' ||
          item.path === '/admin/pre-employment-forms'
        )
        .map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
    </div>
    </>
    )}
  </div>
)}


  {/* Audit */}
  {auditItems.length > 0 && (
    <div>
      <button
      type="button"
      onClick={() => toggleSection('audit')}
      className="w-full flex items-center justify-between text-xs font-semibold
                 text-gray-400 uppercase mb-2 px-2 hover:text-white"
    >
      <span>Audit</span>
      <span>{openSections.audit ? '▾' : '▸'}</span>
    </button>
    {openSections.audit && (
      <div className="space-y-1">
        {auditItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-yellow-400 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    )}
    </div>
  )}



        {/* Settings Section */}
        {settingsItems.length > 0 && (
          <div>
            <button
      type="button"
      onClick={() => toggleSection('settings')}
      className="w-full flex items-center justify-between text-xs font-semibold
                 text-gray-400 uppercase mb-2 px-2 hover:text-white"
    >
      <span>Settings</span>
      <span>{openSections.settings ? '▾' : '▸'}</span>
    </button>
        {openSections.settings && (
            <div className="space-y-1">
              {settingsItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-yellow-400 text-gray-900'
                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-400'}`} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
             )} 
        </div>
        )}
      </nav>
      </div>

        {/* Logout Button - Fixed at bottom of drawer */}
        <div className="p-4 border-t border-gray-600/50 bg-[#1e3a5f] flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 font-medium"
          >
            <FiLogOut className="w-5 h-5" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
