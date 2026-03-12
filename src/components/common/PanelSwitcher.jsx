import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiUser, FiBriefcase, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';

export default function PanelSwitcher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasEmployeeId = Number(user?.employee_id) > 0;

  const ensureOrganizationSlug = () => {
    let selectedOrganization = localStorage.getItem('selectedOrganization');
    if (selectedOrganization && selectedOrganization.trim() !== '') {
      return;
    }

    try {
      const organizationDataRaw = localStorage.getItem('organizationData');
      if (organizationDataRaw) {
        const organizationData = JSON.parse(organizationDataRaw);
        const recoveredSlug = organizationData?.slug || organizationData?.organization_slug;
        if (recoveredSlug && String(recoveredSlug).trim() !== '') {
          localStorage.setItem('selectedOrganization', String(recoveredSlug).trim());
          return;
        }
      }
    } catch (_error) {
      // Ignore parse issues and try user payload fallback below.
    }

    const userSlug = user?.organization_slug || user?.organization?.slug;
    if (userSlug && String(userSlug).trim() !== '') {
      localStorage.setItem('selectedOrganization', String(userSlug).trim());
    }
  };
  
  // Check if user is accountant
  // Check multiple ways: role, localStorage flag, and RBAC roles
  const isAccountantByRole = user?.role === 'ACCOUNTANT' || user?.role?.toUpperCase() === 'ACCOUNTANT';
  const isAccountantFlag = localStorage.getItem('isAccountant') === 'true';
  let userRoles = [];
  try { userRoles = JSON.parse(localStorage.getItem('userRoles') || '[]'); } catch (_) { userRoles = []; }
  const hasAccountsRole = userRoles.includes('ACCOUNTS') || userRoles.includes('accounts');
  const isAccountant = isAccountantByRole || isAccountantFlag || hasAccountsRole;
  
// Check if user is HR/Admin with employee profile access
  const userRole = user?.role?.toUpperCase() || '';
  const isAdminOrHR = userRole === 'ADMIN' || userRole === 'HR_MANAGER';
  const isHRWithEmployeeAccess = isAdminOrHR && hasEmployeeId;

  // Manager with employee access must have linked employee profile
  const isManager = userRole === 'MANAGER';
  const isManagerWithEmployeeAccess = isManager && hasEmployeeId;

 
  
  // Show accountant switcher
  if (isAccountant) {
    const isEmployeePanel = location.pathname.startsWith('/employee');
    const isAccountantPanel = location.pathname.startsWith('/accountant');
    
    const switchToEmployee = () => {
      ensureOrganizationSlug();
      navigate('/employee');
    };
    
    const switchToAccountant = () => {
      navigate('/accountant');
    };
    
    return (
      <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-1 border border-purple-200 dark:border-gray-600 shadow-md hover:shadow-lg transition-shadow">
        <button
          type="button"
          onClick={switchToEmployee}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            isEmployeePanel
              ? 'bg-white dark:bg-gray-700 shadow-md text-purple-600 dark:text-purple-400 font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
          }`}
        >
          <FiUser className="w-4 h-4" />
          <span className="text-sm font-medium">Employee</span>
        </button>
        <button
          type="button"
          onClick={switchToAccountant}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            isAccountantPanel
              ? 'bg-white dark:bg-gray-700 shadow-md text-purple-600 dark:text-purple-400 font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
          }`}
        >
          <FiBriefcase className="w-4 h-4" />
          <span className="text-sm font-medium">Accountant</span>
        </button>
      </div>
    );
  }
  
  // Show HR/Admin switcher
  if (isHRWithEmployeeAccess) {
    const isEmployeePanel = location.pathname.startsWith('/employee');
    const isAdminPanel = location.pathname.startsWith('/admin');
    
    const switchToEmployee = () => {
      ensureOrganizationSlug();
      navigate('/employee');
    };
    
    const switchToAdmin = () => {
      navigate('/admin');
    };
    
    return (
      <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-1 border border-blue-200 dark:border-gray-600 shadow-sm">
        <button
          type="button"
          onClick={switchToEmployee}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            isEmployeePanel
              ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
          }`}
        >
          <FiUser className="w-4 h-4" />
          <span className="text-sm font-medium">Employee</span>
        </button>
        <button
          type="button"
          onClick={switchToAdmin}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            isAdminPanel
              ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
          }`}
        >
          <FiUsers className="w-4 h-4" />
          <span className="text-sm font-medium">Admin</span>
        </button>
      </div>
    );
  }
  
   // Show Manager switcher
  if (isManagerWithEmployeeAccess) {
    const isEmployeePanel = location.pathname.startsWith('/employee');
    const isManagerPanel = location.pathname.startsWith('/manager');
    
    const switchToEmployee = () => {
      ensureOrganizationSlug();
      navigate('/employee');
    };
    
    const switchToManager = () => {
      navigate('/manager');
    };
    
    return (
      <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-1 border border-blue-200 dark:border-gray-600 shadow-sm">
        <button
          type="button"
          onClick={switchToEmployee}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            isEmployeePanel
              ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
          }`}
        >
          <FiUser className="w-4 h-4" />
          <span className="text-sm font-medium">Employee</span>
        </button>
        <button
          type="button"
          onClick={switchToManager}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
            isManagerPanel
              ? 'bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-600/50'
          }`}
        >
          <FiUsers className="w-4 h-4" />
          <span className="text-sm font-medium">Manager</span>
        </button>
      </div>
    );
  }
  
  // No switcher for other users
  return null;
}


