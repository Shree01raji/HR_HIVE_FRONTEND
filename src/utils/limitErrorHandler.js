/**
 * Utility to handle limit exceeded errors and show upgrade prompt
 */

export function isLimitExceededError(error) {
  if (!error) return false;
  
  const errorMessage = error.response?.data?.detail || error.message || '';
  const limitKeywords = [
    'limit',
    'reached',
    'exceeded',
    'maximum',
    'upgrade',
    'plan limit'
  ];
  
  return limitKeywords.some(keyword => 
    errorMessage.toLowerCase().includes(keyword.toLowerCase())
  );
}

export function extractLimitInfo(error) {
  if (!error) return null;
  
  const errorMessage = error.response?.data?.detail || error.message || '';
  
  // Try to extract limit type from error message
  const limitTypeMatch = errorMessage.match(/MAX_\w+/);
  const limitType = limitTypeMatch ? limitTypeMatch[0] : null;
  
  // Try to extract numbers (current usage / limit)
  const numbers = errorMessage.match(/\d+/g);
  
  return {
    errorMessage,
    limitType,
    currentUsage: numbers && numbers.length > 0 ? parseInt(numbers[0]) : null,
    limitValue: numbers && numbers.length > 1 ? parseInt(numbers[1]) : null
  };
}

