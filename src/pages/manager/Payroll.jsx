import React, { useEffect, useMemo, useState } from 'react';
import { managerAPI, workflowAPI } from '../../services/api';
import { WorkflowStatusCard, WorkflowDiagram, WorkflowTimeline } from '../../components/workflow';

const formatMonth = (month, year) => {
  if (!month || !year) return '-';
  return `${month}/${year}`;
};

export default function Payroll() {
  const [records, setRecords] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [workflows, setWorkflows] = useState({});
  const [expandedWorkflow, setExpandedWorkflow] = useState(null);

  const teamMap = useMemo(() => {
    const map = new Map();
    team.forEach((member) => {
      map.set(member.employee_id, `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email);
    });
    return map;
  }, [team]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [reports, data] = await Promise.all([
          managerAPI.getDirectReports(),
          managerAPI.getTeamPayroll()
        ]);
        setTeam(reports || []);
        setRecords(data || []);
        
        // Fetch workflows for each payroll record
        const workflowMap = {};
        for (const record of (data || [])) {
          try {
            const recordWorkflows = await workflowAPI.getInstances('payroll', record.payroll_id);
            if (recordWorkflows?.length > 0) {
              workflowMap[record.payroll_id] = recordWorkflows[0];
            }
          } catch (err) {
            console.warn(`Failed to fetch workflow for payroll ${record.payroll_id}:`, err);
          }
        }
        setWorkflows(workflowMap);
      } catch (err) {
        console.error('Failed to load team payroll:', err);
        setError('Failed to load payroll records.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return <div className="text-gray-600">Loading payroll...</div>;
  }

  if (error) {
    return <div className="bg-white p-4 rounded-lg shadow-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Team Payroll</h1>
        <p className="text-sm text-gray-600">Review payroll records for your team.</p>
      </div>

      <div className="space-y-6">
        {records.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
            No payroll records found.
          </div>
        ) : (
          records.map((record) => {
            const workflow = workflows[record.payroll_id];
            return (
              <div key={record.payroll_id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {teamMap.get(record.employee_id) || `Employee #${record.employee_id}`}
                      </h3>
                      <div className="mt-2 text-sm text-gray-600">
                        <p><span className="font-medium">Period:</span> {formatMonth(record.month, record.year)}</p>
                        <p><span className="font-medium">Net Pay:</span> ₹{(record.net_pay?.toFixed?.(2) || record.net_pay || 0)}</p>
                        <p><span className="font-medium">Status:</span> {record.status}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {workflow && (
                  <div className="border-t border-gray-200">
                    <WorkflowStatusCard 
                      workflow={workflow}
                      onClick={() => setExpandedWorkflow(expandedWorkflow?.instance_id === workflow.instance_id ? null : workflow)}
                    />
                    {expandedWorkflow?.instance_id === workflow.instance_id && (
                      <div className="p-6 bg-gray-50 space-y-4">
                        <div>
                          <h4 className="font-semibold mb-3">Approval Steps</h4>
                          <WorkflowDiagram steps={workflow.steps} />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-3">History</h4>
                          <WorkflowTimeline events={workflow.events} steps={workflow.steps} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
