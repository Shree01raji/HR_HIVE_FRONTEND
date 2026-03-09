import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI, organizationAPI } from '../../services/api';
import OrganizationCode from './OrganizationCode';
import AdminVerification from './AdminVerification';
import Logo from '../../components/Logo';


export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showOrganizationCode, setShowOrganizationCode] = useState(false);
  // Initialize from URL parameter immediately
  const urlParams = new URLSearchParams(window.location.search);
  const [showAdminVerification, setShowAdminVerification] = useState(
    urlParams.get('showAdminVerification') === 'true'
  );
  const [ssoProviders, setSsoProviders] = useState([]);
  const [loadingSSO, setLoadingSSO] = useState(false);
  const { login, refreshUser, user } = useAuth();
  const navigate = useNavigate();

  // Check URL parameter to force show organization code or admin verification - MUST be before any conditional returns
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showOrgCode') === 'true') {
      setShowOrganizationCode(true);
    }
    if (urlParams.get('showAdminVerification') === 'true') {
      console.log('[Login] Setting showAdminVerification to true from URL parameter');
      setShowAdminVerification(true);
      // Clear any existing verification status when showing verification screen
      localStorage.removeItem('adminVerified');
      localStorage.removeItem('adminVerifiedAt');
      localStorage.removeItem('adminVerifiedUserEmail');
    }
  }, []);
  
  // Also check URL parameter on location change (in case navigation happens)
  useEffect(() => {
    const checkUrlParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('showAdminVerification') === 'true' && !showAdminVerification) {
        console.log('[Login] URL parameter detected, setting showAdminVerification');
        setShowAdminVerification(true);
        localStorage.removeItem('adminVerified');
        localStorage.removeItem('adminVerifiedAt');
        localStorage.removeItem('adminVerifiedUserEmail');
      }
    };
    
    checkUrlParams();
    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', checkUrlParams);
    return () => window.removeEventListener('popstate', checkUrlParams);
  }, [showAdminVerification]);
  
  // Also check if user is admin/HR and needs verification when component mounts or user changes
  useEffect(() => {
    // Don't override URL parameter - if showAdminVerification is already set from URL, don't change it
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('showAdminVerification') === 'true') {
      return; // URL parameter takes priority
    }
    
    if (user) {
      const userRole = user.role?.toUpperCase();
      const isAdmin = userRole === 'ADMIN' || userRole === 'HR_MANAGER' || userRole === 'HR_ADMIN';
      
      // Check if admin verification is needed
      const adminVerified = localStorage.getItem('adminVerified') === 'true';
      const verifiedAt = localStorage.getItem('adminVerifiedAt');
      
      if (isAdmin && !adminVerified) {
        // Check if verification has expired (30 minutes)
        if (verifiedAt) {
          const verifiedTime = new Date(verifiedAt);
          const now = new Date();
          const minutesSinceVerification = (now - verifiedTime) / (1000 * 60);
          
          if (minutesSinceVerification >= 30) {
            console.log('[Login] Admin verification expired, showing verification screen');
            setShowAdminVerification(true);
          }
        } else {
          // No verification found, show verification screen
          console.log('[Login] Admin/HR user needs verification, showing verification screen');
          setShowAdminVerification(true);
        }
      }
    }
  }, [user]);

  // Fetch available SSO providers
  useEffect(() => {
    const fetchSSOProviders = async () => {
      try {
        const providers = await authAPI.getSSOProviders();
        if (providers.enabled && providers.providers.length > 0) {
          setSsoProviders(providers.providers);
        }
      } catch (err) {
        console.warn('Could not fetch SSO providers:', err);
        // SSO is optional, so don't show error
      }
    };
    fetchSSOProviders();
  }, []);

  const handleSSOLogin = async (provider) => {
    setLoadingSSO(true);
    setError('');
    try {
      const response = await authAPI.initiateSSO(provider);
      if (response.authorization_url) {
        // Redirect to SSO provider
        window.location.href = response.authorization_url;
      } else {
        setError('Failed to initiate SSO login. Please try again.');
        setLoadingSSO(false);
      }
    } catch (err) {
      console.error('SSO initiation error:', err);
      setError(err.response?.data?.detail || 'Failed to initiate SSO login. Please try again.');
      setLoadingSSO(false);
    }
  };

  const isValidEmail = (email) => {
    const emailPattern =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return emailPattern.test(email.trim());
  };

  const handleEmailChange = (value) => {
    setFormData((prev) => ({ ...prev, email: value }));
    if (!value) {
      setEmailError('Email is required');
    } else if (!isValidEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') {
      handleEmailChange(value);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.email || !isValidEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    console.log('Submitting login form with:', formData);
    
    try {
      const response = await authAPI.login(formData);
      // Store token and user info
      localStorage.setItem('token', response.access_token);
      localStorage.setItem(
        'mustResetPassword',
        response.must_reset_password ? 'true' : 'false'
      );
      
      // Store organization slug if provided in login response (for employees in tenant DB)
      if (response.organization_slug) {
        localStorage.setItem('selectedOrganization', response.organization_slug);
        // Also fetch and store organization data if available
        try {
          const orgData = await organizationAPI.get(response.organization_slug);
          if (orgData) {
            localStorage.setItem('organizationData', JSON.stringify(orgData));
          }
        } catch (err) {
          console.warn('Could not fetch organization data:', err);
          // Continue without organization data - the slug is enough
        }
      } else {
        // Clear any previous organization selection to ensure clean flow
        localStorage.removeItem('selectedOrganization');
        localStorage.removeItem('organizationData');
      }
      
      // IMPORTANT: Set user state in AuthContext to prevent redirect loops
      // This ensures RequireAuth component recognizes the user is logged in
      await refreshUser();
      
      // Store user info temporarily for organization selection
      localStorage.setItem('tempUserData', JSON.stringify(response.user));
      
      // Send config to activity tracker (if installed)
      // This runs in the background and won't block login
      try {
        const { sendTrackerConfigWithRetry } = await import('../../utils/trackerConfig');
        // Try to send config to tracker (retry up to 3 times with 2s delay)
        sendTrackerConfigWithRetry(3, 2000).then(result => {
          if (result.success) {
            console.log('[Login] ✅ Tracker configured successfully');
          } else {
            console.log('[Login] ℹ️ Tracker not running or not installed (this is okay)');
          }
        });
      } catch (err) {
        // Ignore errors - tracker config is optional
        console.log('[Login] Could not send tracker config:', err);
      }
      
      // Check if user is organization admin
      const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                                   !response.user.employee_id || 
                                   response.user.employee_id === 0 ||
                                   (response.user.employee_id && response.user.department === null);
      
      // For organization admins, skip organization code and go directly to organizations page
      if (isOrganizationAdmin && (response.user.role === 'ADMIN' || response.user.role === 'SUPER_ADMIN')) {
        localStorage.removeItem('tempUserData');
        navigate('/admin/organizations');
        return;
      }
      
      // Always show organization code screen for regular employees/candidates
      // Workflow: Login → Company Code → Portal
      // This ensures users always enter their company code for security and consistency
      setShowOrganizationCode(true);
    } catch (err) {
      console.error('Login error:', err);
      console.error('Response:', err.response);
      
      // Handle different error types with user-friendly messages
      let errorMessage = 'Failed to login. Please try again.';
      
      if (err.status === 502 || err.response?.status === 502) {
        errorMessage = 'Service temporarily unavailable. The backend server may be down. Please try again in a few moments or contact support.';
      } else if (err.response?.status === 401) {
        // Check if it's a token expiration or invalid credentials
        const detail = err.response?.data?.detail || '';
        if (detail.includes('expired') || detail.includes('invalid') || detail.includes('token')) {
          errorMessage = 'Your session has expired. Please login again.';
          // Clear any stale tokens
          localStorage.removeItem('token');
          localStorage.removeItem('mustResetPassword');
        } else {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        }
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (err.response?.status === 503) {
        errorMessage = 'Service temporarily unavailable. Please try again in a few moments.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message && !err.message.includes('Network Error')) {
        errorMessage = err.message;
      } else if (err.response?.statusText) {
        errorMessage = `Login failed: ${err.response.statusText}`;
      } else if (err.message?.includes('Network Error')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      }
      
      setError(errorMessage);
    }
  };

  const handleOrganizationSelected = async (organization) => {
    // Organization selected, now complete login flow
    const tempUserData = JSON.parse(localStorage.getItem('tempUserData') || '{}');
    
    // Store organization
    localStorage.setItem('selectedOrganization', organization.slug);
    localStorage.setItem('organizationData', JSON.stringify(organization));
    
    // Refresh user in AuthContext to ensure user state is set
    await refreshUser();
    
    // Clean up temp data
    localStorage.removeItem('tempUserData');
    
    // Check if user is ADMIN or HR_MANAGER - show verification page
    if (tempUserData.role === 'ADMIN' || tempUserData.role === 'SUPER_ADMIN' || tempUserData.role === 'HR_MANAGER') {
      setShowAdminVerification(true);
      return;
    }
    
    // For non-admin users, navigate normally
    const mustReset = localStorage.getItem('mustResetPassword') === 'true';
    
    if (mustReset) {
      navigate('/reset-password');
    } else if (tempUserData.role === 'CANDIDATE') {
      navigate('/candidate');
    } else {
      navigate('/');
    }
  };

  const handleAdminVerified = async () => {
    // Admin/HR verified, navigate to appropriate dashboard
    // Refresh user to get latest data
    await refreshUser();
    
    // Get user data from tempUserData or current user
    const tempUserData = JSON.parse(localStorage.getItem('tempUserData') || '{}');
    const userRole = tempUserData.role || user?.role;
    
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      // Check if this is Organization Admin
      const isOrganizationAdmin = localStorage.getItem('isOrganizationAdmin') === 'true' ||
                                 !tempUserData.employee_id || 
                                 tempUserData.employee_id === 0 ||
                                 (tempUserData.employee_id && tempUserData.department === null);
      // Clear the flag after checking
      if (localStorage.getItem('isOrganizationAdmin') === 'true') {
        localStorage.removeItem('isOrganizationAdmin');
      }
      if (isOrganizationAdmin) {
        navigate('/admin/organizations');
      } else {
        navigate('/admin');
      }
    } else if (userRole === 'HR_MANAGER' || userRole === 'HR_ADMIN') {
      // HR managers always go to admin dashboard
      navigate('/admin');
    } else {
      // Default to admin dashboard for other admin roles
      navigate('/admin');
    }
    
    // Clean up temp data after navigation
    localStorage.removeItem('tempUserData');
  };

  // Show admin verification if admin needs to verify - CHECK THIS FIRST
  // This must be checked before any other conditions to ensure verification screen appears
  if (showAdminVerification) {
    console.log('[Login] Rendering AdminVerification component');
    return <AdminVerification onVerified={handleAdminVerified} />;
  }

  // Show organization code input if login was successful but no organization selected
  if (showOrganizationCode) {
    return <OrganizationCode onOrganizationSelected={handleOrganizationSelected} />;
  }
  
  // If user is authenticated and admin/HR but verification screen not shown, redirect to show it
  if (user) {
    const userRole = user.role?.toUpperCase();
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'HR_MANAGER' || userRole === 'HR_ADMIN';
    const adminVerified = localStorage.getItem('adminVerified') === 'true';
    
    if (isAdmin && !adminVerified && !showAdminVerification) {
      console.log('[Login] User is admin/HR but verification not shown, redirecting to verification');
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('showAdminVerification') !== 'true') {
        navigate('/login?showAdminVerification=true', { replace: true });
        return null;
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#e8f0f5] grid grid-cols-1 lg:grid-cols-[35%_65%] relative overflow-hidden">

      <div className="hidden lg:flex items-center justify-center bg-[#181c52]">
    
       <img
    src="/images/HR-HIVE (1).png"
    alt="HR Hive"
    className="max-w-md w-full object-contain"
  />
  
      </div>
      <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 relative">

      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#1e3a5f]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl"></div>
      </div>

      {/* Logo/Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-down mb-8">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <Logo size="md" showTagline={false} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-sm text-gray-600">
            Sign in to your HR-Hive account
          </p>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg relative animate-slide-down mb-6" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={(e) => handleEmailChange(e.target.value)}
                  className={`appearance-none block w-full px-4 py-3 border rounded-lg shadow-sm placeholder-gray-400 bg-white text-gray-900 focus:outline-none sm:text-sm transition-all ${
                    emailError
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-[#1e3a5f] focus:border-[#1e3a5f]'
                  }`}
                  placeholder="Enter your email"
                />
                {emailError && (
                  <p className="text-sm text-red-600 mt-1 animate-fade-in">{emailError}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-[#1e3a5f] focus:border-[#1e3a5f] sm:text-sm pr-16 transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 px-3 text-sm text-[#1e3a5f] hover:text-[#2a4a6f] focus:outline-none transition-colors font-medium"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loadingSSO}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-[#1e3a5f] hover:bg-[#2a4a6f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a5f] transition-all transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingSSO ? 'Loading...' : 'Sign in'}
              </button>
            </div>

            {/* SSO Login Options */}
            {ssoProviders.length > 0 && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {/* {ssoProviders.includes('google') && (
                    <button
                      type="button"
                      onClick={() => handleSSOLogin('google')}
                      disabled={loadingSSO}
                      className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a5f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </button>
                  )} */}

                  {ssoProviders.includes('microsoft') && (
                    <button
                      type="button"
                      onClick={() => handleSSOLogin('microsoft')}
                      disabled={loadingSSO}
                      className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a5f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23" fill="none">
                        <rect x="0" y="0" width="10" height="10" fill="#F25022" />
                        <rect x="12" y="0" width="10" height="10" fill="#7FBA00" />
                        <rect x="0" y="12" width="10" height="10" fill="#00A4EF" />
                        <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
                      </svg>
                      Continue with Microsoft
                    </button>
                  )}

                  {ssoProviders.includes('oauth2') && (
                    <button
                      type="button"
                      onClick={() => handleSSOLogin('oauth2')}
                      disabled={loadingSSO}
                      className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a5f] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Continue with SSO
                    </button>
                  )}
                </div>
              </>
            )}

            {/* <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-[#1e3a5f] hover:text-[#2a4a6f] transition-colors">
                  Register here
                </Link>
              </p>
            </div> */}
          </form>
        </div>
      </div>
    </div>
  </div>
  );
}
