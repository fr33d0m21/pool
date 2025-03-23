import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Calendar, MapPin, Clock, User, Filter, Save, Shuffle, Tag, Bell } from 'lucide-react';
import { DashboardCard } from '../../components/DashboardCard';

// Mapbox public key
mapboxgl.accessToken = 'pk.eyJ1IjoiZnIzM2QwbTIxIiwiYSI6ImNtM25lMmt2OTAwNHoyanB1bGczYWxpbjIifQ.uTMNzqxdqYsyYZQVo3s1TA';

// Interfaces
interface Technician {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface Customer {
  id: string;
  full_name: string;
  address: string;
  tags?: string[];
}

interface Schedule {
  id: string;
  customer_id: string;
  technician_id: string;
  date: string;
  time_window: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string;
  is_permanent: boolean;
  frequency: string;
  custom_frequency_weeks?: number;
  visit_day_of_week?: number[];
  customer?: Customer;
  technician?: Technician;
}

interface Route {
  id: string;
  technician_id: string;
  date: string;
  status: string;
  is_optimized: boolean;
  technician?: Technician;
  stops?: RouteStop[];
}

interface RouteStop {
  id: string;
  route_id: string;
  schedule_id: string;
  stop_order: number;
  status: string;
  estimated_arrival_time?: string;
  actual_arrival_time?: string;
  schedule?: Schedule;
}

interface Job {
  id: string;
  customer_id: string;
  technician_id: string;
  schedule_id?: string;
  job_type: string;
  date: string;
  status: string;
  notes?: string;
  customer?: Customer;
  technician?: Technician;
}

interface View {
  id: string;
  name: string;
  filters: {
    technicians?: string[];
    job_types?: string[];
    statuses?: string[];
    customer_tags?: string[];
    date_range?: {
      start: string;
      end: string;
    };
  };
  is_default: boolean;
}

// Main component
export function AdminScheduling() {
  // State variables
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapMarkers, setMapMarkers] = useState<mapboxgl.Marker[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewDuration, setViewDuration] = useState<1 | 2 | 5>(1);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [nearbyProperties, setNearbyProperties] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [views, setViews] = useState<View[]>([]);
  const [activeView, setActiveView] = useState<View | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    technicians: [] as string[],
    job_types: [] as string[],
    statuses: [] as string[],
    customer_tags: [] as string[],
  });
  const [draggedMarker, setDraggedMarker] = useState<mapboxgl.Marker | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [showSaveView, setShowSaveView] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load technicians
        const { data: techData } = await supabase
          .from('technicians')
          .select('id, full_name, avatar_url');
        
        if (techData) setTechnicians(techData);
        
        // Load saved views
        const { data: viewData } = await supabase
          .from('views')
          .select('*')
          .order('is_default', { ascending: false });
        
        if (viewData) {
          setViews(viewData);
          // Set default view if exists
          const defaultView = viewData.find(v => v.is_default);
          if (defaultView) {
            setActiveView(defaultView);
            setFilters(defaultView.filters);
          }
        }
        
        // Load data for selected date range
        await loadSchedulesForDateRange();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-95.7129, 37.0902], // US center by default
      zoom: 3
    });
    
    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl());
    
    // Cleanup on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);
  
  // Update map when schedules change
  useEffect(() => {
    if (!map.current || schedules.length === 0) return;
    
    // Clear existing markers
    mapMarkers.forEach(marker => marker.remove());
    const newMarkers: mapboxgl.Marker[] = [];
    
    // Add markers for each schedule
    schedules.forEach(schedule => {
      if (!schedule.latitude || !schedule.longitude) return;
      
      // Determine marker color based on status
      let color = '#3b82f6'; // Default blue
      if (schedule.status === 'completed') color = '#22c55e'; // Green
      else if (schedule.status === 'in_progress') color = '#eab308'; // Yellow
      else if (schedule.status === 'cancelled') color = '#ef4444'; // Red
      
      // Create marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'mapbox-marker';
      markerElement.style.backgroundColor = color;
      markerElement.style.width = '20px';
      markerElement.style.height = '20px';
      markerElement.style.borderRadius = '50%';
      markerElement.style.border = '2px solid white';
      markerElement.style.boxShadow = '0 0 0 2px rgba(0, 0, 0, 0.1)';
      
      // Create marker
      const marker = new mapboxgl.Marker({
        element: markerElement,
        draggable: true
      })
        .setLngLat([schedule.longitude, schedule.latitude])
        .addTo(map.current!);
      
      // Add popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-2">
          <p class="font-medium">${schedule.customer?.full_name || 'Customer'}</p>
          <p class="text-sm">${schedule.address || 'No address'}</p>
          <p class="text-sm text-gray-600">${new Date(schedule.date).toLocaleDateString()}</p>
          <p class="text-sm text-gray-600">${schedule.time_window || 'No time window'}</p>
        </div>
      `);
      
      marker.setPopup(popup);
      
      // Add click event
      marker.getElement().addEventListener('click', () => {
        setSelectedSchedule(schedule);
        findNearbyProperties(schedule.latitude, schedule.longitude, schedule.date);
      });
      
      // Handle drag events for schedule modifications
      marker
        .on('dragstart', () => {
          setDraggedMarker(marker);
          setEditingSchedule(schedule);
        })
        .on('dragend', () => {
          if (draggedMarker) {
            const newPosition = draggedMarker.getLngLat();
            handleSchedulePositionChange(schedule.id, newPosition.lat, newPosition.lng);
          }
        });
      
      newMarkers.push(marker);
    });
    
    // Save markers
    setMapMarkers(newMarkers);
    
    // Fit map to markers if we have any
    if (newMarkers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      schedules.forEach(schedule => {
        if (schedule.latitude && schedule.longitude) {
          bounds.extend([schedule.longitude, schedule.latitude]);
        }
      });
      map.current.fitBounds(bounds, { padding: 100 });
    }
  }, [schedules]);
  
  // Subscribe to real-time updates
  useEffect(() => {
    const scheduleChanges = supabase
      .channel('schedules-admin-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules'
        },
        () => {
          // Reload data when schedules change
          loadSchedulesForDateRange();
        }
      )
      .subscribe();
      
    const jobChanges = supabase
      .channel('jobs-admin-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        () => {
          // Reload jobs when they change
          loadJobsForDateRange();
        }
      )
      .subscribe();
      
    const routeChanges = supabase
      .channel('routes-admin-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'routes'
        },
        () => {
          // Reload routes when they change
          loadRoutesForDateRange();
        }
      )
      .subscribe();
    
    return () => {
      scheduleChanges.unsubscribe();
      jobChanges.unsubscribe();
      routeChanges.unsubscribe();
    };
  }, [viewDuration, selectedDate]);
  
  // Load schedules for the selected date range
  const loadSchedulesForDateRange = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + (viewDuration - 1));
      
      // Format dates for query
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Build query
      let query = supabase
        .from('schedules')
        .select(`
          *,
          customer:users(id, full_name, address),
          technician:technicians(id, full_name, avatar_url)
        `)
        .gte('date', startDateStr)
        .lte('date', endDateStr);
      
      // Apply filters if active
      if (filters.technicians?.length > 0) {
        query = query.in('technician_id', filters.technicians);
      }
      
      if (filters.statuses?.length > 0) {
        query = query.in('status', filters.statuses);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      if (data) setSchedules(data);
      
      // Also load routes and jobs
      await loadRoutesForDateRange();
      await loadJobsForDateRange();
      
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Load routes for the selected date range
  const loadRoutesForDateRange = async () => {
    try {
      // Calculate date range
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + (viewDuration - 1));
      
      // Format dates for query
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Build query
      let query = supabase
        .from('routes')
        .select(`
          *,
          technician:technicians(id, full_name, avatar_url),
          stops:route_stops(
            id, route_id, schedule_id, stop_order, status, 
            estimated_arrival_time, actual_arrival_time,
            schedule:schedules(*)
          )
        `)
        .gte('date', startDateStr)
        .lte('date', endDateStr);
      
      // Apply technician filter if active
      if (filters.technicians?.length > 0) {
        query = query.in('technician_id', filters.technicians);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      if (data) setRoutes(data);
      
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  };
  
  // Load jobs for the selected date range
  const loadJobsForDateRange = async () => {
    try {
      // Calculate date range
      const startDate = new Date(selectedDate);
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + (viewDuration - 1));
      
      // Format dates for query
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Build query
      let query = supabase
        .from('jobs')
        .select(`
          *,
          customer:users(id, full_name, address),
          technician:technicians(id, full_name, avatar_url)
        `)
        .gte('date', startDateStr)
        .lte('date', endDateStr);
      
      // Apply filters if active
      if (filters.technicians?.length > 0) {
        query = query.in('technician_id', filters.technicians);
      }
      
      if (filters.job_types?.length > 0) {
        query = query.in('job_type', filters.job_types);
      }
      
      if (filters.statuses?.length > 0) {
        query = query.in('status', filters.statuses);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      if (data) setJobs(data);
      
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };
  
  // Handle date change
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    loadSchedulesForDateRange();
  };
  
  // Handle view duration change
  const handleViewDurationChange = (duration: 1 | 2 | 5) => {
    setViewDuration(duration);
    loadSchedulesForDateRange();
  };
  
  // Find nearby properties to a selected property
  const findNearbyProperties = async (lat: number, lng: number, date: string) => {
    try {
      const { data, error } = await supabase.rpc('find_nearest_properties', {
        property_lat: lat,
        property_lng: lng,
        search_date: date
      });
      
      if (error) throw error;
      
      if (data) {
        // Convert to Schedule objects
        const nearbySchedules: Schedule[] = [];
        
        for (const prop of data) {
          // Skip the selected property itself
          if (selectedSchedule && prop.schedule_id === selectedSchedule.id) continue;
          
          // Get full schedule details
          const { data: scheduleData } = await supabase
            .from('schedules')
            .select(`
              *,
              customer:users(id, full_name, address),
              technician:technicians(id, full_name, avatar_url)
            `)
            .eq('id', prop.schedule_id)
            .single();
            
          if (scheduleData) {
            nearbySchedules.push(scheduleData);
          }
        }
        
        setNearbyProperties(nearbySchedules);
      }
    } catch (error) {
      console.error('Error finding nearby properties:', error);
    }
  };
  
  // Optimize routes
  const handleRouteOptimization = async () => {
    try {
      // Find routes for the selected date
      const targetDate = selectedDate.toISOString().split('T')[0];
      
      // Get all routes for this date that aren't optimized yet
      const { data: routesToOptimize } = await supabase
        .from('routes')
        .select('id')
        .eq('date', targetDate)
        .eq('is_optimized', false);
      
      if (routesToOptimize && routesToOptimize.length > 0) {
        // Optimize each route
        for (const route of routesToOptimize) {
          await supabase.rpc('optimize_route', { route_id: route.id });
        }
        
        // Reload routes after optimization
        await loadRoutesForDateRange();
      } else {
        alert('No routes to optimize for the selected date.');
      }
    } catch (error) {
      console.error('Error optimizing routes:', error);
    }
  };
  
  // Handle schedule position change (after marker drag)
  const handleSchedulePositionChange = async (scheduleId: string, lat: number, lng: number) => {
    try {
      // Update schedule coordinates
      await supabase
        .from('schedules')
        .update({
          latitude: lat,
          longitude: lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', scheduleId);
      
      // Ask if this should be a one-time change or permanent
      if (editingSchedule && editingSchedule.is_permanent) {
        const confirmPermanent = window.confirm(
          'Do you want to apply this change permanently to all future occurrences?'
        );
        
        if (!confirmPermanent) {
          // Update is_permanent flag to false
          await supabase
            .from('schedules')
            .update({
              is_permanent: false
            })
            .eq('id', scheduleId);
        }
      }
      
      // Reload schedules
      await loadSchedulesForDateRange();
      
    } catch (error) {
      console.error('Error updating schedule position:', error);
    } finally {
      setDraggedMarker(null);
      setEditingSchedule(null);
    }
  };
  
  // Save current view
  const handleSaveView = async () => {
    try {
      if (!newViewName) {
        alert('Please enter a name for this view');
        return;
      }
      
      const { data, error } = await supabase
        .from('views')
        .insert({
          name: newViewName,
          filters: filters,
          is_default: false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add to views list
      if (data) {
        setViews([...views, data]);
        setActiveView(data);
        setShowSaveView(false);
        setNewViewName('');
      }
      
    } catch (error) {
      console.error('Error saving view:', error);
    }
  };
  
  // Set a view as active
  const handleSetActiveView = (view: View) => {
    setActiveView(view);
    setFilters({
      technicians: view.filters.technicians || [],
      job_types: view.filters.job_types || [],
      statuses: view.filters.statuses || [],
      customer_tags: view.filters.customer_tags || [],
    });
    loadSchedulesForDateRange();
  };
  
  // Apply current filters
  const handleApplyFilters = () => {
    setFilterDrawerOpen(false);
    loadSchedulesForDateRange();
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      technicians: [],
      job_types: [],
      statuses: [],
      customer_tags: [],
    });
    setActiveView(null);
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="admin-scheduling">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Schedule Management</h1>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setFilterDrawerOpen(true)}
            className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-md flex items-center"
          >
            <Filter className="w-4 h-4 mr-1.5" />
            Filters
          </button>
          
          {activeView && (
            <div className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md flex items-center">
              <span className="mr-1">View:</span>
              <span className="font-medium">{activeView.name}</span>
            </div>
          )}
          
          <button 
            onClick={() => setShowSaveView(true)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md flex items-center"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save View
          </button>
        </div>
      </div>
      
      {/* Map view duration selector */}
      <div className="flex mb-4 space-x-2">
        <button 
          onClick={() => handleViewDurationChange(1)}
          className={`px-4 py-2 rounded-md ${viewDuration === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          1-Day View
        </button>
        <button 
          onClick={() => handleViewDurationChange(2)}
          className={`px-4 py-2 rounded-md ${viewDuration === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          2-Day View
        </button>
        <button 
          onClick={() => handleViewDurationChange(5)}
          className={`px-4 py-2 rounded-md ${viewDuration === 5 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          5-Day View
        </button>
        
        <div className="ml-auto flex items-center space-x-2">
          <input 
            type="date" 
            value={selectedDate.toISOString().split('T')[0]} 
            onChange={(e) => handleDateChange(new Date(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-1.5"
          />
          
          <button 
            onClick={handleRouteOptimization}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Shuffle className="w-4 h-4 mr-1.5" />
            Optimize Routes
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Map view */}
        <div className="col-span-8">
          <DashboardCard title="Route Map" loading={loading} fullWidth>
            <div 
              ref={mapContainer} 
              className="w-full h-[600px] rounded-md overflow-hidden"
            />
          </DashboardCard>
        </div>
        
        {/* Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Selected property details */}
          {selectedSchedule && (
            <DashboardCard title="Selected Property" fullWidth>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="bg-blue-100 text-blue-700 p-2 rounded-full flex-shrink-0 mt-1">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900">
                      {selectedSchedule.customer?.full_name || 'Customer'}
                    </h3>
                    <p className="text-gray-600 text-sm">{selectedSchedule.address}</p>
                    <div className="flex items-center mt-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span className="mr-3">{formatDate(selectedSchedule.date)}</span>
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{selectedSchedule.time_window}</span>
                    </div>
                    {selectedSchedule.technician && (
                      <div className="flex items-center mt-2">
                        <div className="bg-gray-100 px-2 py-0.5 rounded-full flex items-center">
                          <User className="w-3 h-3 text-gray-500 mr-1" />
                          <span className="text-xs font-medium">
                            {selectedSchedule.technician.full_name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Frequency information */}
                <div className="bg-gray-50 rounded-md p-3 text-sm">
                  <p className="font-medium mb-1">Schedule Information</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">Frequency:</span>
                      <span className="ml-1 font-medium">
                        {selectedSchedule.frequency === 'custom' && selectedSchedule.custom_frequency_weeks
                          ? `Every ${selectedSchedule.custom_frequency_weeks} weeks`
                          : selectedSchedule.frequency?.charAt(0).toUpperCase() + selectedSchedule.frequency?.slice(1)
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Permanent:</span>
                      <span className="ml-1 font-medium">
                        {selectedSchedule.is_permanent ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Buttons for actions */}
                <div className="flex space-x-2">
                  <button className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm flex-1">
                    Edit Details
                  </button>
                  <button className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md text-sm flex-1">
                    Reassign
                  </button>
                </div>
              </div>
            </DashboardCard>
          )}
          
          {/* Nearby properties */}
          {selectedSchedule && nearbyProperties.length > 0 && (
            <DashboardCard title="Nearby Properties" fullWidth>
              <div className="space-y-2">
                {nearbyProperties.map(property => (
                  <div key={property.id} className="p-2 border border-gray-100 hover:bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {property.customer?.full_name || 'Customer'}
                        </h4>
                        <p className="text-gray-600 text-sm">{property.address}</p>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          )}
          
          {/* Route stops / schedule list */}
          <DashboardCard title={`Stops (${schedules.length})`} fullWidth>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {/* Group schedules by date */}
              {Object.entries(
                schedules.reduce((acc, schedule) => {
                  const date = schedule.date;
                  if (!acc[date]) acc[date] = [];
                  acc[date].push(schedule);
                  return acc;
                }, {} as Record<string, Schedule[]>)
              ).map(([date, dateSchedules]) => (
                <div key={date} className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {formatDate(date)}
                  </h4>
                  <div className="space-y-1">
                    {dateSchedules.map(schedule => (
                      <div 
                        key={schedule.id} 
                        className={`p-2 border hover:bg-gray-50 rounded-md cursor-pointer transition ${
                          selectedSchedule?.id === schedule.id ? 'border-blue-200 bg-blue-50' : 'border-gray-100'
                        }`}
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          findNearbyProperties(schedule.latitude, schedule.longitude, schedule.date);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {schedule.customer?.full_name || 'Customer'}
                            </h5>
                            <div className="flex items-center mt-0.5">
                              <Clock className="w-3 h-3 text-gray-500 mr-1" />
                              <span className="text-xs text-gray-600">
                                {schedule.time_window}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              schedule.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : schedule.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : schedule.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {schedule.status}
                            </div>
                            {schedule.technician && (
                              <span className="text-xs text-gray-500 mt-1">
                                {schedule.technician.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      </div>
      
      {/* Filter drawer */}
      {filterDrawerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex justify-end z-50">
          <div className="bg-white w-96 h-full overflow-y-auto shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Filters</h2>
              <button 
                onClick={() => setFilterDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Technician filter */}
              <div>
                <h3 className="font-medium mb-2 flex items-center">
                  <User className="w-4 h-4 mr-1.5" />
                  Technicians
                </h3>
                <div className="space-y-1">
                  {technicians.map(tech => (
                    <label key={tech.id} className="flex items-center">
                      <input 
                        type="checkbox"
                        checked={filters.technicians.includes(tech.id)}
                        onChange={e => {
                          const newTechs = e.target.checked
                            ? [...filters.technicians, tech.id]
                            : filters.technicians.filter(id => id !== tech.id);
                          setFilters({...filters, technicians: newTechs});
                        }}
                        className="mr-2"
                      />
                      {tech.full_name}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Job Type filter */}
              <div>
                <h3 className="font-medium mb-2 flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Job Types
                </h3>
                <div className="space-y-1">
                  {['regular_service', 'filter_clean', 'salt_cell_clean', 'repair'].map(type => (
                    <label key={type} className="flex items-center">
                      <input 
                        type="checkbox"
                        checked={filters.job_types.includes(type)}
                        onChange={e => {
                          const newTypes = e.target.checked
                            ? [...filters.job_types, type]
                            : filters.job_types.filter(t => t !== type);
                          setFilters({...filters, job_types: newTypes});
                        }}
                        className="mr-2"
                      />
                      {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Status filter */}
              <div>
                <h3 className="font-medium mb-2">Status</h3>
                <div className="space-y-1">
                  {['scheduled', 'in_progress', 'completed', 'cancelled'].map(status => (
                    <label key={status} className="flex items-center">
                      <input 
                        type="checkbox"
                        checked={filters.statuses.includes(status)}
                        onChange={e => {
                          const newStatuses = e.target.checked
                            ? [...filters.statuses, status]
                            : filters.statuses.filter(s => s !== status);
                          setFilters({...filters, statuses: newStatuses});
                        }}
                        className="mr-2"
                      />
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Customer Tags filter */}
              <div>
                <h3 className="font-medium mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-1.5" />
                  Customer Tags
                </h3>
                <div className="space-y-1">
                  {['VIP', 'New', 'Seasonal', 'Commercial', 'Residential'].map(tag => (
                    <label key={tag} className="flex items-center">
                      <input 
                        type="checkbox"
                        checked={filters.customer_tags.includes(tag)}
                        onChange={e => {
                          const newTags = e.target.checked
                            ? [...filters.customer_tags, tag]
                            : filters.customer_tags.filter(t => t !== tag);
                          setFilters({...filters, customer_tags: newTags});
                        }}
                        className="mr-2"
                      />
                      {tag}
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex space-x-2 pt-4">
                <button 
                  onClick={handleApplyFilters}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex-1"
                >
                  Apply Filters
                </button>
                <button 
                  onClick={handleResetFilters}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md"
                >
                  Reset
                </button>
              </div>
              
              {/* Saved views */}
              {views.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-medium mb-2">Saved Views</h3>
                  <div className="space-y-1">
                    {views.map(view => (
                      <button
                        key={view.id}
                        onClick={() => handleSetActiveView(view)}
                        className={`block w-full text-left px-3 py-2 rounded-md ${
                          activeView?.id === view.id 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {view.name}
                        {view.is_default && (
                          <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Save view dialog */}
      {showSaveView && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white w-96 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Save View</h2>
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">View Name</label>
              <input 
                type="text"
                value={newViewName}
                onChange={e => setNewViewName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="My Custom View"
              />
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={handleSaveView}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex-1"
              >
                Save
              </button>
              <button 
                onClick={() => setShowSaveView(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 