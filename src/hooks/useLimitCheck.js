import { useState, useCallback } from 'react';
import { subscriptionAPI } from '../services/api';
import UpgradePrompt from '../components/admin/UpgradePrompt';

export function useLimitCheck() {
  const [upgradePrompt, setUpgradePrompt] = useState(null);
  const [checking, setChecking] = useState(false);

  const checkLimit = useCallback(async (organizationId, limitType, incrementBy = 1) => {
    try {
      setChecking(true);
      // Call backend to check limit
      const response = await fetch(`/api/subscriptions/organizations/${organizationId}/usage/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'X-Organization-Slug': localStorage.getItem('selectedOrganization') || ''
        },
        body: JSON.stringify({
          limit_type: limitType,
          increment_by: incrementBy
        })
      });

      const data = await response.json();
      
      if (!data.is_allowed) {
        // Show upgrade prompt
        setUpgradePrompt({
          isOpen: true,
          organizationId,
          limitType,
          currentUsage: data.current_usage || 0,
          limitValue: data.limit_value || 0,
          errorMessage: data.error_message,
          upgradeInfo: data.upgrade_info
        });
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Failed to check limit:', err);
      // On error, allow action (fail open)
      return true;
    } finally {
      setChecking(false);
    }
  }, []);

  const closeUpgradePrompt = useCallback(() => {
    setUpgradePrompt(null);
  }, []);

  const UpgradePromptComponent = upgradePrompt ? (
    <UpgradePrompt
      {...upgradePrompt}
      onClose={closeUpgradePrompt}
    />
  ) : null;

  return {
    checkLimit,
    checking,
    UpgradePromptComponent
  };
}

