import axios from 'axios';

// Determine base URL:
// - If VITE_API_BASE_URL is set and not empty, use it (for custom deployments)
// - Otherwise, use relative path '/api' which works with:
//   * Vite dev server proxy (development)
//   * Nginx reverse proxy (production)
const getBaseURL = () => {
  // Get environment variable (will be undefined, empty string, or a URL)
  // During build, Vite replaces import.meta.env.VITE_API_BASE_URL with the actual value
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  // Debug: Log what we got
  console.log('[API Config] VITE_API_BASE_URL value:', envUrl, 'Type:', typeof envUrl);
  
  // FOR PRODUCTION: Always use '/api' for Nginx reverse proxy
  // Only use env URL in development if explicitly set and not the old IP address
  // Ignore old IP-based URLs (http://72.61.172.7:8000/) - these don't work with Nginx
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    // Check if it's the old IP address - ignore it
    if (envUrl.includes('72.61.172.7') || envUrl.includes('localhost:8000')) {
      console.warn('[API Config] Ignoring old IP-based URL, using /api instead:', envUrl);
    } else if (!envUrl.startsWith('/')) {
      // Only use full URLs if they're not the old IP
      console.log('[API Config] Using VITE_API_BASE_URL:', envUrl);
      return envUrl;
    }
  }
  
  // ALWAYS default to '/api' - works with both Vite proxy and Nginx
  // This is the production default for Nginx reverse proxy
  const baseURL = '/api';
  console.log('[API Config] Using default baseURL:', baseURL);
  return baseURL;
};

// Set baseURL immediately - this runs at module load time
const baseURL = getBaseURL();
console.log('[API Config] Axios baseURL configured as:', baseURL);

// Verify it's set correctly
if (!baseURL || baseURL === '' || baseURL === undefined) {
  console.error('[API Config] ERROR: baseURL is not set correctly!', baseURL);
  // Force it to '/api' as fallback
  const fallbackBaseURL = '/api';
  console.error('[API Config] Using fallback baseURL:', fallbackBaseURL);
}

// Ensure baseURL is always '/api' if not explicitly set
const finalBaseURL = baseURL || '/api';

