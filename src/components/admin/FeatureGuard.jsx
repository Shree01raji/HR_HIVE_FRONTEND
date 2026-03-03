import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeatureToggle } from '../../contexts/FeatureToggleContext';

/**
 * FeatureGuard component that protects routes based on feature toggles
 * Redirects to admin dashboard if feature is disabled
 */
export default function FeatureGuard({ featureKey, children }) {
  const { isEnabled, loading } = useFeatureToggle();
  const navigate = useNavigate();

  useEffect(() => {
    // Only check after loading is complete
    if (!loading && featureKey && !isEnabled(featureKey)) {
      navigate('/admin', { replace: true });
    }
  }, [isEnabled, featureKey, loading, navigate]);

  // Show loading state while checking
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if feature is disabled (will redirect)
  if (featureKey && !isEnabled(featureKey)) {
    return null;
  }

  return children;
}

