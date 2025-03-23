import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Shield } from 'lucide-react';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is already authenticated on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Get user from auth
          const { data: { user } } = await supabase.auth.getUser();
          
          // First try to get role from user metadata
          if (user && user.user_metadata?.role) {
            redirectBasedOnRole(user.user_metadata.role);
            return;
          }
          
          // Fall back to RPC if needed
          try {
            const { data: role } = await supabase.rpc('get_user_role');
            redirectBasedOnRole(role);
          } catch (error) {
            console.error('Error getting role:', error);
            // Default to customer dashboard if role check fails
            navigate('/customer-dashboard');
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };
    
    checkSession();
  }, [navigate]);

  const redirectBasedOnRole = (role: string) => {
    if (role === 'admin') {
      navigate('/admin-dashboard');
    } else {
      navigate('/customer-dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Sign in the user
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;
        
        // Wait a moment for the session to be fully established
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get user and check metadata first
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && user.user_metadata?.role) {
          // Use role from metadata if available
          redirectBasedOnRole(user.user_metadata.role);
          return;
        }
        
        // Fall back to RPC if metadata doesn't have role
        try {
          // Get user role using RPC
          const { data: role, error: roleError } = await supabase.rpc('get_user_role');
          
          if (roleError) {
            console.error('Error getting user role:', roleError);
            // If there's an error, default to customer role
            navigate('/customer-dashboard');
            return;
          }

          console.log('User role:', role); // For debugging
          redirectBasedOnRole(role);
        } catch (roleErr) {
          console.error('Role retrieval error:', roleErr);
          // Fallback to customer role if there's an error
          navigate('/customer-dashboard');
        }
      } else {
        // Register a new user
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              role: 'customer' // Default role for new users
            },
          },
        });

        if (error) throw error;

        // Show success message for new registration
        setError('Registration successful! You can now sign in.');
        setIsLogin(true);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="relative h-[60vh] w-full overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: "url('/img/c300c4c5-8319-4a79-8c12-a88df9f8c067.jpeg')",
            filter: "brightness(0.7)"
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-center items-center text-white px-4">
          <div className="mb-6">
            <h1 className="text-5xl md:text-6xl font-bold text-center">
              {isLogin ? 'Welcome Back' : 'Join Pool Spartans'}
            </h1>
          </div>
          <div className="mb-4">
            <p className="text-xl md:text-2xl text-center max-w-2xl">
              {isLogin 
                ? 'Access your pool service dashboard' 
                : 'Create an account to manage your pool service'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-20 bg-white">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl p-8 shadow-xl">
            <div className="flex justify-center mb-8">
              <Shield className="w-16 h-16 text-blue-600" />
            </div>
            
            {error && (
              <div className={`p-4 rounded-lg mb-6 ${error.includes('successful') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="relative">
                  <User className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={inputClasses}
                    required
                  />
                </div>
              )}
              
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={inputClasses}
                  required
                />
              </div>

              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className={inputClasses}
                  required
                />
              </div>

              {isLogin && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2 text-gray-600">Remember me</span>
                  </label>
                  <a href="#" className="text-blue-600">Forgot password?</a>
                </div>
              )}

              <button
                className="w-full bg-[#00B4D8] text-white py-3 rounded-lg font-semibold hover:bg-[#0096b4] transition-colors"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  window.scrollTo(0, 0);
                }}
                className="text-[#00B4D8] font-medium hover:text-[#0096b4] transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}