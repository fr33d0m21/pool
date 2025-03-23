import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, ClipboardList, CreditCard, FileText, Briefcase, Database, Users, School as Pool, 
  WrenchIcon, Bell, Settings, UserCog, BarChart, Menu, X, MessageSquare } from 'lucide-react';
import { LogoutButton } from './LogoutButton';

interface SidebarLink {
  to: string;
  icon: React.ReactNode;
  label: string;
}

interface DashboardSidebarProps {
  isAdmin?: boolean;
}

export function DashboardSidebar({ isAdmin = false }: DashboardSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  
  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle window resize to auto-close mobile menu on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const customerLinks: SidebarLink[] = [
    { to: 'scheduling', icon: <Calendar className="w-5 h-5" />, label: 'Scheduling' },
    { to: 'service-history', icon: <ClipboardList className="w-5 h-5" />, label: 'Service History' },
    { to: 'billing', icon: <CreditCard className="w-5 h-5" />, label: 'Billing' },
    { to: 'quotes', icon: <FileText className="w-5 h-5" />, label: 'Quotes' },
    { to: 'jobs', icon: <Briefcase className="w-5 h-5" />, label: 'Jobs' },
    { to: 'pool-dna', icon: <Database className="w-5 h-5" />, label: 'Pool DNA' },
    { to: 'contact', icon: <MessageSquare className="w-5 h-5" />, label: 'Contact' }
  ];

  const adminLinks: SidebarLink[] = [
    { to: 'scheduling', icon: <Calendar className="w-5 h-5" />, label: 'Scheduling' },
    { to: 'quotes', icon: <FileText className="w-5 h-5" />, label: 'Quotes' },
    { to: 'jobs', icon: <Briefcase className="w-5 h-5" />, label: 'Jobs' },
    { to: 'billing', icon: <CreditCard className="w-5 h-5" />, label: 'Billing' },
    { to: 'products-services', icon: <Settings className="w-5 h-5" />, label: 'Products & Services' },
    { to: 'customers', icon: <Users className="w-5 h-5" />, label: 'Customers' },
    { to: 'water-bodies', icon: <Pool className="w-5 h-5" />, label: 'Water Bodies' },
    { to: 'equipment', icon: <WrenchIcon className="w-5 h-5" />, label: 'Equipment' },
    { to: 'alerts', icon: <Bell className="w-5 h-5" />, label: 'Alerts' },
    { to: 'service-levels', icon: <UserCog className="w-5 h-5" />, label: 'Service Levels' },
    { to: 'technicians', icon: <Users className="w-5 h-5" />, label: 'Technicians' },
    { to: 'reports', icon: <BarChart className="w-5 h-5" />, label: 'Reports' }
  ];

  const links = isAdmin ? adminLinks : customerLinks;
  const basePath = isAdmin ? '/admin-dashboard' : '/customer-dashboard';

  // Mobile menu button that appears on smaller screens
  const MobileMenuButton = () => (
    <button
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="lg:hidden fixed top-4 left-4 z-50 bg-blue-500 text-white p-2 rounded-md shadow-lg"
      aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
    >
      {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
    </button>
  );

  return (
    <>
      <MobileMenuButton />
      
      {/* Mobile overlay - appears when menu is open */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar - responsive */}
      <div 
        className={`
          bg-white h-screen overflow-y-auto flex flex-col z-40
          lg:fixed lg:left-0 lg:top-0 lg:w-64 lg:shadow-lg lg:translate-x-0 lg:transition-none
          fixed inset-y-0 left-0 w-[280px] shadow-2xl transition-transform duration-300 transform
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-6 flex-grow">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 mt-8 lg:mt-0">
            {isAdmin ? 'Admin Portal' : 'Customer Portal'}
          </h2>
          <nav className="space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={`${basePath}/${link.to}`}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        
        {/* Logout section */}
        <div className="p-6 border-t border-gray-200">
          <LogoutButton className="w-full justify-center" />
        </div>
      </div>
    </>
  );
}