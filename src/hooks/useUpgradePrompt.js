import { useState, useCallback } from 'react';
import { isLimitExceededError, extractLimitInfo } from '../utils/limitErrorHandler';
import api from '../services/api';

/**
 * Hook to handle limit exceeded errors and show upgrade prompt
 */
export function useUpgradePrompt() {
  const [upgradePrompt, setUpgradePrompt] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);

  // Fetch organization ID from slug
  const fetchOrganizationId = useCallback(async () => {
    if (organizationId) return organizationId;
    
    const selectedOrg = localStorage.getItem('selectedOrganization');
    if (!selectedOrg) return null;

    try {
      const response = await api.get(`/organizations/${selectedOrg}`);
      if (response.data && response.data.organization_id) {
        setOrganizationId(response.data.organization_id);
        return response.data.organization_id;
      }
    } catch (err) {
      console.warn('Failed to fetch organization ID:', err);
    }
    return null;
  }, [organizationId]);

  const handleError = useCallback(async (err, limitType = null) => {
    if (!isLimitExceededError(err)) {
      return false; // Not a limit error, let caller handle it
    }

    const limitInfo = extractLimitInfo(err);
    const orgId = await fetchOrganizationId();
    
    if (orgId) {
      setUpgradePrompt({
        isOpen: true,
        organizationId: orgId,
        limitType: limitType || limitInfo?.limitType || 'UNKNOWN',
        currentUsage: limitInfo?.currentUsage || 0,
        limitValue: limitInfo?.limitValue || 0,
        errorMessage: err.response?.data?.detail || err.message || 'Plan limit reached',
        upgradeInfo: err.response?.data?.upgrade_info || null
      });
      return true; // Handled
    }
    
    return false; // Could not show prompt
  }, [fetchOrganizationId]);

  const closePrompt = useCallback(() => {
    setUpgradePrompt(null);
  }, []);

  return {
    upgradePrompt,
    handleError,
    closePrompt
  };
}

