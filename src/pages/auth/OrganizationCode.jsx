import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiCheck, FiArrowRight, FiLoader } from 'react-icons/fi';
import { organizationAPI } from '../../services/api';
import Logo from '../../components/Logo';

export default function OrganizationCode({ onOrganizationSelected, email = null }) {
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [checkingExists, setCheckingExists] = useState(true);
  const [organizationsExist, setOrganizationsExist] = useState(false);
  const navigate = useNavigate();
  
  // Try to get email from localStorage if not provided as prop (for login flow)
  const userEmail = email || (() => {
    try {
      const tempUserData = localStorage.getItem('tempUserData');
      if (tempUserData) {
        const userData = JSON.parse(tempUserData);
        return userData.email || null;
      }
    } catch (e) {
      // Ignore errors
    }
    return null;
  })();

  // Check if any organizations exist on mount
  useEffect(() => {
    const checkOrganizations = async () => {
      try {
        // Defensive check: ensure checkExists method exists
        if (!organizationAPI || typeof organizationAPI.checkExists !== 'function') {
          console.error('organizationAPI.checkExists is not available');
          // Assume organizations exist if API method is not available
          setOrganizationsExist(true);
          setCheckingExists(false);
          return;
        }
        const result = await organizationAPI.checkExists();
        setOrganizationsExist(result.exists);
      } catch (err) {
        console.error('Failed to check organizations:', err);
        // Assume organizations exist if check fails
        setOrganizationsExist(true);
      } finally {
        setCheckingExists(false);
      }
    };
    checkOrganizations();
  }, []);

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Please enter your company code');
      return;
    }

    setLoading(true);
    setError(null);
    setOrganization(null);

    try {
      // Use secure code verification - pass email if available to verify user belongs to company
      const org = await organizationAPI.verifyCode(companyName.trim(), userEmail);
      setOrganization(org);
    } catch (err) {
      console.error('Failed to verify company code:', err);
      setError(
        err.response?.data?.detail || 
        'Invalid company code. Please check your code and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (organization) {
      // Store organization in localStorage
      localStorage.setItem('selectedOrganization', organization.slug);
      localStorage.setItem('organizationData', JSON.stringify(organization));
      
      // Call callback if provided, otherwise navigate
      if (onOrganizationSelected) {
        onOrganizationSelected(organization);
      } else {
        // Navigate to appropriate dashboard based on user role
        navigate('/');
      }
    }
  };

  // Show loading state while checking if organizations exist
  if (checkingExists) {
    return (
      <div className="min-h-screen bg-[#e8f0f5] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#1e3a5f]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-md w-full text-center relative z-10">
          <div className="flex items-center justify-center mb-4">
            <Logo size="md" showTagline={false} />
          </div>
          <FiLoader className="w-8 h-8 animate-spin mx-auto text-[#1e3a5f]" />
          <p className="mt-4 text-gray-600">Checking organizations...</p>
        </div>
      </div>
    );
  }

  // If no organizations exist, show error message
  if (!organizationsExist) {
    return (
      <div className="min-h-screen bg-[#e8f0f5] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#1e3a5f]/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-md w-full relative z-10">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-200">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <Logo size="md" showTagline={false} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No Organizations Found
              </h2>
              <p className="text-gray-600 mb-6">
                No organizations are currently registered in the system. Please contact your administrator to register your organization.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
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

      {/* Logo/Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-down mb-8">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <Logo size="md" showTagline={false} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            Enter Company Code
          </h2>
          <p className="text-sm text-gray-600">
            Please enter your company code to continue. Your company code was sent to your email when your organization was registered.
          </p>
        </div>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-200">
          <form onSubmit={handleVerifyCode} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg relative animate-slide-down mb-6" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {/* Company Code Input */}
            <div>
              <label htmlFor="companyCode" className="block text-sm font-medium text-gray-700 mb-2">
                Company Code <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="companyCode"
                  type="text"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setError(null);
                    setOrganization(null);
                  }}
                  placeholder="Enter your company code (e.g., abc-company)"
                  className="appearance-none block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 bg-white text-gray-900 focus:outline-none focus:ring-[#1e3a5f] focus:border-[#1e3a5f] sm:text-sm transition-all"
                  required
                  autoFocus
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Your company code is the URL-friendly version of your company name (lowercase with hyphens)
              </p>
            </div>

            {/* Verify Code Button */}
            <div>
              <button
                type="submit"
                disabled={loading || !companyName.trim()}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-[#1e3a5f] hover:bg-[#2a4a6f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a5f] transition-all transform hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <FiLoader className="w-5 h-5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <FiCheck className="w-5 h-5" />
                    <span>Verify Code</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Organization Details */}
          {organization && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-lg flex items-center justify-center">
                      <FiBriefcase className="w-5 h-5 text-[#1e3a5f]" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {organization.name}
                    </h3>
                    {organization.industry && (
                      <p className="text-sm text-gray-600 mb-1">
                        {organization.industry}
                        {organization.company_size && ` • ${organization.company_size} employees`}
                      </p>
                    )}
                    {organization.description && (
                      <p className="text-sm text-gray-600 mt-2">
                        {organization.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleConfirm}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 transition-all transform hover:scale-[1.02] hover:shadow-xl"
              >
                <span>Continue with {organization.name}</span>
                <FiArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

