import React, { useEffect, useState } from 'react';
import { FiClipboard, FiShield } from 'react-icons/fi';
import { useAuth } from '../../contexts/AuthContext';
import OnboardingStatus from '../employee/OnboardingStatus';
import PreEmploymentForm from './PreEmploymentForm';
import { preEmploymentAPI } from '../../services/api';

export default function CandidateOnboarding() {
  const { user } = useAuth();
  const [preEmploymentCompleted, setPreEmploymentCompleted] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const displayName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Team Member';
  const targetRoleValue =
    user?.target_role && user.target_role !== user?.role ? user.target_role : null;
  const formattedTargetRole = targetRoleValue
    ? targetRoleValue
        .toLowerCase()
        .split('_')
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(' ')
    : null;

  useEffect(() => {
    checkPreEmploymentStatus();
  }, []);

  const checkPreEmploymentStatus = async () => {
    try {
      setCheckingStatus(true);
      const form = await preEmploymentAPI.getMyForm();
      setPreEmploymentCompleted(form?.status === 'submitted' || form?.status === 'verified' || form?.status === 'approved');
    } catch (error) {
      setPreEmploymentCompleted(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  // Strict: Only show PreEmploymentForm until completed, block all onboarding UI
  if (!preEmploymentCompleted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-2xl mx-auto">
          <PreEmploymentForm onSubmitted={checkPreEmploymentStatus} showHeading={true} />
        </div>
      </div>
    );
  }

  // Only after pre-employment is completed, show onboarding content
  return (
    <div className="space-y-6">
      <div className="bg-white border border-teal-100 rounded-3xl shadow-md p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-500 text-white shadow-lg">
              <FiClipboard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-teal-500 font-semibold">
                Welcome aboard
              </p>
              <h1 className="text-2xl font-bold text-slate-900">
                {displayName}, let&apos;s finish your onboarding
              </h1>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Your pre-employment form is submitted. Upload your onboarding documents next. Once everything is verified, your employee portal will unlock automatically{formattedTargetRole ? ` for your ${formattedTargetRole} role.` : '.'}
              </p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl px-5 py-4 shadow-inner flex items-center space-x-3">
            <FiShield className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                Secure & Verified
              </p>
              <p className="text-sm text-emerald-700">
                HR will review each upload and notify you of approvals instantly.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="-m-6 md:-m-8 lg:-m-10">
        <OnboardingStatus />
      </div>
    </div>
  );
}