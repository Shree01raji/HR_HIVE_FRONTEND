import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, organizationAPI } from '../../services/api';
import Logo from '../../components/Logo';

export default function SSOCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');

        if (errorParam) {
          setError(`SSO authentication failed: ${errorParam}`);
          setLoading(false);
          return;
        }

        if (!code || !state) {
          setError('Missing authorization code or state. Please try logging in again.');
          setLoading(false);
          return;
        }

        // Call backend to exchange code for token
        const response = await authAPI.ssoCallback(code, state);

        // Store token and user info
        if (response.access_token) {
          localStorage.setItem('token', response.access_token);
          localStorage.setItem(
            'mustResetPassword',
            response.must_reset_password ? 'true' : 'false'
          );

          // Store organization slug if provided
          if (response.organization_slug) {
            localStorage.setItem('selectedOrganization', response.organization_slug);
            try {
              const orgData = await organizationAPI.get(response.organization_slug);
              if (orgData) {
                localStorage.setItem('organizationData', JSON.stringify(orgData));
              }
            } catch (err) {
              console.warn('Could not fetch organization data:', err);
            }
          }

          // Refresh user in AuthContext
          await refreshUser();

          // Store user info temporarily for organization selection
          if (response.user) {
            localStorage.setItem('tempUserData', JSON.stringify(response.user));
          }

          // Check if user is admin or HR manager - they need admin verification
          const userRole = response.user.role?.toUpperCase();
          const isAdmin = userRole === 'ADMIN' || userRole === 'HR_MANAGER' || userRole === 'HR_ADMIN';
          
          console.log('[SSOCallback] User role:', userRole, 'isAdmin:', isAdmin);
          console.log('[SSOCallback] Organization slug:', response.organization_slug);
          
          // For admin/HR manager users, always show admin verification
          if (isAdmin) {
            console.log('[SSOCallback] Admin/HR user detected, redirecting to admin verification');
            // Always show admin verification for admin/HR users
            // Navigate to login page with admin verification flag
            navigate('/login?showAdminVerification=true', { replace: true });
            return;
          }

          // For regular employees, show organization code screen
          navigate('/login?showOrgCode=true');
        } else {
          setError('No access token received from server. Please try again.');
          setLoading(false);
        }
      } catch (err) {
        console.error('SSO callback error:', err);
        const errorMessage = err.response?.data?.detail || 
                           err.message || 
                           'Failed to complete SSO login. Please try again.';
        setError(errorMessage);
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen bg-[#e8f0f5] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1e3a5f]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Logo/Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <Logo size="md" showTagline={false} />
          </div>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-200">
          {loading ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto mb-4"></div>
              <p className="text-gray-600">Completing your login...</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6">
                <span className="block">{error}</span>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-[#1e3a5f] hover:bg-[#2a4a6f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a5f] transition-all"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600">Redirecting...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
