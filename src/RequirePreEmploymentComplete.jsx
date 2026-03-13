import React from 'react';
import { useAuth } from './contexts/AuthContext';
import { useLocation, Navigate } from 'react-router-dom';

export default function RequirePreEmploymentComplete({ children }) {
  const { user } = useAuth();
  const [preEmploymentCompleted, setPreEmploymentCompleted] = React.useState(undefined);
  const [checking, setChecking] = React.useState(true);
  const location = useLocation();

  React.useEffect(() => {
    async function checkStatus() {
      try {
        // Only check for employee
        if (user?.role !== 'EMPLOYEE') {
          setPreEmploymentCompleted(true);
          setChecking(false);
          return;
        }
        // Fetch pre-employment form status
        const res = await import('./services/api');
        const api = res.preEmploymentAPI;
        const form = await api.getMyForm();
        const completed = form?.status === 'submitted' || form?.status === 'verified' || form?.status === 'approved';
        setPreEmploymentCompleted(completed);
      } catch {
        setPreEmploymentCompleted(false);
      } finally {
        setChecking(false);
      }
    }
    checkStatus();
  }, [user]);

  if (checking) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }
  if (!preEmploymentCompleted) {
    // If not completed, redirect to pre-employment form (now under onboarding)
    if (!location.pathname.startsWith('/employee/onboarding/pre-employment-form')) {
      return <Navigate to="/employee/onboarding/pre-employment-form" replace />;
    }
  }
  return children;
}
