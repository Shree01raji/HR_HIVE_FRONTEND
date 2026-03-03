import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiMail, FiCheck, FiArrowRight, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { authAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../../components/Logo';

export default function AdminVerification({ onVerified }) {
  const { user } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const hasAutoSentRef = useRef(false); // Prevent duplicate auto-sends

  // Auto-send code on mount only if not sent in this session
  useEffect(() => {
    // Prevent duplicate calls
    if (hasAutoSentRef.current) {
      return;
    }

    // Check if we've already auto-sent in this session (sessionStorage clears on browser close)
    const hasAutoSentInSession = sessionStorage.getItem('adminVerificationAutoSent');
    
    if (hasAutoSentInSession === 'true') {
      // Already auto-sent in this session, don't send again
      hasAutoSentRef.current = true;
      setCodeSent(true);
      
      // Check if there's a cooldown from localStorage (for resend button)
      const lastSentTime = localStorage.getItem('adminVerificationCodeSentAt');
      if (lastSentTime) {
        const lastSent = parseInt(lastSentTime, 10);
        if (!isNaN(lastSent)) {
          const timeSinceLastSent = (Date.now() - lastSent) / 1000; // seconds
          const resendCooldownTime = 60; // 60 seconds for resend button
          const timeSinceLastSentSeconds = Math.floor(timeSinceLastSent);
          const remainingCooldown = Math.max(0, resendCooldownTime - timeSinceLastSentSeconds);
          setResendCooldown(remainingCooldown);
        }
      }
      return;
    }
    
    // First time in this session, send code and mark as auto-sent
    hasAutoSentRef.current = true;
    sessionStorage.setItem('adminVerificationAutoSent', 'true');
    sendVerificationCode();
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendVerificationCode = async () => {
    setSendingCode(true);
    setError('');
    try {
      await authAPI.sendAdminVerificationCode();
      setCodeSent(true);
      setResendCooldown(60); // 60 second cooldown
      // Store timestamp when code was sent (for resend cooldown)
      localStorage.setItem('adminVerificationCodeSentAt', Date.now().toString());
      // Mark as auto-sent in session to prevent auto-send on refresh
      sessionStorage.setItem('adminVerificationAutoSent', 'true');
    } catch (err) {
      console.error('Failed to send verification code:', err);
      setError(err.response?.data?.detail || 'Failed to send verification code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take last character
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
    
    setCode(newCode);
    setError('');
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newCode = [...code];
      for (let i = 0; i < 6; i++) {
        newCode[i] = pastedData[i] || '';
      }
      setCode(newCode);
      // Focus on last input or next empty
      const nextEmpty = newCode.findIndex((c, i) => !c && i >= pastedData.length);
      const focusIndex = nextEmpty >= 0 ? nextEmpty : Math.min(pastedData.length, 5);
      const nextInput = document.getElementById(`code-${focusIndex}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyAdminCode(fullCode);
      
      if (response.verified) {
        // Store verification in localStorage (session-based, persists until logout)
        const userEmail = user?.email || '';
        localStorage.setItem('adminVerified', 'true');
        localStorage.setItem('adminVerifiedAt', new Date().toISOString());
        localStorage.setItem('adminVerifiedUserEmail', userEmail);
        
        // Clear the code sent timestamps since verification is complete
        localStorage.removeItem('adminVerificationCodeSentAt');
        sessionStorage.removeItem('adminVerificationAutoSent');
        
        // Call onVerified callback if provided, otherwise navigate
        if (onVerified) {
          onVerified();
        } else {
          navigate('/admin/organizations');
        }
      }
    } catch (err) {
      console.error('Verification failed:', err);
      setError(err.response?.data?.detail || 'Invalid verification code. Please try again.');
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      document.getElementById('code-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="min-h-screen grid grid-cols-1 lg:grid-cols-[35%_65%]">
      {/* Animated background elements */}
      {/* <div className="absolute inset-0 overflow-hidden pointer-events-none"> */}
        {/* <div className="absolute top-0 right-0 w-96 h-96 bg-[#1e3a5f]/10 rounded-full blur-3xl"></div> */}
        {/* <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl"></div> */}
      {/* </div> */}

        <div className="hidden lg:flex items-center justify-center bg-[#181c52]">
    
       <img
    src="/images/HR-HIVE (1).png"
    alt="HR Hive"
    className="max-w-md w-full object-contain"
  />
      </div>

      <div className="flex items-center justify-center bg-[#e8f0f5] relative overflow-hidden py-12 sm:px-6 lg:px-8">


      <div className="max-w-md w-full relative z-10 animate-slide-down">
        {/* Header */}
        <div className="mb-8">
  {/* Logo + Title row */}
  <div className="flex items-center justify-center gap-3 mb-3">
    <Logo className="w-8 h-8" />

    <div className="flex items-center justify-center w-8 h-8 bg-[#1e3a5f] rounded-full">
      <FiShield className="w-4 h-4 text-white" />
    </div>

    <h2 className="text-3xl font-bold text-gray-900">
      Admin Verification
    </h2>

    
  </div>

  {/* Subtitle */}
  <p className="text-center text-gray-600">
    We've sent a 6-digit verification code to your email address
  </p>
</div>


        {/* Form */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-200">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-start">
              <FiAlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {codeSent && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded flex items-start">
              <FiCheck className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-green-700 text-sm">
                Verification code sent successfully! Please check your email.
              </p>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            {/* Code Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                Enter Verification Code
              </label>
              <div className="flex justify-center space-x-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    id={`code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-all"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Code expires in 10 minutes
              </p>
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || code.join('').length !== 6}
              className="w-full flex items-center justify-center space-x-2
             py-3 px-6 rounded-lg text-sm font-semibold text-white
             bg-[#1e3a5f] hover:bg-[#2a4a6f]
             shadow-lg hover:shadow-xl
             transition-all transform hover:scale-[1.02]
             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1e3a5f]
             disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <FiLoader className="w-5 h-5 animate-spin mr-2" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify Code</span>
                  <FiArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600 mb-3">
              Didn't receive the code?
            </p>
            <button
              onClick={sendVerificationCode}
              disabled={sendingCode || resendCooldown > 0}
              className="text-indigo-600 hover:text-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto transition-colors"
            >
              {sendingCode ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin mr-2" />
                  <span>Sending...</span>
                </>
              ) : resendCooldown > 0 ? (
                `Resend code in ${resendCooldown}s`
              ) : (
                <>
                  <FiMail className="w-4 h-4 mr-2" />
                  <span>Resend Verification Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            🔒 This verification is required for Admin and HR Manager access
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}

