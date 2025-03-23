import { useState, useEffect } from 'react';
import { DashboardCard, DashboardGrid } from '../../components/DashboardCard';
import { supabase } from '../../lib/supabase';
import { fetchPoolDNA, getChemicalTrends } from '../../services/supabaseService';
import { Droplets, Calendar, WrenchIcon, AlertTriangle, Thermometer, Waves, RefreshCw } from 'lucide-react';
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

interface Equipment {
  id: string;
  name: string;
  type: string;
  installation_date: string;
  last_maintenance_date: string;
}

interface ChemicalLog {
  id: string;
  ph: number;
  chlorine: number;
  alkalinity: number;
  created_at: string;
}

interface PoolDNA {
  id: string;
  volume: number;
  surface_area: number;
  pool_type: string;
  last_service_date: string;
  equipment: Equipment[];
  chemical_logs: ChemicalLog[];
  daysSinceLastService: number;
  suggestion: string | null;
}

export function PoolDNA() {
  const [poolData, setPoolData] = useState<PoolDNA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any>(null);
  
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');
        
        const data = await fetchPoolDNA(user.id);
        
        setPoolData(data);
        
        // Prepare chart data
        if (data.chemical_logs && data.chemical_logs.length > 0) {
          setChartData(getChemicalTrends(data.chemical_logs));
        }
      } catch (err: any) {
        console.error('Error loading pool data:', err);
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
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Chemical Trends',
        font: {
          size: 16
        }
      },
    },
    scales: {
      y: {
        beginAtZero: false
      }
    }
  };

  // Get pool type icon
  const getPoolTypeIcon = (poolType: string) => {
    switch (poolType.toLowerCase()) {
      case 'inground':
        return <Waves className="w-5 h-5 text-blue-600" />;
      case 'aboveground':
        return <Waves className="w-5 h-5 text-green-600" />;
      case 'spa':
        return <Thermometer className="w-5 h-5 text-red-600" />;
      default:
        return <Waves className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pool DNA</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p>{error}</p>
        </div>
      )}
      
      {poolData ? (
        <>
          <DashboardGrid>
            {/* Pool Overview */}
            <DashboardCard
              title="Pool Overview"
              loading={loading}
            >
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Pool Type</div>
                  <div className="flex items-center justify-center">
                    {getPoolTypeIcon(poolData.pool_type)}
                    <span className="ml-2 font-medium text-gray-900 capitalize">
                      {poolData.pool_type}
                    </span>
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Volume</div>
                  <div className="text-lg font-medium text-gray-900">
                    {poolData.volume.toLocaleString()} gal
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Surface Area</div>
                  <div className="text-lg font-medium text-gray-900">
                    {poolData.surface_area} sq ft
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Last Service</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(poolData.last_service_date)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <RefreshCw className="w-4 h-4 mr-1 text-blue-600" />
                  <span className="text-gray-600">Service Frequency: Weekly</span>
                </div>
                
                <a
                  href="/customer-dashboard/scheduling"
                  className="text-blue-600 hover:text-blue-800"
                >
                  View Schedule
                </a>
              </div>
              
              {poolData.suggestion && (
                <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-lg p-3 flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-800 text-sm">{poolData.suggestion}</p>
                </div>
              )}
            </DashboardCard>
            
            {/* Chemical Balance */}
            <DashboardCard
              title="Chemical Balance"
              loading={loading}
            >
              {poolData.chemical_logs && poolData.chemical_logs.length > 0 ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-500 mb-1">Current pH</div>
                      <div className="text-xl font-semibold text-blue-800">
                        {poolData.chemical_logs[0].ph}
                      </div>
                      <div className="text-xs mt-1 text-blue-600">Ideal: 7.2-7.8</div>
                    </div>
                    
                    <div className="bg-pink-50 p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-500 mb-1">Chlorine</div>
                      <div className="text-xl font-semibold text-pink-800">
                        {poolData.chemical_logs[0].chlorine}
                      </div>
                      <div className="text-xs mt-1 text-pink-600">Ideal: 1-3 ppm</div>
                    </div>
                    
                    <div className="bg-teal-50 p-3 rounded-lg text-center">
                      <div className="text-xs text-gray-500 mb-1">Alkalinity</div>
                      <div className="text-xl font-semibold text-teal-800">
                        {poolData.chemical_logs[0].alkalinity}
                      </div>
                      <div className="text-xs mt-1 text-teal-600">Ideal: 80-120 ppm</div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    Last reading from {formatDate(poolData.chemical_logs[0].created_at)}. These values show your current water chemistry levels.
                  </p>
                  
                  <a
                    href="/customer-dashboard/service-history"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View Service History
                  </a>
                </>
              ) : (
                <div className="text-center py-4">
                  <Droplets className="w-12 h-12 text-blue-200 mx-auto mb-3" />
                  <p className="text-gray-500">No chemical readings available yet.</p>
                </div>
              )}
            </DashboardCard>
          </DashboardGrid>
          
          {/* Chemical Trends Chart */}
          <DashboardCard
            title="Chemical Trends"
            loading={loading}
          >
            {chartData ? (
              <div className="h-64">
                <Line data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">Not enough data to show chemical trends.</p>
                <p className="text-gray-500 text-sm">Trends will appear after multiple service visits.</p>
              </div>
            )}
          </DashboardCard>
          
          {/* Equipment */}
          <DashboardCard
            title="Equipment"
            loading={loading}
          >
            {poolData.equipment && poolData.equipment.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {poolData.equipment.map(item => (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500 capitalize">{item.type}</div>
                      </div>
                      <div className="text-sm text-right">
                        <div className="text-gray-500">Installed: {formatDate(item.installation_date)}</div>
                        <div className="text-gray-500">Last Maintenance: {formatDate(item.last_maintenance_date)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <WrenchIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">No equipment data available.</p>
              </div>
            )}
          </DashboardCard>
        </>
      ) : !loading ? (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Droplets className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No pool data available</h3>
          <p className="text-gray-500 mb-4">Your pool information will appear here once our team has completed your initial service.</p>
          <a 
            href="/customer-dashboard/contact" 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors inline-block"
          >
            Contact Us
          </a>
        </div>
      ) : null}
    </div>
  );
} 