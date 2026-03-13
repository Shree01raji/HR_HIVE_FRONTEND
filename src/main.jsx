import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RealTimeProvider } from './contexts/RealTimeContext';
import { QueryProvider } from './providers/QueryProvider';
import { ThemeProvider } from './contexts/ThemeContext';
import { FeatureToggleProvider } from './contexts/FeatureToggleContext';
import RegisterForm from './RegisterForm';
import Login from './pages/auth/Login';
import ResetPassword from './pages/auth/ResetPassword';
import SSOCallback from './pages/auth/SSOCallback';
import Landing from './pages/Landing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import OrganizationSelect from './pages/OrganizationSelect';
import OrganizationCreate from './pages/OrganizationCreate';
import './styles.css';
import { ToastContainer } from "react-toastify";
import { managerAPI} from "./services/api";

// Admin imports
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import Employees from './pages/admin/Employees';
import EmployeeDetail from './pages/admin/EmployeeDetail';
import EmployeeCreate from './pages/admin/EmployeeCreate';
import EmployeeEdit from './pages/admin/EmployeeEdit';
import LeaveApprovals from './pages/admin/LeaveApprovals';
import AdminPayroll from './pages/admin/Payroll';
import TimesheetManagement from './pages/admin/TimesheetManagement';
import RealtimeDashboard from './pages/admin/RealtimeDashboard';
import Recruitment from './pages/admin/Recruitment';
import RecruitmentEnhanced from './pages/admin/RecruitmentEnhanced';
import QualifiedApplications from './pages/admin/QualifiedApplications';
import ChatManagement from './pages/admin/ChatManagement';
import Integrations from './pages/admin/Integrations';
import Analytics from './pages/admin/Analytics';
import ComplianceReporting from './pages/admin/ComplianceReporting';
import AdminDocuments from './pages/admin/Documents';
import Policies from './pages/admin/Policies';
import LearningManagement from './pages/admin/LearningManagement';
import EngagementManagement from './pages/admin/EngagementManagement';
import PerformanceManagement from './pages/admin/PerformanceManagement';
import AgentMonitoring from './pages/admin/AgentMonitoring';
import QuestionBank from './pages/admin/QuestionBank';
import TestMonitoring from './pages/admin/TestMonitoring';
import Settings from './pages/admin/Settings';
import OnboardingAdmin from './pages/admin/Onboarding';
import Organizations from './pages/admin/Organizations';
import Plans from './pages/admin/Plans';
import TaskManagement from './pages/admin/TaskManagement';
import InvestmentDeclarations from './pages/admin/InvestmentDeclarations';
import OfferLetters from './pages/admin/OfferLetters';
import LeavePolicies from './pages/admin/LeavePolicies';
import InsuranceCards from './pages/admin/InsuranceCards';
import Expenses from './pages/admin/Expenses';
import Reimbursements from './pages/admin/Reimbursements';
import PreEmploymentForms from './pages/admin/PreEmploymentForms';
import Branches from './pages/admin/Branches';
import Team from './pages/admin/Team';
import Assets from './pages/admin/Assets';
import EmployeeEngagement from './pages/admin/EmployeeEngagement';
import HRChatPage from './pages/admin/HRChatPage';
import RecruitmentAnalytics from './pages/admin/RecruitmentAnalytics';
import OrganizationsAdminLayout from './layouts/OrganizationsAdminLayout';
import RequireAdminVerification from './components/auth/RequireAdminVerification';
import RequireOrganizationCode from './components/auth/RequireOrganizationCode';

