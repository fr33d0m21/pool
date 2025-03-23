import { useState, useEffect } from 'react';
import { DashboardCard, DashboardGrid } from '../../components/DashboardCard';
import { supabase } from '../../lib/supabase';
import { fetchActiveJobs } from '../../services/supabaseService';
import { Briefcase, Calendar, Clock, ArrowRight, CheckCircle, Repeat } from 'lucide-react';

interface TimeWindow {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface Job {
  id: string;
  date: string;
  job_type: 'one_time' | 'route_stop';
  status: string;
  description: string;
  time_windows: TimeWindow;
}

export function Jobs() {
  const [oneTimeJobs, setOneTimeJobs] = useState<Job[]>([]);
  const [routeStops, setRouteStops] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');
        
        const { oneTimeJobs, routeStops } = await fetchActiveJobs(user.id);
        
        // Transform data to match Job type
        const typedOneTimeJobs = oneTimeJobs?.map((item: any) => ({
          id: item.id,
          date: item.date,
          job_type: item.job_type,
          status: item.status,
          description: item.description,
          time_windows: item.time_windows
        })) || [];
        
        const typedRouteStops = routeStops?.map((item: any) => ({
          id: item.id,
          date: item.date,
          job_type: item.job_type,
          status: item.status,
          description: item.description,
          time_windows: item.time_windows
        })) || [];
        
        setOneTimeJobs(typedOneTimeJobs);
        setRouteStops(typedRouteStops);
      } catch (err: any) {
        console.error('Error loading jobs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format time window for display
  const formatTimeWindow = (timeWindow: TimeWindow) => {
    if (!timeWindow) return 'Flexible';
    return `${timeWindow.name} (${timeWindow.start_time} - ${timeWindow.end_time})`;
  };

  // Get job type icon and label
  const getJobTypeInfo = (jobType: string) => {
    switch (jobType) {
      case 'one_time':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          label: 'One-Time Service',
          color: 'bg-purple-100 text-purple-700'
        };
      case 'route_stop':
        return {
          icon: <Repeat className="w-5 h-5" />,
          label: 'Recurring Service',
          color: 'bg-green-100 text-green-700'
        };
      default:
        return {
          icon: <Briefcase className="w-5 h-5" />,
          label: 'Service',
          color: 'bg-blue-100 text-blue-700'
        };
    }
  };

  // Render job card
  const renderJobCard = (job: Job) => {
    const jobTypeInfo = getJobTypeInfo(job.job_type);
    
    return (
      <div key={job.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className={`px-4 py-2 ${jobTypeInfo.color} flex items-center`}>
          {jobTypeInfo.icon}
          <span className="ml-2 font-medium">{jobTypeInfo.label}</span>
        </div>
        
        <div className="p-4">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDate(job.date)}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 mb-3">
            <Clock className="w-4 h-4 mr-1" />
            <span>{formatTimeWindow(job.time_windows)}</span>
          </div>
          
          {job.description && (
            <p className="text-gray-700 text-sm mb-3">{job.description}</p>
          )}
          
          <a 
            href={`/customer-dashboard/contact?subject=Question about job on ${formatDate(job.date)}`}
            className="text-blue-600 text-sm hover:text-blue-800 inline-flex items-center"
          >
            Have questions?
            <ArrowRight className="w-3 h-3 ml-1" />
          </a>
        </div>
      </div>
    );
  };

  // Check if there are any jobs
  const hasJobs = oneTimeJobs.length > 0 || routeStops.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Scheduled Jobs</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p>{error}</p>
        </div>
      )}
      
      {!hasJobs && !loading ? (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No active jobs</h3>
          <p className="text-gray-500 mb-4">You don't have any scheduled jobs at the moment.</p>
          <a 
            href="/schedule" 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
          >
            Schedule Service
          </a>
        </div>
      ) : (
        <>
          {oneTimeJobs.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">One-Time Services</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {oneTimeJobs.map(job => renderJobCard(job))}
              </div>
            </div>
          )}
          
          {routeStops.length > 0 && (
            <div className={oneTimeJobs.length > 0 ? 'mt-8' : ''}>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Recurring Services</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {routeStops.map(job => renderJobCard(job))}
              </div>
            </div>
          )}
          
          <DashboardCard
            title="Schedule Flexibility"
            loading={loading}
            className="mt-6"
          >
            <p className="text-gray-600 mb-4">
              Our service technicians typically work within these time windows:
            </p>
            
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium text-gray-800">Morning</div>
                <div className="text-sm text-gray-600">8:00 AM - 12:00 PM</div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium text-gray-800">Afternoon</div>
                <div className="text-sm text-gray-600">12:00 PM - 4:00 PM</div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="font-medium text-gray-800">Evening</div>
                <div className="text-sm text-gray-600">4:00 PM - 7:00 PM <span className="text-gray-500">(Summer only)</span></div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mt-4">
              While we strive to arrive within these windows, please allow some flexibility as
              service times can vary based on previous appointments and conditions.
            </p>
          </DashboardCard>
        </>
      )}
    </div>
  );
} 