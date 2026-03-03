/**
 * Automatic Task Time Tracking Hook
 * Automatically tracks time to the active task based on user activity
 * No buttons needed - fully automatic!
 */
import { useEffect, useRef } from 'react';
import { taskTrackingAPI } from '../services/api';
import activityTracker from '../utils/activityTracker';

export const useAutoTaskTracking = (enabled = true) => {
  const syncIntervalRef = useRef(null);
  const lastSyncTimeRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Sync task time every 30 seconds (same as general timesheet)
    syncIntervalRef.current = setInterval(async () => {
      try {
        // Get current work time from activity tracker
        const totalWorkTime = activityTracker.getTotalWorkTime(); // in hours
        const isActive = activityTracker.isCurrentlyWorking();

        // Only sync if there's meaningful work time (at least 1 minute)
        if (totalWorkTime < 1/60) {
          return;
        }

        // Check if we have an active task
        const activeTask = await taskTrackingAPI.getActiveTask();
        
        if (activeTask?.active_task_id) {
          // Automatically track time to active task
          await taskTrackingAPI.autoTrackTaskTime(totalWorkTime, isActive);
          
          // Reset activity tracker work time after syncing (to avoid double counting)
          // Actually, don't reset - let it accumulate for the general timesheet
          // The task time is calculated from the timer duration, not from work_hours
        }
      } catch (error) {
        console.error('Failed to auto-track task time:', error);
        // Don't throw - this is background sync, failures are non-critical
      }
    }, 30000); // Every 30 seconds

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [enabled]);

  return {
    setActiveTask: async (taskId) => {
      try {
        return await taskTrackingAPI.setActiveTask(taskId);
      } catch (error) {
        console.error('Failed to set active task:', error);
        throw error;
      }
    },
    clearActiveTask: async () => {
      try {
        return await taskTrackingAPI.clearActiveTask();
      } catch (error) {
        console.error('Failed to clear active task:', error);
        throw error;
      }
    },
    getActiveTask: async () => {
      try {
        return await taskTrackingAPI.getActiveTask();
      } catch (error) {
        console.error('Failed to get active task:', error);
        return null;
      }
    }
  };
};