// Employee imports
import EmployeeLayout from './layouts/EmployeeLayout';
import OnboardingLayout from './layouts/OnboardingLayout';
import EmployeeDashboard from './pages/employee/Dashboard';
import LeaveManagement from './pages/employee/LeaveManagement';
import EmployeeLeavePolicies from './pages/employee/LeavePolicies';
import PayrollView from './pages/employee/PayrollView';
import OnboardingStatus from './pages/employee/OnboardingStatus';
import Timesheet from './pages/employee/Timesheet';
import Documents from './pages/employee/Documents';
import EmployeeProfile from './pages/employee/Profile';
import Learning from './pages/employee/Learning';
import Engagement from './pages/employee/Engagement';
import Surveys from './pages/employee/Surveys';
import PerformanceEnhanced from './pages/employee/PerformanceEnhanced';
import HRPolicy from './pages/employee/HRPolicy';
import MyTasks from './pages/employee/MyTasks';
import InvestmentDeclaration from './pages/employee/InvestmentDeclaration';
import EmployeeExpenses from './pages/employee/Expenses';
import EmployeeReimbursements from './pages/employee/Reimbursements';
import EmployeeInsuranceCards from './pages/employee/InsuranceCards';
import Calendar from './pages/employee/Calendar';
import OrgChart from './pages/employee/OrgChart';
import ConfirmWorking from './pages/employee/ConfirmWorking';

// Candidate imports
import CandidateLayout from './layouts/CandidateLayout';
import CandidateDashboard from './pages/candidate/Dashboard';
import Careers from './pages/candidate/Careers';
import CompanyCareers from './pages/candidate/CompanyCareers';
import JobApplicationForm from './pages/candidate/JobApplicationForm';
import MyApplications from './pages/candidate/MyApplications';
import Profile from './pages/candidate/Profile';
import TakeTest from './pages/candidate/TakeTest';
import CandidateOnboarding from './pages/candidate/Onboarding';
import PreEmploymentForm from './pages/candidate/PreEmploymentForm';
import RequirePreEmploymentComplete from './RequirePreEmploymentComplete';

// Student imports
import StudentLayout from './layouts/StudentLayout';
import StudentDashboard from './pages/student/Dashboard';

// Accountant imports
import AccountantLayout from './layouts/AccountantLayout';
import AccountantDashboard from './pages/accountant/Dashboard';
import AccountantPayroll from './pages/accountant/Payroll';
import AccountantTimesheet from './pages/accountant/Timesheet';
import AccountantSettings from './pages/accountant/Settings';

// Manager imports
import ManagerLayout from './layouts/ManagerLayout';
import ManagerDashboard from './pages/manager/Dashboard';
import ManagerChatMonitor from './pages/manager/ChatMonitor';
import ManagerTimesheet from './pages/manager/Timesheet';
import ManagerPayroll from './pages/manager/Payroll';
import ManagerLeaveManagement from './pages/manager/LeaveManagement';
import ManagerTaskManagement from './pages/manager/TaskManagement';
import ManagerExpenses from './pages/manager/Expenses';
import ManagerReimbursements from './pages/manager/Reimbursements';
import ManagerInvestmentDeclarations from './pages/manager/InvestmentDeclarations';
 
