import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FiLock, FiSave, FiDollarSign, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { authAPI } from '../../services/api';
import api from '../../services/api';

export default function AccountantSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(null);

  
  const [payrollConfig, setPayrollConfig] = useState({
    enable_direct_processing: false,
    account_name: '',
    account_identifier: '',
    processing_notes: '',
    razorpayx_enabled: false,
    razorpayx_key_id: '',
    razorpayx_key_secret: '',
    razorpayx_webhook_secret: ''
  });

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings/');
      const data = response.data;
      setSettings(data);
      
      // Set payroll config from other_settings
      const payrollConfigData = data.other_settings?.payroll_config || {};
      setPayrollConfig({
        enable_direct_processing: payrollConfigData.enable_direct_processing === true,
        account_name: payrollConfigData.account_name || '',
        account_identifier: payrollConfigData.account_identifier || '',
        processing_notes: payrollConfigData.processing_notes || '',
        razorpayx_enabled: payrollConfigData.razorpayx_enabled === true,
        razorpayx_key_id: payrollConfigData.razorpayx_key_id || '',
        razorpayx_key_secret: '',
        razorpayx_webhook_secret: ''
      });
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayrollSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const existingOtherSettings = settings?.other_settings || {};
      const existingPayrollConfig = existingOtherSettings?.payroll_config || {};
      
      const payrollConfigToSave = {
        ...existingPayrollConfig,
        ...payrollConfig,
        enable_direct_processing: payrollConfig.enable_direct_processing === true,
        razorpayx_enabled: payrollConfig.razorpayx_enabled === true,
        razorpayx_key_secret: payrollConfig.razorpayx_key_secret || undefined,
        razorpayx_webhook_secret: payrollConfig.razorpayx_webhook_secret || undefined
      };
      
      const updateData = {
        other_settings: {
          ...existingOtherSettings,
          payroll_config: payrollConfigToSave
        }
      };
      
      const response = await api.put('/settings/', updateData);
      setSettings(response.data);
      setSuccess('Payroll settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      await fetchSettings();
    } catch (err) {
      console.error('Error saving payroll settings:', err);
      setError(err.response?.data?.detail || 'Failed to save payroll settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };


 
  

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
        <p className="text-gray-600">Manage your profile and payroll preferences</p>
      </div>

      {/* Payroll Account Settings */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FiDollarSign className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900">Payroll Account Settings</h3>
        </div>
        
        <div className="space-y-6">
          {/* Enable Direct Processing Toggle */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div>
              <h4 className="font-medium text-gray-900">Direct Processing Mode</h4>
              <p className="text-sm text-gray-500">
                Process payroll amounts directly without any external API calls
              </p>
            </div>
            <button
              onClick={() => setPayrollConfig({
                ...payrollConfig,
                enable_direct_processing: !payrollConfig.enable_direct_processing
              })}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                payrollConfig.enable_direct_processing
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {payrollConfig.enable_direct_processing ? (
                <>
                  <FiToggleRight className="w-5 h-5" />
                  <span>Enabled</span>
                </>
              ) : (
                <>
                  <FiToggleLeft className="w-5 h-5" />
                  <span>Disabled</span>
                </>
              )}
            </button>
          </div>
          
          {payrollConfig.enable_direct_processing && (
            <>
              {/* Account Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  value={payrollConfig.account_name}
                  onChange={(e) => setPayrollConfig({
                    ...payrollConfig,
                    account_name: e.target.value
                  })}
                  placeholder="e.g., Main Payroll Account"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Name identifier for the payroll processing account
                </p>
              </div>
              
              {/* Account Identifier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Identifier
                </label>
                <input
                  type="text"
                  value={payrollConfig.account_identifier}
                  onChange={(e) => setPayrollConfig({
                    ...payrollConfig,
                    account_identifier: e.target.value
                  })}
                  placeholder="e.g., PAY-ACC-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Unique identifier for tracking payroll transactions
                </p>
              </div>
              
              {/* Processing Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processing Notes
                </label>
                <textarea
                  value={payrollConfig.processing_notes}
                  onChange={(e) => setPayrollConfig({
                    ...payrollConfig,
                    processing_notes: e.target.value
                  })}
                  placeholder="Add any notes or instructions for direct processing..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Optional notes for internal reference regarding payroll processing
                </p>
              </div>
              
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                <p className="text-sm">
                  <strong>Direct Processing Mode:</strong> When enabled, payroll amounts will be processed directly 
                  within the system without requiring external payment APIs (RazorpayX, bank portals, etc.). 
                  This allows you to mark payments as processed manually or through your own internal processes.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* RazorpayX Configuration */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FiDollarSign className="w-6 h-6 text-purple-600" />
          <h3 className="text-xl font-semibold text-gray-900">RazorpayX Payment Gateway</h3>
        </div>
        
        <div className="space-y-6">
          {/* Enable RazorpayX Toggle */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div>
              <h4 className="font-medium text-gray-900">Enable RazorpayX Integration</h4>
              <p className="text-sm text-gray-500">
                Use your existing RazorpayX account to process payroll payments automatically
              </p>
            </div>
            <button
              onClick={() => setPayrollConfig({
                ...payrollConfig,
                razorpayx_enabled: !payrollConfig.razorpayx_enabled
              })}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                payrollConfig.razorpayx_enabled
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {payrollConfig.razorpayx_enabled ? (
                <>
                  <FiToggleRight className="w-5 h-5" />
                  <span>Enabled</span>
                </>
              ) : (
                <>
                  <FiToggleLeft className="w-5 h-5" />
                  <span>Disabled</span>
                </>
              )}
            </button>
          </div>
          
          {payrollConfig.razorpayx_enabled && (
            <>
              {/* RazorpayX Key ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RazorpayX Key ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={payrollConfig.razorpayx_key_id}
                  onChange={(e) => setPayrollConfig({
                    ...payrollConfig,
                    razorpayx_key_id: e.target.value
                  })}
                  placeholder="rzp_live_xxxxxxxxxxxxx or rzp_test_xxxxxxxxxxxxx"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter your existing RazorpayX account's API Key ID (from RazorpayX Dashboard → Settings → API Keys)
                </p>
              </div>
              
              {/* RazorpayX Key Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RazorpayX Key Secret <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={payrollConfig.razorpayx_key_secret}
                  onChange={(e) => setPayrollConfig({
                    ...payrollConfig,
                    razorpayx_key_secret: e.target.value
                  })}
                  placeholder={payrollConfig.razorpayx_key_secret ? '••••••••••••' : 'Enter your RazorpayX Key Secret'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Enter your existing RazorpayX account's API Key Secret (stored securely and encrypted)
                </p>
              </div>
              
              {/* RazorpayX Webhook Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RazorpayX Webhook Secret
                </label>
                <input
                  type="password"
                  value={payrollConfig.razorpayx_webhook_secret}
                  onChange={(e) => setPayrollConfig({
                    ...payrollConfig,
                    razorpayx_webhook_secret: e.target.value
                  })}
                  placeholder={payrollConfig.razorpayx_webhook_secret ? '••••••••••••' : 'Enter your webhook secret (optional)'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Webhook secret for verifying payment status updates (optional, but recommended)
                </p>
              </div>
              
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                <p className="text-sm mb-2">
                  <strong>Using Your Existing RazorpayX Account:</strong> If you already have a RazorpayX business account, simply enter your API credentials below. The system will use these credentials to transfer money from your RazorpayX account to employee bank accounts.
                </p>
                <p className="text-sm mb-2 font-semibold">
                  You don't need to create a new account - just provide your existing RazorpayX API keys!
                </p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  <li>Use your existing RazorpayX business account credentials</li>
                  <li>Get API keys from: RazorpayX Dashboard → Settings → API Keys</li>
                  <li>Money transfers from YOUR RazorpayX account to employee accounts</li>
                  <li>Credentials are encrypted and stored securely</li>
                  <li>Each organization uses their own RazorpayX account</li>
                </ul>
                <p className="text-sm mt-2 text-blue-700">
                  <strong>Note:</strong> Make sure you have sufficient balance in your RazorpayX wallet to process payroll payments.
                </p>
              </div>
            </>
          )}
        </div>
        
        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSavePayrollSettings}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-lg text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Payroll Settings'}</span>
          </button>
        </div>
      </div>

   

      {/* Messages */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-800">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}

