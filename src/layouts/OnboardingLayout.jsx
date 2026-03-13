import React from 'react';
import { Outlet } from 'react-router-dom';
import ThemeToggle from '../components/common/ThemeToggle';

export default function OnboardingLayout() {
  // RequireOrganizationCode wrapper handles organization validation
  // If we reach here, organization is already validated
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 transition-colors duration-200">
      <header className="border-b border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Onboarding</h1>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              Upload your documents and complete the pre-join checklist.
            </p>
          </div>
          {/* <ThemeToggle /> */}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