// Auth guard for protected routes
function RequireAuth({ children, allowedRoles = [] }) {
  const { user, mustResetPassword, refreshUser } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  // If user is null but we have a token, try to refresh user before redirecting
  useEffect(() => {
    if (!user && !hasChecked && !isChecking) {
      const token = localStorage.getItem('token');
      if (token) {
        setIsChecking(true);
        refreshUser()
          .then(() => {
            setHasChecked(true);
            setIsChecking(false);
          })
          .catch(() => {
            setHasChecked(true);
            setIsChecking(false);
          });
      } else {
        setHasChecked(true);
      }
    }
  }, [user, hasChecked, isChecking, refreshUser]);

  // Show loading state while checking auth
  const token = localStorage.getItem('token');

// Wait if we still have a token but user is not loaded yet
if (!user && token) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const onboardingRequired =
    user.role === 'EMPLOYEE' &&
    !!user.employee_id &&
    (user.is_onboarded === false || !user.join_date);

  if (mustResetPassword && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }

  if (
    onboardingRequired &&
    !location.pathname.startsWith('/employee/onboarding') &&
    location.pathname !== '/reset-password'
  ) {
    return <Navigate to="/employee/onboarding" replace />;
  }

  // Check if organization is required for this route
  const requiresOrganization =
  location.pathname.startsWith('/employee') ||
  location.pathname.startsWith('/candidate') ||
  location.pathname.startsWith('/manager') ||
  location.pathname.includes('/onboarding');
  
  // Check if user is organization admin (they don't need organization code)
  const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                               !user.employee_id || 
                               user.employee_id === 0 ||
                               (user.employee_id && user.department === null);
  
	// For non-organization-admin users accessing routes that require organization, check if organization is selected.
	// Dual-role users should be allowed to switch portals without forced org-code relogin.
	const roleUpper = user.role?.toUpperCase() || '';
	const skipOrganizationPrompt = ['ADMIN', 'HR_MANAGER', 'MANAGER', 'SUPER_ADMIN'].includes(roleUpper);

  if (requiresOrganization) {
    // Always try to recover selectedOrganization so API calls include X-Organization-Slug.
    // This matters for ADMIN/HR_MANAGER/MANAGER who skip the org-code prompt but still
    // need the slug so the backend can route to the correct tenant database.
    let selectedOrganization = localStorage.getItem('selectedOrganization');
    if (!selectedOrganization || selectedOrganization.trim() === '') {
      try {
        const organizationDataRaw = localStorage.getItem('organizationData');
        if (organizationDataRaw) {
          const organizationData = JSON.parse(organizationDataRaw);
          const recoveredSlug = organizationData?.slug || organizationData?.organization_slug;
          if (recoveredSlug && String(recoveredSlug).trim() !== '') {
            selectedOrganization = String(recoveredSlug).trim();
            localStorage.setItem('selectedOrganization', selectedOrganization);
          }
        }
      } catch (error) {
        console.warn('[RequireAuth] Failed to recover selectedOrganization from organizationData:', error);
      }
    }

    // Only redirect to login for org-code if the user is NOT a dual-role user.
    // ADMIN/HR_MANAGER/MANAGER/SUPER_ADMIN are already authenticated globally.
    if (!isOrganizationAdmin && !skipOrganizationPrompt) {
      if (!selectedOrganization || selectedOrganization.trim() === '') {
        localStorage.setItem('tempUserData', JSON.stringify(user));
        return <Navigate to="/login?showOrgCode=true" replace />;
      }
    }
  }

  // Check if user is accountant (has ACCOUNTANT role or ACCOUNTS RBAC role)
  const isAccountant = user.role === 'ACCOUNTANT' || localStorage.getItem('isAccountant') === 'true';
  
  // If accountant tries to access admin routes, redirect to accountant panel
  if (isAccountant && location.pathname.startsWith('/admin') && !location.pathname.startsWith('/admin/organizations')) {
    return <Navigate to="/accountant" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role) && !isAccountant) {
    // Redirect to appropriate dashboard if role doesn't match
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      if (isOrganizationAdmin) {
        return <Navigate to="/admin/organizations" replace />;
      } else {
        return <Navigate to="/admin" replace />;
      }
    } else if (user.role === 'HR_MANAGER') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'MANAGER'){
      return <Navigate to="/manager" replace/>;
    } else if (user.role === 'CANDIDATE') {
      return <Navigate to="/candidate" replace />;
    } else {
      return <Navigate to="/employee" replace />;
    }
  }

  return children;
}

function RequireOnboardingComplete({ children }) {
  const { user } = useAuth();
  const onboardingRequired =
  (user?.role === 'EMPLOYEE' || user?.role === 'MANAGER') &&
  !!user?.employee_id &&
  (user?.is_onboarded === false || !user?.join_date);

  if (onboardingRequired) {
    return <Navigate to="/employee/onboarding" replace />;
  }

  return children;
}

