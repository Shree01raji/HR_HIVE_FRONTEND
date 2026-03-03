/**
 * Timezone utility functions for handling time display
 * Using India Standard Time (IST) - Asia/Kolkata
 */

/**
 * Get the application timezone (India Standard Time)
 */
export const getUserTimezone = () => {
  return 'Asia/Kolkata'; // IST - Indian Standard Time (UTC+5:30)
};

/**
 * Format a UTC datetime string to local time
 */
export const formatToLocalTime = (utcDateTimeString, options = {}) => {
  if (!utcDateTimeString) return '';
  
  try {
    // Ensure the string is treated as UTC (add Z if not present)
    let dateString = utcDateTimeString;
    if (typeof dateString !== 'string') {
      dateString = String(dateString);
    }
    
    // If it doesn't end with Z and doesn't have timezone info, add Z
    if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
      dateString = dateString + 'Z';
    }
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', utcDateTimeString);
      return '';
    }
    
    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: getUserTimezone(),
      ...options
    };
    
    return date.toLocaleTimeString('en-IN', defaultOptions);
  } catch (error) {
    console.error('Error formatting time:', error, 'Input:', utcDateTimeString);
    return '';
  }
};

/**
 * Format a UTC datetime string to local date and time
 */
export const formatToLocalDateTime = (utcDateTimeString, options = {}) => {
  if (!utcDateTimeString) return '';
  
  // Ensure the string is treated as UTC (add Z if not present)
  let dateString = utcDateTimeString;
  if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
    dateString = dateString + 'Z';
  }
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: getUserTimezone(),
    ...options
  };
  
  return new Date(dateString).toLocaleString('en-IN', defaultOptions);
};

/**
 * Format a UTC datetime string to local date only
 */
export const formatToLocalDate = (utcDateTimeString, options = {}) => {
  if (!utcDateTimeString) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: getUserTimezone(),
    ...options
  };
  
  return new Date(utcDateTimeString).toLocaleDateString([], defaultOptions);
};

/**
 * Get time ago string from a UTC datetime
 */
export const getTimeAgo = (utcDateTimeString) => {
  if (!utcDateTimeString) return '';
  
  const now = new Date();
  const past = new Date(utcDateTimeString);
  const diffMs = now - past;
  
  if (diffMs < 0) return 'Just now';
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60;
    return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m ago` : `${diffHours}h ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  } else {
    return 'Just now';
  }
};

/**
 * Get current time in user's timezone
 */
export const getCurrentLocalTime = () => {
  return new Date().toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: getUserTimezone()
  });
};

/**
 * Get timezone offset string (e.g., "+05:30", "-08:00")
 */
export const getTimezoneOffset = () => {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Format duration in a user-friendly way
 * Shows minutes if less than 1 hour, otherwise shows hours and minutes
 */
export const formatDuration = (hours) => {
  if (!hours || hours === 0) return '0m';
  
  // Round to 2 decimal places to avoid floating point precision issues
  const roundedHours = Math.round(hours * 100) / 100;
  const totalMinutes = Math.round(roundedHours * 60);
  
  // Handle very small durations (less than 1 minute)
  if (totalMinutes < 1) {
    return '1m'; // Show at least 1 minute for very small durations
  }
  
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  } else {
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;
    
    if (minutesPart === 0) {
      return `${hoursPart}h`;
    } else {
      return `${hoursPart}h ${minutesPart}m`;
    }
  }
};

/**
 * Format duration for display in cards and summaries
 */
export const formatDurationShort = (hours) => {
  if (!hours || hours === 0) return '0m';
  
  // Round to 2 decimal places to avoid floating point precision issues
  const roundedHours = Math.round(hours * 100) / 100;
  const totalMinutes = Math.round(roundedHours * 60);
  
  // Handle very small durations (less than 1 minute)
  if (totalMinutes < 1) {
    return '1m'; // Show at least 1 minute for very small durations
  }
  
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  } else {
    const hoursPart = Math.floor(totalMinutes / 60);
    const minutesPart = totalMinutes % 60;
    
    if (minutesPart === 0) {
      return `${hoursPart}h`;
    } else if (minutesPart < 10) {
      return `${hoursPart}h ${minutesPart}m`;
    } else {
      return `${hoursPart}h ${minutesPart}m`;
    }
  }
};
