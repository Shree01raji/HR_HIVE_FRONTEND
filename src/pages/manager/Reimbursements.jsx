import React, { useEffect, useMemo, useState } from 'react';
import { managerAPI } from '../../services/api';

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};

export default function Reimbursements() {
  const [reimbursements, setReimbursements] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const teamMap = useMemo(() => {
    const map = new Map();
    team.forEach((member) => {
      map.set(member.employee_id, `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email);
    });
    return map;
  }, [team]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [reports, data] = await Promise.all([
        managerAPI.getDirectReports(),
        managerAPI.getTeamReimbursements()
      ]);
      setTeam(reports || []);
      setReimbursements(data || []);
    } catch (err) {
      console.error('Failed to load reimbursements:', err);
      setError('Failed to load reimbursements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (reimbursementId) => {
    await managerAPI.approveReimbursement(reimbursementId);
    await loadData();
  };

  if (loading) {
    return <div className="text-gray-600">Loading reimbursements...</div>;
  }

  if (error) {
    return <div className="bg-white p-4 rounded-lg shadow-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Team Reimbursements</h1>
        <p className="text-sm text-gray-600">Review reimbursement requests from your team.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Reimbursement #</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Submitted</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reimbursements.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-gray-500">
                  No reimbursements found.
                </td>
              </tr>
            )}
            {reimbursements.map((reimb) => (
              <tr key={reimb.reimbursement_id} className="border-t">
                <td className="px-4 py-3">
                  {teamMap.get(reimb.employee_id) || `Employee #${reimb.employee_id}`}
                </td>
                <td className="px-4 py-3">{reimb.reimbursement_number}</td>
                <td className="px-4 py-3">{reimb.total_amount}</td>
                <td className="px-4 py-3">{formatDate(reimb.submitted_at || reimb.created_at)}</td>
                <td className="px-4 py-3">{reimb.status}</td>
                <td className="px-4 py-3 text-right">
                  {reimb.status === 'SUBMITTED' && (
                    <button
                      onClick={() => handleApprove(reimb.reimbursement_id)}
                      className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