// Route guard to prevent organization admins from accessing regular admin routes
function RequireNotOrganizationAdmin({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is organization admin
  const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                               !user.employee_id || 
                               user.employee_id === 0 ||
                               (user.employee_id && user.department === null);

  // If organization admin tries to access regular admin routes, redirect to organizations
  if (isOrganizationAdmin && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
    return <Navigate to="/admin/organizations" replace />;
  }

  return children;
}

// Route guard for department HR managers - restrict access to certain routes
function RequireAdminOrHRAdmin({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is organization admin - redirect them to organizations page
  const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                               !user.employee_id || 
                               user.employee_id === 0 ||
                               (user.employee_id && user.department === null);

  if (isOrganizationAdmin && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
    return <Navigate to="/admin/organizations" replace />;
  }

  const userRole = user.role?.toUpperCase() || '';
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'HR_ADMIN' || userRole === 'HR_MANAGER';
  // HR_MANAGER always gets full admin access, not department-restricted
  // Department filtering is disabled - all HR managers have full access
  const isDepartmentHR = false; // Always false - HR managers use admin panel

  // HR_MANAGER now has full admin access, so no path restrictions needed
  // If user is not an admin/HR_ADMIN/HR_MANAGER and trying to access admin-only routes, redirect
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Route guard for accountants - checks both ACCOUNTANT role and isAccountant flag
function RequireAccountant({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is accountant (has ACCOUNTANT role or ACCOUNTS RBAC role)
  const isAccountant = user.role === 'ACCOUNTANT' || localStorage.getItem('isAccountant') === 'true';

  if (!isAccountant) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                                   !user.employee_id || 
                                   user.employee_id === 0 ||
                                   (user.employee_id && user.department === null);
      if (isOrganizationAdmin) {
        return <Navigate to="/admin/organizations" replace />;
      } else {
        return <Navigate to="/admin" replace />;
      }
    } else if (user.role === 'HR_MANAGER') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'CANDIDATE') {
      return <Navigate to="/candidate" replace />;
    } else {
      return <Navigate to="/employee" replace />;
    }
  }

  return children;
}

// Route guard for employee portal - allows EMPLOYEE, ACCOUNTANT, and ADMIN/HR_MANAGER with employee_id
function RequireEmployeeAccess({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is accountant (has ACCOUNTANT role or ACCOUNTS RBAC role)
  const isAccountant = user.role === 'ACCOUNTANT' || localStorage.getItem('isAccountant') === 'true';
  
  // Check if user is EMPLOYEE
  const isEmployee = user.role === 'EMPLOYEE';
  const hasEmployeeId = Number(user?.employee_id) > 0;
  
  // Check if user is ADMIN or HR_MANAGER
  const userRole = user.role?.toUpperCase() || '';
  const isHRWithEmployeeAccess = (userRole === 'HR_MANAGER' || userRole === 'ADMIN') && hasEmployeeId;
  const isManagerWithEmployeeAccess = userRole === 'MANAGER' && hasEmployeeId;

  // Allow access if user is EMPLOYEE, ACCOUNTANT, ADMIN/HR_MANAGER, or MANAGER with employee_id
  if (!isEmployee && !isAccountant && !isHRWithEmployeeAccess && !isManagerWithEmployeeAccess) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                                   !user.employee_id || 
                                   user.employee_id === 0 ||
                                   (user.employee_id && user.department === null);
      if (isOrganizationAdmin) {
        return <Navigate to="/admin/organizations" replace />;
      } else {
        return <Navigate to="/admin" replace />;
      }
    } else if (user.role === 'HR_MANAGER') {
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'CANDIDATE') {
      return <Navigate to="/candidate" replace />;
    } else {
      return <Navigate to="/employee" replace />;
    }
  }

  // Use RequireAuth for other checks (password reset, onboarding, organization, etc.)
  return <RequireAuth>{children}</RequireAuth>;
}

