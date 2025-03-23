import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        // Get session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setIsAuthenticated(false);
          setUserRole(null);
          return;
        }
        
        setIsAuthenticated(true);
        
        // Get user from auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // First try to get role from user metadata (most reliable)
          if (user.user_metadata?.role) {
            setUserRole(user.user_metadata.role);
            setIsLoading(false);
            return;
          }
          
          // Fall back to RPC if metadata doesn't have role
          try {
            const { data: role, error } = await supabase.rpc('get_user_role');
            
            if (error) {
              console.error('Error getting user role:', error);
              // Default to customer role if there's an error
              setUserRole('customer');
            } else {
              setUserRole(role);
            }
          } catch (roleError) {
            console.error('Failed to get user role:', roleError);
            setUserRole('customer');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setUserRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsAuthenticated(!!session);
      
      if (session) {
        // Get user from auth
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && user.user_metadata?.role) {
          // Use metadata if available
          setUserRole(user.user_metadata.role);
        } else {
          try {
            const { data: role } = await supabase.rpc('get_user_role');
            setUserRole(role);
          } catch (error) {
            console.error('Error getting role on auth change:', error);
            setUserRole('customer');
          }
        }
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle role-based access
  if (requiredRole && userRole !== requiredRole) {
    // If admin role is required but user is a customer, redirect to customer dashboard
    if (requiredRole === 'admin' && userRole === 'customer') {
      return <Navigate to="/customer-dashboard" replace />;
    }
    
    // For other cases, redirect to home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}