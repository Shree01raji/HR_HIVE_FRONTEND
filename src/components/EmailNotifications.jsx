import React, { useState, useEffect } from 'react';
import { FiMail, FiSend, FiClock, FiUser, FiCalendar, FiCheck, FiX } from 'react-icons/fi';

export default function EmailNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({
    recipient: '',
    subject: '',
    message: '',
    type: 'interview_invite'
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    // Mock data - replace with actual API call
    const mockNotifications = [
      {
        id: 1,
        type: 'interview_invite',
        recipient: 'john.doe@email.com',
        subject: 'Interview Invitation - Software Engineer Position',
        message: 'Dear John, We are pleased to invite you for an interview...',
        status: 'sent',
        sentAt: new Date(),
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000)
      },
      {
        id: 2,
        type: 'reminder',
        recipient: 'sarah.johnson@company.com',
        subject: 'Interview Reminder - Tomorrow at 2:00 PM',
        message: 'This is a reminder for your interview tomorrow...',
        status: 'sent',
        sentAt: new Date(),
        scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000)
      },
      {
        id: 3,
        type: 'status_update',
        recipient: 'mike.smith@email.com',
        subject: 'Application Status Update',
        message: 'Thank you for your interest. We have reviewed your application...',
        status: 'pending',
        sentAt: null,
        scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000)
      }
    ];
    setNotifications(mockNotifications);
    setLoading(false);
  };

  const handleSendEmail = async (emailData) => {
    try {
      // Mock API call
      console.log('Sending email:', emailData);
      setShowCompose(false);
      setComposeData({
        recipient: '',
        subject: '',
        message: '',
        type: 'interview_invite'
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  const handleSendReminder = async (notificationId) => {
    try {
      // Mock API call
      console.log('Sending reminder for notification:', notificationId);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to send reminder:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'interview_invite':
        return <FiCalendar className="w-5 h-5 text-blue-600" />;
      case 'reminder':
        return <FiClock className="w-5 h-5 text-yellow-600" />;
      case 'status_update':
        return <FiUser className="w-5 h-5 text-green-600" />;
      default:
        return <FiMail className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'interview_invite':
        return 'Interview Invite';
      case 'reminder':
        return 'Reminder';
      case 'status_update':
        return 'Status Update';
      default:
        return 'Email';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Email Notifications</h3>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiSend className="w-4 h-4" />
            <span>Compose</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{notification.subject}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                          {notification.status}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                          {getTypeLabel(notification.type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">To: {notification.recipient}</p>
                      <p className="text-sm text-gray-700 line-clamp-2">{notification.message}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        {notification.sentAt && (
                          <span>Sent: {notification.sentAt.toLocaleString()}</span>
                        )}
                        {notification.scheduledFor && (
                          <span>Scheduled: {notification.scheduledFor.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {notification.status === 'pending' && (
                      <button
                        onClick={() => handleSendReminder(notification.id)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Send Now"
                      >
                        <FiSend className="w-4 h-4" />
                      </button>
                    )}
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                      <FiMail className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeEmailModal
          onClose={() => setShowCompose(false)}
          onSend={handleSendEmail}
          composeData={composeData}
          setComposeData={setComposeData}
        />
      )}
    </div>
  );
}

// Compose Email Modal Component
function ComposeEmailModal({ onClose, onSend, composeData, setComposeData }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSend(composeData);
  };

  const getTemplateMessage = (type) => {
    switch (type) {
      case 'interview_invite':
        return `Dear Candidate,

We are pleased to invite you for an interview for the Software Engineer position at our company.

Interview Details:
- Date: [Date]
- Time: [Time]
- Duration: 60 minutes
- Format: Video Interview
- Interviewer: [Interviewer Name]

Please confirm your availability by replying to this email.

Best regards,
HR Team`;
      case 'reminder':
        return `Dear Candidate,

This is a friendly reminder about your upcoming interview.

Interview Details:
- Date: [Date]
- Time: [Time]
- Duration: 60 minutes
- Format: Video Interview

Please ensure you have a stable internet connection and are in a quiet environment.

Best regards,
HR Team`;
      case 'status_update':
        return `Dear Candidate,

Thank you for your interest in the Software Engineer position. We have reviewed your application and would like to update you on the next steps.

[Status Update Message]

Best regards,
HR Team`;
      default:
        return '';
    }
  };

  const handleTypeChange = (type) => {
    setComposeData({
      ...composeData,
      type,
      message: getTemplateMessage(type)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Compose Email</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Type</label>
            <select
              value={composeData.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="interview_invite">Interview Invite</option>
              <option value="reminder">Reminder</option>
              <option value="status_update">Status Update</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
            <input
              type="email"
              value={composeData.recipient}
              onChange={(e) => setComposeData({ ...composeData, recipient: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="candidate@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={composeData.subject}
              onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email subject"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={composeData.message}
              onChange={(e) => setComposeData({ ...composeData, message: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="8"
              placeholder="Email message"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Send Email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
