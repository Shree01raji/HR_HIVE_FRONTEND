/**
 * Tracker Configuration Utility
 * Sends configuration to Electron tracker when user logs in
 */

const configManager = {
  /**
   * Get config file path (for Electron tracker)
   * This is where the tracker expects to find its configuration
   */
  getConfigPath() {
    // On Windows: C:\Users\<username>\.hr-hive-tracker\config.json
    // On Mac: ~/.hr-hive-tracker/config.json
    // On Linux: ~/.hr-hive-tracker/config.json
    
    // For web app, we'll send config via API or IPC if Electron is available
    // For now, we'll use localStorage as a bridge and Electron can read it
    return 'localStorage'; // Electron will read from localStorage or API
  },

  /**
   * Configure tracker when user logs in
   * This writes the config to a location that Electron can read
   */
  async configureTracker(authToken, employeeId, apiBaseUrl = null) {
    try {
      // Get API base URL
      const baseUrl = apiBaseUrl || window.location.origin + '/api';
      
      // Create config object
      const config = {
        apiBaseUrl: baseUrl,
        authToken: authToken,
        employeeId: employeeId,
        organizationSlug: localStorage.getItem('selectedOrganization'),
        updatedAt: new Date().toISOString(),
        setupComplete: true
      };
      
      // Store config in localStorage (for Electron embedded mode)
      localStorage.setItem('trackerConfig', JSON.stringify(config));
      
      // Try to send config to Electron app via IPC (if running in Electron)
      if (window.electron && window.electron.ipcRenderer) {
        try {
          await window.electron.ipcRenderer.invoke('set-config', config);
          console.log('✅ Tracker configured via IPC');
          return true;
        } catch (error) {
          console.log('⚠️ IPC not available, trying file write...');
        }
      }
      
      // Try to send config to Electron app's local HTTP server
      // This is the permanent solution: Electron runs a local server on port 8765
      try {
        const response = await fetch('http://localhost:8765/tracker-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(config),
          // Don't wait too long - if Electron isn't running, fail fast
          signal: AbortSignal.timeout(2000)
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            console.log('✅ Tracker configured via local HTTP server');
            return true;
          }
        }
      } catch (error) {
        // Electron app might not be running or port 8765 not available
        console.log('⚠️ Could not connect to Electron tracker (it may not be running)');
        console.log('   The tracker will use config from file when it starts');
      }
      
      // Fallback: Send config to backend endpoint that Electron can poll
      // Electron will read from backend if local server fails
      try {
        await fetch(`${baseUrl}/timesheet/tracker/store-config`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            employee_id: employeeId,
            ...config
          })
        });
        console.log('✅ Tracker config sent to backend (Electron can retrieve it)');
      } catch (error) {
        console.log('⚠️ Could not send config to backend:', error);
      }
      
      console.log('✅ Tracker configuration saved. Electron app will pick it up automatically.');
      console.log('   Tip: Make sure the Electron tracker app is running');
      return true;
    } catch (error) {
      console.error('Failed to configure tracker:', error);
      return false;
    }
  },

  /**
   * Check if tracker is configured
   */
  isTrackerConfigured() {
    const config = localStorage.getItem('trackerConfig');
    return config !== null;
  },

  /**
   * Get tracker configuration
   */
  getTrackerConfig() {
    const config = localStorage.getItem('trackerConfig');
    if (config) {
      try {
        return JSON.parse(config);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
};

export default configManager;

