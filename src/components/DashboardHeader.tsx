import { useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LogoutButton } from './LogoutButton';
import { useNavigate } from 'react-router-dom';

interface UserData {
  name?: string;
  email?: string;
  role?: string;
}

export function DashboardHeader() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getUserData = async () => {
      try {
        setLoading(true);
        
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          return;
        }
        
        // Get user metadata
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Determine role from metadata first (preferred)
          const userMetadataRole = user.user_metadata?.role;
          
          if (userMetadataRole) {
            setUserData({
              name: user.user_metadata?.name || 'User',
              email: user.email,
              role: userMetadataRole
            });
            return;
          }
          
          // Try RPC as fallback, but catch any errors
          try {
            const { data: role } = await supabase.rpc('get_user_role');
            setUserData({
              name: user.user_metadata?.name || 'User',
              email: user.email,
              role: role || 'customer'
            });
          } catch (roleError) {
            console.error('Could not get role from RPC:', roleError);
            // Default to customer if we can't get the role
            setUserData({
              name: user.user_metadata?.name || 'User',
              email: user.email,
              role: 'customer'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    getUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (dropdownOpen && !target.closest('[data-dropdown]')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <header className="bg-white shadow-sm px-4 md:px-6 lg:px-8 py-3 md:py-4 flex justify-between items-center sticky top-0 z-30">
      <h1 className="text-xl md:text-2xl font-semibold text-gray-800 ml-12 lg:ml-0">Dashboard</h1>
      
      <div className="flex items-center">
        {loading ? (
          <div className="animate-pulse flex items-center">
            <div className="rounded-full bg-gray-200 h-8 w-8 md:h-10 md:w-10"></div>
          </div>
        ) : userData ? (
          <div className="relative" data-dropdown>
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center focus:outline-none"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="bg-gray-100 rounded-full p-2 flex items-center justify-center">
                <User className="w-5 h-5 md:w-6 md:h-6 text-gray-600" />
              </div>
              <div className="ml-2 text-right hidden md:block">
                <div className="text-sm font-medium text-gray-900 truncate max-w-[120px] lg:max-w-full">
                  {userData.name}
                </div>
                <div className="text-xs text-blue-600 capitalize">{userData.role}</div>
              </div>
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-2 md:hidden">
                  <div className="text-sm font-medium text-gray-900">{userData.name}</div>
                  <div className="text-xs text-gray-500 truncate">{userData.email}</div>
                  <div className="text-xs font-medium text-blue-600 capitalize">{userData.role}</div>
                </div>
                {userData.email && (
                  <div className="border-t border-gray-100 md:hidden">
                    <div className="px-4 py-2 text-xs text-gray-500 truncate">
                      {userData.email}
                    </div>
                  </div>
                )}
                <div className={`${userData.email ? 'border-t' : ''} border-gray-100`}>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <LogoutButton variant="icon" />
        )}
      </div>
    </header>
  );
} 