import React, { useState, useEffect } from 'react';
import { FiDownload, FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';
import { timesheetAPI } from '../services/api';
import { sendTrackerConfigWithRetry } from '../utils/trackerConfig';

const ActivityTrackerInstaller = () => {
  const [trackerStatus, setTrackerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    checkTrackerStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkTrackerStatus, 30000);
    
    // Try to configure tracker when component mounts (if user is logged in)
    // This helps configure tracker if employee logged in before installing tracker
    const configureTracker = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        // Wait a bit for tracker to start if just installed
        setTimeout(async () => {
          const result = await sendTrackerConfigWithRetry(3, 2000);
          if (result.success) {
            console.log('[ActivityTrackerInstaller] ✅ Tracker configured');
            // Refresh status after configuring
            setTimeout(checkTrackerStatus, 1000);
          }
        }, 3000);
      }
    };
    configureTracker();
    
    return () => clearInterval(interval);
  }, []);

  const checkTrackerStatus = async () => {
    try {
      const status = await timesheetAPI.getTrackerStatus();
      setTrackerStatus(status);
    } catch (error) {
      console.error('Failed to check tracker status:', error);
      setTrackerStatus({ is_active: false, tracker_installed: false });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setInstalling(true);
    try {
      // Determine OS and download appropriate installer
      const platform = detectPlatform();
      const downloadUrl = getDownloadUrl(platform);
      
      console.log('[ActivityTrackerInstaller] Starting download:', downloadUrl);
      console.log('[ActivityTrackerInstaller] Browser:', isEdgeBrowser() ? 'Edge' : 'Other');
      
      // Use a more reliable download method that works in Edge
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadUrl.split('/').pop(); // Extract filename
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.display = 'none'; // Hide the link
      
      // Append to body, click, then remove
      document.body.appendChild(link);
      
      // For Edge, we may need to wait a bit before clicking
      if (isEdgeBrowser()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      link.click();
      
      // Remove link after a short delay to ensure download starts
      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
      }, 1000);
      
      // After download, show instructions
      setTimeout(() => {
        const message = isEdgeBrowser() 
          ? `Download started! If Edge blocked the download:\n1. Check the downloads bar at the bottom\n2. Click "Keep" if prompted\n3. After installation, run the installer\n4. The tracker will start automatically\n5. Refresh this page to verify`
          : `Download started! After installation:\n1. Run the installer\n2. The tracker will start automatically\n3. Refresh this page to verify`;
        alert(message);
      }, 1000);
      
    } catch (error) {
      console.error('[ActivityTrackerInstaller] Download failed:', error);
      // Fallback to window.open if anchor method fails
      try {
        const platform = detectPlatform();
        const downloadUrl = getDownloadUrl(platform);
        console.log('[ActivityTrackerInstaller] Trying fallback method:', downloadUrl);
        window.open(downloadUrl, '_blank');
      } catch (fallbackError) {
        console.error('[ActivityTrackerInstaller] Fallback download also failed:', fallbackError);
        alert('Failed to start download. Please try right-clicking the download button and selecting "Save link as..." or contact IT support.');
      }
    } finally {
      setInstalling(false);
    }
  };

  const detectPlatform = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) return 'windows';
    if (userAgent.includes('mac')) return 'mac';
    if (userAgent.includes('linux')) return 'linux';
    return 'windows'; // Default
  };

  const isEdgeBrowser = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return userAgent.includes('edg/') || userAgent.includes('edge/');
  };

  const getDownloadUrl = (platform) => {
    // These URLs should point to your actual installer files
    const baseUrl = window.location.origin;
    const urls = {
      windows: `${baseUrl}/downloads/hr-hive-tracker-setup.exe`,
      mac: `${baseUrl}/downloads/hr-hive-tracker.dmg`,
      linux: `${baseUrl}/downloads/hr-hive-tracker.AppImage`
    };
    return urls[platform] || urls.windows;
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-sm text-blue-800">Checking tracker status...</span>
        </div>
      </div>
    );
  }

  if (!trackerStatus) {
    return null;
  }

  const isInstalled = trackerStatus.tracker_installed;
  const isActive = trackerStatus.is_active;

  if (isInstalled && isActive) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-1">
            <FiCheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Activity Tracker Active</p>
              <p className="text-xs text-green-600">
                Last activity: {trackerStatus.last_activity ? new Date(trackerStatus.last_activity).toLocaleString() : 'Just now'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              disabled={installing}
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-medium disabled:opacity-50"
              title="Download updated tracker version"
            >
              <FiDownload className="w-3 h-3" />
              <span>{installing ? 'Downloading...' : 'Update Tracker'}</span>
            </button>
            <button
              onClick={checkTrackerStatus}
              className="text-xs text-green-600 hover:text-green-800 underline"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <FiInfo className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-sm font-medium text-yellow-800">Activity Tracker Required</h3>
          </div>
          <p className="text-xs text-yellow-700 mb-3">
            Install the activity tracker to automatically track your work activities across all applications.
            This helps accurately measure work time and productivity.
          </p>
          
          {showInfo && (
            <div className="bg-yellow-100 rounded p-3 mb-3 text-xs text-yellow-800">
              <p className="font-semibold mb-1">What gets tracked:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Applications you use (VS Code, Excel, Chrome, etc.)</li>
                <li>Active windows and websites</li>
                <li>Idle time detection</li>
                <li>Time spent per application</li>
              </ul>
              <p className="mt-2 text-yellow-700">
                <strong>Privacy:</strong> Data is encrypted and only accessible to authorized HR personnel.
              </p>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              disabled={installing}
              className="flex items-center space-x-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
            >
              <FiDownload className="w-4 h-4" />
              <span>{installing ? 'Downloading...' : 'Download & Install Tracker'}</span>
            </button>
            
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="text-xs text-yellow-700 hover:text-yellow-900 underline"
            >
              {showInfo ? 'Hide' : 'More Info'}
            </button>
          </div>
        </div>
        
        <button
          onClick={() => setTrackerStatus(null)}
          className="text-yellow-600 hover:text-yellow-800 ml-2"
        >
          <FiXCircle className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ActivityTrackerInstaller;

