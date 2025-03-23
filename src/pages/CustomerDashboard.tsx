import React, { useState, useEffect } from 'react';
import { DashboardCard, DashboardGrid } from '../components/DashboardCard';
import { supabase } from '../lib/supabase';
import { Calendar, AlertTriangle, Droplets, ArrowRight } from 'lucide-react';

// Sample data types
interface Appointment {
  id: string;
  date: string;
  time: string;
  service: string;
  status: string;
}

interface ServiceHistory {
  id: string;
  date: string;
  service: string;
  technician: string;
  notes: string;
}

interface WaterQuality {
  id: string;
  date: string;
  ph: number;
  chlorine: number;
  alkalinity: number;
  status: 'good' | 'warning' | 'alert';
}

export function CustomerDashboard() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [waterQuality, setWaterQuality] = useState<WaterQuality[]>([]);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const getUserData = async () => {
      try {
        setLoading(true);
        // In a real app, fetch this data from your API
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Sample data
        setAppointments([
          { id: '1', date: '2024-03-28', time: '10:00 AM', service: 'Regular Maintenance', status: 'confirmed' },
          { id: '2', date: '2024-04-05', time: '2:30 PM', service: 'Chemical Balancing', status: 'pending' }
        ]);
        
        setServiceHistory([
          { id: '1', date: '2024-03-12', service: 'Regular Maintenance', technician: 'John Doe', notes: 'All systems functioning properly.' },
          { id: '2', date: '2024-02-28', service: 'Filter Cleaning', technician: 'Sarah Smith', notes: 'Replaced filter cartridge.' }
        ]);
        
        setWaterQuality([
          { id: '1', date: '2024-03-15', ph: 7.4, chlorine: 2.1, alkalinity: 90, status: 'good' },
          { id: '2', date: '2024-03-01', ph: 7.8, chlorine: 1.2, alkalinity: 110, status: 'warning' }
        ]);
        
        // Get user data for personalization
        const { data: { user } } = await supabase.auth.getUser();
        setUserData(user);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getUserData();
  }, []);

  // Helper for formatting dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get water quality status color
  const getQualityColor = (status: 'good' | 'warning' | 'alert') => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'alert': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm text-white p-6 md:p-8">
        <h1 className="text-xl md:text-2xl font-semibold mb-2">
          Welcome back, {userData?.user_metadata?.name || 'Pool Owner'}!
        </h1>
        <p className="opacity-90 max-w-xl">
          View your upcoming appointments, service history, and pool status. Need to schedule a service? 
          Use the scheduling tool or contact customer support.
        </p>
      </div>

      {/* Next appointment */}
      <DashboardCard 
        title="Upcoming Appointments" 
        loading={loading}
        fullWidth
      >
        {appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map(appointment => (
              <div key={appointment.id} className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0 space-y-2 md:space-y-0">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 text-blue-800 p-2 rounded-full flex-shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">{appointment.service}</div>
                    <div className="text-sm text-gray-500">
                      {formatDate(appointment.date)} at {appointment.time}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </span>
                  {appointment.status === 'pending' && (
                    <button className="text-blue-600 text-sm font-medium hover:text-blue-800">
                      Confirm
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            <div className="mt-4 text-right">
              <a href="#" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                View all appointments
                <ArrowRight className="ml-1 w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500">No upcoming appointments.</p>
            <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
              Schedule Service
            </button>
          </div>
        )}
      </DashboardCard>

      <DashboardGrid>
        {/* Service History */}
        <DashboardCard 
          title="Recent Services" 
          loading={loading}
        >
          {serviceHistory.length > 0 ? (
            <div className="space-y-4">
              {serviceHistory.map(service => (
                <div key={service.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium">{service.service}</div>
                    <div className="text-xs text-gray-500">{formatDate(service.date)}</div>
                  </div>
                  <div className="text-sm text-gray-600">Tech: {service.technician}</div>
                  {service.notes && (
                    <div className="mt-1 text-xs text-gray-500 line-clamp-2">{service.notes}</div>
                  )}
                </div>
              ))}
              
              <div className="mt-2 text-right">
                <a href="#" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800">
                  View full history
                  <ArrowRight className="ml-1 w-4 h-4" />
                </a>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center">No service history available.</p>
          )}
        </DashboardCard>

        {/* Water Quality */}
        <DashboardCard 
          title="Water Quality" 
          loading={loading}
        >
          {waterQuality.length > 0 ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-gray-500">Last tested: {formatDate(waterQuality[0].date)}</div>
                <div className={`flex items-center ${getQualityColor(waterQuality[0].status)}`}>
                  {waterQuality[0].status === 'good' ? (
                    <>
                      <span className="bg-green-100 w-2 h-2 rounded-full mr-1"></span>
                      <span className="text-xs font-medium">Good</span>
                    </>
                  ) : waterQuality[0].status === 'warning' ? (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">Attention Needed</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-xs font-medium">Alert</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Droplets className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl font-semibold text-blue-800">{waterQuality[0].ph}</div>
                  <div className="text-xs text-gray-600">pH Level</div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Droplets className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl font-semibold text-blue-800">{waterQuality[0].chlorine}</div>
                  <div className="text-xs text-gray-600">Chlorine</div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Droplets className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl font-semibold text-blue-800">{waterQuality[0].alkalinity}</div>
                  <div className="text-xs text-gray-600">Alkalinity</div>
                </div>
              </div>
              
              <div className="mt-4 text-center">
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  View water history
                </a>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center">No water quality data available.</p>
          )}
        </DashboardCard>
      </DashboardGrid>
    </div>
  );
} 