const api = axios.create({
  baseURL: finalBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Verify the axios instance has the correct baseURL
console.log('[API Config] Axios instance baseURL:', api.defaults.baseURL);
if (!api.defaults.baseURL || api.defaults.baseURL === '') {
  console.error('[API Config] CRITICAL: Axios baseURL is empty! Setting to /api');
  api.defaults.baseURL = '/api';
}

// Add request interceptor to attach token and organization
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add organization header for multi-tenant routing
    let selectedOrganization = localStorage.getItem('selectedOrganization');
    
    // If not in localStorage, try to extract from current URL (for public careers pages)
    if (!selectedOrganization && typeof window !== 'undefined') {
      const pathMatch = window.location.pathname.match(/\/careers\/([^\/]+)/);
      if (pathMatch && pathMatch[1]) {
        selectedOrganization = pathMatch[1];
        console.log(`[API Request] 📍 Extracted organization slug from URL: ${selectedOrganization}`);
      }
    }
    
    if (selectedOrganization) {
      config.headers['X-Organization-Slug'] = selectedOrganization;
      console.log(`[API Request] ✅ X-Organization-Slug header: ${selectedOrganization}`);
    } else {
      const url = (config.url || '').split('?')[0];
      const authNoOrg = /^\/(api\/)?(auth\/(login|verify-code|sso\/providers|register|organization-code|check-exists))/.test(url) ||
        /\/auth\/(login|verify-code|sso\/providers|register|organization-code|check-exists)/.test(url);
      if (authNoOrg) {
        console.warn(`[API Request] No X-Organization-Slug (expected for auth before org selection)`);
      } else {
        console.error(`[API Request] ❌ CRITICAL: No X-Organization-Slug header!`);
        console.error(`[API Request] selectedOrganization is not set in localStorage or URL.`);
        console.error(`[API Request] This WILL cause empty results if data is in tenant database.`);
        console.error(`[API Request] localStorage.getItem('selectedOrganization'):`, localStorage.getItem('selectedOrganization'));
        console.error(`[API Request] Current URL:`, typeof window !== 'undefined' ? window.location?.pathname : '');
      }
    }
    // Log the full URL being called for debugging
    const fullUrl = (config.baseURL || '') + (config.url || '');
    console.log(`[API Request] ${config.method?.toUpperCase()} ${fullUrl}`);
    console.log(`[API Request Debug] baseURL: "${config.baseURL}", url: "${config.url}"`);
    
    // Log request data for POST/PUT/PATCH requests
    if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
      console.log(`[API Request] Request data:`, config.data);
      console.log(`[API Request] Request data type:`, typeof config.data);
      if (config.data && typeof config.data === 'object') {
        console.log(`[API Request] Request data JSON:`, JSON.stringify(config.data, null, 2));
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to log errors (runs after the existing interceptor)
api.interceptors.response.use(
  (response) => {
    // Skip processing for blob responses
    if (response.config?.responseType === 'blob') {
      console.log('[API Response] Blob response, skipping interceptor processing');
      return response;
    }
    
    // Log successful responses for debugging (only for dashboard-related endpoints)
    const selectedOrg = localStorage.getItem('selectedOrganization');
    const url = response.config?.url || '';
    if (url.includes('/employees') || url.includes('/leaves') || url.includes('/documents') || url.includes('/chat')) {
      console.log(`[API Response] ✅ ${response.config?.method?.toUpperCase()} ${url}`);
      console.log(`[API Response] Status: ${response.status}, Organization: ${selectedOrg || 'NONE'}`);
      if (Array.isArray(response.data)) {
        console.log(`[API Response] Data length: ${response.data.length}`);
      } else if (response.data && typeof response.data === 'object') {
        console.log(`[API Response] Data keys:`, Object.keys(response.data));
      }
    }
    return response;
  },
  (error) => {
    // Log errors with full details, but suppress expected errors
    const selectedOrg = localStorage.getItem('selectedOrganization');
    const url = error.config?.url || 'unknown';
    const status = error.response?.status || 'NO_RESPONSE';

    // Suppress expected 403 for settings endpoint when role has no settings access
    if (status === 403 && (url.includes('/settings/') || url.endsWith('/settings'))) {
      return Promise.reject(error);
    }
    
    // Suppress 404 errors for /projects endpoint (might not be available in all orgs)
    if (status === 404 && url.includes('/projects')) {
      // Silently handle - projects endpoint might not be available
      return Promise.reject(error);
    }
    
    // Suppress connection refused errors for tracker endpoints
    if (url.includes('localhost:8765') || url.includes('tracker-config') || url.includes('logout-status')) {
      // Silently handle - tracker might not be running
      return Promise.reject(error);
    }
    
    console.error(`[API Response] ❌ Error on ${error.config?.method?.toUpperCase()} ${url}`);
    console.error(`[API Response] Status: ${status}, Organization: ${selectedOrg || 'NONE'}`);
    if (error.response?.data) {
      console.error(`[API Response] Error data:`, error.response.data);
    }
    console.error(`[API Response] Error message:`, error.message);
    if (!selectedOrg) {
      console.error(`[API Response] ⚠️ CRITICAL: No organization slug! This is likely why the request failed.`);
    }
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors and normalize employees endpoint
api.interceptors.response.use(
  (response) => {
    // Skip processing for blob responses
    if (response.config?.responseType === 'blob') {
      console.log('[API Response] Blob response, skipping normalization interceptor');
      return response;
    }
    
    // Normalize /employees endpoint to always return an array
    const url = response.config?.url || '';
    const method = (response.config?.method || '').toLowerCase();
    
    // Check if this is a GET /employees request (list all employees, not a specific employee)
    // Match: /employees, /api/employees, but not /employees/123 or /employees/me
    // Handle both /employees and /api/employees URLs
    // CRITICAL: More aggressive matching to catch all variations
    const normalizedUrl = url.replace( ''); // Remove /api prefix if present
    
    // Check if URL contains /employees (case-insensitive)
    const hasEmployeesPath = url.includes('/employees') || url.includes('employees') || 
                            normalizedUrl.includes('/employees') || normalizedUrl.includes('employees');
    
    // Check if it's NOT a specific employee endpoint
    const isNotSpecificEmployee = !url.match(/\/employees\/\d+/) && 
                                  !normalizedUrl.match(/\/employees\/\d+/) &&
                                  !url.includes('/employees/me') && 
                                  !normalizedUrl.includes('/employees/me') &&
                                  !url.includes('employees/me') && 
                                  !normalizedUrl.includes('employees/me');
    
    const isEmployeesListRequest = hasEmployeesPath && 
                                   isNotSpecificEmployee &&
                                   (method === 'get' || method === '');
    
    if (isEmployeesListRequest) {
      console.log('[API Interceptor] 🔍 Detected /employees list request');
      console.log('[API Interceptor] Original URL:', url);
      console.log('[API Interceptor] Normalized URL:', normalizedUrl);
      console.log('[API Interceptor] Method:', method);
      console.log('[API Interceptor] Response data type:', typeof response.data);
      console.log('[API Interceptor] Response data is array?', Array.isArray(response.data));
      console.log('[API Interceptor] Response data:', response.data);
      
      // CRITICAL: Always ensure response.data is an array for /employees endpoint
      if (response.data == null) {
        console.warn('[API Interceptor] ⚠️ /employees endpoint returned null/undefined, setting to empty array');
        response.data = [];
      } else if (!Array.isArray(response.data)) {
        console.warn('[API Interceptor] ⚠️ /employees endpoint returned non-array, normalizing to array');
        console.warn('[API Interceptor] Response data type:', typeof response.data);
        console.warn('[API Interceptor] Response data:', response.data);
        
        // Try to extract array from different response structures
        if (response.data && typeof response.data === 'object' && Array.isArray(response.data.data)) {
          console.log('[API Interceptor] ✅ Found nested data array');
          response.data = response.data.data;
        } else if (response.data && typeof response.data === 'object' && Array.isArray(response.data.employees)) {
          console.log('[API Interceptor] ✅ Found employees array');
          response.data = response.data.employees;
        } else {
          console.warn('[API Interceptor] ❌ Could not find array, returning empty array');
          response.data = [];
        }
      } else {
        console.log('[API Interceptor] ✅ Response is already an array with', response.data.length, 'items');
        // Additional safety: filter out any null/undefined entries
        response.data = response.data.filter(item => item != null);
      }
      
      // FINAL CRITICAL CHECK - ensure it's ALWAYS an array after processing
      if (!Array.isArray(response.data)) {
        console.error('[API Interceptor] 🚨 CRITICAL: Response.data is still not an array after normalization!');
        console.error('[API Interceptor] 🚨 Forcing to empty array');
        response.data = [];
      }
      
      // Log final state
      console.log('[API Interceptor] ✅ Final response.data type:', typeof response.data);
      console.log('[API Interceptor] ✅ Final response.data is array?', Array.isArray(response.data));
      console.log('[API Interceptor] ✅ Final response.data length:', response.data?.length || 0);
    }
    
    // Normalize /payroll endpoint to always return an array
    const hasPayrollPath = url.includes('/payroll') || url.includes('payroll');
    const isNotSpecificPayroll = !url.match(/\/payroll\/\d+/) && 
                                 !url.includes('/payroll/me') &&
                                 !url.includes('payroll/me');
    const isPayrollListRequest = hasPayrollPath && 
                                isNotSpecificPayroll &&
                                (method === 'get' || method === '');
    
    if (isPayrollListRequest) {
      console.log('[API Interceptor] 🔍 Detected /payroll list request');
      console.log('[API Interceptor] Original URL:', url);
      console.log('[API Interceptor] Method:', method);
      console.log('[API Interceptor] Response data type:', typeof response.data);
      console.log('[API Interceptor] Response data is array?', Array.isArray(response.data));
      console.log('[API Interceptor] Response data:', response.data);
      
      // CRITICAL: Always ensure response.data is an array for /payroll endpoint
      if (response.data == null) {
        console.warn('[API Interceptor] ⚠️ /payroll endpoint returned null/undefined, setting to empty array');
        response.data = [];
      } else if (!Array.isArray(response.data)) {
        console.warn('[API Interceptor] ⚠️ /payroll endpoint returned non-array, normalizing to array');
        console.warn('[API Interceptor] Response data type:', typeof response.data);
        console.warn('[API Interceptor] Response data:', response.data);
        
        // Try to extract array from different response structures
        if (response.data && typeof response.data === 'object' && Array.isArray(response.data.data)) {
          console.log('[API Interceptor] ✅ Found nested data array');
          response.data = response.data.data;
        } else if (response.data && typeof response.data === 'object' && Array.isArray(response.data.payroll)) {
          console.log('[API Interceptor] ✅ Found payroll array');
          response.data = response.data.payroll;
        } else if (response.data && typeof response.data === 'object' && Array.isArray(response.data.records)) {
          console.log('[API Interceptor] ✅ Found records array');
          response.data = response.data.records;
        } else {
          console.warn('[API Interceptor] ❌ Could not find array, returning empty array');
          response.data = [];
        }
      } else {
        console.log('[API Interceptor] ✅ Response is already an array with', response.data.length, 'items');
        // Additional safety: filter out any null/undefined entries
        response.data = response.data.filter(item => item != null);
      }
      
      // FINAL CRITICAL CHECK - ensure it's ALWAYS an array after processing
      if (!Array.isArray(response.data)) {
        console.error('[API Interceptor] 🚨 CRITICAL: Response.data is still not an array after normalization!');
        console.error('[API Interceptor] 🚨 Forcing to empty array');
        response.data = [];
      }
      
      // Log final state
      console.log('[API Interceptor] ✅ Final payroll response.data type:', typeof response.data);
      console.log('[API Interceptor] ✅ Final payroll response.data is array?', Array.isArray(response.data));
      console.log('[API Interceptor] ✅ Final payroll response.data length:', response.data?.length || 0);
    }
    
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Check error detail to determine if it's a real auth failure
      const errorDetail = error.response?.data?.detail || '';
      const normalizedDetail = String(errorDetail).toLowerCase();
      const isAuthError = normalizedDetail.includes('token') ||
                          normalizedDetail.includes('credentials') ||
                          normalizedDetail.includes('expired') ||
                          normalizedDetail.includes('invalid') ||
                          normalizedDetail.includes('not authenticated') ||
                          normalizedDetail.includes('user not found') ||
                          errorDetail === 'Invalid or expired token';
      
      // Only redirect if it's a real authentication error, not a data/employee lookup issue
      if (isAuthError) {
      const token = localStorage.getItem('token');
      if (token) {
          console.log('Authentication error detected, clearing token and redirecting to login:', errorDetail);
      localStorage.removeItem('token');
        localStorage.removeItem('mustResetPassword');
        localStorage.removeItem('selectedOrganization');
        localStorage.removeItem('organizationData');
        localStorage.removeItem('adminVerified');
        localStorage.removeItem('adminVerifiedAt');
        localStorage.removeItem('adminVerifiedUserEmail');
        localStorage.removeItem('isOrganizationAdmin');
        
        // Only redirect if we're not already on login/register/landing pages
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && 
            !currentPath.includes('/register') && 
            !currentPath.includes('/landing') &&
            !currentPath.includes('/reset-password')) {
          // Use setTimeout to avoid navigation during render
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
        }
      } else {
        // 401 but not an auth error - might be employee record issue
        console.warn('401 error but not authentication failure:', errorDetail);
        // Don't redirect, let the component handle the error
      }
    } else if (error.response?.status === 502) {
      // Backend server is down - enhance error message
      console.error('502 Bad Gateway: Backend server is not responding');
      const enhancedError = new Error('Service temporarily unavailable. The backend server may be down. Please try again in a few moments or contact support.');
      enhancedError.status = 502;
      enhancedError.response = error.response;
      enhancedError.originalError = error;
      return Promise.reject(enhancedError);
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials) => {
    console.log('Sending login credentials:', credentials);
    try {
      const response = await api.post('/auth/login', credentials);
      console.log('Login response:', response.data);
      
      // Store token in localStorage
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        console.log('Token stored in localStorage');
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      
      // Provide better error messages for common issues
      if (error.response?.status === 502) {
        const enhancedError = new Error('Service temporarily unavailable. The backend server may be down. Please try again in a few moments or contact support.');
        enhancedError.status = 502;
        enhancedError.originalError = error;
        throw enhancedError;
      }
      
      throw error;
    }
  },
  register: async (userData) => {
    console.log('Sending registration data:', userData);
    const response = await api.post('/auth/register', userData);
    console.log('Registration response:', response.data);
    
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/session');
    if (response.data?.must_reset_password !== undefined) {
      localStorage.setItem(
        'mustResetPassword',
        response.data.must_reset_password ? 'true' : 'false'
      );
    }
    return response.data;
  },
  updateProfile: async (profileData) => {
    const response = await api.put('/auth/me', profileData);
    return response.data;
  },
  logout: async () => {
    try {
      // Call logout API first (while token is still available) 
      // Use a timeout to ensure we don't wait forever
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout request timeout')), 10000)
      );
      
      await Promise.race([
        api.post('/auth/logout'),
        timeoutPromise
      ]);
      
      console.log('✅ Logout API call completed successfully');
    } catch (error) {
      // Log the error but don't fail - we still need to clear the token
      console.error('⚠️ Logout API call failed:', error);
      console.error('   This may leave active sessions open. They will be closed on next login.');
    } finally {
      // Always remove token from localStorage
      localStorage.removeItem('token');
    }
  },
  changePassword: async (payload) => {
    const response = await api.post('/auth/change-password', payload);
    return response.data;
  },
  sendAdminVerificationCode: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    const response = await api.post('/auth/admin/send-verification-code');
    return response.data;
  },
  verifyAdminCode: async (code) => {
    const response = await api.post('/auth/admin/verify-code', { code: code });
    return response.data;
  },
  registerOrgAdmin: async (orgAdminData) => {
    // Organization admin registration via /organizations/register-org-admin
    const response = await api.post('/organizations/register-org-admin', orgAdminData);
    // Ensure selectedOrganization is set for org admin context
    if (response.data && response.data.organization_slug) {
      localStorage.setItem('selectedOrganization', response.data.organization_slug);
    } else if (orgAdminData.organization_slug) {
      // Fallback: use submitted slug if backend does not return it
      localStorage.setItem('selectedOrganization', orgAdminData.organization_slug);
    }
    return response.data;
  },
  getAdminVerificationStatus: async () => {
    const response = await api.get('/auth/admin/verification-status');
    return response.data;
  },
  getSSOProviders: async () => {
    const response = await api.get('/auth/sso/providers');
    return response.data;
  },
  initiateSSO: async (provider, organizationSlug = null) => {
    const params = organizationSlug ? { organization_slug: organizationSlug } : {};
    const response = await api.get(`/auth/sso/initiate/${provider}`, { params });
    return response.data;
  },
  ssoCallback: async (code, state) => {
    const response = await api.post(`/auth/sso/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
    return response.data;
  },
};

// Branches API
export const branchesAPI = {
  list: async () => {
    const response = await api.get('/settings/branches');
    return response.data;
  },
  create: async (payload) => {
    const response = await api.post('/settings/branches', payload);
    return response.data;
  },
  remove: async (branchCode) => {
    const response = await api.delete(`/settings/branches/${encodeURIComponent(branchCode)}`);
    return response.data;
  },
};

// Employee API
export const employeeAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/employees');
      console.log('[EmployeeAPI] Raw response:', response);
      console.log('[EmployeeAPI] Response data type:', typeof response.data);
      console.log('[EmployeeAPI] Response data is array?', Array.isArray(response.data));
      console.log('[EmployeeAPI] Response data:', response.data);
      
      // CRITICAL: Backend returns array directly, but interceptor normalizes it
      // So response.data should ALWAYS be an array after interceptor processing
      let employeesData = response?.data;
      
      // CRITICAL: If response or response.data is null/undefined, return empty array immediately
      if (response == null || employeesData == null) {
        console.error('[EmployeeAPI] ❌ Response or response.data is null/undefined, returning empty array');
        return [];
      }
      
      // CRITICAL: After interceptor, response.data should be an array
      // But handle edge cases where it might not be
      if (Array.isArray(employeesData)) {
        console.log('[EmployeeAPI] ✅ Returning array with', employeesData.length, 'employees');
        // Additional safety: filter out any invalid entries
        const filtered = employeesData.filter(item => item != null && typeof item === 'object');
        console.log('[EmployeeAPI] ✅ Filtered array length:', filtered.length);
        return filtered;
      }
      
      // Fallback: If somehow response.data is not an array, try to extract it
      // This should rarely happen due to interceptor, but handle it just in case
      if (employeesData && typeof employeesData === 'object') {
        // Try nested structures (shouldn't happen, but defensive coding)
        if (Array.isArray(employeesData.data)) {
          console.warn('[EmployeeAPI] ⚠️ Found nested data array (unexpected)');
          return employeesData.data.filter(item => item != null && typeof item === 'object');
        }
        if (Array.isArray(employeesData.employees)) {
          console.warn('[EmployeeAPI] ⚠️ Found employees array (unexpected)');
          return employeesData.employees.filter(item => item != null && typeof item === 'object');
        }
      }
      
      // CRITICAL: If response.data is not an array and can't be extracted, log error
      console.error('[EmployeeAPI] ❌ CRITICAL: Response is not an array. Type:', typeof employeesData);
      console.error('[EmployeeAPI] ❌ Response value:', employeesData);
      console.error('[EmployeeAPI] ❌ Returning empty array as fallback');
      return [];
    } catch (error) {
      console.error('[EmployeeAPI] Error fetching employees:', error);
      console.error('[EmployeeAPI] Error response:', error.response?.data);
      console.error('[EmployeeAPI] Error status:', error.response?.status);
      // ALWAYS return empty array on error instead of throwing
      return [];
    }
  },
  get: async (id, allowManagerAccess = false) => {
    const params = allowManagerAccess ? { allow_manager_access: true } : {};
    const response = await api.get(`/employees/${id}`, { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },
  create: async (employeeData) => {
    const response = await api.post('/employees', employeeData);
    return response.data;
  },
  update: async (id, employeeData) => {
    const response = await api.put(`/employees/${id}`, employeeData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/employees/${id}`);
    return response.data;
  },
  getProfilePhoto: async (employee_Id) => {
    const response = await api.get(`/employees/${employee_Id}/photo`, {
      params: { allow_manager_access: true },
      responseType: 'blob',
      validateStatus: (s) => s === 200 || s === 404,
    });
    if (response.status === 404) return null;
    return response.data;
  },
  uploadProfilePhoto: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    // Do not set Content-Type: the browser must set multipart/form-data with the boundary.
    // Override the api default (application/json) so the server can parse the form.
    const response = await api.post('/employees/me/photo', formData, {
      headers: { 'Content-Type': false },
    });
    return response.data;
  },
  getTodaysBirthdays: async () => {
    const response = await api.get('/employees/birthdays/today');
    return response.data;
  },
  sendBirthdayWish: async (employeeId, message) => {
    const response = await api.post(`/employees/${employeeId}/birthday-wish`, {
      message,
    });
    return response.data;
  },
  provisionAccess: async (employeeId,payload = {}) => {  
    const response = await api.post(`/employees/${employeeId}/provision-access`,payload);
    return response.data;
  },
};

// Super Admin API
export const superAdminAPI = {
  getModules: async () => {
    const res = await api.get('/settings/super/modules');
    return res.data;
  },
  updateModules: async (payload) => {
    const res = await api.put('/settings/super/modules', payload);
    return res.data;
  },
  getModuleConfig: async (key) => {
    const res = await api.get(`/settings/super/modules/${key}`);
    return res.data;
  },
  updateModuleConfig: async (key, payload) => {
    const res = await api.put(`/settings/super/modules/${key}`, payload);
    return res.data;
  }
};
 
// RBAC / User module access API
export const rbacAPI = {
  getUserModuleAccess: async (userId, moduleKey) => {
    const params = { user_id: userId, module: moduleKey }
    const res = await api.get('/rbac/user-module-access', { params })
    return res.data
  },
  assignUserModuleAccess: async (payload) => {
    const res = await api.post('/rbac/user-module-access', payload)
    return res.data
  },
  revokeUserModuleAccess: async ({ user_id, module, organization_id=null }) => {
    const res = await api.delete('/rbac/user-module-access', { data: { user_id, module, organization_id } })
    return res.data
  }
}

// Leave API
export const leaveAPI = {
  getAll: async () => {
    const response = await api.get('/leave');
    return response.data;
  },
  getMyLeaves: async () => {
    const response = await api.get('/leave/me');
    return response.data;
  },
  getMyEntitlements: async () => {
    // For now, return a mock entitlement - this should be implemented in the backend
    return [{
      year: new Date().getFullYear(),
      days_allowed: 20,
      days_used: 0
    }];
  },
  getPending: async () => {
    const response = await api.get('/leave/pending');
    return response.data;
  },
  apply: async (leaveData) => {
    const response = await api.post('/leave/apply', leaveData);
    return response.data;
  },
  approve: async (id) => {
    const response = await api.post(`/leave/${id}/approve`);
    return response.data;
  },
  reject: async (id, reason) => {
    const response = await api.post(`/leave/${id}/reject`, { reason });
    return response.data;
  },
};

// Payroll API
export const payrollAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/payroll');
      console.log('[PayrollAPI] Raw response:', response);
      console.log('[PayrollAPI] Response data type:', typeof response.data);
      console.log('[PayrollAPI] Response data is array?', Array.isArray(response.data));
      
      // CRITICAL: Backend returns array directly, but interceptor normalizes it
      // So response.data should ALWAYS be an array after interceptor processing
      let payrollData = response?.data;
      
      // CRITICAL: If response or response.data is null/undefined, return empty array
      if (response == null || payrollData == null) {
        console.error('[PayrollAPI] ❌ Response or response.data is null/undefined, returning empty array');
        return [];
      }
      
      // CRITICAL: After interceptor, response.data should be an array
      if (Array.isArray(payrollData)) {
        console.log('[PayrollAPI] ✅ Returning array with', payrollData.length, 'records');
        return payrollData.filter(item => item != null && typeof item === 'object');
      }
      
      // Fallback: If somehow response.data is not an array, try to extract it
      if (payrollData && typeof payrollData === 'object') {
        if (Array.isArray(payrollData.data)) {
          console.warn('[PayrollAPI] ⚠️ Found nested data array (unexpected)');
          return payrollData.data.filter(item => item != null && typeof item === 'object');
        }
        if (Array.isArray(payrollData.payroll)) {
          console.warn('[PayrollAPI] ⚠️ Found payroll array (unexpected)');
          return payrollData.payroll.filter(item => item != null && typeof item === 'object');
        }
        if (Array.isArray(payrollData.records)) {
          console.warn('[PayrollAPI] ⚠️ Found records array (unexpected)');
          return payrollData.records.filter(item => item != null && typeof item === 'object');
        }
      }
      
      // CRITICAL: If response.data is not an array, log error and return empty array
      console.error('[PayrollAPI] ❌ CRITICAL: Response is not an array. Type:', typeof payrollData);
      console.error('[PayrollAPI] ❌ Response value:', payrollData);
      console.error('[PayrollAPI] ❌ Returning empty array as fallback');
      return [];
    } catch (error) {
      console.error('[PayrollAPI] Error fetching payroll:', error);
      console.error('[PayrollAPI] Error response:', error.response?.data);
      // ALWAYS return empty array on error instead of throwing
      return [];
    }
  },
  getMyPayroll: async () => {
    const response = await api.get('/payroll/me');
    return response.data;
  },
  create: async (payrollData) => {
    const response = await api.post('/payroll', payrollData);
    return response.data;
  },
  update: async (id, payrollData) => {
    const response = await api.put(`/payroll/${id}`, payrollData);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/payroll/${id}`);
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/payroll/${id}`);
    return response.data;
  },
  download: async (id) => {
    const response = await api.get(`/payroll/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },
  processRazorpayX: async (id) => {
    const response = await api.post(`/payroll/${id}/process-razorpayx`);
    return response.data;
  },
  bulkProcessRazorpayX: async (month, year) => {
    const response = await api.post(`/payroll/bulk-process-razorpayx?month=${encodeURIComponent(month)}&year=${year}`);
    return response.data;
  },
  downloadBulkCSV: async (month, year) => {
    const response = await api.get(`/payroll/bulk-disbursement/csv`, {
      params: {
        month: month.trim(),
        year: year
      },
      responseType: 'text', // Get text response, not JSON
    });
    return response.data;
  },
  // Salary Structure API
  getAllSalaryStructures: async () => {
    const response = await api.get('/payroll/salary-structure');
    return response.data;
  },
  getSalaryStructureByEmployee: async (employeeId) => {
    const response = await api.get(`/payroll/salary-structure/employee/${employeeId}`);
    return response.data;
  },
  getSalaryStructure: async (structureId) => {
    const response = await api.get(`/payroll/salary-structure/${structureId}`);
    return response.data;
  },
  createSalaryStructure: async (structureData) => {
    const response = await api.post('/payroll/salary-structure', structureData);
    return response.data;
  },
  updateSalaryStructure: async (structureId, structureData) => {
    const response = await api.put(`/payroll/salary-structure/${structureId}`, structureData);
    return response.data;
  },
  deleteSalaryStructure: async (structureId) => {
    const response = await api.delete(`/payroll/salary-structure/${structureId}`);
    return response.data;
  },
};

// Export api instance for direct use if needed
export { api };
// Calendar API
export const calendarAPI = {
  getEvents: async (startDate, endDate, employeeId = null) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (employeeId) params.append('employee_id', employeeId);
    
    const response = await api.get(`/calendar/events?${params.toString()}`);
    return response.data;
  },
  
  createEvent: async (eventData) => {
    const response = await api.post('/calendar/events', eventData);
    return response.data;
  },
  
  updateEvent: async (eventId, eventData) => {
    const response = await api.put(`/calendar/events/${eventId}`, eventData);
    return response.data;
  },
  
  deleteEvent: async (eventId) => {
    await api.delete(`/calendar/events/${eventId}`);
  },
  
  // Google Calendar API
  getGoogleCalendarAuthUrl: async () => {
    const response = await api.get('/calendar/google/oauth/authorize');
    return response.data;
  },
  
  getGoogleCalendarStatus: async () => {
    const response = await api.get('/calendar/google/status');
    return response.data;
  },
  
  disconnectGoogleCalendar: async () => {
    const response = await api.post('/calendar/google/disconnect');
    return response.data;
  }
};

export default api;

// Onboarding API
export const onboardingAPI = {
  getMyTasks: async () => {
    const response = await api.get('/onboarding/me/tasks');
    return response.data;
  },
  getMyDashboard: async () => {
    const response = await api.get('/onboarding/me/dashboard');
    return response.data;
  },
  getNotifications: async () => {
    const response = await api.get('/onboarding/me/notifications');
    return response.data;
  },
  markNotificationRead: async (notificationId) => {
    const response = await api.post(`/onboarding/notifications/${notificationId}/read`, {
      is_read: true,
    });
    return response.data;
  },
  completeTask: async (taskId) => {
    const response = await api.post(`/onboarding/tasks/${taskId}/complete`);
    return response.data;
  },
  uploadDocument: async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/onboarding/tasks/${taskId}/document`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  downloadDocument: async (taskId) => {
    const response = await api.get(`/onboarding/tasks/${taskId}/document/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
  listTasks: async (filters = {}) => {
    const response = await api.get('/onboarding/tasks', { params: filters });
    return response.data;
  },
  createTask: async (taskData) => {
    const response = await api.post('/onboarding/tasks', taskData);
    return response.data;
  },
  updateTask: async (taskId, taskData) => {
    const response = await api.patch(`/onboarding/tasks/${taskId}`, taskData);
    return response.data;
  },
  reviewDocument: async (taskId, reviewData) => {
    const response = await api.post(`/onboarding/tasks/${taskId}/document/review`, reviewData);
    return response.data;
  },
  getEmployeeOverview: async (employeeId) => {
    const response = await api.get(`/onboarding/employees/${employeeId}`);
    return response.data;
  },
};

// Recruitment API
export const recruitmentAPI = {
  // Job Management
  getJobs: async () => {
    const response = await api.get('/recruitment/jobs');
    return response.data;
  },
  getPublicJobs: async () => {
    const response = await api.get('/recruitment/jobs/public');
    return response.data;
  },
  getOrganizationCareers: async (organizationSlug) => {
    const response = await api.get(`/recruitment/jobs/public/${organizationSlug}/details`);
    return response.data;
  },
  getJob: async (jobId) => {
    const response = await api.get(`/recruitment/jobs/${jobId}`);
    return response.data;
  },
  createJob: async (jobData) => {
    const response = await api.post('/recruitment/jobs', jobData);
    return response.data;
  },
  updateJob: async (jobId, jobData) => {
    const response = await api.put(`/recruitment/jobs/${jobId}`, jobData);
    return response.data;
  },
  
  // Candidate Management
  getCandidates: async (jobId = null, status = null) => {
    const params = {};
    if (jobId) params.job_id = jobId;
    if (status) params.status = status;
    const response = await api.get('/recruitment/candidates', { params });
    return response.data;
  },
  getCandidate: async (candidateId) => {
    const response = await api.get(`/recruitment/candidates/${candidateId}`);
    return response.data;
  },
  createCandidate: async (candidateData) => {
    const response = await api.post('/recruitment/candidates', candidateData);
    return response.data;
  },
  updateCandidate: async (candidateId, candidateData) => {
    const response = await api.put(`/recruitment/candidates/${candidateId}`, candidateData);
    return response.data;
  },
  shortlistCandidate: async (candidateId) => {
    const response = await api.post(`/recruitment/candidates/${candidateId}/shortlist`);
    return response.data;
  },
  rejectCandidate: async (candidateId) => {
    const response = await api.post(`/recruitment/candidates/${candidateId}/reject`);
    return response.data;
  },
  approveCandidate: async (candidateId) => {
    const response = await api.post(`/recruitment/candidates/${candidateId}/approve`);
    return response.data;
  },
  hireCandidate: async (candidateId) => {
    const response = await api.post(`/recruitment/candidates/${candidateId}/hire`);
    return response.data;
  },
  getJobCandidates: async (jobId) => {
    const response = await api.get(`/recruitment/jobs/${jobId}/candidates`);
    return response.data;
  },
  downloadResume: async (applicationId) => {
    try {
      const response = await api.get(`/recruitment/applications/${applicationId}/resume`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (err) {
      // If the recruitment route is not available (404), try the alternative applications route
      if (err?.response?.status === 404) {
        try {
          const alt = await api.get(`/applications/${applicationId}/resume`, { responseType: 'blob' });
          return alt.data;
        } catch (err2) {
          throw err2;
        }
      }
      throw err;
    }
  },

  // Enhanced Recruitment Features
  // Candidate Sourcing
  searchCandidates: async (searchParams) => {
    const response = await api.get('/recruitment/sourcing/search', { params: searchParams });
    return response.data;
  },
  getSourcingChannels: async () => {
    const response = await api.get('/recruitment/sourcing/channels');
    return response.data;
  },
  addSourcedCandidate: async (candidateData) => {
    const response = await api.post('/recruitment/sourcing/candidates', candidateData);
    return response.data;
  },

  // Interview Scheduling
  scheduleInterview: async (interviewData) => {
    const response = await api.post('/recruitment/interviews', interviewData);
    return response.data;
  },
  getInterviews: async (applicationId = null, interviewerEmail = null, status = null) => {
    const params = {};
    if (applicationId) params.application_id = applicationId;
    if (interviewerEmail) params.interviewer_email = interviewerEmail;
    if (status) params.status = status;
    const response = await api.get('/recruitment/interviews', { params });
    return response.data;
  },
  getInterview: async (interviewId) => {
    const response = await api.get(`/recruitment/interviews/${interviewId}`);
    return response.data;
  },
  updateInterview: async (interviewId, interviewData) => {
    const response = await api.put(`/recruitment/interviews/${interviewId}`, interviewData);
    return response.data;
  },
  completeInterview: async (interviewId) => {
    const response = await api.post(`/recruitment/interviews/${interviewId}/complete`);
    return response.data;
  },
  cancelInterview: async (interviewId) => {
    const response = await api.post(`/recruitment/interviews/${interviewId}/cancel`);
    return response.data;
  },
    getCandidateInterviews: async (candidateId) => {
      const response = await api.get(`/recruitment/candidates/${candidateId}/interviews`);
      return response.data;
    },
    
    // Get all interviews
    getInterviews: async () => {
      const response = await api.get('/recruitment/interviews');
      return response.data;
    },

    // Candidate Sourcing
    addCandidateSource: async (sourceData) => {
      const response = await api.post('/recruitment/sources', sourceData);
      return response.data;
    },
    getApplicationSources: async (applicationId) => {
      const response = await api.get(`/recruitment/sources/${applicationId}`);
      return response.data;
    },
    listCandidateSources: async (sourceType = null) => {
      const params = sourceType ? { source_type: sourceType } : {};
      const response = await api.get('/recruitment/sources', { params });
      return response.data;
    },

    // Interviewer Availability
    addInterviewerAvailability: async (availabilityData) => {
      const response = await api.post('/recruitment/availability', availabilityData);
      return response.data;
    },
    getInterviewerAvailability: async (employeeId, startDate = null, endDate = null) => {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await api.get(`/recruitment/availability/${employeeId}`, { params });
      return response.data;
    },
    getAvailableSlots: async (scheduledDate, durationMinutes = 60, department = null) => {
      const params = { scheduled_date: scheduledDate, duration_minutes: durationMinutes };
      if (department) params.department = department;
      const response = await api.get('/recruitment/available-slots', { params });
      return response.data;
    },

    
    updateInterviewerAvailability: async (availabilityId, availabilityData) => {
      const response = await api.put(`/recruitment/availability/${availabilityId}`, availabilityData);
      return response.data;
    },

    // Approval Workflow
    createApprovalWorkflow: async (workflowData) => {
      const response = await api.post('/recruitment/approvals', workflowData);
      return response.data;
    },
    getApplicationApprovals: async (applicationId) => {
      const response = await api.get(`/recruitment/approvals/${applicationId}`);
      return response.data;
    },
    approveWorkflow: async (workflowId, approvalData) => {
      const response = await api.put(`/recruitment/approvals/${workflowId}/approve`, approvalData);
      return response.data;
    },
    rejectWorkflow: async (workflowId, rejectionData) => {
      const response = await api.put(`/recruitment/approvals/${workflowId}/reject`, rejectionData);
      return response.data;
    },
    getPendingApprovals: async (approverId = null) => {
      const params = approverId ? { approver_id: approverId } : {};
      const response = await api.get('/recruitment/approvals/pending', { params });
      return response.data;
    },
    getApprovalStats: async () => {
      const response = await api.get('/recruitment/approvals/stats');
    return response.data;
  },

  // Video Interview
  createVideoInterview: async (interviewData) => {
    const response = await api.post('/recruitment/interviews/video/create', interviewData);
    return response.data;
  },
  getVideoInterviewLink: async (interviewId) => {
    const response = await api.get(`/recruitment/interviews/${interviewId}/video-link`);
    return response.data;
  },
  joinVideoInterview: async (interviewId, userType) => {
    const response = await api.post(`/recruitment/interviews/${interviewId}/join`, { userType });
    return response.data;
  },

  // Email Notifications
  sendInterviewInvite: async (interviewId) => {
    const response = await api.post(`/recruitment/interviews/${interviewId}/send-invite`);
    return response.data;
  },
  sendReminder: async (interviewId, reminderType) => {
    const response = await api.post(`/recruitment/interviews/${interviewId}/reminder`, { reminderType });
    return response.data;
  },
  sendStatusUpdate: async (candidateId, status, message) => {
    const response = await api.post(`/recruitment/candidates/${candidateId}/status-update`, { 
      status, 
      message 
    });
    return response.data;
  },

  // Dashboard & Analytics
  getRecruitmentStats: async (filters = {}) => {
    const response = await api.get('/recruitment/dashboard/stats', { params: filters });
    return response.data;
  },
  getDepartmentStats: async (department = null) => {
    const response = await api.get('/recruitment/dashboard/department-stats', { 
      params: { department } 
    });
    return response.data;
  },
  getRecruitmentPipeline: async () => {
    const response = await api.get('/recruitment/dashboard/pipeline');
    return response.data;
  },

  // Approval Workflow
  getPendingApprovals: async () => {
    const response = await api.get('/recruitment/approvals/pending');
    return response.data;
  },
  approveCandidate: async (candidateId) => {
    const response = await api.post(`/recruitment/candidates/${candidateId}/approve`);
    return response.data;
  },
  rejectApproval: async (candidateId, reason) => {
    const response = await api.post(`/recruitment/candidates/${candidateId}/reject-approval`, { reason });
    return response.data;
  },
  getApprovalHistory: async (candidateId) => {
    const response = await api.get(`/recruitment/candidates/${candidateId}/approval-history`);
    return response.data;
  },
};

// Job Applications API
export const applicationsAPI = {
  applyForJob: async (jobId, coverLetter, resumeFile, name = null, email = null, phone = null, keywordsSkills = null, previousOrgs = null, degrees = null, education = null, noticePeriod = null, currentCtc = null, expectedCtc = null, currentLocation = null, reasonForChange = null) => {
    const formData = new FormData();
    
    // If name and email are provided (non-empty strings), use public endpoint (always use public for form submissions)
    if (name && email && typeof name === 'string' && typeof email === 'string' && name.trim() && email.trim()) {
      formData.append('name', name.trim());
      formData.append('email', email.trim());
      if (coverLetter && coverLetter.trim()) formData.append('cover_letter', coverLetter.trim());
      if (resumeFile) {
        formData.append('resume_file', resumeFile);
      }
      if (phone && phone.trim()) formData.append('phone', phone.trim());
      if (keywordsSkills && keywordsSkills.trim()) formData.append('keywords_skills', keywordsSkills.trim());
      if (previousOrgs && previousOrgs.trim()) formData.append('previous_organizations', previousOrgs.trim());
      if (degrees && degrees.trim()) formData.append('degrees', degrees.trim());
      if (education && education.trim()) formData.append('education', education.trim());
      if (noticePeriod && noticePeriod.trim()) formData.append('notice_period', noticePeriod.trim());
      if (currentCtc && currentCtc.trim()) formData.append('current_ctc', currentCtc.trim());
      if (expectedCtc && expectedCtc.trim()) formData.append('expected_ctc', expectedCtc.trim());
      if (currentLocation && currentLocation.trim()) formData.append('current_location', currentLocation.trim());
      if (reasonForChange && reasonForChange.trim()) formData.append('reason_for_job_change', reasonForChange.trim());
      
      const response = await api.post(`/applications/apply/public?job_id=${jobId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }
    
    // Otherwise use authenticated endpoint (only for chatbot/API calls without name/email)
    if (phone) formData.append('phone', phone);
    if (keywordsSkills) formData.append('keywords_skills', keywordsSkills);
    if (previousOrgs) formData.append('previous_organizations', previousOrgs);
    if (degrees) formData.append('degrees', degrees);
    if (education) formData.append('education', education);
    if (noticePeriod) formData.append('notice_period', noticePeriod);
    if (currentCtc) formData.append('current_ctc', currentCtc);
    if (expectedCtc) formData.append('expected_ctc', expectedCtc);
    if (currentLocation) formData.append('current_location', currentLocation);
    if (reasonForChange) formData.append('reason_for_job_change', reasonForChange);
    
    const response = await api.post(`/applications/apply?job_id=${jobId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getMyApplications: async () => {
    const response = await api.get('/applications/my-applications');
    return response.data;
  },
  getInterviewDetails: async () => {
    const response = await api.get('/applications/interview-details');
    return response.data;
  },
  getJobApplications: async (jobId) => {
    const response = await api.get(`/applications/job/${jobId}/applications`);
    return response.data;
  },
  getQualifiedApplications: async () => {
    const response = await api.get('/applications/applications/qualified');
    return response.data;
  },
  forwardToHR: async (applicationId) => {
    const response = await api.post(`/applications/${applicationId}/forward-to-hr`);
    return response.data;
  },
  updateApplicationStatus: async (applicationId, statusData) => {
    const response = await api.post(`/applications/${applicationId}/update-status`, statusData);
    return response.data;
  },
  // updateApplicationStatus: async (applicationId, statusData) => {
  //   const response = await api.post(`/applications/${applicationId}/update-status`, statusData);
  //   return response.data;
  // },
};

// Chat API
export const chatAPI = {
  // Regular user endpoints
  getSessions: async () => {
    console.log('🔍 DEBUG: API call - getSessions (user)');
    console.log('🔍 DEBUG: API base URL:', api.defaults.baseURL);
    console.log('🔍 DEBUG: API headers:', api.defaults.headers);
    console.log('🔍 DEBUG: Full URL will be:', api.defaults.baseURL + '/agents/sessions');
    
    try {
      // Use regular user endpoint
      const response = await api.get('/agents/sessions');
      console.log('🔍 DEBUG: getSessions response:', response);
      console.log('🔍 DEBUG: Response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ DEBUG: getSessions error:', error);
      console.error('❌ DEBUG: Error response:', error.response);
      console.error('❌ DEBUG: Error status:', error.response?.status);
      console.error('❌ DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },
  getMessages: async (sessionId) => {
    console.log('🔍 DEBUG: API call - getMessages (user)', { sessionId });
    console.log('🔍 DEBUG: API base URL:', api.defaults.baseURL);
    console.log('🔍 DEBUG: API headers:', api.defaults.headers);
    console.log('🔍 DEBUG: Full URL will be:', api.defaults.baseURL + `/agents/${sessionId}/messages`);
    
    try {
      // Use regular user endpoint
      const response = await api.get(`/agents/${sessionId}/messages`);
      console.log('🔍 DEBUG: API response:', response);
      console.log('🔍 DEBUG: Response data:', response.data);
      console.log('🔍 DEBUG: Response data type:', typeof response.data);
      console.log('🔍 DEBUG: Response data is array?', Array.isArray(response.data));
      console.log('🔍 DEBUG: Response data length:', response.data?.length);
      
      // Handle different response structures
      let messages = response.data;
      
      // If response.data is not an array, try to extract it
      if (!Array.isArray(messages)) {
        console.warn('⚠️ WARNING: Response.data is not an array!', messages);
        if (messages && Array.isArray(messages.data)) {
          console.log('✅ Found nested data array');
          messages = messages.data;
        } else if (messages && Array.isArray(messages.messages)) {
          console.log('✅ Found messages array');
          messages = messages.messages;
        } else {
          console.error('❌ Could not find messages array, returning empty array');
          messages = [];
        }
      }
      
      // Log each message structure
      if (messages && messages.length > 0) {
        console.log('🔍 DEBUG: First message structure:', messages[0]);
        console.log('🔍 DEBUG: First message keys:', Object.keys(messages[0]));
        console.log('🔍 DEBUG: First message content:', messages[0].content);
        console.log('🔍 DEBUG: All messages content check:', messages.map((m, i) => ({
          index: i,
          id: m.id,
          hasContent: !!m.content,
          contentLength: m.content?.length || 0,
          contentPreview: m.content?.substring(0, 50) || '(empty)',
          sender: m.sender
        })));
      } else {
        console.warn('⚠️ WARNING: No messages in response!');
      }
      
      return messages;
    } catch (error) {
      console.error('❌ DEBUG: API error:', error);
      console.error('❌ DEBUG: Error response:', error.response);
      console.error('❌ DEBUG: Error status:', error.response?.status);
      console.error('❌ DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },
  sendMessage: async (sessionId, message) => {
    console.log('🔍 DEBUG: API call - sendMessage', { sessionId, message });
    console.log('🔍 DEBUG: API base URL:', api.defaults.baseURL);
    console.log('🔍 DEBUG: API headers:', api.defaults.headers);
    
    try {
      // Use MessageRequest format expected by backend
      const response = await api.post(`/agents/${sessionId}/messages`, { 
        message: message,
        message_type: 'text'
      });
      console.log('🔍 DEBUG: sendMessage response:', response);
      return response.data;
    } catch (error) {
      console.error('❌ DEBUG: sendMessage error:', error);
      console.error('❌ DEBUG: Error response:', error.response);
      throw error;
    }
  },
  createSession: async () => {
    console.log('🔍 DEBUG: API call - createSession');
    console.log('🔍 DEBUG: API base URL:', api.defaults.baseURL);
    console.log('🔍 DEBUG: Full URL will be:', api.defaults.baseURL + '/agents/sessions');
    
    try {
      const response = await api.post('/agents/sessions');
      console.log('🔍 DEBUG: createSession response:', response);
      console.log('🔍 DEBUG: Response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ DEBUG: createSession error:', error);
      console.error('❌ DEBUG: Error response:', error.response);
      console.error('❌ DEBUG: Error status:', error.response?.status);
      console.error('❌ DEBUG: Error data:', error.response?.data);
      throw error;
    }
  },
  createSessionWithName: async (userName) => {
    const response = await api.post('/agents/sessions', { user_name: userName });
    return response.data;
  },
  
  // Admin chat functions (for admin dashboard)
  getAdminSessions: async () => {
    console.log('🔍 DEBUG: API call - getAdminSessions');
    try {
      const response = await api.get('/agents/admin/sessions');
      console.log('🔍 DEBUG: getAdminSessions response:', response);
      return response.data;
    } catch (error) {
      console.error('❌ DEBUG: getAdminSessions error:', error);
      throw error;
    }
  },
  getAdminMessages: async (userId, sessionId) => {
    console.log('🔍 DEBUG: API call - getAdminMessages', { userId, sessionId });
    try {
      const response = await api.get(`/agents/admin/sessions/${userId}/${sessionId}/messages`);
      console.log('🔍 DEBUG: getAdminMessages response:', response);
      return response.data;
    } catch (error) {
      console.error('❌ DEBUG: getAdminMessages error:', error);
      throw error;
    }
  },
};

// Admin Chat (advanced) API
export const adminChatAPI = {
  /** Create a new admin chat session (for a new conversation). */
  createSession: async () => {
    const response = await api.post('/agents/admin/sessions');
    return response.data; // { session_id, user_id }
  },
  /** Send a message. Pass sessionId so messages go to that conversation. */
  sendQuery: async (query, sessionId = null) => {
    const body = { query, type: 'admin_query' };
    if (sessionId != null) body.session_id = Number(sessionId);
    const response = await api.post('/agents/admin/chat/query', body);
    return response.data; // expected shape: { response, type, data, session_id?, user_id? }
  }
};

// Engagement API
export const engagementAPI = {
  // Survey Management
  getSurveys: async (filters = {}) => {
    const response = await api.get('/engagement/surveys', { params: filters });
    return response.data;
  },
  getSurvey: async (surveyId) => {
    const response = await api.get(`/engagement/surveys/${surveyId}`);
    return response.data;
  },
  createSurvey: async (surveyData) => {
    const response = await api.post('/engagement/surveys', surveyData);
    return response.data;
  },
  updateSurvey: async (surveyId, surveyData) => {
    const response = await api.put(`/engagement/surveys/${surveyId}`, surveyData);
    return response.data;
  },
  deleteSurvey: async (surveyId) => {
    const response = await api.delete(`/engagement/surveys/${surveyId}`);
    return response.data;
  },
  getMySurveys: async () => {
    const response = await api.get('/engagement/surveys/my-surveys');
    return response.data;
  },
  getAvailableSurveys: async () => {
    const response = await api.get('/engagement/surveys/available');
    return response.data;
  },
  submitSurveyResponse: async (surveyId, responses) => {
    const response = await api.post(`/engagement/surveys/${surveyId}/responses`, responses);
    return response.data;
  },
  getSurveyResponses: async (surveyId) => {
    const response = await api.get(`/engagement/surveys/${surveyId}/responses`);
    return response.data;
  },
  getSurveyQuestionAnalytics: async (surveyId) => {
    const response = await api.get(`/engagement/surveys/${surveyId}/analytics`);
    return response.data;
  },

  // Recognition Programs
  getRecognitionPrograms: async () => {
    const response = await api.get('/engagement/recognition');
    return response.data;
  },
  createRecognitionProgram: async (programData) => {
    const response = await api.post('/engagement/recognition', programData);
    return response.data;
  },
  updateRecognitionProgram: async (programId, programData) => {
    const response = await api.put(`/engagement/recognition/${programId}`, programData);
    return response.data;
  },
  deleteRecognitionProgram: async (programId) => {
    const response = await api.delete(`/engagement/recognition/${programId}`);
    return response.data;
  },
  nominateEmployee: async (programId, nominationData) => {
    const response = await api.post(`/engagement/recognition/${programId}/nominate`, nominationData);
    return response.data;
  },

  // Wellness Programs
  getWellnessPrograms: async () => {
    const response = await api.get('/engagement/wellness');
    return response.data;
  },
  createWellnessProgram: async (programData) => {
    const response = await api.post('/engagement/wellness', programData);
    return response.data;
  },
  updateWellnessProgram: async (programId, programData) => {
    const response = await api.put(`/engagement/wellness/${programId}`, programData);
    return response.data;
  },
  deleteWellnessProgram: async (programId) => {
    const response = await api.delete(`/engagement/wellness/${programId}`);
    return response.data;
  },
  joinWellnessProgram: async (programId) => {
    const response = await api.post(`/engagement/wellness/${programId}/join`);
    return response.data;
  },

  // Analytics & Metrics
  getEngagementMetrics: async () => {
    const response = await api.get('/engagement/analytics/metrics');
    return response.data;
  },
  getSurveyAnalytics: async (surveyId) => {
    const response = await api.get(`/engagement/surveys/${surveyId}/analytics`);
    return response.data;
  },
  getDepartmentEngagement: async (department = null) => {
    const response = await api.get('/engagement/analytics/department', { 
      params: { department } 
    });
    return response.data;
  },
  getEngagementTrends: async (period = '6months') => {
    const response = await api.get('/engagement/analytics/trends', { 
      params: { period } 
    });
    return response.data;
  }
};

// Projects API (for project-based time tracking)
export const projectsAPI = {
  getList: async () => {
    const response = await api.get('/projects');
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/projects', data);
    return response.data;
  }
};

// Timesheet API
export const timesheetAPI = {
  createEntry: async (entryData) => {
    const response = await api.post('/timesheet/entries', entryData);
    return response.data;
  },
  createManualEntry: async (entryData) => {
    // Use the dedicated manual entry endpoint
    const response = await api.post('/timesheet/manual-entry', entryData);
    return response.data;
  },
  getMyEntries: async (startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get('/timesheet/entries', { params });
    return response.data;
  },
  getEntry: async (entryId) => {
    const response = await api.get(`/timesheet/entries/${entryId}`);
    return response.data;
  },
  updateEntry: async (entryId, entryData) => {
    const response = await api.put(`/timesheet/entries/${entryId}`, entryData);
    return response.data;
  },
  deleteEntry: async (entryId) => {
    const response = await api.delete(`/timesheet/entries/${entryId}`);
    return response.data;
  },
  submitEntry: async (entryId) => {
    const response = await api.post(`/timesheet/entries/${entryId}/submit`);
    return response.data;
  },
  getSummary: async (startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get('/timesheet/summary', { params });
    return response.data;
  },
  // Auto timesheet functions
  getAutoEntries: async (startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get('/timesheet/auto-entries', { params });
    return response.data;
  },
  getCurrentSession: async () => {
    const response = await api.get('/timesheet/current-session');
    return response.data;
  },
  confirmAutoEntry: async (entryId) => {
    const response = await api.post(`/timesheet/auto-entries/${entryId}/confirm`);
    return response.data;
  },
  sendWorkingConfirmation: async (body) => {
    const response = await api.post('/timesheet/working-confirmation/send', body);
    return response.data;
  },
  confirmWorking: async (requestId) => {
    const response = await api.post('/timesheet/confirm-working', { request_id: requestId });
    return response.data;
  },
  getTodayHours: async () => {
    const response = await api.get('/timesheet/today-hours');
    return response.data;
  },
  // Door access log functions
  getDoorAccessLogs: async (startDate = null, endDate = null, employeeId = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (employeeId) params.employee_id = employeeId;
    const response = await api.get('/timesheet/door-access', { params });
    return response.data;
  },
  getDoorAccessLog: async (accessId) => {
    const response = await api.get(`/timesheet/door-access/${accessId}`);
    return response.data;
  },
  updateWorkTime: async (workData) => {
    const response = await api.post('/timesheet/update-work-time', workData);
    return response.data;
  },
  getDailyBreakdown: async (employeeId, targetDate) => {
    const response = await api.get(`/timesheet/admin/employees/${employeeId}/breakdown/${targetDate}`);
    return response.data;
  },
  getSystemActivity: async (startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get('/timesheet/system-activity', { params });
    return response.data;
  },
  getEmployeeSystemActivity: async (employeeId, startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get(`/timesheet/admin/employees/${employeeId}/system-activity`, { params });
    return response.data;
  },
  getTrackerStatus: async () => {
    const response = await api.get('/timesheet/tracker/status');
    return response.data;
  },
  getEmployeeTrackerStatus: async (employeeId) => {
    const response = await api.get(`/timesheet/admin/employees/${employeeId}/tracker-status`);
    return response.data;
  },
  // HR Admin timesheet functions
  getAllEmployeeTimesheets: async (startDate = null, endDate = null, department = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (department) params.department = department;
    const response = await api.get('/timesheet/admin/employees', { params });
    return response.data;
  },
  getEmployeeTimesheetDetails: async (employeeId, startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get(`/timesheet/admin/employees/${employeeId}/details`, { params });
    return response.data;
  },
  getEmployeeDailyAttendance: async (employeeId, startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get(`/timesheet/admin/employees/${employeeId}/daily-attendance`, { params });
    return response.data;
  },
  getTimesheetSummary: async (startDate = null, endDate = null, department = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (department) params.department = department;
    const response = await api.get('/timesheet/admin/summary', { params });
    return response.data;
  },
  getPendingTimesheetsByDepartment: async (startDate = null, endDate = null, department = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (department) params.department = department;
    const response = await api.get('/timesheet/admin/pending', { params });
    return response.data;
  },
  getTimesheetsByStatus: async (status, startDate = null, endDate = null, department = null) => {
    const params = { status };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (department) params.department = department;
    const response = await api.get('/timesheet/admin/by-status', { params });
    return response.data;
  },
  // Approval functions (HR/Accountant)
  approveEntry: async (entryId) => {
    const response = await api.post(`/timesheet/entries/${entryId}/approve`);
    return response.data;
  },
  rejectEntry: async (entryId, rejectionReason = null) => {
    const response = await api.post(`/timesheet/entries/${entryId}/reject`, { rejection_reason: rejectionReason });
    return response.data;
  },
  // Get approved timesheets only (for Accountant panel)
  getApprovedTimesheets: async (startDate = null, endDate = null, department = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (department) params.department = department;
    const response = await api.get('/timesheet/approved', { params });
    return response.data;
  },
  // Screenshot functions
  getScreenshots: async (employeeId, startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get(`/timesheet/screenshots/${employeeId}`, { params });
    return response.data;
  },
  // Real-time activity
  getRealtimeActivity: async () => {
    const response = await api.get('/timesheet/realtime/activity');
    return response.data;
  },
};

// Documents API
export const documentsAPI = {
  uploadDocument: async (formData) => {
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getDocuments: async (category = null, isPublic = null) => {
    const params = {};
    if (category) params.category = category;
    if (isPublic !== null) params.is_public = isPublic;
    const response = await api.get('/documents/', { params });
    return response.data;
  },
  getDocument: async (documentId) => {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
  },
  downloadDocument: async (documentId) => {
    const response = await api.get(`/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },
  viewDocument: async (documentId) => {
    // Get document as blob and create object URL for viewing
    try {
      const response = await api.get(`/documents/${documentId}/view`, {
        responseType: 'blob'
      });
      return window.URL.createObjectURL(response.data);
    } catch (error) {
      console.error('Error getting document for view:', error);
      throw error;
    }
  },
  updateDocument: async (documentId, documentData) => {
    const response = await api.put(`/documents/${documentId}`, documentData);
    return response.data;
  },
  deleteDocument: async (documentId) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
  },
  getCategories: async () => {
    const response = await api.get('/documents/categories/list');
    return response.data;
  },
  getDocumentsByEmployee: async () => {
    const response = await api.get('/documents/admin/by-employee');
    return response.data;
  },
  getPendingDocuments: async () => {
    const response = await api.get('/documents/admin/pending-verification');
    return response.data;
  },
  approveDocument: async (documentId) => {
    const response = await api.post(`/documents/${documentId}/approve`);
    return response.data;
  },
  rejectDocument: async (documentId, reason) => {
    const response = await api.post(`/documents/${documentId}/reject`, { reason });
    return response.data;
  },
  // Required Documents Management (HR only)
  getRequiredDocuments: async () => {
    const response = await api.get('/documents/admin/required-documents');
    return response.data;
  },
  createRequiredDocument: async (documentData) => {
    const response = await api.post('/documents/admin/required-documents', documentData);
    return response.data;
  },
  updateRequiredDocument: async (requiredDocId, documentData) => {
    const response = await api.put(`/documents/admin/required-documents/${requiredDocId}`, documentData);
    return response.data;
  },
  deleteRequiredDocument: async (requiredDocId) => {
    const response = await api.delete(`/documents/admin/required-documents/${requiredDocId}`);
    return response.data;
  },
  assignRequiredDocument: async (requiredDocId, payload) => {
    const response = await api.post(`/documents/admin/required-documents/${requiredDocId}/assign`, payload);
    return response.data;
  },
  updateAssignment: async (assignmentId, payload) => {
    const response = await api.put(`/documents/admin/assignments/${assignmentId}`, payload);
    return response.data;
  },
  getEmployeeRequirements: async (employeeId) => {
    const response = await api.get(`/documents/admin/employees/${employeeId}/requirements`);
    return response.data;
  },
  getRequirementsOverview: async () => {
    const response = await api.get('/documents/admin/requirements/overview');
    return response.data;
  },
  // Employee document status
  getEmployeeDocumentStatus: async () => {
    const response = await api.get('/documents/employee/status');
    return response.data;
  },
  getEmployeeDocuments: async (employeeId) => {
    const response = await api.get(`/documents/admin/employees/${employeeId}/documents`);
    return response.data;
  },
  getDocumentStats: async () => {
    const response = await api.get('/documents/admin/stats');
    return response.data;
  },
};

// Task Tracking API
export const taskTrackingAPI = {
  createTask: async (taskData) => {
    const response = await api.post('/plugins/tasks', taskData);
    return response.data;
  },
  createTasksBulk: async (tasksData) => {
    const response = await api.post('/plugins/tasks/bulk', tasksData);
    return response.data;
  },
  getTasks: async (employeeId = null, status = null) => {
    const params = {};
    if (employeeId) params.employee_id = employeeId;
    if (status) params.status_filter = status;
    const response = await api.get('/plugins/tasks', { params });
    return response.data;
  },
  getTask: async (taskId) => {
    const response = await api.get(`/plugins/tasks/${taskId}`);
    return response.data;
  },
  updateTask: async (taskId, taskData) => {
    const response = await api.patch(`/plugins/tasks/${taskId}`, taskData);
    return response.data;
  },
  updateTaskStatus: async (taskId, statusData) => {
    const response = await api.patch(`/plugins/tasks/${taskId}/status`, statusData);
    return response.data;
  },
  startTimeTracking: async (taskId, timeData) => {
    const response = await api.post(`/plugins/tasks/${taskId}/time-tracking`, timeData);
    return response.data;
  },
  startTimer: async (taskId, notes = null) => {
    const response = await api.post(`/plugins/tasks/${taskId}/time-tracking/start?${notes ? `notes=${encodeURIComponent(notes)}` : ''}`);
    return response.data;
  },
  stopTimer: async (taskId, notes = null) => {
    const response = await api.post(`/plugins/tasks/${taskId}/time-tracking/stop?${notes ? `notes=${encodeURIComponent(notes)}` : ''}`);
    return response.data;
  },
  getActiveTimer: async (taskId) => {
    const response = await api.get(`/plugins/tasks/${taskId}/time-tracking/active`);
    return response.data;
  },
  getTimeTracking: async (taskId) => {
    const response = await api.get(`/plugins/tasks/${taskId}/time-tracking`);
    return response.data;
  },
  // Automatic task time tracking (no buttons needed!)
  setActiveTask: async (taskId) => {
    const response = await api.post(`/plugins/tasks/set-active-task?task_id=${taskId}`);
    return response.data;
  },
  clearActiveTask: async () => {
    const response = await api.post(`/plugins/tasks/set-active-task`);
    return response.data;
  },
  getActiveTask: async () => {
    const response = await api.get(`/plugins/tasks/active-task`);
    return response.data;
  },
  autoTrackTaskTime: async (workHours, isActive) => {
    const response = await api.post(`/plugins/tasks/auto-track-time?work_hours=${workHours}&is_active=${isActive}`);
    return response.data;
  },
  syncToTimesheet: async (taskId, date = null) => {
    const params = {};
    if (date) {
      // Convert date to YYYY-MM-DD format
      const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
      params.sync_date = dateStr;
    }
    const response = await api.post(`/plugins/tasks/${taskId}/sync-timesheet`, null, { params });
    return response.data;
  },
  getStatusUpdates: async (taskId) => {
    const response = await api.get(`/plugins/tasks/${taskId}/status-updates`);
    return response.data;
  },
  deleteTask: async (taskId) => {
    const response = await api.delete(`/plugins/tasks/${taskId}`);
    return response.data;
  },
};

// Helper function for updating task status
export const updateTaskStatus = async (taskId, statusData) => {
  return taskTrackingAPI.updateTaskStatus(taskId, statusData);
};

// Learning & Development API
export const learningAPI = {
  // Course Management
  getCourses: async () => {
    const response = await api.get('/learning/courses');
    return response.data;
  },
  getCourse: async (courseId) => {
    const response = await api.get(`/learning/courses/${courseId}`);
    return response.data;
  },
  createCourse: async (courseData) => {
    const response = await api.post('/learning/courses', courseData);
    return response.data;
  },
  updateCourse: async (courseId, courseData) => {
    const response = await api.put(`/learning/courses/${courseId}`, courseData);
    return response.data;
  },
  deleteCourse: async (courseId) => {
    const response = await api.delete(`/learning/courses/${courseId}`);
    return response.data;
  },
  
  // Employee Learning
  getMyCourses: async () => {
    const response = await api.get('/learning/me/courses');
    return response.data;
  },
  enrollCourse: async (courseId) => {
    const response = await api.post(`/learning/courses/${courseId}/enroll`);
    return response.data;
  },
  completeCourse: async (courseId) => {
    const response = await api.post(`/learning/courses/${courseId}/complete`);
    return response.data;
  },
  
  // Enrollments Management
  getEnrollments: async () => {
    const response = await api.get('/learning/enrollments');
    return response.data;
  },
  getMyEnrollments: async () => {
    const response = await api.get('/learning/me/enrollments');
    return response.data;
  },
  updateEnrollment: async (enrollmentId, enrollmentData) => {
    const response = await api.put(`/learning/enrollments/${enrollmentId}`, enrollmentData);
    return response.data;
  },
  deleteEnrollment: async (enrollmentId) => {
    const response = await api.delete(`/learning/enrollments/${enrollmentId}`);
    return response.data;
  },
  
  // Skills Management
  getSkills: async () => {
    const response = await api.get('/learning/skills');
    return response.data;
  },
  getMySkills: async () => {
    const response = await api.get('/learning/me/skills');
    return response.data;
  },
  createSkill: async (skillData) => {
    const response = await api.post('/learning/skills', skillData);
    return response.data;
  },
  updateSkill: async (skillId, skillData) => {
    const response = await api.put(`/learning/skills/${skillId}`, skillData);
    return response.data;
  },
  deleteSkill: async (skillId) => {
    const response = await api.delete(`/learning/skills/${skillId}`);
    return response.data;
  },
  
  // Progress Tracking
  getMyProgress: async () => {
    const response = await api.get('/learning/progress/me');
    return response.data;
  },
  getEmployeesProgress: async () => {
    const response = await api.get('/learning/progress/employees');
    return response.data;
  },
  updateCourseProgress: async (courseId, progressPercentage, timeSpent = null) => {
    const response = await api.post(`/learning/courses/${courseId}/progress`, {
      progress_percentage: progressPercentage,
      time_spent: timeSpent
    });
    return response.data;
  },
  createProgress: async (progressData) => {
    const response = await api.post('/learning/progress', progressData);
    return response.data;
  },
  updateProgress: async (progressId, progressData) => {
    const response = await api.put(`/learning/progress/${progressId}`, progressData);
    return response.data;
  },
  
  // Certifications
  getCertifications: async () => {
    const response = await api.get('/learning/certifications');
    return response.data;
  },
  getMyCertifications: async () => {
    const response = await api.get('/learning/me/certifications');
    return response.data;
  },
  createCertification: async (certData) => {
    const response = await api.post('/learning/certifications', certData);
    return response.data;
  },
  
  // Employee Management (for admin)
  getEmployees: async () => {
    const response = await api.get('/learning/employees');
    return response.data;
  },
  getEmployeeLearning: async (employeeId) => {
    const response = await api.get(`/learning/employees/${employeeId}`);
    return response.data;
  },
  assignCourse: async (employeeId, courseId) => {
    const response = await api.post(`/learning/employees/${employeeId}/courses/${courseId}/assign`);
    return response.data;
  },
  
  // Categories and Tags
  getCategories: async () => {
    const response = await api.get('/learning/categories');
    return response.data;
  },
  createCategory: async (categoryData) => {
    const response = await api.post('/learning/categories', categoryData);
    return response.data;
  },
  
  // Analytics and Reports
  getLearningStats: async () => {
    const response = await api.get('/learning/stats');
    return response.data;
  },
  getDepartmentLearningStats: async (department = null) => {
    const response = await api.get('/learning/department-stats', { 
      params: { department } 
    });
    return response.data;
  },
  getLearningProgress: async (filters = {}) => {
    const response = await api.get('/learning/progress', { params: filters });
    return response.data;
  }
};

// Performance Management API
export const performanceAPI = {
  getEmployees: async () => {
    const response = await api.get('/employees');
    return response.data;
  },
  getGoals: async (employeeId = null) => {
    const url = employeeId 
      ? `/performance/goals?employee_id=${employeeId}`
      : '/performance/goals';
    const response = await api.get(url);
    return response.data;
  },
  getGoal: async (goalId) => {
    const response = await api.get(`/performance/goals/${goalId}`);
    return response.data;
  },
  getMyGoals: async () => {
    const response = await api.get('/performance/goals/my-goals');
    return response.data;
  },
  createGoal: async (goalData) => {
    const response = await api.post('/performance/goals', goalData);
    return response.data;
  },
  updateGoal: async (goalId, goalData) => {
    const response = await api.put(`/performance/goals/${goalId}`, goalData);
    return response.data;
  },
  deleteGoal: async (goalId) => {
    const response = await api.delete(`/performance/goals/${goalId}`);
    return response.data;
  },
  getReviews: async (employeeId = null) => {
    const url = employeeId 
      ? `/performance/reviews?employee_id=${employeeId}`
      : '/performance/reviews';
    const response = await api.get(url);
    return response.data;
  },
  getReview: async (reviewId) => {
    const response = await api.get(`/performance/reviews/${reviewId}`);
    return response.data;
  },
  getMyReviews: async () => {
    const response = await api.get('/performance/reviews/my-reviews');
    return response.data;
  },
  createReview: async (reviewData) => {
    const response = await api.post('/performance/reviews', reviewData);
    return response.data;
  },
  updateReview: async (reviewId, reviewData) => {
    const response = await api.put(`/performance/reviews/${reviewId}`, reviewData);
    return response.data;
  },
  deleteReview: async (reviewId) => {
    const response = await api.delete(`/performance/reviews/${reviewId}`);
    return response.data;
  },
  submitReview: async (reviewId) => {
    const response = await api.post(`/performance/reviews/${reviewId}/submit`);
    return response.data;
  },
  approveReview: async (reviewId) => {
    const response = await api.post(`/performance/reviews/${reviewId}/approve`);
    return response.data;
  },
  completeReview: async (reviewId) => {
    const response = await api.post(`/performance/reviews/${reviewId}/complete`);
    return response.data;
  },
  getFeedback: async (employeeId = null) => {
    const url = employeeId 
      ? `/performance/feedback-360?employee_id=${employeeId}`
      : '/performance/feedback-360';
    const response = await api.get(url);
    return response.data;
  },
  submitFeedback: async (feedbackData) => {
    const response = await api.post('/performance/feedback-360', feedbackData);
    return response.data;
  },
  getPersonalAnalytics: async () => {
    const response = await api.get('/performance/analytics/personal');
    return response.data;
  }
};


// Compliance & Reporting API
export const complianceAPI = {
  generateReport: async (reportType, params) => {
    const queryParams = new URLSearchParams({
      start_date: params.start_date,
      end_date: params.end_date,
      format: params.format || 'json'
    });
    
    if (params.department && params.department !== 'All Departments') {
      queryParams.append('department', params.department);
    }
    
    const response = await api.get(`/compliance/reports/${reportType}?${queryParams}`);
    return response.data;
  },
  
  getAuditLogs: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.skip) queryParams.append('skip', params.skip);
    if (params.action) queryParams.append('action', params.action);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    
    const response = await api.get(`/compliance/audit-logs?${queryParams}`);
    return response.data;
  },
  
  createAuditLog: async (auditData) => {
    const response = await api.post('/compliance/audit-logs', auditData);
    return response.data;
  }
};

