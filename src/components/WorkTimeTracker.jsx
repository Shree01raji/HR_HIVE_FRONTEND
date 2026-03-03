import React, { useState, useEffect, useRef } from 'react';
import { FiPlay, FiPause, FiSquare, FiClock } from 'react-icons/fi';
import activityTracker from '../utils/activityTracker';
import { timesheetAPI } from '../services/api';

const WorkTimeTracker = ({ onTimeUpdate }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const [totalWorkTime, setTotalWorkTime] = useState(0);
  const [displayTime, setDisplayTime] = useState('00:00:00');
  const intervalRef = useRef(null);

  useEffect(() => {
    // Set up activity tracking callbacks
    const handleActivityChange = (active, workTime) => {
      setIsActive(active);
      setTotalWorkTime(workTime);
      if (onTimeUpdate) {
        onTimeUpdate({
          isActive: active,
          totalWorkTime: workTime,
          currentSessionTime: activityTracker.getCurrentSessionWorkTime()
        });
      }
    };

    activityTracker.onActivityChange(handleActivityChange);

    // Start update interval
    intervalRef.current = setInterval(async () => {
      if (isTracking) {
        const sessionTime = activityTracker.getCurrentSessionWorkTime();
        const totalTime = activityTracker.getTotalWorkTime();
        
        setCurrentSessionTime(sessionTime);
        setTotalWorkTime(totalTime);
        setDisplayTime(formatTime(sessionTime));
        
        // Sync with backend every 30 seconds
        if (Math.floor(Date.now() / 1000) % 30 === 0) {
          try {
            const idlePeriods = activityTracker.getIdlePeriods();
            await timesheetAPI.updateWorkTime({
              work_hours: totalTime,
              is_active: activityTracker.isCurrentlyWorking(),
              idle_periods: idlePeriods
            });
            // Clear synced periods
            if (idlePeriods.length > 0) {
              activityTracker.clearIdlePeriods();
            }
          } catch (error) {
            console.error('Failed to sync work time:', error);
          }
        }
        
        if (onTimeUpdate) {
          onTimeUpdate({
            isActive: activityTracker.isCurrentlyWorking(),
            totalWorkTime: totalTime,
            currentSessionTime: sessionTime
          });
        }
      }
    }, 1000); // Update every second

    return () => {
      activityTracker.offActivityChange(handleActivityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTracking, onTimeUpdate]);

  const formatTime = (hours) => {
    const totalSeconds = Math.floor(hours * 3600);
    const hoursPart = Math.floor(totalSeconds / 3600);
    const minutesPart = Math.floor((totalSeconds % 3600) / 60);
    const secondsPart = totalSeconds % 60;
    
    return `${hoursPart.toString().padStart(2, '0')}:${minutesPart.toString().padStart(2, '0')}:${secondsPart.toString().padStart(2, '0')}`;
  };

  const startTracking = () => {
    activityTracker.startTracking();
    setIsTracking(true);
  };

  const stopTracking = async () => {
    // Sync final idle periods before stopping
    try {
      const idlePeriods = activityTracker.getIdlePeriods();
      if (idlePeriods.length > 0) {
        await timesheetAPI.updateWorkTime({
          work_hours: activityTracker.getTotalWorkTime(),
          is_active: false,
          idle_periods: idlePeriods
        });
        activityTracker.clearIdlePeriods();
      }
    } catch (error) {
      console.error('Failed to sync idle periods on stop:', error);
    }
    
    activityTracker.stopTracking();
    setIsTracking(false);
    setIsActive(false);
  };

  const pauseTracking = () => {
    // Pause current session but keep tracking
    if (isActive) {
      activityTracker.stopTracking();
      setIsActive(false);
    } else {
      activityTracker.startTracking();
      setIsActive(true);
    }
  };

  const resetTracking = () => {
    activityTracker.resetWorkTime();
    setCurrentSessionTime(0);
    setTotalWorkTime(0);
    setDisplayTime('00:00:00');
  };

  const getStatusColor = () => {
    if (!isTracking) return 'text-gray-500';
    if (isActive) return 'text-green-500';
    return 'text-yellow-500';
  };

  const getStatusText = () => {
    if (!isTracking) return 'Not Tracking';
    if (isActive) return 'Working';
    return 'Idle';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FiClock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Work Time Tracker</h3>
        </div>
        <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Time Display */}
        <div className="text-center">
          <div className="text-3xl font-mono font-bold text-gray-800 mb-2">
            {displayTime}
          </div>
          <div className="text-sm text-gray-600">
            Current Session
          </div>
        </div>

        {/* Total Time */}
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700">
            Total Today: {formatTime(totalWorkTime)}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-2">
          {!isTracking ? (
            <button
              onClick={startTracking}
              className="flex-1 flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <FiPlay className="w-4 h-4" />
              <span>Start Work</span>
            </button>
          ) : (
            <>
              <button
                onClick={pauseTracking}
                className="flex-1 flex items-center justify-center space-x-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isActive ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4" />}
                <span>{isActive ? 'Pause' : 'Resume'}</span>
              </button>
              <button
                onClick={stopTracking}
                className="flex-1 flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <FiSquare className="w-4 h-4" />
                <span>End Work</span>
              </button>
            </>
          )}
        </div>

        {/* Reset Button */}
        {isTracking && (
          <div className="text-center">
            <button
              onClick={resetTracking}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Reset Timer
            </button>
          </div>
        )}

        {/* Activity Info */}
        <div className="text-xs text-gray-500 text-center">
          <div>Activity detected: {isActive ? 'Yes' : 'No'}</div>
          <div>Idle threshold: 5 minutes</div>
        </div>
      </div>
    </div>
  );
};

export default WorkTimeTracker;
