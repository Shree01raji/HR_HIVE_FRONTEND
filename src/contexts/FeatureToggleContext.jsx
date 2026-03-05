import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const FeatureToggleContext = createContext(null);

export const useFeatureToggle = () => {
  const context = useContext(FeatureToggleContext);
  if (!context) {
      // Return default enabled features if context is not available (graceful degradation)
    return {
      features: {
        enable_dashboard: true,
        enable_settings: true,
        enable_finance: true,
        enable_ai_agents: true,
        enable_learning: true,
        enable_engagement: true,
        enable_performance: true,
        enable_recruitment: true,
        enable_timesheet: true,
        enable_agent_monitoring: true,
        enable_analytics: true,
        enable_chat_monitor: true,
        enable_compliance: true,
        enable_documents: true,
        enable_employees: false,
        enable_onboarding: true,
        enable_leaves: true,
        enable_payroll: true,
        enable_policies: true,
        enable_qualified_applications: true,
        enable_question_bank: true,
        enable_test_monitoring: true,
        enable_task_management: true,
        enable_workflows: true,
      },
      loading: false,
      isEnabled: (key) => true,
      refetch: () => {},
    };
  }
  return context;
};

export const FeatureToggleProvider = ({ children }) => {
  const { user } = useAuth();
  const [features, setFeatures] = useState(null);
  const [backendFeaturesConfig, setBackendFeaturesConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default features (all enabled by default) - use useMemo to avoid recreating on every render
  const defaultFeatures = useMemo(() => ({
    enable_dashboard: true,
    enable_settings: true,
    enable_finance: true,
    enable_ai_agents: true,
    enable_learning: true,
    enable_engagement: true,
    enable_performance: true,
    enable_recruitment: true,
    enable_timesheet: true,
    enable_agent_monitoring: true,
    enable_analytics: true,
    enable_chat_monitor: true,
    enable_compliance: true,
    enable_documents: true,
    enable_employees: true,
    enable_onboarding: true,
    enable_leaves: true,
    enable_payroll: true,
    enable_policies: true,
    enable_qualified_applications: true,
    enable_question_bank: true,
    enable_test_monitoring: true,
    enable_task_management: true,
    enable_workflows: true,
  }), []);

  const fetchFeatures = useCallback(async () => {
    // Always try to fetch organization settings from the backend.
    // If the backend refuses (403) or errors, we'll gracefully fall back to defaults.
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/settings/');
      // Handle null, undefined, or empty object
      const rawFeaturesConfig = response.data.features_config;
      const featuresConfig = (rawFeaturesConfig && typeof rawFeaturesConfig === 'object' && !Array.isArray(rawFeaturesConfig)) 
        ? rawFeaturesConfig 
        : {};
      
      // DEBUG: Log the full response to see what we're getting
      console.log('🔍 [FeatureToggle] Full API response:', response.data);
      console.log('🔍 [FeatureToggle] Raw features_config from API:', rawFeaturesConfig);
      console.log('🔍 [FeatureToggle] Processed features_config:', featuresConfig);
      console.log('🔍 [FeatureToggle] features_config type:', typeof featuresConfig);
      console.log('🔍 [FeatureToggle] features_config is null?', rawFeaturesConfig === null);
      console.log('🔍 [FeatureToggle] features_config keys:', featuresConfig ? Object.keys(featuresConfig) : 'N/A');
    
      // Store the original backend config to check key existence
      setBackendFeaturesConfig(featuresConfig);

      // Merge backend config with defaults.
      // If backend provides a non-empty config, treat it as authoritative:
      // - Keys present in backend config use the backend value (true/false)
      // - Keys missing from backend config are treated as DISABLED (false)
      const hasBackendConfig = featuresConfig && Object.keys(featuresConfig).length > 0;
      let mergedFeatures;
      if (hasBackendConfig) {
        mergedFeatures = Object.keys(defaultFeatures).reduce((acc, key) => {
          acc[key] = false;
          return acc;
        }, {});
        Object.keys(featuresConfig).forEach(key => {
          if (key in mergedFeatures) {
            mergedFeatures[key] = featuresConfig[key] === true;
          }
        });
      } else {
        mergedFeatures = { ...defaultFeatures };
      }
      
      console.log('📋 Feature toggles loaded from backend:', featuresConfig);
      console.log('📋 Backend config keys:', Object.keys(featuresConfig));
      console.log('📋 Merged features (after preserving false values):', mergedFeatures);
      console.log('📋 Has backend config:', hasBackendConfig);
      
      // Debug: Log specific feature checks
      console.log('📋 enable_recruitment in backend:', featuresConfig.enable_recruitment);
      console.log('📋 enable_analytics in backend:', featuresConfig.enable_analytics);
      
      setFeatures(mergedFeatures);
    } catch (err) {
      // Handle 403 (Forbidden) gracefully - employees don't have access to settings
      if (err.response?.status === 403) {
        console.log('ℹ️ [FeatureToggle] User does not have access to settings (403) - using default config');
        setError(null); // Don't show error for permission issues
        // On 403, default to all features enabled (for employees)
        setFeatures(defaultFeatures);
      } else {
        console.error('Error fetching feature toggles:', err);
        setError(err);
        // On error, default to all features enabled
        setFeatures(defaultFeatures);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch features on mount and when user changes
  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  // Listen for real-time settings updates
  useEffect(() => {
    const handleSettingsUpdate = (event) => {
      const { data } = event.detail;
      if (data && data.type === 'settings_update' && data.settings?.features_config) {
        const featuresConfig = data.settings.features_config;
        const hasBackendConfig = featuresConfig && Object.keys(featuresConfig).length > 0;
        const mergedFeatures = hasBackendConfig
          ? Object.keys(defaultFeatures).reduce((acc, key) => {
              acc[key] = false;
              return acc;
            }, {})
          : { ...defaultFeatures };
        
        // Store the original backend config
        setBackendFeaturesConfig(featuresConfig);
        
        // Explicitly check: if feature exists in backend config (even if false), use it
        Object.keys(defaultFeatures).forEach(key => {
          if (key in featuresConfig) {
            const value = featuresConfig[key];
            mergedFeatures[key] = value === true;
          }
        });
        
        setFeatures(mergedFeatures);
      }
    };

    // Listen for custom settings-update event (from Settings page)
    window.addEventListener('settings-update', handleSettingsUpdate);

    return () => {
      window.removeEventListener('settings-update', handleSettingsUpdate);
    };
  }, [defaultFeatures]);

  // Check if a feature is enabled
  const isEnabled = useCallback((featureKey) => {
    if (!features) {
      // Default to enabled during loading or if not fetched
      console.log(`🔍 [isEnabled] ${featureKey}: features not loaded yet, returning true (default)`);
      return true;
    }
    
    // CRITICAL FIX: Check if key exists in backend config first
    // If key exists in backend config, use its value (even if false/null)
    // If key doesn't exist in backend config, default to enabled (true)
    const hasBackendConfig = backendFeaturesConfig && Object.keys(backendFeaturesConfig).length > 0;
    
    if (hasBackendConfig) {
      // Authoritative backend mode: if backend provided a config (non-empty),
      // then only keys explicitly present and true are enabled. Missing keys
      // are disabled.
      if (Object.prototype.hasOwnProperty.call(backendFeaturesConfig, featureKey)) {
        const backendValue = backendFeaturesConfig[featureKey];
        const isEnabledResult = backendValue === true;
        console.log(`🔍 [isEnabled] ${featureKey}: backend has explicit config, value=${backendValue}, result=${isEnabledResult}`);
        return isEnabledResult;
      }
      console.log(`🔍 [isEnabled] ${featureKey}: backend has config but key is missing -> disabled`);
      return false;
    }
    
    // If key doesn't exist in backend config, check merged features
    // This handles cases where default features are used
    const featureValue = features[featureKey];
    // Return false only if explicitly false, otherwise return true (default enabled)
    const result = featureValue !== false && featureValue !== null;
    console.log(`🔍 [isEnabled] ${featureKey}: no backend config, merged value=${featureValue}, result=${result}`);
    return result;
  }, [features, backendFeaturesConfig]);

  const value = {
    features: features || defaultFeatures,
    loading,
    error,
    isEnabled,
    refetch: fetchFeatures,
  };

  return (
    <FeatureToggleContext.Provider value={value}>
      {children}
    </FeatureToggleContext.Provider>
  );
};


