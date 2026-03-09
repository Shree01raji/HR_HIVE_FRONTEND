/**
 * Utility functions to send configuration to the activity tracker
 */

/**
 * Send configuration to the activity tracker running on localhost:8765
 * This is called automatically when employees log in to configure their tracker
 */
export async function sendTrackerConfig() {
  try {
    // Tracker bridge runs with the desktop tracker app; skip in normal web browsers.
    const isElectron = typeof window !== 'undefined' &&
      typeof window.navigator?.userAgent === 'string' &&
      window.navigator.userAgent.includes('Electron');
    if (!isElectron) {
      return { success: false, reason: 'tracker_not_available_in_browser' };
    }

    // Get config from localStorage
    const token = localStorage.getItem('token');
    const organizationSlug = localStorage.getItem('selectedOrganization');
    
    if (!token) {
      console.log('[Tracker Config] No auth token found, skipping config');
      return { success: false, reason: 'no_token' };
    }
    
    // Determine API base URL - use same logic as api.js
    let apiBaseUrl = window.location.origin + '/api';
    
    // Try to use the same base URL as the main API (for consistency)
    try {
      const envUrl = import.meta.env.VITE_API_BASE_URL;
      if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '' && 
          !envUrl.includes('72.61.172.7') && !envUrl.includes('localhost:8000') &&
          !envUrl.startsWith('/')) {
        apiBaseUrl = envUrl;
      }
    } catch (e) {
      // Ignore - use default
    }
    
    try {
      // Fetch current user to get employee_id
      const response = await fetch(`${apiBaseUrl}/auth/session`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Organization-Slug': organizationSlug || '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn('[Tracker Config] Could not fetch user session:', response.status);
        return { success: false, reason: 'no_session' };
      }
      
      const userData = await response.json();
      // employee_id can be in userData.employee_id or userData.user.employee_id
      const employeeId = userData.employee_id || userData.user?.employee_id;
      
      if (!employeeId) {
        console.warn('[Tracker Config] No employee_id in user data:', userData);
        return { success: false, reason: 'no_employee_id' };
      }
      
      // Prepare config object
      const config = {
        apiBaseUrl: apiBaseUrl,
        authToken: token,
        employeeId: employeeId,
        organizationSlug: organizationSlug || null
      };
      
      // Send to tracker on localhost:8765
      // Use AbortController with timeout to avoid hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      try {
        const trackerResponse = await fetch('http://localhost:8765/tracker-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(config),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (trackerResponse.ok) {
          const result = await trackerResponse.json();
          console.log('[Tracker Config] ✅ Configuration sent to tracker successfully');
          return { success: true, ...result };
        } else {
          // Tracker might not be running - that's okay
          console.log('[Tracker Config] ⚠️ Tracker not running (this is okay if tracker is not installed yet)');
          return { success: false, reason: 'tracker_not_running' };
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Connection refused, network error, or timeout - tracker probably not running
        // These are expected and normal - suppress error logging
        if (fetchError.name === 'AbortError' || 
            fetchError.message.includes('fetch') || 
            fetchError.message.includes('Failed to fetch') ||
            fetchError.message.includes('ERR_CONNECTION_REFUSED') ||
            fetchError.message.includes('NetworkError')) {
          // Silent - this is expected when tracker is not installed
          return { success: false, reason: 'tracker_not_running' };
        }
        
        // Only log unexpected errors
        console.error('[Tracker Config] Unexpected error:', fetchError);
        return { success: false, reason: 'error', error: fetchError.message };
      }
    } catch (error) {
      console.error('[Tracker Config] Error fetching user session:', error);
      return { success: false, reason: 'error', error: error.message };
    }
  } catch (error) {
    console.error('[Tracker Config] Unexpected error:', error);
    return { success: false, reason: 'unexpected_error', error: error.message };
  }
}

/**
 * Try to send config to tracker, retrying a few times
 * Useful when tracker might take a moment to start
 */
export async function sendTrackerConfigWithRetry(maxRetries = 3, delayMs = 2000) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await sendTrackerConfig();
    
    if (result.success) {
      return result;
    }
    
    // If tracker is not running, wait and retry
    if (result.reason === 'tracker_not_running' && i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      continue;
    }
    
    // For other errors, don't retry
    return result;
  }
  
  return { success: false, reason: 'max_retries_exceeded' };
}
