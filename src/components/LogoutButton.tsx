import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LogoutButtonProps {
  variant?: 'icon' | 'text' | 'full';
  className?: string;
}

export function LogoutButton({ 
  variant = 'full', 
  className = '' 
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        className={`p-2 text-gray-600 hover:text-red-600 transition-colors rounded-full hover:bg-gray-100 ${className}`}
        aria-label="Log out"
      >
        <LogOut className="w-5 h-5" />
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        className={`text-gray-600 hover:text-red-600 transition-colors ${className}`}
      >
        {loading ? 'Logging out...' : 'Log out'}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors rounded-lg hover:bg-gray-100 ${className}`}
    >
      <LogOut className="w-5 h-5" />
      <span>{loading ? 'Logging out...' : 'Log out'}</span>
    </button>
  );
} 