// Analytics API
export const analyticsAPI = {
  getLeaveAnalytics: async () => {
    const response = await api.get('/analytics/leave');
    return response.data;
  },
  
  getEmployeeAnalytics: async () => {
    const response = await api.get('/analytics/employee');
    return response.data;
  },
  
  getRecruitmentAnalytics: async () => {
    const response = await api.get('/analytics/recruitment');
    return response.data;
  },
  
  getSurveyAnalytics: async () => {
    const response = await api.get('/analytics/survey');
    return response.data;
  },
  
  getTimesheetAnalytics: async () => {
    const response = await api.get('/analytics/timesheet');
    return response.data;
  },
  
  getPayrollAnalytics: async () => {
    const response = await api.get('/analytics/payroll');
    return response.data;
  },
  
  getLearningAnalytics: async () => {
    const response = await api.get('/analytics/learning');
    return response.data;
  },
  
  getDashboardAnalytics: async () => {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  }
};

// Survey Analytics API (legacy)
export const surveyAnalyticsAPI = {
  getSurveyAnalytics: async () => {
    const response = await api.get('/engagement/surveys/analytics');
    return response.data;
  },
  
  getSurveySubmissions: async (surveyId) => {
    const response = await api.get(`/engagement/surveys/${surveyId}/submissions`);
    return response.data;
  }
};