function RequireManagerAccess({ children }) {
  const { user } = useAuth();

  const roles = (user?.roles || [user?.role] || [])
    .map(r => r?.replace('ROLE_', '').toUpperCase());

  // Only check role if user exists
  if (user && !roles.includes('MANAGER')) {
    return <Navigate to="/employee" replace />;
  }

  // Let RequireAuth handle login recovery
  return <RequireAuth>{children}</RequireAuth>;
}

 
// Home component that redirects based on auth status
function Home() {
  const { user } = useAuth();
  const location = useLocation();
  const roles = user?.roles || [user?.role];
  
  if (!user) {
    return <Navigate to="/landing" replace />;
  }
  
  // Check if we're on login page with admin verification flag - don't redirect
  const urlParams = new URLSearchParams(location.search);
  if (location.pathname === '/login' && urlParams.get('showAdminVerification') === 'true') {
    return null; // Let Login component handle it
  }
  
  if (
    user.role === 'CANDIDATE' &&
    user.employee_id &&
    user.is_onboarded === false
  ) {
    return <Navigate to="/candidate/onboarding" replace />;
  }

  // Check if user is accountant (has ACCOUNTANT role or ACCOUNTS RBAC role)
  const isAccountant = user.role === 'ACCOUNTANT' || localStorage.getItem('isAccountant') === 'true';
  
  // Check admin verification for ADMIN and HR_MANAGER
  const userRole = user.role?.toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'HR_MANAGER' || userRole === 'HR_ADMIN';
  
  if (isAdmin) {
    // Check if admin verification is required
    const adminVerified = localStorage.getItem('adminVerified') === 'true';
    const verifiedAt = localStorage.getItem('adminVerifiedAt');
    let needsVerification = !adminVerified;
    
    // Check if verification has expired (30 minutes)
    if (verifiedAt && adminVerified) {
      const verifiedTime = new Date(verifiedAt);
      const now = new Date();
      const minutesSinceVerification = (now - verifiedTime) / (1000 * 60);
      if (minutesSinceVerification >= 30) {
        needsVerification = true;
      }
    }
    
    // If verification needed, redirect to login with verification flag
    if (needsVerification) {
      return <Navigate to="/login?showAdminVerification=true" replace />;
    }
    
    // Verification complete, proceed with normal redirect
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      // Check if this is Organization Admin
      const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                                 !user.employee_id || 
                                 user.employee_id === 0 ||
                                 (user.employee_id && user.department === null);
      if (isOrganizationAdmin) {
        return <Navigate to="/admin/organizations" replace />;
      } else {
        return <Navigate to="/admin" replace />;
      }
    } else if (user.role === 'HR_MANAGER') {
      return <Navigate to="/admin" replace />;
    }
  }

  // Managers should be redirected to the manager portal before falling back to employee
  if (roles.includes('MANAGER')) {
    return <Navigate to="/manager" replace />;
  }

  if (roles.includes('EMPLOYEE')) {
    return <Navigate to="/employee" replace />;
  }

  
  if (user.role === 'CANDIDATE') {
    return <Navigate to="/candidate" replace />;
  } else if (isAccountant) {
    // Accountants go to dedicated accountant panel
    return <Navigate to="/accountant" replace />;
  } else {
    return <Navigate to="/employee" replace />;
  }
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider>
            <FeatureToggleProvider>
              <RealTimeProvider>
                
          <Routes>
          {/* Public routes */}
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/sso/callback" element={<SSOCallback />} />
          <Route
            path="/reset-password"
            element={<RequireAuth><ResetPassword /></RequireAuth>}
          />
          <Route path="/register" element={<RegisterForm />} />
          
          {/* Legal pages - publicly accessible */}
          <Route path="/privacy-policy.html" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service.html" element={<TermsOfService />} />
          
          {/* Public company careers page */}
          <Route path="/careers/:organizationSlug" element={<CompanyCareers />} />
          <Route path="/careers/:organizationSlug/apply/:jobId" element={<JobApplicationForm />} />
          
          {/* Organization routes */}
          <Route path="/organizations" element={<OrganizationSelect />} />
          <Route path="/organizations/create" element={<OrganizationCreate />} />
          
          {/* Home route - redirects based on auth */}
          <Route path="/" element={<Home />} />

          {/* Admin routes - Only ADMIN and HR_MANAGER */}
          <Route
            path="/admin"
            element={
              <RequireAuth allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HR_MANAGER']}>
                <RequireAdminVerification>
                  <RequireNotOrganizationAdmin>
                    <AdminLayout />
                  </RequireNotOrganizationAdmin>
                </RequireAdminVerification>
              </RequireAuth>
            }
          >
              <Route index element={<RequireAdminOrHRAdmin><AdminDashboard /></RequireAdminOrHRAdmin>} />
              <Route path="employees" element={<RequireAdminOrHRAdmin><Employees /></RequireAdminOrHRAdmin>} />
              <Route path="employees/new" element={<RequireAdminOrHRAdmin><EmployeeCreate /></RequireAdminOrHRAdmin>} />
              <Route path="employees/:employeeId" element={<RequireAdminOrHRAdmin><EmployeeDetail /></RequireAdminOrHRAdmin>} />
              <Route path="employees/:employeeId/edit" element={<RequireAdminOrHRAdmin><EmployeeEdit /></RequireAdminOrHRAdmin>} />
              <Route path="leaves" element={<RequireAdminOrHRAdmin><LeaveApprovals /></RequireAdminOrHRAdmin>} />
              <Route path="payroll" element={<RequireAdminOrHRAdmin><AdminPayroll /></RequireAdminOrHRAdmin>} />
              <Route path="tasks" element={<RequireAdminOrHRAdmin><TaskManagement /></RequireAdminOrHRAdmin>} />
              <Route path="timesheet" element={<RequireAdminOrHRAdmin><TimesheetManagement /></RequireAdminOrHRAdmin>} />
              <Route path="realtime-dashboard" element={<RequireAdminOrHRAdmin><RealtimeDashboard /></RequireAdminOrHRAdmin>} />
              <Route path="learning" element={<RequireAdminOrHRAdmin><LearningManagement /></RequireAdminOrHRAdmin>} />
              <Route path="analytics" element={<RequireAdminOrHRAdmin><Analytics /></RequireAdminOrHRAdmin>} />
              <Route path="documents" element={<RequireAdminOrHRAdmin><AdminDocuments /></RequireAdminOrHRAdmin>} />
              <Route path="policies" element={<RequireAdminOrHRAdmin><Policies /></RequireAdminOrHRAdmin>} />
              <Route path="chats" element={<RequireAdminOrHRAdmin><ChatManagement /></RequireAdminOrHRAdmin>} />
              <Route path="onboarding" element={<RequireAdminOrHRAdmin><OnboardingAdmin /></RequireAdminOrHRAdmin>} />
              {/* Admin-only routes - HR_MANAGER has full access */}
              <Route path="recruitment" element={<RequireNotOrganizationAdmin><RequireAuth allowedRoles={['ADMIN', 'HR_ADMIN', 'HR_MANAGER']}><Recruitment /></RequireAuth></RequireNotOrganizationAdmin>} />
              <Route path="recruitment-enhanced" element={<RequireNotOrganizationAdmin><RequireAuth allowedRoles={['ADMIN', 'HR_ADMIN', 'HR_MANAGER']}><RecruitmentEnhanced /></RequireAuth></RequireNotOrganizationAdmin>} />
              <Route path="qualified-applications" element={<RequireNotOrganizationAdmin><RequireAuth allowedRoles={['ADMIN', 'HR_ADMIN', 'HR_MANAGER']}><QualifiedApplications /></RequireAuth></RequireNotOrganizationAdmin>} />
              <Route path="compliance" element={<RequireNotOrganizationAdmin><RequireAuth allowedRoles={['ADMIN', 'HR_ADMIN', 'HR_MANAGER']}><ComplianceReporting /></RequireAuth></RequireNotOrganizationAdmin>} />
              <Route path="agents" element={<RequireNotOrganizationAdmin><RequireAuth allowedRoles={['ADMIN', 'HR_ADMIN', 'HR_MANAGER']}><AgentMonitoring /></RequireAuth></RequireNotOrganizationAdmin>} />
              <Route path="integrations" element={<RequireNotOrganizationAdmin><RequireAuth allowedRoles={['ADMIN', 'HR_ADMIN', 'HR_MANAGER']}><Integrations /></RequireAuth></RequireNotOrganizationAdmin>} />
              <Route path="engagement" element={<RequireNotOrganizationAdmin><RequireAuth allowedRoles={['ADMIN', 'HR_ADMIN', 'HR_MANAGER']}><EngagementManagement /></RequireAuth></RequireNotOrganizationAdmin>} />
              <Route path="performance" element={<RequireNotOrganizationAdmin><RequireAuth allowedRoles={['ADMIN', 'HR_ADMIN', 'HR_MANAGER']}><PerformanceManagement /></RequireAuth></RequireNotOrganizationAdmin>} />
              <Route path="question-bank" element={<RequireNotOrganizationAdmin><RequireAuth allowedRoles={['ADMIN', 'HR_ADMIN', 'HR_MANAGER']}><QuestionBank /></RequireAuth></RequireNotOrganizationAdmin>} />
              <Route path="test-monitoring" element={<RequireNotOrganizationAdmin><RequireAuth allowedRoles={['ADMIN', 'HR_ADMIN', 'HR_MANAGER']}><TestMonitoring /></RequireAuth></RequireNotOrganizationAdmin>} />
              <Route path="settings" element={<RequireNotOrganizationAdmin><RequireAuth allowedRoles={['ADMIN', 'HR_MANAGER']}><Settings /></RequireAuth></RequireNotOrganizationAdmin>} />
              <Route path="investment-declarations" element={<RequireAdminOrHRAdmin><InvestmentDeclarations /></RequireAdminOrHRAdmin>} />
              <Route path="offer-letters" element={<RequireAdminOrHRAdmin><OfferLetters /></RequireAdminOrHRAdmin>} />
              <Route path="leave-policies" element={<RequireAdminOrHRAdmin><LeavePolicies /></RequireAdminOrHRAdmin>} />
              <Route path="insurance-cards" element={<RequireAdminOrHRAdmin><InsuranceCards /></RequireAdminOrHRAdmin>} />
              <Route path="expenses" element={<RequireAdminOrHRAdmin><Expenses /></RequireAdminOrHRAdmin>} />
              <Route path="reimbursements" element={<RequireAdminOrHRAdmin><Reimbursements /></RequireAdminOrHRAdmin>} />
              <Route path="pre-employment-forms" element={<RequireAdminOrHRAdmin><PreEmploymentForms /></RequireAdminOrHRAdmin>} />
              <Route path="branches" element={<RequireAdminOrHRAdmin><Branches /></RequireAdminOrHRAdmin>} />
              <Route path="team" element={<RequireAdminOrHRAdmin><Team /></RequireAdminOrHRAdmin>} />
                <Route path="assets" element={<RequireAdminOrHRAdmin><Assets /></RequireAdminOrHRAdmin>} />
                <Route path="employee-engagement" element={<RequireAdminOrHRAdmin><EmployeeEngagement /></RequireAdminOrHRAdmin>} />
                <Route path="hr-chat" element={<RequireAdminOrHRAdmin><HRChatPage /></RequireAdminOrHRAdmin>} />
                <Route path="recruitment-analytics" element={<RequireAdminOrHRAdmin><RecruitmentAnalytics /></RequireAdminOrHRAdmin>} />
          </Route>

          {/* Separate Organizations Admin Panel - Super Admin Only */}
          <Route
            path="/admin/organizations"
            element={
              <RequireAuth allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <RequireAdminVerification>
                  <OrganizationsAdminLayout />
                </RequireAdminVerification>
              </RequireAuth>
            }
          >
            <Route index element={<Organizations />} />
            <Route path="plans" element={<Plans />} />
          </Route>

          {/* Employee routes - Allow EMPLOYEE, ACCOUNTANT, and ADMIN/HR_MANAGER with employee_id */}
          <Route
            path="/employee"
            element={
              <RequireEmployeeAccess>
                <EmployeeLayout />
              </RequireEmployeeAccess>
            }
          >
            <Route index element={<RequireOnboardingComplete><EmployeeDashboard /></RequireOnboardingComplete>} />
            <Route path="calendar" element={<RequireOnboardingComplete><Calendar /></RequireOnboardingComplete>} />
            <Route path="leaves" element={<RequireOnboardingComplete><LeaveManagement /></RequireOnboardingComplete>} />
            <Route path="leave-policies" element={<RequireOnboardingComplete><EmployeeLeavePolicies /></RequireOnboardingComplete>} />
            <Route path="payroll" element={<RequireOnboardingComplete><PayrollView /></RequireOnboardingComplete>} />
            <Route path="timesheet" element={<RequireOnboardingComplete><Timesheet /></RequireOnboardingComplete>} />
            <Route path="confirm-working" element={<RequireOnboardingComplete><ConfirmWorking /></RequireOnboardingComplete>} />
            <Route path="documents" element={<RequireOnboardingComplete><Documents /></RequireOnboardingComplete>} />
            <Route path="profile" element={<RequireOnboardingComplete><EmployeeProfile /></RequireOnboardingComplete>} />
            <Route path="learning" element={<RequireOnboardingComplete><Learning /></RequireOnboardingComplete>} />
            <Route path="engagement" element={<RequireOnboardingComplete><Engagement /></RequireOnboardingComplete>} />
            <Route path="surveys" element={<RequireOnboardingComplete><Surveys /></RequireOnboardingComplete>} />
            <Route path="performance" element={<RequireOnboardingComplete><PerformanceEnhanced /></RequireOnboardingComplete>} />
            <Route path="hr-policy" element={<RequireOnboardingComplete><HRPolicy /></RequireOnboardingComplete>} />
            <Route path="tasks" element={<RequireOnboardingComplete><MyTasks /></RequireOnboardingComplete>} />
            <Route path="investment-declaration" element={<RequireOnboardingComplete><InvestmentDeclaration /></RequireOnboardingComplete>} />
            <Route path="expenses" element={<RequireOnboardingComplete><EmployeeExpenses /></RequireOnboardingComplete>} />
            <Route path="reimbursements" element={<RequireOnboardingComplete><EmployeeReimbursements /></RequireOnboardingComplete>} />
            <Route path="insurance-cards" element={<RequireOnboardingComplete><EmployeeInsuranceCards /></RequireOnboardingComplete>} />
            <Route path="org-chart" element={<RequireOnboardingComplete><RequireAuth allowedRoles={['ADMIN', 'HR_ADMIN', 'HR_MANAGER', 'EMPLOYEE']}><OrgChart /></RequireAuth></RequireOnboardingComplete>} />           
          </Route>
 
 {/* Manager routes */}
          <Route
            path="/manager"
            element={
              <RequireManagerAccess>
                <ManagerLayout />
              </RequireManagerAccess>
            }
          >
            <Route index element={<ManagerDashboard />} />
            <Route path="chat" element={<ManagerChatMonitor />} />
            <Route path="timesheet" element={<ManagerTimesheet />} />
            <Route path="payroll" element={<ManagerPayroll />} />
            <Route path="leaves" element={<ManagerLeaveManagement />} />
            <Route path="tasks" element={<ManagerTaskManagement />} />
            <Route path="expenses" element={<ManagerExpenses />} />
            <Route path="reimbursements" element={<ManagerReimbursements />} />
            <Route path="investment-declarations" element={<ManagerInvestmentDeclarations />} />
          </Route>
          
          <Route
            path="/employee/onboarding"
            element={
              <RequireAuth>
                <OnboardingLayout />
              </RequireAuth>
            }
          >
            {/* Pre-employment form must be filled before onboarding */}
            <Route path="pre-employment-form" element={<PreEmploymentForm />} />
            {/* Only show onboarding status if pre-employment is complete */}
            <Route index element={<RequirePreEmploymentComplete><OnboardingStatus /></RequirePreEmploymentComplete>} />
          </Route>

          {/* Candidate routes */}
          <Route
            path="/candidate"
            element={
              <RequireAuth allowedRoles={['CANDIDATE']}>
                <CandidateLayout />
              </RequireAuth>
            }
          >
            <Route index element={<CandidateDashboard />} />
            <Route path="onboarding" element={<RequirePreEmploymentComplete><CandidateOnboarding /></RequirePreEmploymentComplete>} />
            <Route path="careers" element={<Careers />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="profile" element={<Profile />} />
            <Route path="pre-employment-form" element={<PreEmploymentForm />} />
          </Route>
          
          {/* Test route - standalone without layout for security */}
          <Route
            path="/candidate/test/:testId"
            element={
              <RequireAuth allowedRoles={['CANDIDATE']}>
                <TakeTest />
              </RequireAuth>
            }
          />

          {/* Student routes */}
          <Route
            path="/student"
            element={
              <RequireAuth allowedRoles={['STUDENT']}>
                <StudentLayout />
              </RequireAuth>
            }
          >
            <Route index element={<StudentDashboard />} />
          </Route>

          {/* Accountant routes */}
          <Route
            path="/accountant"
            element={
              <RequireAccountant>
                <AccountantLayout />
              </RequireAccountant>
            }
          >
            <Route index element={<AccountantDashboard />} />
            <Route path="payroll" element={<AccountantPayroll />} />
            <Route path="timesheet" element={<AccountantTimesheet />} />
            <Route path="settings" element={<AccountantSettings />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
              </RealTimeProvider>
            </FeatureToggleProvider>
          </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
        <ToastContainer />
      </BrowserRouter>
      
    );
  }

const root = createRoot(document.getElementById('root'));
root.render(<App />);

