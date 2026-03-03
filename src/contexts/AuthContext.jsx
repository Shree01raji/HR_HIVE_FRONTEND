import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [mustResetPassword, setMustResetPassword] = useState(
    localStorage.getItem('mustResetPassword') === 'true'
  );
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Ensure role strings are normalized to uppercase to make role checks case-insensitive
  const normalizeUserRoles = (u) => {
  if (!u) return u;

  const normalize = (r) =>
    String(r)
      .replace(/^ROLE_/, '')  // remove ROLE_ prefix
      .toUpperCase();         // normalize casing

  const nu = { ...u };

  try {
    if (nu.role) nu.role = normalize(nu.role);

    if (Array.isArray(nu.roles)) {
      nu.roles = nu.roles.map(normalize);
    } else if (nu.role && !nu.roles) {
      // Ensure roles array always exists
      nu.roles = [nu.role];
    }
  } catch (e) {
    return u;
  }

  return nu;
};

  useEffect(() => {
    checkAuth();
    
    // Check for tracker logout status periodically
    const checkTrackerLogout = async () => {
      try {
        // Use AbortController for timeout (more compatible)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch('http://localhost:8765/logout-status', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.loggedOut) {
            console.log('[AuthContext] Tracker logout detected, logging out from web app');
            // Clear auth and redirect to login
            setUser(null);
            setMustResetPassword(false);
            localStorage.removeItem('token');
            localStorage.removeItem('mustResetPassword');
            localStorage.removeItem('selectedOrganization');
            localStorage.removeItem('organizationData');
            localStorage.removeItem('adminVerified');
            localStorage.removeItem('adminVerifiedAt');
            localStorage.removeItem('adminVerifiedUserEmail');
            localStorage.removeItem('isOrganizationAdmin');
            navigate('/login');
          }
        }
      } catch (error) {
        // Tracker not running or not accessible - ignore silently
        // This is expected if tracker is not installed
        // Suppress all errors including network errors, abort errors, and connection refused
        // These are normal when the tracker is not running
        if (error.name === 'AbortError' || 
            error.message?.includes('Failed to fetch') ||
            error.message?.includes('ERR_CONNECTION_REFUSED') ||
            error.message?.includes('NetworkError') ||
            error.message?.includes('Network request failed')) {
          // Silently ignore - tracker is not running, which is expected
          return;
        }
        // Only log unexpected errors
        console.error('[AuthContext] Unexpected tracker check error:', error);
      }
    };
    
    // Check every 10 seconds for tracker logout (reduced from 3 seconds to reduce load)
    const logoutCheckInterval = setInterval(checkTrackerLogout, 10000);
    
    return () => {
      clearInterval(logoutCheckInterval);
    };
  }, [navigate]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Don't fail silently - catch errors but don't redirect immediately
        let session;
        try {
          session = await authAPI.getCurrentUser();
        } catch (error) {
          // If session check fails, log but don't clear token immediately
          // This prevents redirect loops and frequent logouts on refresh
          console.warn('[AuthContext] Session check failed, but keeping token:', error);
          const status = error.response?.status;
          const errorDetail = error.response?.data?.detail || '';
          
          // Check if we're on login page - if so, don't do anything
          const currentPath = window.location.pathname;
          if (currentPath === '/login' || currentPath === '/register' || currentPath === '/landing') {
            setLoading(false);
            return;
          }
          
          // Only clear token if it's definitely invalid (401 with explicit token expiration/invalid error)
          // Don't clear on network errors, 404, or other temporary issues
          if (status === 401) {
            // Only clear if error explicitly mentions token expiration or invalid token
            const isTokenError = errorDetail.toLowerCase().includes('token') || 
                                errorDetail.toLowerCase().includes('expired') ||
                                errorDetail.toLowerCase().includes('invalid') ||
                                errorDetail.toLowerCase().includes('credentials');
            
            if (isTokenError) {
              console.error('[AuthContext] Token is invalid/expired, clearing auth');
              localStorage.removeItem('token');
              setUser(null);
              setMustResetPassword(false);
              setLoading(false);
              // Only redirect to login if not already there
              if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
                navigate('/login');
              }
              return;
            } else {
              // 401 but not a token error - might be permission issue, keep token
              console.warn('[AuthContext] 401 error but not token-related, keeping token');
              setLoading(false);
              return;
            }
          }
          
          // For 404, 500, network errors, etc. - keep token and user state
          // These are likely temporary issues, don't log user out
          console.warn('[AuthContext] Non-401 error, keeping token and user state. Status:', status);
          setLoading(false);
          return;
        }
        
        // Successfully got session - update user state (normalize roles)
        setUser(normalizeUserRoles(session.user));
        setMustResetPassword(session.must_reset_password);
        localStorage.setItem(
          'mustResetPassword',
          session.must_reset_password ? 'true' : 'false'
        );
        // Store organization slug if provided in session response
        if (session.organization_slug) {
          localStorage.setItem('selectedOrganization', session.organization_slug);
          console.log(`[AuthContext] Set selectedOrganization to: ${session.organization_slug}`);
        } else {
          console.warn(`[AuthContext] No organization_slug in session response. Current selectedOrganization: ${localStorage.getItem('selectedOrganization')}`);
        }
        
        // Try to configure activity tracker if user has employee_id (runs in background)
        if (session.user?.employee_id) {
          import('../utils/trackerConfig').then(({ sendTrackerConfigWithRetry }) => {
            // Delay a bit to ensure localStorage is set
            setTimeout(() => {
              sendTrackerConfigWithRetry(2, 1500).then(result => {
                if (result.success) {
                  console.log('[AuthContext] ✅ Tracker configured');
                }
              });
            }, 1000);
          }).catch(() => {
            // Ignore import errors
          });
        }
        const onboardingRequired =
          session.user?.role === 'EMPLOYEE' &&
          !!session.user?.employee_id &&
          (session.user?.is_onboarded === false || !session.user?.join_date);

        // if (session.must_reset_password && window.location.pathname !== '/reset-password') {
        //   navigate('/reset-password');
        // } else if (onboardingRequired && !window.location.pathname.startsWith('/employee/onboarding')) {
        //   navigate('/employee/onboarding');
        // }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      console.error('Error details:', {
        status: error.response?.status,
        message: error.response?.data?.detail || error.message,
        selectedOrganization: localStorage.getItem('selectedOrganization')
      });
      
      // Handle different error types
      const status = error.response?.status;
      
      // 401/403: Unauthorized/Forbidden - clear auth and redirect to login
      // But only if we're sure the token is invalid (not just a temporary network issue)
      if (status === 401 || status === 403) {
        const errorDetail = error.response?.data?.detail || '';
        const errorDetailLower = errorDetail.toLowerCase();
        
        // Only clear auth if it's explicitly an invalid token/credentials error
        // Don't clear on network errors, permission issues, or temporary problems
        const isTokenError = errorDetailLower.includes('token') || 
                            errorDetailLower.includes('credentials') || 
                            errorDetailLower.includes('expired') ||
                            errorDetailLower.includes('invalid') ||
                            errorDetailLower.includes('could not validate');
        
        if (isTokenError) {
          console.error('[AuthContext] Token error detected, clearing auth');
          localStorage.removeItem('token');
          localStorage.removeItem('mustResetPassword');
          localStorage.removeItem('selectedOrganization');
          localStorage.removeItem('organizationData');
          localStorage.removeItem('adminVerified');
          localStorage.removeItem('adminVerifiedAt');
          localStorage.removeItem('adminVerifiedUserEmail');
          localStorage.removeItem('isOrganizationAdmin');
          setMustResetPassword(false);
          setUser(null);
          
          // Redirect to login if not already there
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/login') && 
              !currentPath.includes('/register') && 
              !currentPath.includes('/landing') &&
              !currentPath.includes('/reset-password')) {
            navigate('/login');
          }
        } else {
          // For other 401/403 errors (like permission issues, network problems), keep token
          console.warn('[AuthContext] 401/403 error but not token-related, keeping user state. Error:', errorDetail);
          // Don't clear user state - might be temporary issue or permission problem
        }
      } 
      // 404: User not found - might be a temporary issue, don't clear auth immediately
      // This can happen if organization slug is missing or incorrect
      else if (status === 404) {
        console.warn('User not found in session check. This might be due to missing organization context.');
        const selectedOrg = localStorage.getItem('selectedOrganization');
        const token = localStorage.getItem('token');
        
        // If we have a token, don't immediately redirect - might be a temporary issue
        // Only redirect if we're sure it's a real auth problem
        if (token && selectedOrg) {
          console.warn('Have token and organization, but session check failed. This might be temporary.');
          console.warn('Not redirecting to login - will retry on next check.');
          // Don't redirect - just log the warning
          return;
        }
        
        // If we have a token but no organization selected, the user needs to select organization
        if (token && !selectedOrg) {
          console.warn('No organization selected. User may need to enter company code.');
          // Try to get organization from tempUserData if available
          const tempUserData = localStorage.getItem('tempUserData');
          if (tempUserData) {
            try {
              const userData = JSON.parse(tempUserData);
              // If we have temp user data, redirect to organization code screen
              const currentPath = window.location.pathname;
              if (!currentPath.includes('/login') && 
                  !currentPath.includes('/organization-code')) {
                // Don't clear token - just redirect to show organization code
                window.location.href = '/login?showOrgCode=true';
                return;
              }
            } catch (e) {
              console.error('Error parsing tempUserData:', e);
            }
          }
        }
        
        // Only redirect to login if we don't have a token at all
        if (!token) {
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/login') && 
              !currentPath.includes('/register') && 
              !currentPath.includes('/landing') &&
              !currentPath.includes('/reset-password') &&
              !currentPath.includes('/organization-code')) {
            setMustResetPassword(false);
            setUser(null);
            navigate('/login');
          }
        }
      }
      // Other errors: Log but don't clear auth
      else {
        console.error('Unexpected error in auth check:', error);
        // Don't clear auth for network errors or other issues
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      localStorage.setItem('token', response.access_token);
      localStorage.setItem(
        'mustResetPassword',
        response.must_reset_password ? 'true' : 'false'
      );
      
      // Store organization slug if provided (for tenant database access)
      if (response.organization_slug) {
        localStorage.setItem('selectedOrganization', response.organization_slug);
        console.log(`[AuthContext] ✅ Stored organization_slug in localStorage: ${response.organization_slug}`);
        // Also store organization data if available
        if (response.organization) {
          localStorage.setItem('organizationData', JSON.stringify(response.organization));
        }
      } else {
        console.warn(`[AuthContext] ⚠️ No organization_slug in login response!`);
        console.warn(`[AuthContext] Response keys:`, Object.keys(response));
        console.warn(`[AuthContext] This may cause empty pages if user data is in tenant database.`);
        // Try to get from existing localStorage
        const existingOrg = localStorage.getItem('selectedOrganization');
        if (existingOrg) {
          console.warn(`[AuthContext] Using existing selectedOrganization from localStorage: ${existingOrg}`);
        }
      }
      
      // Set user state immediately - this is critical to prevent redirect loops
      // Normalize roles/role casing to avoid client-side mismatches
      setUser(normalizeUserRoles(response.user));
      setMustResetPassword(response.must_reset_password);
      setLoading(false);
      
      // Configure Electron tracker automatically
      if (response.user && response.user.employee_id) {
        try {
          const apiBaseUrl = window.location.origin + '/api';
          await trackerConfigManager.configureTracker(
            response.access_token,
            response.user.employee_id,
            apiBaseUrl
          );
        } catch (error) {
          console.warn('Failed to configure Electron tracker:', error);
          // Don't fail login if tracker config fails
        }
      }
      
      // Don't navigate automatically - let the Login component handle navigation
      // This prevents conflicts and allows for organization code flow
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Wait for logout API to complete (with timeout handled in authAPI.logout)
      await authAPI.logout();
      
      // Clear all user data
      setUser(null);
      setMustResetPassword(false);
      localStorage.removeItem('mustResetPassword');
      // Clear organization selection so user must select it on next login
      localStorage.removeItem('selectedOrganization');
      localStorage.removeItem('organizationData');
      localStorage.removeItem('tempUserData');
      // Clear admin verification status
      localStorage.removeItem('adminVerified');
      localStorage.removeItem('adminVerifiedAt');
      localStorage.removeItem('adminVerifiedUserEmail');
      
      // Navigate to login page
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, clear local state and navigate
      // The backend will close stale sessions on next login
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('selectedOrganization');
      navigate('/login');
    }
  };

  // Don't show loading screen if we're on login/register/landing pages
  // This prevents blocking the login page while auth check happens
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isPublicPage = currentPath.includes('/login') || 
                       currentPath.includes('/register') || 
                       currentPath.includes('/landing');
  
  if (loading && !isPublicPage) {
    return <div>Loading...</div>;
  }

  // const changePassword = async (payload) => {
  //   const response = await authAPI.changePassword(payload);
  //   setMustResetPassword(false);
  //   localStorage.setItem('mustResetPassword', 'false');
  //   return response;
  // };

  const changePassword = async (payload) => {
  await authAPI.changePassword(payload);

  // Sync frontend state with backend
  await checkAuth();

  return true;
};

  const updateProfile = (updatedUserData) => {
    // Update user state with new profile data
    if (updatedUserData) {
      setUser(prevUser => ({
        ...prevUser,
        ...updatedUserData
      }));
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, register, mustResetPassword, changePassword, refreshUser: checkAuth, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
