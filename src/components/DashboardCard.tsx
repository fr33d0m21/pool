import React, { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
  loading?: boolean;
  noPadding?: boolean;
}

export function DashboardCard({ 
  title, 
  children, 
  className = '', 
  fullWidth = false,
  loading = false,
  noPadding = false
}: DashboardCardProps) {
  return (
    <div className={`
      bg-white rounded-lg shadow-sm border border-gray-100 
      ${fullWidth ? 'w-full' : 'w-full md:w-auto'} 
      ${className}
    `}>
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="font-medium text-gray-800 text-base md:text-lg">{title}</h2>
      </div>
      <div className={`${noPadding ? '' : 'p-4 md:p-6'} ${loading ? 'animate-pulse' : ''}`}>
        {loading ? (
          <div className="flex flex-col space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// Grid layout for multiple cards
interface DashboardGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function DashboardGrid({ 
  children, 
  columns = 2,
  className = '' 
}: DashboardGridProps) {
  const getGridCols = () => {
    switch(columns) {
      case 1: return 'grid-cols-1';
      case 3: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      case 2:
      default: return 'grid-cols-1 md:grid-cols-2';
    }
  };
  
  return (
    <div className={`grid ${getGridCols()} gap-4 md:gap-6 ${className}`}>
      {children}
    </div>
  );
} 