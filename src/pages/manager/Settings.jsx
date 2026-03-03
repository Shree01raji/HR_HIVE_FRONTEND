
import React from 'react';
import { FiUser, FiSettings, FiUsers, FiCheckSquare, FiMessageSquare } from 'react-icons/fi';

const quickActions = [
  { icon: <FiUser className="text-blue-600" />, label: 'My Employee Profile', link: '/employee/profile' },
  { icon: <FiSettings className="text-green-600" />, label: 'Employee Settings', link: '/employee/settings' },
  { icon: <FiUsers className="text-indigo-600" />, label: 'Manage Team', link: '/manager' },
  { icon: <FiCheckSquare className="text-yellow-600" />, label: 'Approve Leaves', link: '/manager/leaves' },
  { icon: <FiMessageSquare className="text-purple-600" />, label: 'Monitor Chats', link: '/manager/chat' },
];

const summaryCards = [
  { label: 'Direct Reports', value: 0, icon: <FiUsers className="text-2xl text-blue-500" /> },
  { label: 'Pending Leaves', value: 0, icon: <FiCheckSquare className="text-2xl text-yellow-500" /> },
  { label: 'Pending Expenses', value: 0, icon: <FiSettings className="text-2xl text-green-500" /> },
  { label: 'Pending Reimbursements', value: 0, icon: <FiMessageSquare className="text-2xl text-purple-500" /> },
];

const ManagerSettings = () => {
  return (
    <div className="p-6 bg-[#e8f0f5] min-h-screen">
      <h2 className="text-2xl font-bold mb-2">Welcome, Manager!</h2>
      <p className="text-gray-600 mb-6">You have dual access: <span className="font-semibold">Employee</span> & <span className="font-semibold">Manager</span>. Use the quick actions or cards below to manage your settings and team.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
            {card.icon}
            <div className="text-3xl font-bold mt-2">{card.value}</div>
            <div className="text-gray-500 text-sm mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => (
            <a
              key={idx}
              href={action.link}
              className="flex items-center space-x-3 p-4 bg-[#f5f8fa] rounded-lg hover:bg-blue-50 transition"
            >
              {action.icon}
              <span className="font-medium text-gray-700">{action.label}</span>
            </a>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Manager Settings</h3>
        <ul className="list-disc pl-6 text-gray-700">
          <li>Update your profile and preferences</li>
          <li>Configure notification settings</li>
          <li>Manage your team and approvals</li>
          <li>Access employee and manager features from one place</li>
        </ul>
      </div>
    </div>
  );
};

export default ManagerSettings;
