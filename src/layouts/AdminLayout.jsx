import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/admin/Sidebar';
import Header from '../components/admin/Header';
import ChatWidget from '../components/ChatWidget';

export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // HR_MANAGER always gets blue admin panel, not department panel
  // Department filtering is disabled - all HR managers have full access
  const isDepartmentHR = false; // Always false - HR managers use admin panel
  
  // Check if user is organization admin and redirect them
  useEffect(() => {
    // Treat both ADMIN and HR_MANAGER as full admins for panel access
    if (user?.role === 'ADMIN' || user?.role === 'HR_MANAGER') {
      const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                                   !user.employee_id || 
                                   user.employee_id === 0 ||
                                   (user.employee_id && user.department === null);
      if (isOrganizationAdmin && user?.role === 'ADMIN') {
        navigate('/admin/organizations', { replace: true });
      }
    }
  }, [user, navigate]);
  
  return (
    <div className="h-screen overflow-hidden bg-[#e8f0f5] dark:bg-gray-900 transition-colors duration-200">
      <div className="flex flex-col h-full">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-[#e8f0f5] dark:bg-gray-900">
            <Outlet />
          </main>
        </div>
      </div>
      <ChatWidget />
    </div>
  );
}