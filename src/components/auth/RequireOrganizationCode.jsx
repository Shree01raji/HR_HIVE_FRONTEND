import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function RequireOrganizationCode({ children }) {
  const location = useLocation();
  const selectedOrganization = localStorage.getItem('selectedOrganization');

  // Check if organization is selected and not empty
  if (!selectedOrganization || selectedOrganization.trim() === '') {
    // Redirect to login page with a query parameter to show the organization code input
    return <Navigate to="/login?showOrgCode=true" replace state={{ from: location }} />;
  }

  return children;
}

