import { QueryClient } from '@tanstack/react-query';

// API base URL - use relative path for proxy support
// This works with both Vite dev proxy and Nginx in production
// Leave empty to use relative path '/api'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Generic API request function
export async function apiRequest(endpoint, options = {}) {
  // Only prepend base URL if endpoint is not already a full URL
  // If API_BASE_URL is set, use it; otherwise use '/api' prefix for proxy support
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : (API_BASE_URL ? `${API_BASE_URL}${endpoint}` : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);

  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;

    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.detail || errorData.message || errorMessage;
    } catch {
      if (errorText) {
        errorMessage = errorText;
      }
    }

    // Handle 401 Unauthorized
    if (response.status === 401) {
      localStorage.removeItem('token');
      // Don't redirect here to avoid infinite loops, let components handle it
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

// Query function factory
export const getQueryFn = (options = { on401: 'throw' }) => {
  return async ({ queryKey }) => {
    const endpoint = queryKey[0];
    
    // Build URL - handle both relative and absolute paths
    // If endpoint is full URL, use as-is
    // If API_BASE_URL is set, use it
    // Otherwise, use '/api' prefix for proxy support
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : (API_BASE_URL ? `${API_BASE_URL}${endpoint}` : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);

    const token = localStorage.getItem('token');

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      headers,
      credentials: 'include',
    });

    // Handle 401 based on options
    if (options.on401 === 'returnNull' && res.status === 401) {
      return null;
    }

    if (!res.ok) {
      const errorText = await res.text();
      let errorMessage = `API Error: ${res.status} ${res.statusText}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        if (errorText) {
          errorMessage = errorText;
        }
      }

      if (res.status === 401) {
        localStorage.removeItem('token');
      }

      throw new Error(errorMessage);
    }

    return await res.json();
  };
};

// Create and configure QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: 'throw' }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Helper function for mutations
export async function apiMutation(endpoint, options = {}) {
  return apiRequest(endpoint, options);
}

