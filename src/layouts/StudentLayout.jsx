import React from 'react';
import { Outlet } from 'react-router-dom';
import StudentSidebar from '../components/student/Sidebar';
import StudentHeader from '../components/student/Header';

export default function StudentLayout() {
  return (
    <div className="h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 dark:from-gray-900 dark:via-slate-900 dark:to-teal-950 overflow-hidden transition-colors duration-200">
      <div className="flex h-full">
        <StudentSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <StudentHeader />
          <main className="flex-1 overflow-y-auto p-6 bg-transparent">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
