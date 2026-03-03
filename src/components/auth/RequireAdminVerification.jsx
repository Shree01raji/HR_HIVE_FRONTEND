import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import AdminVerification from '../../pages/auth/AdminVerification';

export default function RequireAdminVerification({ children }) {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    const checkVerification = async () => {
      const token = localStorage.getItem('token');
      // Check for ADMIN and HR_MANAGER users
      const userRole = user?.role?.toUpperCase();
      const isAdminOrHR = userRole === 'ADMIN' || userRole === 'HR_MANAGER' || userRole === 'HR_ADMIN';
      
      if (!user || !isAdminOrHR || !token) {
        setChecking(false);
        setIsVerified(false);
        return;
      }

      // Organization creators (admins who created the organization) skip verification
      // ALL other admins and HR managers need admin verification OTP

      try {
        // IMPORTANT: Check localStorage FIRST - if verification exists, trust it for the session
        // This prevents showing OTP on page refresh. OTP is only required at login.
        const verifiedAt = localStorage.getItem('adminVerifiedAt');
        const isVerifiedLocal = localStorage.getItem('adminVerified') === 'true';
        const userEmail = user?.email || '';
        
        // Check if verification exists in localStorage (session-based, persists until logout)
        if (isVerifiedLocal && verifiedAt) {
          // Verify it's for the same user (email check)
          const storedUserEmail = localStorage.getItem('adminVerifiedUserEmail');
          if (storedUserEmail === userEmail) {
            // Trust localStorage - user was verified during login, no need to re-verify on refresh
            setIsVerified(true);
            setChecking(false);
            return;
          } else {
            // Different user, clear old verification
            localStorage.removeItem('adminVerified');
            localStorage.removeItem('adminVerifiedAt');
            localStorage.removeItem('adminVerifiedUserEmail');
          }
        }

        // If no localStorage verification, check backend (only for organization creator check)
        try {
          const status = await authAPI.getAdminVerificationStatus();
          
          // If user is organization creator, skip verification
          if (status.is_organization_creator) {
            localStorage.setItem('adminVerified', 'true');
            localStorage.setItem('adminVerifiedAt', new Date().toISOString());
            localStorage.setItem('adminVerifiedUserEmail', userEmail);
            setIsVerified(true);
            setChecking(false);
            return;
          }
        } catch (backendError) {
          // If backend check fails, continue to show verification
          console.warn('Backend verification check failed:', backendError);
        }

        // No valid verification found - show verification screen
        // This should only happen during login flow, not on refresh
        setShowVerification(true);
      } catch (error) {
        console.error('Error checking verification status:', error);
        // On error, check localStorage one more time
        const verifiedAt = localStorage.getItem('adminVerifiedAt');
        const isVerifiedLocal = localStorage.getItem('adminVerified') === 'true';
        if (isVerifiedLocal && verifiedAt) {
          const storedUserEmail = localStorage.getItem('adminVerifiedUserEmail');
          if (storedUserEmail === user?.email) {
            setIsVerified(true);
          } else {
            setShowVerification(true);
          }
        } else {
          setShowVerification(true);
        }
      } finally {
        setChecking(false);
      }
    };

    checkVerification();
  }, [user]);

  const handleVerified = () => {
    setIsVerified(true);
    setShowVerification(false);
    // Store verification in localStorage (session-based, persists until logout)
    const userEmail = user?.email || '';
    localStorage.setItem('adminVerified', 'true');
    localStorage.setItem('adminVerifiedAt', new Date().toISOString());
    localStorage.setItem('adminVerifiedUserEmail', userEmail);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Checking verification status...</p>
        </div>
      </div>
    );
  }

  const userRole = user?.role?.toUpperCase();
  const isAdminOrHR = userRole === 'ADMIN' || userRole === 'HR_MANAGER' || userRole === 'HR_ADMIN';
  
  if (!user || !isAdminOrHR) {
    return <Navigate to="/login" replace />;
  }

  if (showVerification && !isVerified) {
    return <AdminVerification onVerified={handleVerified} />;
  }

  if (isVerified) {
    return children;
  }

  // Default to showing verification
  return <AdminVerification onVerified={handleVerified} />;
}

