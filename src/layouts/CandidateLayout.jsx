import React from 'react';
import { Outlet } from 'react-router-dom';
import CandidateSidebar from '../components/candidate/Sidebar';
import CandidateHeader from '../components/candidate/Header';

export default function CandidateLayout() {
  return (
    <div className="h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 dark:from-gray-900 dark:via-slate-900 dark:to-teal-950 overflow-hidden transition-colors duration-200">
      <div className="flex h-full">
        <CandidateSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <CandidateHeader />
          <main className="flex-1 overflow-y-auto p-6 bg-transparent">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
