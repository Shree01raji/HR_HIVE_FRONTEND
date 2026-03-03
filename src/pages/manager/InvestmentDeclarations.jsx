import React, { useEffect, useMemo, useState } from 'react';
import { managerAPI } from '../../services/api';

export default function InvestmentDeclarations() {
  const [declarations, setDeclarations] = useState([]);
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
        managerAPI.getTeamInvestmentDeclarations()
      ]);
      setTeam(reports || []);
      setDeclarations(data || []);
    } catch (err) {
      console.error('Failed to load investment declarations:', err);
      setError('Failed to load investment declarations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerify = async (declarationId) => {
    const notes = window.prompt('Verification notes (optional)?');
    await managerAPI.verifyInvestmentDeclaration(declarationId, notes || null);
    await loadData();
  };

  if (loading) {
    return <div className="text-gray-600">Loading investment declarations...</div>;
  }

  if (error) {
    return <div className="bg-white p-4 rounded-lg shadow-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Team Investment Declarations</h1>
        <p className="text-sm text-gray-600">Verify declarations submitted by your team.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 text-left">Employee</th>
              <th className="px-4 py-3 text-left">Financial Year</th>
              <th className="px-4 py-3 text-left">Total Deductions</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {declarations.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-gray-500">
                  No declarations found.
                </td>
              </tr>
            )}
            {declarations.map((decl) => (
              <tr key={decl.declaration_id} className="border-t">
                <td className="px-4 py-3">
                  {teamMap.get(decl.employee_id) || `Employee #${decl.employee_id}`}
                </td>
                <td className="px-4 py-3">{decl.financial_year}</td>
                <td className="px-4 py-3">{decl.total_deductions}</td>
                <td className="px-4 py-3">{decl.declaration_status}</td>
                <td className="px-4 py-3 text-right">
                  {decl.declaration_status === 'submitted' && (
                    <button
                      onClick={() => handleVerify(decl.declaration_id)}
                      className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                    >
                      Verify
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
