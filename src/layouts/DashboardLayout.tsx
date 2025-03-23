import React from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardSidebar } from '../components/DashboardSidebar';
import { DashboardHeader } from '../components/DashboardHeader';

interface DashboardLayoutProps {
  isAdmin?: boolean;
}

export function DashboardLayout({ isAdmin = false }: DashboardLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <DashboardSidebar isAdmin={isAdmin} />
      <div className="flex-1 lg:ml-64 flex flex-col">
        <DashboardHeader />
        <main className="p-4 md:p-6 lg:p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}