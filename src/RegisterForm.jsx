import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { organizationAPI, subscriptionAPI } from './services/api';
import { FiUser, FiShield, FiEye, FiEyeOff, FiMail, FiLock, FiBriefcase, FiHash, FiCheck, FiLoader } from 'react-icons/fi';
import Logo from './components/Logo';

export default function RegisterForm() {
  const [activeTab, setActiveTab] = useState('hr-employee'); // 'hr-employee' or 'org-admin'
  
  // HR/Employee form data
  const [hrEmployeeData, setHrEmployeeData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    department: '',
    company_code: '', // Company code for organization selection
  });
  
  // Company code validation state
  const [companyCodeValidating, setCompanyCodeValidating] = useState(false);
  const [companyCodeError, setCompanyCodeError] = useState('');
  const [validatedOrganization, setValidatedOrganization] = useState(null);

  // Organization Admin form data
  const [orgAdminData, setOrgAdminData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'ADMIN',
    department: '',
    organization_employee_id: '', // Required for Organization Admin
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailError, setEmailError] = useState({ hrEmployee: '', orgAdmin: '' });
  const [showPassword, setShowPassword] = useState({ hrEmployee: false, orgAdmin: false });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const navigate = useNavigate();
  const { register } = useAuth();

  // Check for selected plan on component mount
  useEffect(() => {
    const planData = localStorage.getItem('selectedPlan');
    if (planData) {
      try {
        const plan = JSON.parse(planData);
        setSelectedPlan(plan);
      } catch (e) {
        console.error('Error parsing selected plan:', e);
      }
    }
  }, []);

  const isValidEmail = (email) => {
    const emailPattern =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return emailPattern.test(email.trim());
  };

  const handleEmailChange = (value, tab) => {
    const newData = tab === 'hrEmployee' 
      ? { ...hrEmployeeData, email: value }
      : { ...orgAdminData, email: value };
    
    if (tab === 'hrEmployee') {
      setHrEmployeeData(newData);
    } else {
      setOrgAdminData(newData);
    }

    if (!value) {
      setEmailError({ ...emailError, [tab]: 'Email is required' });
    } else if (!isValidEmail(value)) {
      setEmailError({ ...emailError, [tab]: 'Please enter a valid email address' });
    } else {
      setEmailError({ ...emailError, [tab]: '' });
    }
  };

  const togglePasswordVisibility = (tab) => {
    setShowPassword({ ...showPassword, [tab]: !showPassword[tab] });
  };

  // Validate company code
  const validateCompanyCode = async (companyCode) => {
    if (!companyCode || !companyCode.trim()) {
      setCompanyCodeError('');
      setValidatedOrganization(null);
      return;
    }

    setCompanyCodeValidating(true);
    setCompanyCodeError('');
    setValidatedOrganization(null);

    try {
      // Use secure code verification instead of search
      const org = await organizationAPI.verifyCode(companyCode.trim());
      if (org) {
        setValidatedOrganization(org);
        setCompanyCodeError('');
        // Store organization info for registration
        localStorage.setItem('selectedOrganization', org.slug);
        localStorage.setItem('organizationData', JSON.stringify(org));
      } else {
        setCompanyCodeError('Invalid company code. Please check your code and try again.');
        setValidatedOrganization(null);
      }
    } catch (err) {
      console.error('Company code validation error:', err);
      setCompanyCodeError(
        err.response?.data?.detail || 
        'Invalid company code. Please check your code and try again.'
      );
      setValidatedOrganization(null);
    } finally {
      setCompanyCodeValidating(false);
    }
  };

  const handleHrEmployeeSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!hrEmployeeData.email || !isValidEmail(hrEmployeeData.email)) {
      setEmailError({ ...emailError, hrEmployee: 'Please enter a valid email address' });
      return;
    }
    
    // Company code is required for all candidate and employee registrations
    if (!hrEmployeeData.company_code || !hrEmployeeData.company_code.trim()) {
      setError('Company code is required. Please enter your company code.');
      return;
    }

    if (!validatedOrganization) {
      setError('Please validate your company code first.');
      return;
    }
    
    // Department is optional for all roles - HR can assign it later
    
    try {
      console.log('Submitting HR/Employee registration:', hrEmployeeData);
      console.log('Organization:', validatedOrganization);
      // Clear Organization Admin flag if it exists (in case user switched tabs)
      localStorage.removeItem('isOrganizationAdmin');
      // Pass company_code to registration
      const registrationData = {
        ...hrEmployeeData,
        company_code: validatedOrganization.slug
      };
      await register(registrationData);
      setSuccess(true);
      setError('');
      // Show success message for 2 seconds, then redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.detail || 'Registration failed');
      setSuccess(false);
    }
  };

  const handleOrgAdminSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!orgAdminData.email || !isValidEmail(orgAdminData.email)) {
      setEmailError({ ...emailError, orgAdmin: 'Please enter a valid email address' });
      return;
    }

    // Validate organization employee ID requirement
    if (!orgAdminData.organization_employee_id || !orgAdminData.organization_employee_id.trim()) {
      setError('Organization Employee ID is required for Organization Admin registration');
      return;
    }

    try {
      console.log('Submitting Organization Admin registration:', orgAdminData);
      await register(orgAdminData);
      // Store flag to indicate this is an Organization Admin registration
      localStorage.setItem('isOrganizationAdmin', 'true');
      setSuccess(true);
      setError('');
      // Show success message for 2 seconds, then redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.detail || 'Registration failed');
      setSuccess(false);
    }
  };

  const departmentOptions = [
    { value: 'Engineering', label: 'Engineering' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Human Resources', label: 'Human Resources' },
    { value: 'Operations', label: 'Operations' },
    { value: 'IT', label: 'IT' },
    { value: 'Customer Support', label: 'Customer Support' },
    { value: 'Product', label: 'Product' },
    { value: 'Design', label: 'Design' },
  ];

  return (
        <div className="min-h-screen bg-[#e8f0f5] grid grid-cols-1 lg:grid-cols-[35%_65%] ">

      <div className="hidden lg:flex items-center justify-center bg-[#181c52]">
    
       <img
    src="/images/HR-HIVE (1).png"
    alt="HR Hive"
    className="max-w-md w-full object-contain"
  />
      </div>
      <div className="flex flex-col justify-center items-start px-6 sm:px-12 lg:px-20 relative">


      <div className="max-w-2xl w-full relative lg:ml-16 z-10 animate-slide-down">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-[#1e3a5f] px-8 py-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <Logo size="md" showTagline={false} dark={true} />
            </div>
            <h2 className="text-3xl font-bold text-white">Create Your Account</h2>
            <p className="text-gray-200 mt-2">Join HR-Hive and transform your HR operations</p>
            {selectedPlan && (
              <div className="mt-4 p-3 bg-white/10 rounded-lg backdrop-blur-sm animate-fade-in">
                <p className="text-sm text-white/80">
                  Selected Plan: <span className="font-semibold">{selectedPlan.name}</span>
                  {selectedPlan.name !== 'Free' && (
                    <span className="ml-2 text-xs">(Payment will be processed after organization creation)</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex">
              <button
                onClick={() => {
                  setActiveTab('hr-employee');
                  setError('');
                }}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-semibold transition-all duration-200 ${
                  activeTab === 'hr-employee'
                    ? 'bg-white text-[#1e3a5f] border-b-2 border-[#1e3a5f]'
                    : 'text-gray-600 hover:text-[#1e3a5f] hover:bg-gray-100'
                }`}
              >
                <FiUser className="w-5 h-5" />
                <span>HR & Employee</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('org-admin');
                  setError('');
                }}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-semibold transition-all duration-200 ${
                  activeTab === 'org-admin'
                    ? 'bg-white text-[#1e3a5f] border-b-2 border-[#1e3a5f]'
                    : 'text-gray-600 hover:text-[#1e3a5f] hover:bg-gray-100'
                }`}
              >
                <FiShield className="w-5 h-5" />
                <span>Organization Admin</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {success && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-6 animate-slide-down">
                <p className="text-green-700 font-semibold">
                  ✅ Registered successfully! Redirecting to login page...
                </p>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6 animate-slide-down">
                <p className="text-red-700">{error}</p>
          </div>
        )}

            {/* HR & Employee Registration Form */}
            {activeTab === 'hr-employee' && (
              <form onSubmit={handleHrEmployeeSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
            <input
              type="text"
                      value={hrEmployeeData.first_name}
                      onChange={(e) => setHrEmployeeData({ ...hrEmployeeData, first_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] bg-white text-gray-900 transition-all"
              required
            />
          </div>
          <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
            <input
              type="text"
                      value={hrEmployeeData.last_name}
                      onChange={(e) => setHrEmployeeData({ ...hrEmployeeData, last_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] bg-white text-gray-900 transition-all"
              required
            />
          </div>
                </div>

          <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
                      value={hrEmployeeData.email}
                      onChange={(e) => handleEmailChange(e.target.value, 'hrEmployee')}
                      onBlur={(e) => handleEmailChange(e.target.value, 'hrEmployee')}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] bg-white text-gray-900 transition-all ${
                        emailError.hrEmployee ? 'border-red-500' : 'border-gray-300'
                      }`}
              required
              placeholder="Enter your email"
            />
                  </div>
                  {emailError.hrEmployee && (
                    <p className="text-sm text-red-600 mt-1">{emailError.hrEmployee}</p>
            )}
          </div>

          <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
            <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                      type={showPassword.hrEmployee ? 'text' : 'password'}
                      value={hrEmployeeData.password}
                      onChange={(e) => setHrEmployeeData({ ...hrEmployeeData, password: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] bg-white text-gray-900 transition-all"
                required
                      minLength={6}
                      placeholder="Enter your password"
              />
              <button
                type="button"
                      onClick={() => togglePasswordVisibility('hrEmployee')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#1e3a5f]"
              >
                      {showPassword.hrEmployee ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
              </button>
            </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={hrEmployeeData.role}
                    onChange={(e) => {
                      setHrEmployeeData({ 
                        ...hrEmployeeData, 
                        role: e.target.value
                      });
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] bg-white text-gray-900 transition-all"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="HR_MANAGER">HR Manager</option>
                    <option value="CANDIDATE">Candidate</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="ADMIN">Admin</option>
                    <option value="ORG_ADMIN">ORG Admin</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {hrEmployeeData.role === 'EMPLOYEE'
                      ? 'Access payroll, leave management, and employee services'
                      : hrEmployeeData.role === 'HR_MANAGER'
                      ? 'Manage HR operations, employee data, and organizational processes'
                      : hrEmployeeData.role === 'MANAGER'
                      ? 'Manage your team, approve requests, and oversee direct reports'
                      : hrEmployeeData.role === 'ACCOUNTANT'
                      ? 'Register as accountant - you will be assigned ACCOUNTS role by admin to access timesheet approval and payroll processing'
                      : hrEmployeeData.role === 'ADMIN'
                      ? 'Register as Admin for your specific organization. You will have admin privileges within your organization only.'
                      : hrEmployeeData.role === 'ORG_ADMIN'
                      ? 'Register as Organization Admin. You will have elevated organization-level privileges; the organization must verify your account.'
                      : 'Browse jobs, apply for positions, and track your applications'}
                  </p>
                    {/* No special validation needed for organization-specific Admin role */}
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Code <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" />
              <input
                type="text"
                value={hrEmployeeData.company_code}
                onChange={(e) => {
                  setHrEmployeeData({ ...hrEmployeeData, company_code: e.target.value });
                  setCompanyCodeError('');
                  setValidatedOrganization(null);
                }}
                className={`w-full pl-10 pr-24 py-3 border rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] bg-white text-gray-900 transition-all ${
                  companyCodeError ? 'border-red-500' : validatedOrganization ? 'border-green-500' : 'border-gray-300'
                }`}
                placeholder="Enter your company code"
                required
                disabled={companyCodeValidating}
              />
              {/* Verify Button inside input */}
              <button
                type="button"
                onClick={() => {
                  if (hrEmployeeData.company_code && hrEmployeeData.company_code.trim()) {
                    validateCompanyCode(hrEmployeeData.company_code);
                  }
                }}
                disabled={companyCodeValidating || !hrEmployeeData.company_code || !hrEmployeeData.company_code.trim()}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  companyCodeValidating
                    ? 'bg-[#1e3a5f] text-white cursor-wait'
                    : validatedOrganization
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-[#1e3a5f] text-white hover:bg-[#2a4a6f] disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {companyCodeValidating ? (
                  <span className="flex items-center space-x-1">
                    <FiLoader className="animate-spin w-3 h-3" />
                    <span>Verifying...</span>
                  </span>
                ) : validatedOrganization ? (
                  <span className="flex items-center space-x-1">
                    <FiCheck className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                ) : (
                  'Verify'
                )}
              </button>
            </div>
            {companyCodeError && (
              <p className="text-sm text-red-600 mt-1 animate-fade-in">{companyCodeError}</p>
            )}
            {validatedOrganization && (
              <p className="text-sm text-green-600 mt-1 animate-fade-in">
                ✓ Validated: {validatedOrganization.name}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Enter your company code and click Verify to register with your organization
            </p>
          </div>

          <button
            type="submit"
                  className="w-full bg-[#1e3a5f] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#2a4a6f] transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
          >
            Register
          </button>
        </form>
            )}

            {/* Organization Admin Registration Form */}
            {activeTab === 'org-admin' && (
              <form onSubmit={handleOrgAdminSubmit} className="space-y-6">
                {/* Info Banner */}
                <div className="bg-[#1e3a5f]/10 border-l-4 border-[#1e3a5f] p-4 rounded-lg mb-6">
                  <div className="flex items-start">
                    <FiShield className="w-5 h-5 text-[#1e3a5f] mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-[#1e3a5f] mb-1">Organization Admin Registration</h3>
                      <p className="text-xs text-gray-600">
                        For system administrators who manage all organizations. You must have an Organization Employee ID to register.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={orgAdminData.first_name}
                      onChange={(e) => setOrgAdminData({ ...orgAdminData, first_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={orgAdminData.last_name}
                      onChange={(e) => setOrgAdminData({ ...orgAdminData, last_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Employee ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiHash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={orgAdminData.organization_employee_id}
                      onChange={(e) => setOrgAdminData({ ...orgAdminData, organization_employee_id: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] bg-white text-gray-900"
                      placeholder="Enter your organization employee ID"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This ID is provided by your organization's system administrator
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={orgAdminData.email}
                      onChange={(e) => handleEmailChange(e.target.value, 'orgAdmin')}
                      onBlur={(e) => handleEmailChange(e.target.value, 'orgAdmin')}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] bg-white text-gray-900 ${
                        emailError.orgAdmin ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  {emailError.orgAdmin && (
                    <p className="text-sm text-red-600 mt-1">{emailError.orgAdmin}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword.orgAdmin ? 'text' : 'password'}
                      value={orgAdminData.password}
                      onChange={(e) => setOrgAdminData({ ...orgAdminData, password: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] bg-white text-gray-900 transition-all"
                      required
                      minLength={6}
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('orgAdmin')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#1e3a5f]"
                    >
                      {showPassword.orgAdmin ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department <span className="text-gray-500">(Optional)</span>
                  </label>
                  <div className="relative">
                    <FiBriefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={orgAdminData.department}
                      onChange={(e) => setOrgAdminData({ ...orgAdminData, department: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] bg-white text-gray-900"
                      placeholder="Enter department (optional)"
                    />
                  </div>
                </div>

                <div className="bg-[#1e3a5f]/10 border border-[#1e3a5f]/20 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Note:</strong> After registration, you'll receive a verification code via email. 
                    You'll need to verify your identity every time you log in to access the Organizations Admin Panel.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1e3a5f] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#2a4a6f] transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                >
                  Register as Organization Admin
                </button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600">
          Already have an account?{' '}
                <Link to="/login" className="text-[#1e3a5f] hover:text-[#2a4a6f] font-semibold">
            Login
          </Link>
        </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
