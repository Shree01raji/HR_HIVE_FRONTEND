import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { teamAPI, employeeAPI } from '../../services/api';
import { FiUsers, FiChevronDown, FiChevronRight, FiFilter, FiX, FiMail, FiPhone, FiBriefcase, FiCalendar } from 'react-icons/fi';

function flattenEmployees(employees) {
  if (!employees?.length) return [];
  let list = [];
  for (const e of employees) {
    list.push(e);
    if (e.direct_reports?.length) list.push(...flattenEmployees(e.direct_reports));
  }
  return list;
}

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function OrgChart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [expandedManagers, setExpandedManagers] = useState(new Set()); // employee_ids whose team is expanded
  const [photoUrls, setPhotoUrls] = useState({});
  // Profile popup
  const [profileEmployeeId, setProfileEmployeeId] = useState(null);
  const [profileFallback, setProfileFallback] = useState(null);
  const [profileEmployee, setProfileEmployee] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const profileFallbackRef = useRef(null);

  // Check if user has access (only ADMIN and EMPLOYEE)
  useEffect(() => {
    if (!user) return;
    
    const userRole = user.role?.toUpperCase() || '';
    const isAdmin = userRole === 'ADMIN' || userRole === 'HR_ADMIN' || userRole === 'HR_MANAGER';
    const isEmployee = userRole === 'EMPLOYEE';
    
    if (!isAdmin && !isEmployee) {
      // Redirect unauthorized users
      if (userRole === 'CANDIDATE') {
        navigate('/candidate', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [selectedDepartment, user]);

  useEffect(() => {
    if (!data?.root_employees) {
      setPhotoUrls({});
      return;
    }
    const list = flattenEmployees(data.root_employees);
    const uniq = [...new Map(list.filter((e) => e.employee_id).map((e) => [e.employee_id, e])).values()];
    const toFetch = uniq.filter((e) => e.profile_photo);
    const urlsToRevoke = [];
    let cancelled = false;

    toFetch.forEach((emp) => {
      employeeAPI.getProfilePhoto(emp.employee_id)
        .then((blob) => {
          if (cancelled || !blob) return;
          const url = URL.createObjectURL(blob);
          urlsToRevoke.push(url);
          setPhotoUrls((prev) => ({ ...prev, [emp.employee_id]: url }));
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
      urlsToRevoke.forEach((u) => URL.revokeObjectURL(u));
      setPhotoUrls({});
    };
  }, [data, selectedDepartment]);

  // Fetch full employee when profile popup opens
  useEffect(() => {
    if (!profileEmployeeId) {
      setProfileEmployee(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    setProfileEmployee(null);
    employeeAPI.get(profileEmployeeId)
      .then((res) => setProfileEmployee(res))
      .catch(() => setProfileEmployee(profileFallbackRef.current || null))
      .finally(() => setProfileLoading(false));
  }, [profileEmployeeId]);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Determine if we should use team view (for employees only, not admins)
      const userRole = user.role?.toUpperCase() || '';
      const isAdmin = userRole === 'ADMIN' || userRole === 'HR_ADMIN' || userRole === 'HR_MANAGER';
      const isEmployee = userRole === 'EMPLOYEE';
      
      // For employees, use team view (manager + colleagues)
      // For admins, show full organization structure
      const useTeamView = isEmployee && !isAdmin;
      
      const result = await teamAPI.getOrganizationStructure(selectedDepartment || null, useTeamView);
      setData(result);
    } catch (err) {
      console.error('Error fetching organization structure:', err);
      setError(err.response?.data?.detail || 'Failed to load organization structure');
    } finally {
      setLoading(false);
    }
  };

  const toggleManager = (employeeId) => {
    setExpandedManagers((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const openProfile = (employee) => {
    profileFallbackRef.current = employee;
    setProfileFallback(employee);
    setProfileEmployeeId(employee.employee_id);
  };

  const closeProfile = () => {
    profileFallbackRef.current = null;
    setProfileEmployeeId(null);
    setProfileFallback(null);
    setProfileEmployee(null);
  };

  const renderNode = (employee, fromParent = false) => {
    const hasReports = employee.direct_reports && employee.direct_reports.length > 0;
    const isExpanded = hasReports && expandedManagers.has(employee.employee_id);
    const photoUrl = photoUrls[employee.employee_id] || null;
    const reportCount = employee.direct_reports?.length || 0;

    return (
      <div key={employee.employee_id} className="flex flex-col items-center">
        {fromParent && <div className="w-0.5 h-4 bg-gray-300 shrink-0" />}

        {/* Employee Card - clickable for profile */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => openProfile(employee)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProfile(employee); } }}
          className="bg-white rounded-xl shadow-lg p-5 w-56 hover:shadow-xl transition-all border border-gray-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <div className="flex justify-center mb-3">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={`${employee.first_name} ${employee.last_name}`}
                className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 shadow-md"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-4 border-blue-500 shadow-md ${photoUrl ? 'hidden' : ''}`}
            >
              <span className="text-white font-bold text-2xl">
                {employee.first_name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
            <h3 className="font-bold text-gray-900 text-base mb-1">
              {employee.first_name} {employee.last_name}
            </h3>
            <p className="text-sm text-gray-700 font-medium">
              {employee.designation || 'N/A'}
            </p>
          </div>

          {/* Expand / Collapse team - only for managers with reports */}
          {hasReports && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleManager(employee.employee_id); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.stopPropagation(); }}
              className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
            >
              {isExpanded ? (
                <FiChevronDown className="w-4 h-4" />
              ) : (
                <FiChevronRight className="w-4 h-4" />
              )}
              <span>{isExpanded ? 'Hide' : 'Show'} {reportCount} team {reportCount === 1 ? 'member' : 'members'}</span>
            </button>
          )}
        </div>

        {/* Connector and children when expanded */}
        {hasReports && isExpanded && (
          <>
            <div className="w-0.5 h-6 bg-gray-300 my-1 shrink-0" />
            <div className="w-full max-w-4xl h-0.5 bg-gray-300 mb-2" />
            <div className="flex flex-wrap justify-center gap-8 mt-2">
              {employee.direct_reports.map((report) => (
                <div key={report.employee_id} className="flex flex-col items-center">
                  {renderNode(report, true)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading organization chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Check access before rendering
  if (!user) {
    return null;
  }
  
  const userRole = user.role?.toUpperCase() || '';
  const isAdmin = userRole === 'ADMIN' || userRole === 'HR_ADMIN' || userRole === 'HR_MANAGER';
  const isEmployee = userRole === 'EMPLOYEE';
  
  if (!isAdmin && !isEmployee) {
    return null; // Will redirect in useEffect
  }

  const isTeamView = isEmployee && !isAdmin;

  if (!data || !data.root_employees || data.root_employees.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">
          {isTeamView ? 'No team members found' : 'No organization structure found'}
        </p>
      </div>
    );
  }

  const displayEmployee = profileEmployee || profileFallback;
  const photoForModal = profileEmployeeId ? photoUrls[profileEmployeeId] : null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {isTeamView ? 'Team Chart' : 'Organization Chart'}
        </h1>
        <p className="text-gray-600">
          {isTeamView 
            ? 'View your team structure (manager and colleagues)' 
            : 'View your team structure and reporting hierarchy'}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {!isTeamView && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FiFilter className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">Department:</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="border border-gray-300 rounded-lg px-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Departments</option>
                  {data.departments?.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div>
              <span className="font-semibold text-gray-800">{data.total_employees}</span> {isTeamView ? 'Team Members' : 'Employees'}
            </div>
            {!isTeamView && (
              <>
                <div>
                  <span className="font-semibold text-gray-800">{data.levels}</span> Levels
                </div>
                <div>
                  <span className="font-semibold text-gray-800">{data.departments?.length || 0}</span> Departments
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-8 overflow-x-auto">
        <div className="min-w-max">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {isTeamView ? 'TEAM STRUCTURE' : 'PROJECT TEAM STRUCTURE ORG CHART'}
            </h2>
            <p className="text-sm text-gray-500">
              Click a card to view profile. {!isTeamView && <>Click <strong>Show team members</strong> to expand a manager&apos;s team.</>}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            {data.root_employees.map((emp) => (
              <div key={emp.employee_id} className="flex flex-col items-center">
                {renderNode(emp, false)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profile popup modal */}
      {profileEmployeeId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeProfile}
          role="presentation"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
          >
            <div className="sticky top-0 bg-white rounded-t-2xl px-6 py-4 border-b border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={closeProfile}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {profileLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                  <p className="mt-3 text-gray-600">Loading profile...</p>
                </div>
              ) : displayEmployee ? (
                <>
                  <div className="flex flex-col items-center text-center mb-6">
                    {photoForModal ? (
                      <img
                        src={photoForModal}
                        alt={`${displayEmployee.first_name} ${displayEmployee.last_name}`}
                        className="w-28 h-28 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center border-4 border-blue-500 shadow-lg">
                        <span className="text-white font-bold text-3xl">
                          {displayEmployee.first_name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <h2 id="profile-modal-title" className="mt-4 text-xl font-bold text-gray-900">
                      {displayEmployee.first_name} {displayEmployee.last_name}
                    </h2>
                    <p className="text-blue-600 font-medium">{displayEmployee.designation || '—'}</p>
                    {displayEmployee.department && (
                      <p className="text-sm text-gray-500 mt-1">{displayEmployee.department}</p>
                    )}
                  </div>
                  <div className="space-y-4">
                    {displayEmployee.email && (
                      <div className="flex items-start gap-3">
                        <FiMail className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Email</p>
                          <p className="text-sm font-medium text-gray-900">{displayEmployee.email}</p>
                        </div>
                      </div>
                    )}
                    {displayEmployee.phone && (
                      <div className="flex items-start gap-3">
                        <FiPhone className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="text-sm font-medium text-gray-900">{displayEmployee.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <FiBriefcase className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Designation</p>
                        <p className="text-sm font-medium text-gray-900">{displayEmployee.designation || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FiCalendar className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Joining Date</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(displayEmployee.join_date)}</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-gray-500">Could not load profile.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
