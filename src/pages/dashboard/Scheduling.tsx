import { useState, useEffect } from 'react';
import { DashboardCard } from '../../components/DashboardCard';
import { supabase } from '../../lib/supabase';
import { fetchSchedules, subscribeToSchedules } from '../../services/supabaseService';
import { Calendar, Clock, User } from 'lucide-react';

interface Schedule {
  id: string;
  date: string;
  time_window: string;
  technicians: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export function Scheduling() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');
        
        const data = await fetchSchedules(user.id);
        // Transform data to match Schedule type
        const typedData = data?.map((item: any) => ({
          id: item.id,
          date: item.date,
          time_window: item.time_window,
          technicians: item.technicians
        })) || [];
        
        setSchedules(typedData);
      } catch (err: any) {
        console.error('Error loading schedules:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    async function setupSubscription() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const subscription = subscribeToSchedules(user.id, payload => {
          // Refresh data when changes occur
          fetchSchedules(user.id)
            .then(data => {
              // Transform data to match Schedule type
              const typedData = data?.map((item: any) => ({
                id: item.id,
                date: item.date,
                time_window: item.time_window,
                technicians: item.technicians
              })) || [];
              
              setSchedules(typedData);
            })
            .catch(err => console.error('Error refreshing schedules:', err));
        });
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Error setting up subscription:', err);
      }
    }
    
    setupSubscription();
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Your Scheduled Services</h1>
      
      <DashboardCard 
        title="Upcoming Service Visits" 
        loading={loading}
        fullWidth
      >
        {error ? (
          <div className="text-red-500 p-4">Error: {error}</div>
        ) : schedules.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {schedules.map(schedule => (
              <div key={schedule.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-700 p-2 rounded-full flex-shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{formatDate(schedule.date)}</div>
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{schedule.time_window}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-full">
                      <User className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium">
                        {schedule.technicians?.full_name || 'Assigned Technician'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No upcoming services scheduled</h3>
            <p className="text-gray-500 mb-4">Your pool service schedule will appear here once appointments are made.</p>
            <button 
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              onClick={() => window.location.href = '/schedule'}
            >
              Request Service
            </button>
          </div>
        )}
      </DashboardCard>
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 md:p-6">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Need to reschedule?</h3>
        <p className="text-blue-700 mb-4">
          We understand that plans change. If you need to reschedule a service visit,
          please contact us at least 24 hours in advance.
        </p>
        <a 
          href="/customer-dashboard/contact" 
          className="inline-block text-blue-700 font-medium hover:text-blue-800"
        >
          Contact us about scheduling
        </a>
      </div>
    </div>
  );
} 