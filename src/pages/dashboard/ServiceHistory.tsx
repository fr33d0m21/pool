import { useState, useEffect } from 'react';
import { DashboardCard, DashboardGrid } from '../../components/DashboardCard';
import { supabase } from '../../lib/supabase';
import { fetchServiceHistory } from '../../services/supabaseService';
import { ClipboardCheck, ChevronRight, ChevronLeft, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ServiceHistoryItem {
  id: string;
  date: string;
  status: string;
  notes: string;
  technician_id: string;
  technicians: {
    full_name: string;
  };
  chemical_logs: {
    id: string;
    ph: number;
    chlorine: number;
    alkalinity: number;
    created_at: string;
  }[];
}

export function ServiceHistory() {
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJob, setSelectedJob] = useState<ServiceHistoryItem | null>(null);
  const itemsPerPage = 5;

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');
        
        const data = await fetchServiceHistory(user.id, currentPage, itemsPerPage);
        
        // Transform data to match ServiceHistoryItem type
        const typedData = data?.map((item: any) => ({
          id: item.id,
          date: item.date,
          status: item.status,
          notes: item.notes,
          technician_id: item.technician_id,
          technicians: item.technicians,
          chemical_logs: item.chemical_logs || []
        })) || [];
        
        setServiceHistory(typedData);
        
        // Set total pages - this would normally come from an API count
        // For this example, we'll assume there are 3 pages total
        setTotalPages(3);
      } catch (err: any) {
        console.error('Error loading service history:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [currentPage]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return {
          color: 'text-green-700 bg-green-50',
          icon: <CheckCircle className="w-4 h-4 mr-1" />
        };
      case 'no access':
        return {
          color: 'text-yellow-700 bg-yellow-50',
          icon: <XCircle className="w-4 h-4 mr-1" />
        };
      case 'canceled':
        return {
          color: 'text-red-700 bg-red-50',
          icon: <XCircle className="w-4 h-4 mr-1" />
        };
      default:
        return {
          color: 'text-gray-700 bg-gray-50',
          icon: <AlertCircle className="w-4 h-4 mr-1" />
        };
    }
  };

  // Handle job selection to view details
  const handleSelectJob = (job: ServiceHistoryItem) => {
    setSelectedJob(job);
  };

  // Prepare chemical log data for chart
  const prepareChartData = () => {
    if (!selectedJob || !selectedJob.chemical_logs || selectedJob.chemical_logs.length === 0) {
      return null;
    }
    
    // Sort logs by date
    const sortedLogs = [...selectedJob.chemical_logs].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Format dates for x-axis labels
    const labels = sortedLogs.map(log => {
      const date = new Date(log.created_at);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    
    return {
      labels,
      datasets: [
        {
          label: 'pH',
          data: sortedLogs.map(log => log.ph),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.3
        },
        {
          label: 'Chlorine',
          data: sortedLogs.map(log => log.chlorine),
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.3
        },
        {
          label: 'Alkalinity',
          data: sortedLogs.map(log => log.alkalinity),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.3
        }
      ]
    };
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
      }
    },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Service History</h1>
      
      <DashboardGrid>
        <DashboardCard 
          title="Past Service Visits" 
          loading={loading}
        >
          {error ? (
            <div className="text-red-500 p-4">Error: {error}</div>
          ) : serviceHistory.length > 0 ? (
            <div>
              <div className="divide-y divide-gray-100">
                {serviceHistory.map(job => {
                  const statusInfo = getStatusInfo(job.status);
                  
                  return (
                    <div 
                      key={job.id} 
                      className={`py-3 cursor-pointer ${selectedJob?.id === job.id ? 'bg-blue-50 -mx-6 px-6' : ''}`}
                      onClick={() => handleSelectJob(job)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{formatDate(job.date)}</div>
                          <div className="flex items-center mt-1">
                            <div className={`text-xs font-medium px-2 py-1 rounded-full flex items-center ${statusInfo.color}`}>
                              {statusInfo.icon}
                              {job.status}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          <div>Tech: {job.technicians?.full_name || 'Unknown'}</div>
                        </div>
                      </div>
                      
                      {job.notes && (
                        <div className="mt-2 text-sm text-gray-600 line-clamp-2">{job.notes}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className={`flex items-center text-sm font-medium ${
                    currentPage === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                
                <span className="text-sm text-gray-500">
                  Page {currentPage + 1} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className={`flex items-center text-sm font-medium ${
                    currentPage >= totalPages - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <ClipboardCheck className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No service history yet</h3>
              <p className="text-gray-500">Your service history will appear here after your first service visit.</p>
            </div>
          )}
        </DashboardCard>
        
        <DashboardCard 
          title={selectedJob ? `Chemical Readings (${formatDate(selectedJob.date)})` : "Chemical Readings"}
          loading={loading}
        >
          {selectedJob ? (
            selectedJob.chemical_logs && selectedJob.chemical_logs.length > 0 ? (
              <div>
                <div className="h-64">
                  {prepareChartData() && (
                    <Line data={prepareChartData()!} options={chartOptions} />
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-xs text-gray-500 mb-1">pH</div>
                    <div className="text-xl font-medium text-blue-700">
                      {selectedJob.chemical_logs[0].ph}
                    </div>
                  </div>
                  
                  <div className="bg-pink-50 p-3 rounded-lg text-center">
                    <div className="text-xs text-gray-500 mb-1">Chlorine</div>
                    <div className="text-xl font-medium text-pink-700">
                      {selectedJob.chemical_logs[0].chlorine}
                    </div>
                  </div>
                  
                  <div className="bg-teal-50 p-3 rounded-lg text-center">
                    <div className="text-xs text-gray-500 mb-1">Alkalinity</div>
                    <div className="text-xl font-medium text-teal-700">
                      {selectedJob.chemical_logs[0].alkalinity}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-sm text-gray-600">
                  <p>
                    These readings are from your most recent service visit. Keeping your water 
                    chemistry balanced is essential for a clean, safe swimming experience.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">No chemical readings available for this service visit.</p>
              </div>
            )
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-500">Select a service from the history to view chemical readings.</p>
            </div>
          )}
        </DashboardCard>
      </DashboardGrid>
    </div>
  );
} 