// Agent Monitoring API
export const agentMonitoringAPI = {
  // Get comprehensive overview of all AI agents
  getAgentsOverview: async () => {
    const response = await api.get('/agents/monitoring/overview');
    return response.data;
  },
  
  // Get detailed performance metrics for a specific agent
  getAgentPerformance: async (agentType) => {
    const response = await api.get(`/agents/monitoring/performance/${agentType}`);
    return response.data;
  },
  
  // Restart a specific agent
  restartAgent: async (agentType) => {
    const response = await api.post(`/agents/monitoring/restart/${agentType}`);
    return response.data;
  },
  
  // Get recent agent activity logs
  getAgentLogs: async (limit = 50) => {
    const response = await api.get(`/agents/monitoring/logs?limit=${limit}`);
    return response.data;
  },
  
  // Get system health status
  getSystemHealth: async () => {
    const response = await api.get('/agents/monitoring/overview');
    return response.data.system_health;
  },
  
  // Get chat statistics
  getChatStatistics: async () => {
    const response = await api.get('/agents/monitoring/overview');
    return response.data.chat_statistics;
  }
};

// Question Bank API
export const questionBankAPI = {
  getQuestions: async (params = {}) => {
    const response = await api.get('/question-bank/questions', { params });
    return response.data;
  },
  getQuestion: async (questionId) => {
    const response = await api.get(`/question-bank/questions/${questionId}`);
    return response.data;
  },
  createQuestion: async (questionData) => {
    const response = await api.post('/question-bank/questions', questionData);
    return response.data;
  },
  updateQuestion: async (questionId, questionData) => {
    const response = await api.put(`/question-bank/questions/${questionId}`, questionData);
    return response.data;
  },
  deleteQuestion: async (questionId) => {
    await api.delete(`/question-bank/questions/${questionId}`);
  },
  generateQuestions: async (generationRequest) => {
    const response = await api.post('/question-bank/questions/generate', generationRequest);
    return response.data;
  },
  analyzeDifficulty: async (questionId) => {
    const response = await api.post(`/question-bank/questions/${questionId}/analyze-difficulty`);
    return response.data;
  },
  bulkAnalyzeDifficulty: async (questionIds) => {
    const response = await api.post('/question-bank/questions/bulk-analyze', questionIds);
    return response.data;
  },
  getTestTemplates: async (jobId = null) => {
    const params = jobId ? { job_id: jobId } : {};
    const response = await api.get('/question-bank/templates', { params });
    return response.data;
  },
  createTestTemplate: async (templateData) => {
    const response = await api.post('/question-bank/templates', templateData);
    return response.data;
  },
  generateTest: async (testRequest) => {
    const response = await api.post('/question-bank/generate-test', testRequest);
    return response.data;
  },
  getTestMonitoring: async (params = {}) => {
    const response = await api.get('/question-bank/monitoring', { params });
    return response.data;
  }
};

