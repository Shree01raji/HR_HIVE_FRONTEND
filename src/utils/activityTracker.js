/**
 * Activity Tracker for Work Time Monitoring
 * Tracks actual work activity (mouse, keyboard, scroll) to determine real work time
 */

class ActivityTracker {
  constructor() {
    this.isActive = false;
    this.lastActivity = Date.now();
    this.idleThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.workStartTime = null;
    this.totalWorkTime = 0; // in milliseconds
    this.isTracking = false;
    this.activityCallbacks = [];
    this.heartbeatInterval = null;
    this.idlePeriods = []; // Track all idle periods with start/end times
    this.currentIdleStart = null; // Track when current idle period started
    
    // Bind methods
    this.handleActivity = this.handleActivity.bind(this);
    this.checkIdle = this.checkIdle.bind(this);
  }

  /**
   * Start tracking work activity
   */
  startTracking() {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.workStartTime = Date.now();
    this.lastActivity = Date.now();
    this.isActive = true;
    
    // Add event listeners for activity detection
    this.addEventListeners();
    
    // Start heartbeat to check for idle state
    this.startHeartbeat();
    
    console.log('🟢 Work time tracking started');
    this.notifyActivityChange(true);
  }

  /**
   * Stop tracking work activity
   */
  stopTracking() {
    if (!this.isTracking) return;
    
    // Calculate final work time
    if (this.isActive && this.workStartTime) {
      const sessionWorkTime = Date.now() - this.workStartTime;
      this.totalWorkTime += sessionWorkTime;
    }
    
    this.isTracking = false;
    this.workStartTime = null;
    this.isActive = false;
    
    // Remove event listeners
    this.removeEventListeners();
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    console.log('🔴 Work time tracking stopped');
    this.notifyActivityChange(false);
  }

  /**
   * Add event listeners for activity detection
   */
  addEventListeners() {
    const events = [
      'mousedown', 'mousemove', 'keydown', 'keyup', 'scroll',
      'touchstart', 'touchmove', 'click', 'focus', 'blur'
    ];
    
    events.forEach(event => {
      document.addEventListener(event, this.handleActivity, true);
    });
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {
    const events = [
      'mousedown', 'mousemove', 'keydown', 'keyup', 'scroll',
      'touchstart', 'touchmove', 'click', 'focus', 'blur'
    ];
    
    events.forEach(event => {
      document.removeEventListener(event, this.handleActivity, true);
    });
  }

  /**
   * Handle activity events
   */
  handleActivity() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    
    // Only consider it activity if it's been more than 1 second since last activity
    // This prevents excessive activity updates
    if (timeSinceLastActivity > 1000) {
      this.lastActivity = now;
      
      // If we were idle and now have activity, end the idle period and resume work time
      if (!this.isActive && this.isTracking && this.currentIdleStart) {
        // Record the completed idle period
        const idleEnd = now;
        const idleDuration = idleEnd - this.currentIdleStart;
        
        // Only record idle periods longer than 1 minute
        if (idleDuration >= 60 * 1000) {
          this.idlePeriods.push({
            start_time: new Date(this.currentIdleStart).toISOString(),
            end_time: new Date(idleEnd).toISOString(),
            duration_minutes: idleDuration / (60 * 1000)
          });
        }
        
        this.currentIdleStart = null;
        this.isActive = true;
        this.workStartTime = now;
        console.log('🟢 Work resumed');
        this.notifyActivityChange(true);
      }
    }
  }

  /**
   * Check if user is idle
   */
  checkIdle() {
    if (!this.isTracking) return;
    
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    
    // If user has been idle for more than threshold, pause work time and start tracking idle period
    if (timeSinceLastActivity > this.idleThreshold && this.isActive) {
      // Calculate work time for this session
      if (this.workStartTime) {
        const sessionWorkTime = now - this.workStartTime;
        this.totalWorkTime += sessionWorkTime;
      }
      
      // Start tracking this idle period
      this.currentIdleStart = now - timeSinceLastActivity; // Use when idle actually started
      this.isActive = false;
      this.workStartTime = null;
      console.log('🟡 Work paused - user idle');
      this.notifyActivityChange(false);
    }
  }

  /**
   * Start heartbeat to check for idle state
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(this.checkIdle, 30000); // Check every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get current work time in hours
   */
  getCurrentWorkTime() {
    let currentWorkTime = this.totalWorkTime;
    
    // Add current session work time if active
    if (this.isActive && this.workStartTime) {
      currentWorkTime += Date.now() - this.workStartTime;
    }
    
    return currentWorkTime / (1000 * 60 * 60); // Convert to hours
  }

  /**
   * Get current session work time in hours
   */
  getCurrentSessionWorkTime() {
    if (!this.isActive || !this.workStartTime) {
      return 0;
    }
    
    return (Date.now() - this.workStartTime) / (1000 * 60 * 60); // Convert to hours
  }

  /**
   * Get total work time in hours
   */
  getTotalWorkTime() {
    return this.totalWorkTime / (1000 * 60 * 60); // Convert to hours
  }

  /**
   * Reset work time
   */
  resetWorkTime() {
    this.totalWorkTime = 0;
    this.workStartTime = null;
    this.lastActivity = Date.now();
    this.idlePeriods = [];
    this.currentIdleStart = null;
  }

  /**
   * Get all idle periods (only completed ones for syncing)
   */
  getIdlePeriods() {
    // Only return completed periods for syncing
    // Ongoing periods will be synced when they end
    return [...this.idlePeriods];
  }

  /**
   * Get all idle periods including ongoing
   */
  getAllIdlePeriods() {
    const periods = [...this.idlePeriods];
    
    // Include current idle period if active
    if (!this.isActive && this.currentIdleStart) {
      const now = Date.now();
      const idleDuration = now - this.currentIdleStart;
      if (idleDuration >= 60 * 1000) {
        periods.push({
          start_time: new Date(this.currentIdleStart).toISOString(),
          end_time: null, // Still ongoing
          duration_minutes: idleDuration / (60 * 1000)
        });
      }
    }
    
    return periods;
  }

  /**
   * Clear idle periods (after syncing to backend)
   */
  clearIdlePeriods() {
    this.idlePeriods = [];
    this.currentIdleStart = null;
  }

  /**
   * Check if currently working
   */
  isCurrentlyWorking() {
    return this.isActive && this.isTracking;
  }

  /**
   * Add activity change callback
   */
  onActivityChange(callback) {
    this.activityCallbacks.push(callback);
  }

  /**
   * Remove activity change callback
   */
  offActivityChange(callback) {
    this.activityCallbacks = this.activityCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Notify activity change
   */
  notifyActivityChange(isActive) {
    this.activityCallbacks.forEach(callback => {
      try {
        callback(isActive, this.getCurrentWorkTime());
      } catch (error) {
        console.error('Error in activity callback:', error);
      }
    });
  }

  /**
   * Get work time summary
   */
  getWorkTimeSummary() {
    return {
      isTracking: this.isTracking,
      isActive: this.isActive,
      currentSessionTime: this.getCurrentSessionWorkTime(),
      totalWorkTime: this.getTotalWorkTime(),
      lastActivity: this.lastActivity,
      idleThreshold: this.idleThreshold
    };
  }
}

// Create global instance
const activityTracker = new ActivityTracker();

export default activityTracker;
