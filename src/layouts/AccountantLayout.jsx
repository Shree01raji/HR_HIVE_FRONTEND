import React from 'react';
import { Outlet } from 'react-router-dom';
import AccountantSidebar from '../components/accountant/Sidebar';
import AccountantHeader from '../components/accountant/Header';

export default function AccountantLayout() {
  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 overflow-hidden transition-colors duration-200">
      <div className="flex h-full">
        <AccountantSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AccountantHeader />
          <main className="flex-1 overflow-y-auto p-6 bg-transparent">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