// Candidate Tests API  
export const candidateTestAPI = {
  getTest: async (testId) => {
    const response = await api.get(`/candidate-tests/${testId}`);
    return response.data;
  },
  startTest: async (testId) => {
    const response = await api.post(`/candidate-tests/${testId}/start`);
    return response.data;
  },
  logTestBehavior: async (testId, behaviorData) => {
    const response = await api.post(`/candidate-tests/${testId}/behavior`, behaviorData);
    return response.data;
  },
  submitTest: async (testId, submitData) => {
    const response = await api.post(`/candidate-tests/${testId}/submit`, submitData);
    return response.data;
  }
};

// HR Test Management API
export const hrTestAPI = {
  scheduleTest: async (applicationId, templateId) => {
    const response = await api.post(`/candidate-tests/hr/schedule?application_id=${applicationId}&template_id=${templateId}`);
    return response.data;
  },
  getTestReport: async (testId, includeProctoring = true) => {
    const response = await api.get(`/candidate-tests/hr/reports/${testId}`, {
      params: { include_proctoring: includeProctoring }
    });
    return response.data;
  },
  getTestAnalytics: async (startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get(`/candidate-tests/hr/analytics`, { params });
    return response.data;
  },
  getProctoringSummary: async (testId) => {
    const response = await api.get(`/candidate-tests/hr/proctoring/${testId}`);
    return response.data;
  }
};

