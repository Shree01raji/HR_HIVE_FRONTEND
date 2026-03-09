import React, { useEffect, useState } from 'react'
import ModuleItem from './ModuleItem'
import UserModuleAccess from '../../components/superadmin/UserModuleAccess'

const modules = [
  { title: 'Basic Configuration', description: 'Set up users, roles/permissions, groups and other related settings' },
  { title: 'Organization Chart & Directory', description: 'Configure organization chart and directory settings' },
  { title: 'Leave Management', description: 'Setup leave policies and the holiday calendar' },
  { title: 'Time and Attendance', description: 'Set up time & attendance plans, shifts and reporting' },
  { title: 'Timesheet', description: 'Set up timesheet settings and approvals' },
  { title: 'Travel & Expense', description: 'Set up travel and expense settings' },
  { title: 'Recruitment', description: 'Set up recruitment pipeline and settings' },
  { title: 'On-boarding', description: 'Set up letter templates and candidate portal settings' },
  { title: 'Letters, Forms & Documents', description: 'Manage templates, forms and documents' },
  { title: 'Learning & Development', description: 'Manage trainings and courses' },
  { title: 'Assets', description: 'Define assets and their attributes' },
  { title: 'Grievances', description: 'Define ticket categories and settings' },
  { title: 'Exit', description: 'Set up exit formalities and settings' },
  { title: 'Approval Workflow', description: 'Set up approval workflows and associated forms' },
  { title: 'Payroll', description: 'Configure payroll, compensation, and benefits settings' }
]

const SuperAdminSettings = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-md shadow p-6 mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Super Admin Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure organization-wide settings and module configuration</p>
        </div>

        <div className="mb-6">
          {modules.map((m) => (
            <ModuleItem key={m.title} title={m.title} description={m.description} />
          ))}
        </div>

        <div className="mb-6">
          <UserModuleAccess />
        </div>
      </div>
    </div>
  )
}

export default SuperAdminSettings