// Investment Declaration API
export const investmentAPI = {
  getMyDeclarations: async () => {
    const response = await api.get('/investment/me');
    return response.data;
  },
  getDeclaration: async (declarationId) => {
    const response = await api.get(`/investment/${declarationId}`);
    return response.data;
  },
  createDeclaration: async (declarationData) => {
    const response = await api.post('/investment', declarationData);
    return response.data;
  },
  updateDeclaration: async (declarationId, declarationData) => {
    const response = await api.put(`/investment/${declarationId}`, declarationData);
    return response.data;
  },
  submitDeclaration: async (declarationId) => {
    const response = await api.post(`/investment/${declarationId}/submit`);
    return response.data;
  },
  verifyDeclaration: async (declarationId, verificationNotes) => {
    const response = await api.post(`/investment/${declarationId}/verify`, { verification_notes: verificationNotes });
    return response.data;
  },
  getAllDeclarations: async (employeeId = null, financialYear = null) => {
    const params = {};
    if (employeeId) params.employee_id = employeeId;
    if (financialYear) params.financial_year = financialYear;
    const response = await api.get('/investment', { params });
    return response.data;
  }
};

// Offer Letter API
export const offerLetterAPI = {
  createOfferLetter: async (offerData) => {
    const response = await api.post('/offer-letters', offerData);
    return response.data;
  },
  getOfferLetters: async (employeeId = null, candidateId = null, status = null) => {
    const params = {};
    if (employeeId) params.employee_id = employeeId;
    if (candidateId) params.candidate_id = candidateId;
    if (status) params.status_filter = status;
    const response = await api.get('/offer-letters', { params });
    return response.data;
  },
  getOfferLetter: async (offerId) => {
    const response = await api.get(`/offer-letters/offer/${offerId}`);
    return response.data;
  },
  updateOfferLetter: async (offerId, offerData) => {
    const response = await api.put(`/offer-letters/offer/${offerId}`, offerData);
    return response.data;
  },
  getOrgContext: async () => {
    const response = await api.get('/offer-letters/org-context');
    return response.data;
  },
  preview: async (previewData) => {
    const response = await api.post('/offer-letters/preview', previewData);
    return response.data;
  },
  previewPdf: async (previewData) => {
    const response = await api.post('/offer-letters/preview-pdf', previewData, { responseType: 'blob' });
    return response.data;
  },
  generatePDF: async (offerId, overrides = null) => {
    const response = await api.post(
      `/offer-letters/offer/${offerId}/generate-pdf`,
      overrides && Object.keys(overrides).length ? overrides : undefined
    );
    return response.data;
  },
  downloadPDF: async (offerId) => {
    const response = await api.get(`/offer-letters/offer/${offerId}/download-pdf`, { responseType: 'blob' });
    return response.data;
  },
  linkToPayroll: async (offerId, employeeId) => {
    const response = await api.post(`/offer-letters/offer/${offerId}/link-payroll`, null, { params: { employee_id: employeeId } });
    return response.data;
  },
  sendOfferLetter: async (offerId) => {
    const response = await api.post(`/offer-letters/offer/${offerId}/send`);
    return response.data;
  },
  acceptOfferLetter: async (offerId) => {
    const response = await api.post(`/offer-letters/offer/${offerId}/accept`);
    return response.data;
  },
  rejectOfferLetter: async (offerId) => {
    const response = await api.post(`/offer-letters/offer/${offerId}/reject`);
    return response.data;
  },
  deleteOfferLetter: async (offerId) => {
    const response = await api.delete(`/offer-letters/offer/${offerId}`);
    return response.data;
  },
  
  // Template Management
  getTemplates: async () => {
    const response = await api.get('/offer-letters/templates');
    return response.data;
  },
  
  getTemplate: async (templateId) => {
    const response = await api.get(`/offer-letters/templates/${templateId}`);
    return response.data;
  },
  
  getDefaultTemplate: async () => {
    const response = await api.get('/offer-letters/templates/default');
    return response.data;
  },
  
  createTemplate: async (templateData) => {
    const response = await api.post('/offer-letters/templates', templateData);
    return response.data;
  },
  
  updateTemplate: async (templateId, templateData) => {
    const response = await api.put(`/offer-letters/templates/${templateId}`, templateData);
    return response.data;
  },
  
  deleteTemplate: async (templateId) => {
    const response = await api.delete(`/offer-letters/templates/${templateId}`);
    return response.data;
  },
  
  uploadPdfTemplate: async (file, templateName, description, companyName, companyAddress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('template_name', templateName);
    if (description) formData.append('description', description);
    if (companyName) formData.append('company_name', companyName);
    if (companyAddress) formData.append('company_address', companyAddress);
    
    const response = await api.post('/offer-letters/templates/upload-template', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Auto-Detect Placeholder Methods (v3 - Fixed duplicate key)
  downloadTemplatePdf: async (templateId) => {
    const response = await api.get(`/offer-letters/templates/${templateId}/download-pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },

  detectAndSuggestPlaceholders: async (templateId) => {
    const response = await api.post(`/offer-letters/templates/${templateId}/detect-placeholders`);
    return response.data;
  },

  previewWithValues: async (payload) => {
    const { template_id, values } = payload;
    const response = await api.post(
      `/offer-letters/templates/${template_id}/preview-with-values`,
      { values },
      { responseType: 'blob' }
    );
    return response.data;
  },

  generateWithValues: async (payload) => {
    const { template_id, values } = payload;
    const response = await api.post(
      `/offer-letters/templates/${template_id}/generate-with-values`,
      { values }
    );
    return response.data;
  },

  downloadWithValues: async (payload) => {
    const { template_id, values } = payload;
    console.log('[API] ===== downloadWithValues CALLED =====');
    console.log('[API] Full payload:', payload);
    console.log('[API] template_id:', template_id);
    console.log('[API] values:', values);
    console.log('[API] values keys:', Object.keys(values || {}));
    console.log('[API] values JSON:', JSON.stringify(values, null, 2));
    
    const requestBody = { values: values || {} };
    console.log('[API] Request body to send:', requestBody);
    
    try {
      const response = await api({
        method: 'POST',
        url: `/offer-letters/templates/${template_id}/download-with-values`,
        data: requestBody,
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('[API] Response received');
      console.log('[API] Response status:', response.status);
      console.log('[API] Response headers:', response.headers);
      console.log('[API] Response data type:', response.data?.constructor?.name);
      console.log('[API] Blob size:', response.data?.size);
      console.log('[API] Blob type:', response.data?.type);
      
      // Check if response is actually JSON (error case)
      if (response.data?.type === 'application/json') {
        const text = await response.data.text();
        console.error('[API] Got JSON instead of file:', text);
        throw new Error('Server returned JSON instead of file: ' + text);
      }
      
      return response.data;
    } catch (error) {
      console.error('[API] Download error:', error);
      console.error('[API] Error response:', error.response);
      throw error;
    }
  }
};

// Leave Policy API
export const leavePolicyAPI = {
  createPolicy: async (policyData) => {
    const response = await api.post('/leave-policies', policyData);
    return response.data;
  },
  getPolicies: async (isActive = null, leaveType = null) => {
    const params = {};
    if (isActive !== null) params.is_active = isActive;
    if (leaveType) params.leave_type = leaveType;
    const response = await api.get('/leave-policies', { params });
    return response.data;
  },
  getPolicy: async (policyId) => {
    const response = await api.get(`/leave-policies/${policyId}`);
    return response.data;
  },
  updatePolicy: async (policyId, policyData) => {
    const response = await api.put(`/leave-policies/${policyId}`, policyData);
    return response.data;
  },
  deletePolicy: async (policyId) => {
    const response = await api.delete(`/leave-policies/${policyId}`);
    return response.data;
  },
  applyToEmployees: async (policyId, employeeIds = null) => {
    // Only include employee_ids in request body if it's provided
    const requestBody = employeeIds ? { employee_ids: employeeIds } : {};
    const response = await api.post(`/leave-policies/${policyId}/apply-to-employees`, requestBody);
    return response.data;
  }
};

// Insurance Card API
export const insuranceAPI = {
  createCard: async (cardData) => {
    const response = await api.post('/insurance', cardData);
    return response.data;
  },
  getMyCards: async (insuranceType = null) => {
    const params = {};
    if (insuranceType) params.insurance_type = insuranceType;
    const response = await api.get('/insurance/me', { params });
    return response.data;
  },
  getCard: async (cardId) => {
    const response = await api.get(`/insurance/${cardId}`);
    return response.data;
  },
  updateCard: async (cardId, cardData) => {
    const response = await api.put(`/insurance/${cardId}`, cardData);
    return response.data;
  },
  uploadCardImage: async (cardId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/insurance/${cardId}/upload-card-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  getAllCards: async (employeeId = null, insuranceType = null) => {
    const params = {};
    if (employeeId) params.employee_id = employeeId;
    if (insuranceType) params.insurance_type = insuranceType;
    const response = await api.get('/insurance', { params });
    return response.data;
  },
  deleteCard: async (cardId) => {
    const response = await api.delete(`/insurance/${cardId}`);
    return response.data;
  }
};

// Expenses API
export const expensesAPI = {
  createExpense: async (expenseData) => {
    // If caller passed a FormData (for receipt upload), ensure multipart headers
    const config = typeof FormData !== 'undefined' && expenseData instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    const response = await api.post('/expenses', expenseData, config);
    return response.data;
  },
  getMyExpenses: async (status = null, category = null) => {
    const params = {};
    if (status) params.status_filter = status;
    if (category) params.category = category;
    const response = await api.get('/expenses/me', { params });
    return response.data;
  },
  getExpense: async (expenseId) => {
    const response = await api.get(`/expenses/${expenseId}`);
    return response.data;
  },
  updateExpense: async (expenseId, expenseData) => {
    const response = await api.put(`/expenses/${expenseId}`, expenseData);
    return response.data;
  },
  uploadReceipt: async (expenseId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/expenses/${expenseId}/upload-receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  submitExpense: async (expenseId) => {
    const response = await api.post(`/expenses/${expenseId}/submit`);
    return response.data;
  },
  approveExpense: async (expenseId) => {
    const response = await api.post(`/expenses/${expenseId}/approve`);
    return response.data;
  },
  rejectExpense: async (expenseId, rejectionReason) => {
    const response = await api.post(`/expenses/${expenseId}/reject`, { rejection_reason: rejectionReason });
    return response.data;
  },
  getAllExpenses: async (employeeId = null, status = null) => {
    const params = {};
    if (employeeId) params.employee_id = employeeId;
    if (status) params.status_filter = status;
    const response = await api.get('/expenses', { params });
    return response.data;
  }
};

// Reimbursements API
export const reimbursementAPI = {
  createReimbursement: async (reimbursementData) => {
    const response = await api.post('/reimbursements', reimbursementData);
    return response.data;
  },
  getMyReimbursements: async (status = null) => {
    const params = {};
    if (status) params.status_filter = status;
    const response = await api.get('/reimbursements/me', { params });
    return response.data;
  },
  getReimbursement: async (reimbursementId) => {
    const response = await api.get(`/reimbursements/${reimbursementId}`);
    return response.data;
  },
  submitReimbursement: async (reimbursementId) => {
    const response = await api.post(`/reimbursements/${reimbursementId}/submit`);
    return response.data;
  },
  approveReimbursement: async (reimbursementId) => {
    const response = await api.post(`/reimbursements/${reimbursementId}/approve`);
    return response.data;
  },
  getAllReimbursements: async (employeeId = null, status = null) => {
    const params = {};
    if (employeeId) params.employee_id = employeeId;
    if (status) params.status_filter = status;
    const response = await api.get('/reimbursements', { params });
    return response.data;
  }
};

// Pre-employment Form API
export const preEmploymentAPI = {
  createForm: async (formData) => {
    const response = await api.post('/pre-employment', formData);
    return response.data;
  },
  getMyForm: async () => {
    const response = await api.get('/pre-employment/me');
    return response.data;
  },
  getForm: async (formId) => {
    const response = await api.get(`/pre-employment/${formId}`);
    return response.data;
  },
  updateForm: async (formId, formData) => {
    const response = await api.put(`/pre-employment/${formId}`, formData);
    return response.data;
  },
  submitForm: async (formId) => {
    const response = await api.post(`/pre-employment/${formId}/submit`);
    return response.data;
  },
  verifyForm: async (formId) => {
    const response = await api.post(`/pre-employment/${formId}/verify`);
    return response.data;
  },
  getAllForms: async (employeeId = null, candidateId = null, status = null) => {
    const params = {};
    if (employeeId) params.employee_id = employeeId;
    if (candidateId) params.candidate_id = candidateId;
    if (status) params.status_filter = status;
    const response = await api.get('/pre-employment', { params });
    return response.data;
  }
};

// Organization API
export const organizationAPI = {
  list: async (skip = 0, limit = 100, includeInactive = false) => {
    const response = await api.get('/organizations', {
      params: { skip, limit, include_inactive: includeInactive }
    });
    return response.data;
  },
  listAllAdmin: async (skip = 0, limit = 1000, includeInactive = true) => {
    const response = await api.get('/organizations/admin/all', {
      params: { skip, limit, include_inactive: includeInactive }
    });
    return response.data;
  },
  get: async (slug) => {
    const response = await api.get(`/organizations/${slug}`);
    return response.data;
  },
  checkExists: async () => {
    const response = await api.get('/organizations/exists');
    return response.data;
  },
  searchByName: async (companyName) => {
    // DEPRECATED: Use verifyCode instead for security
    const response = await api.get(`/organizations/search/${encodeURIComponent(companyName)}`);
    return response.data;
  },
  verifyCode: async (code, email = null) => {
    // Secure company code verification - exact match only, no searching
    // If email is provided, verifies user belongs to this company's database
    const payload = { code };
    if (email) {
      payload.email = email;
    }
    const response = await api.post('/organizations/verify-code', payload);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/organizations', data);
    return response.data;
  },
  update: async (slug, data) => {
    const response = await api.put(`/organizations/${slug}`, data);
    return response.data;
  },
  uploadLogo: async (slug, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/organizations/${slug}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getHealth: async (slug) => {
    const response = await api.get(`/organizations/${slug}/health`);
    return response.data;
  },
  checkHealth: async (slug) => {
    const response = await api.get(`/organizations/${slug}/health`);
    return response.data;
  },
  getDatabaseStats: async (slug) => {
    const response = await api.get(`/organizations/${slug}/database/stats`);
    return response.data;
  },
  upgrade: async (slug) => {
    const response = await api.post(`/organizations/${slug}/upgrade`);
    return response.data;
  },
  downgrade: async (slug, trialDays = 30) => {
    const response = await api.post(`/organizations/${slug}/downgrade`, null, {
      params: { trial_days: trialDays }
    });
    return response.data;
  },
  delete: async (slug) => {
    const response = await api.delete(`/organizations/${slug}`);
    return response.data;
  },
  getAdminSettings: async (slug) => {
    const response = await api.get(`/organizations/${slug}/admin-settings`);
    return response.data;
  }
};

export const subscriptionAPI = {
  listPlans: async (includeInactive = false) => {
    const response = await api.get('/subscriptions/plans', {
      params: { include_inactive: includeInactive }
    });
    return response.data;
  },
  getMyOrganizationUsage: async () => {
    const response = await api.get('/subscriptions/my-organization/usage');
    return response.data;
  },
  initiatePayment: async (organizationId, planId, paymentGateway = 'razorpay') => {
    const response = await api.post(`/subscriptions/organizations/${organizationId}/upgrade/initiate`, {
      plan_id: planId,
      payment_gateway: paymentGateway
    });
    return response.data;
  },
  verifyPayment: async (organizationId, orderId, paymentId, signature) => {
    const response = await api.post(`/subscriptions/organizations/${organizationId}/upgrade/verify`, {
      order_id: orderId,
      payment_id: paymentId,
      signature: signature
    });
    return response.data;
  },
  initiatePreRegistrationPayment: async (planId, paymentMethod = 'razorpay') => {
    const response = await api.post('/subscriptions/pre-registration/payment/initiate', {}, {
      params: {
        plan_id: planId,
        payment_method: paymentMethod
      }
    });
    return response.data;
  },
  verifyPreRegistrationPayment: async (transactionId, orderId, paymentId, signature) => {
    const response = await api.post('/subscriptions/pre-registration/payment/verify', {}, {
      params: {
        transaction_id: transactionId,
        order_id: orderId,
        payment_id: paymentId,
        signature: signature
      }
    });
    return response.data;
  }
};

// Manager API
export const managerAPI = {
  getDirectReports: async () => {
    const response = await api.get('/team/direct-reports');
    return response.data;
  },
  getTeamLeaves: async (status = null) => {
    const params = {};
    if (status) params.status_filter = status;
    const response = await api.get('/leave/team', { params });
    return response.data;
  },
  getTeamPendingLeaves: async () => {
    const response = await api.get('/leave/team/pending');
    return response.data;
  },
  approveLeave: async (leaveId) => {
    const response = await api.post(`/leave/${leaveId}/approve`);
    return response.data;
  },
  rejectLeave: async (leaveId, reason) => {
    const response = await api.post(`/leave/${leaveId}/reject`, { reason });
    return response.data;
  },
  getTeamTimesheets: async (startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get('/timesheet/team', { params });
    return response.data;
  },
  getTeamPayroll: async () => {
    const response = await api.get('/payroll/team');
    return response.data;
  },
  getTeamExpenses: async (status = null, category = null) => {
    const params = {};
    if (status) params.status_filter = status;
    if (category) params.category = category;
    const response = await api.get('/expenses/team', { params });
    return response.data;
  },
  approveExpense: async (expenseId) => {
    const response = await api.post(`/expenses/${expenseId}/approve`);
    return response.data;
  },
  rejectExpense: async (expenseId, rejectionReason) => {
    const params = {};
    if (rejectionReason) params.rejection_reason = rejectionReason;
    const response = await api.post(`/expenses/${expenseId}/reject`, null, { params });
    return response.data;
  },
  getTeamReimbursements: async (status = null) => {
    const params = {};
    if (status) params.status_filter = status;
    const response = await api.get('/reimbursements/team', { params });
    return response.data;
  },
  approveReimbursement: async (reimbursementId) => {
    const response = await api.post(`/reimbursements/${reimbursementId}/approve`);
    return response.data;
  },
  getTeamInvestmentDeclarations: async (financialYear = null) => {
    const params = {};
    if (financialYear) params.financial_year = financialYear;
    const response = await api.get('/investment/team', { params });
    return response.data;
  },
  verifyInvestmentDeclaration: async (declarationId, verificationNotes = null) => {
    const params = {};
    if (verificationNotes) params.verification_notes = verificationNotes;
    const response = await api.post(`/investment/${declarationId}/verify`, null, { params });
    return response.data;
  },
  getTeamChatSessions: async () => {
    const response = await api.get('/agents/manager/sessions');
    return response.data;
  },
  getTeamChatMessages: async (userId, sessionId) => {
    const response = await api.get(`/agents/manager/sessions/${userId}/${sessionId}/messages`);
    return response.data;
  },
  sendBirthdayWish: async (employeeId, message) => {
    const response = await api.post(`/employees/${employeeId}/birthday-wish`, { message });
    return response.data;
  }
};

// Team Management API
export const teamAPI = {
  getOrganizationStructure: async (department = null, teamView = false) => {
    const params = {};
    if (department) params.department = department;
    if (teamView) params.team_view = true;
    const response = await api.get('/team/organization-structure', { params });
    return response.data;
  },

  getReportingStructure: async (employeeId = null, department = null) => {
    const params = {};
    if (employeeId) params.employee_id = employeeId;
    if (department) params.department = department;
    const response = await api.get('/team/reporting-structure', { params });
    return response.data;
  },

  getApprovalHierarchy: async (employeeId = null, approvalType = null) => {
    const params = {};
    if (employeeId) params.employee_id = employeeId;
    if (approvalType) params.approval_type = approvalType;
    const response = await api.get('/team/approval-hierarchy', { params });
    return response.data;
  },

  getManagerChain: async (employeeId) => {
    const response = await api.get(`/team/employees/${employeeId}/manager-chain`);
    return response.data;
  }
};

// Workflow Management API
export const workflowAPI = {
  // Workflow Definitions
  getDefinitions: async (resourceType = null) => {
    const params = {};
    if (resourceType) params.resource_type = resourceType;
    const response = await api.get('/workflows/definitions', { params });
    return response.data;
  },
  getDefinition: async (workflowDefId) => {
    const response = await api.get(`/workflows/definitions/${workflowDefId}`);
    return response.data;
  },
  createDefinition: async (workflowData) => {
    const response = await api.post('/workflows/definitions', workflowData);
    return response.data;
  },
  updateDefinition: async (workflowDefId, workflowData) => {
    const response = await api.put(`/workflows/definitions/${workflowDefId}`, workflowData);
    return response.data;
  },
  deleteDefinition: async (workflowDefId) => {
    const response = await api.delete(`/workflows/definitions/${workflowDefId}`);
    return response.data;
  },

  // Workflow Instances
  getInstances: async (resourceType = null, resourceId = null) => {
    const params = {};
    if (resourceType) params.resource_type = resourceType;
    if (resourceId) params.resource_id = resourceId;
    const response = await api.get('/workflows/instances', { params });
    return response.data;
  },
  getInstance: async (instanceId) => {
    const response = await api.get(`/workflows/instances/${instanceId}`);
    return response.data;
  },
  startInstance: async (workflowData) => {
    const response = await api.post('/workflows/instances', workflowData);
    return response.data;
  },

  // Workflow Actions
  actOnInstance: async (instanceId, actionData) => {
    const response = await api.post(`/workflows/instances/${instanceId}/actions`, actionData);
    return response.data;
  },
  approveStep: async (instanceId, approvalData) => {
    return await this.actOnInstance(instanceId, { action: 'approve', ...approvalData });
  },
  rejectStep: async (instanceId, rejectionData) => {
    return await this.actOnInstance(instanceId, { action: 'reject', ...rejectionData });
  },

  // Auto-Approve Configuration
  getAutoApproveRules: async (workflowDefId) => {
    const response = await api.get(`/workflows/definitions/${workflowDefId}/auto-approve`);
    return response.data;
  },
  setAutoApproveRules: async (workflowDefId, rulesData) => {
    const response = await api.post(`/workflows/definitions/${workflowDefId}/auto-approve`, rulesData);
    return response.data;
  }
};


