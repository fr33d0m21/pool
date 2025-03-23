import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardCard } from '../../components/DashboardCard';
import { 
  Calendar, 
  Clock, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  ChevronDown, 
  Search, 
  FileText, 
  UserCircle,
  Droplet,
  BarChart2,
  ArrowRight,
  Clipboard,
  Tag,
  AlertCircle,
  Settings,
  ListChecks
} from 'lucide-react';
import { Chart } from 'chart.js/auto';

// Enums and Types
type JobType = 'route_stop' | 'one_time' | 'maintenance' | 'repair' | 'chemical_balance' | 'equipment_install';
type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Job template interface
interface JobTemplate {
  id: string;
  name: string;
  description?: string;
  job_type: JobType;
  estimated_duration: number;
  default_price?: number;
  is_billable: boolean;
  required_services: string[];
  suggested_services: string[];
  chemical_check: boolean;
  equipment_check: boolean;
}

// Job interface
interface Job {
  id: string;
  job_number: string;
  customer_id: string;
  water_body_id?: string;
  technician_id?: string;
  job_template_id?: string;
  schedule_id?: string;
  job_type: JobType;
  title: string;
  description?: string;
  status: JobStatus;
  date: string;
  start_time?: string;
  end_time?: string;
  estimated_duration?: number;
  actual_duration?: number;
  is_billable: boolean;
  price?: number;
  notes?: string;
  checklist_completed: boolean;
  invoice_id?: string;
  invoice_generated: boolean;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
  };
  technician?: {
    id: string;
    full_name: string;
  };
  water_body?: {
    id: string;
    type: string;
    volume_gallons?: number;
  };
  services?: JobService[];
  workflow?: JobWorkflow;
  chemical_logs?: ChemicalLog[];
}

// Job service interface
interface JobService {
  id: string;
  job_id: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_billable: boolean;
  notes?: string;
  service?: {
    id: string;
    name: string;
    description?: string;
    price: number;
  };
}

// Service interface
interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimated_duration?: number;
  category?: string;
}

// Workflow interface
interface Workflow {
  id: string;
  job_template_id?: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  equipment_condition?: any;
  step_dependencies?: any;
}

// Workflow step interface
interface WorkflowStep {
  step: number;
  name: string;
  description?: string;
  required: boolean;
}

// Job workflow interface
interface JobWorkflow {
  id: string;
  job_id: string;
  workflow_id: string;
  current_step: number;
  completed_steps: number[];
  skipped_steps: number[];
  notes?: any;
  is_completed: boolean;
  workflow?: Workflow;
}

// Chemical log interface
interface ChemicalLog {
  id: string;
  job_id?: string;
  water_body_id: string;
  technician_id?: string;
  reading_date: string;
  ph?: number;
  free_chlorine?: number;
  total_chlorine?: number;
  alkalinity?: number;
  calcium_hardness?: number;
  cyanuric_acid?: number;
  total_dissolved_solids?: number;
  temperature?: number;
  salt_level?: number;
  phosphates?: number;
  notes?: string;
  dosing?: ChemicalDosing[];
}

// Chemical dosing interface
interface ChemicalDosing {
  id: string;
  job_id?: string;
  chemical_log_id?: string;
  water_body_id: string;
  technician_id?: string;
  chemical_type: string;
  dosage_amount: number;
  dosage_unit: string;
  target_parameter: string;
  initial_value?: number;
  target_value?: number;
  achieved_value?: number;
  is_completed: boolean;
}

// Chemical target interface
interface ChemicalTarget {
  id: string;
  water_body_id: string;
  parameter: string;
  min_value: number;
  max_value: number;
  ideal_value?: number;
}

// Main component
export function AdminJobs() {
  // State for job list
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // State for creating/editing jobs
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Job>>({});
  
  // State for job services and workflow
  const [jobServices, setJobServices] = useState<JobService[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<JobWorkflow | null>(null);
  
  // State for chemical logs
  const [chemicalLogs, setChemicalLogs] = useState<ChemicalLog[]>([]);
  
  // State for templates and services
  const [jobTemplates, setJobTemplates] = useState<JobTemplate[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  
  // State for filters
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<JobType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  // Chart refs
  const chemicalChartRef = useRef<HTMLCanvasElement>(null);
  const chemicalChartInstance = useRef<Chart | null>(null);
  
  // Fetch jobs on component mount
  useEffect(() => {
    fetchJobs();
    fetchJobTemplates();
    fetchServices();
    fetchWorkflows();
  }, []);
  
  // Clean up chart on unmount
  useEffect(() => {
    return () => {
      if (chemicalChartInstance.current) {
        chemicalChartInstance.current.destroy();
      }
    };
  }, []);

  // Fetch jobs from Supabase
  const fetchJobs = async () => {
    try {
      setLoading(true);
      
      // Construct query based on filters
      let query = supabase
        .from('jobs')
        .select(`
          *,
          customer:users(id, full_name, email, phone),
          technician:technicians(id, full_name),
          water_body:water_bodies(id, type, volume_gallons),
          services:job_services(
            *,
            service:services(id, name, description, price)
          )
        `)
        .order('date', { ascending: false });
      
      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Apply type filter if not 'all'
      if (typeFilter !== 'all') {
        query = query.eq('job_type', typeFilter);
      }
      
      // Apply date filter if provided
      if (dateFilter) {
        query = query.eq('date', dateFilter);
      }
      
      // Apply search term if present
      if (searchTerm) {
        query = query.or(
          `job_number.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`
        );
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      if (data) setJobs(data);
      
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch job templates
  const fetchJobTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('job_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      if (data) setJobTemplates(data);
      
    } catch (error) {
      console.error('Error fetching job templates:', error);
    }
  };
  
  // Fetch services
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      
      if (error) throw error;
      if (data) setServices(data);
      
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };
  
  // Fetch workflows
  const fetchWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*');
      
      if (error) throw error;
      if (data) setWorkflows(data);
      
    } catch (error) {
      console.error('Error fetching workflows:', error);
    }
  };
  
  // Fetch job details with workflow and chemical logs
  const fetchJobDetails = async (jobId: string) => {
    try {
      // Fetch job with workflow
      const { data: jobWorkflow, error: workflowError } = await supabase
        .from('job_workflows')
        .select(`
          *,
          workflow:workflows(*)
        `)
        .eq('job_id', jobId)
        .maybeSingle();
      
      if (workflowError) throw workflowError;
      
      // Fetch chemical logs
      const { data: chemLogs, error: chemError } = await supabase
        .from('chemical_logs')
        .select(`
          *,
          dosing:chemical_dosing(*)
        `)
        .eq('job_id', jobId)
        .order('reading_date', { ascending: false });
      
      if (chemError) throw chemError;
      
      // Update current workflow and chemical logs
      setCurrentWorkflow(jobWorkflow || null);
      setChemicalLogs(chemLogs || []);
      
      return { workflow: jobWorkflow, chemicalLogs: chemLogs };
    } catch (error) {
      console.error('Error fetching job details:', error);
      return null;
    }
  };
  
  // Handle job selection
  const handleSelectJob = async (job: Job) => {
    setSelectedJob(job);
    await fetchJobDetails(job.id);
  };
  
  // Format currency
  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format time
  const formatTime = (timeString?: string) => {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Format duration in minutes to hours and minutes
  const formatDuration = (minutes?: number) => {
    if (!minutes) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };
  
  // Get status badge class
  const getStatusBadgeClass = (status: JobStatus) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get job type badge class
  const getJobTypeBadgeClass = (type: JobType) => {
    switch (type) {
      case 'route_stop':
        return 'bg-purple-100 text-purple-800';
      case 'one_time':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'repair':
        return 'bg-red-100 text-red-800';
      case 'chemical_balance':
        return 'bg-teal-100 text-teal-800';
      case 'equipment_install':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Render job list or detail view
  return (
    <div className="admin-jobs">
      {selectedJob ? (
        <JobDetailView 
          job={selectedJob}
          workflow={currentWorkflow}
          chemicalLogs={chemicalLogs}
          onBack={() => {
            setSelectedJob(null);
            setCurrentWorkflow(null);
            setChemicalLogs([]);
          }}
          onRefresh={() => {
            fetchJobs();
            if (selectedJob) {
              fetchJobDetails(selectedJob.id);
            }
          }}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          formatTime={formatTime}
          formatDuration={formatDuration}
          getStatusBadgeClass={getStatusBadgeClass}
        />
      ) : isCreating || isEditing ? (
        <JobFormView 
          formData={formData}
          jobServices={jobServices}
          jobTemplates={jobTemplates}
          services={services}
          workflows={workflows}
          isEditing={isEditing}
          onCancel={() => {
            setIsCreating(false);
            setIsEditing(false);
          }}
          onSave={fetchJobs}
          formatCurrency={formatCurrency}
        />
      ) : (
        <JobListView 
          jobs={jobs}
          loading={loading}
          statusFilter={statusFilter}
          typeFilter={typeFilter}
          searchTerm={searchTerm}
          dateFilter={dateFilter}
          onStatusFilterChange={setStatusFilter}
          onTypeFilterChange={setTypeFilter}
          onSearchTermChange={setSearchTerm}
          onDateFilterChange={setDateFilter}
          onSearch={fetchJobs}
          onCreateJob={() => {
            setFormData({
              job_type: 'one_time',
              status: 'scheduled',
              is_billable: true,
              checklist_completed: false,
              invoice_generated: false,
              date: new Date().toISOString().split('T')[0]
            });
            setJobServices([]);
            setIsCreating(true);
            setIsEditing(false);
          }}
          onSelectJob={handleSelectJob}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          formatDuration={formatDuration}
          getStatusBadgeClass={getStatusBadgeClass}
          getJobTypeBadgeClass={getJobTypeBadgeClass}
        />
      )}
    </div>
  );
}

// Job List View Component
function JobListView({
  jobs,
  loading,
  statusFilter,
  typeFilter,
  searchTerm,
  dateFilter,
  onStatusFilterChange,
  onTypeFilterChange,
  onSearchTermChange,
  onDateFilterChange,
  onSearch,
  onCreateJob,
  onSelectJob,
  formatCurrency,
  formatDate,
  formatDuration,
  getStatusBadgeClass,
  getJobTypeBadgeClass
}: {
  jobs: Job[];
  loading: boolean;
  statusFilter: JobStatus | 'all';
  typeFilter: JobType | 'all';
  searchTerm: string;
  dateFilter: string;
  onStatusFilterChange: (status: JobStatus | 'all') => void;
  onTypeFilterChange: (type: JobType | 'all') => void;
  onSearchTermChange: (term: string) => void;
  onDateFilterChange: (date: string) => void;
  onSearch: () => void;
  onCreateJob: () => void;
  onSelectJob: (job: Job) => void;
  formatCurrency: (amount?: number) => string;
  formatDate: (date?: string) => string;
  formatDuration: (minutes?: number) => string;
  getStatusBadgeClass: (status: JobStatus) => string;
  getJobTypeBadgeClass: (type: JobType) => string;
}) {
  // Process jobs data for UI rendering
  const routeStopJobs = jobs.filter(job => job.job_type === 'route_stop');
  const oneTimeJobs = jobs.filter(job => job.job_type !== 'route_stop');
  
  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Jobs</h1>
        
        <button
          onClick={onCreateJob}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Job
        </button>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              placeholder="Search jobs..."
              className="w-full border border-gray-300 rounded-md py-2 pl-10 pr-4"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as JobStatus | 'all')}
              className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-4 pr-10 w-full"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
          </div>
          
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value as JobType | 'all')}
              className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-4 pr-10 w-full"
            >
              <option value="all">All Job Types</option>
              <option value="route_stop">Route Stop</option>
              <option value="one_time">One-Time</option>
              <option value="maintenance">Maintenance</option>
              <option value="repair">Repair</option>
              <option value="chemical_balance">Chemical Balance</option>
              <option value="equipment_install">Equipment Install</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-3 pointer-events-none" />
          </div>
          
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md py-2 px-3"
            />
          </div>
          
          <div>
            <button
              onClick={onSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md w-full flex items-center justify-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>
      
      {/* Route Stop Jobs Section */}
      <DashboardCard 
        title={
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-purple-600 mr-2" />
            <span>Route Stop Jobs</span>
            <span className="ml-2 bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {routeStopJobs.length}
            </span>
          </div>
        } 
        fullWidth
        loading={loading}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Technician
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {routeStopJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No route stop jobs found
                  </td>
                </tr>
              ) : (
                routeStopJobs.map(job => (
                  <tr 
                    key={job.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onSelectJob(job)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {job.job_number}
                          </div>
                          <div className="text-sm text-gray-500">
                            {job.title}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {job.customer?.full_name || 'Unknown Customer'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {job.water_body?.type || 'Unknown Pool Type'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(job.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {job.technician?.full_name || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(job.estimated_duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(job.status)}`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>
      
      {/* One-Time and Other Jobs Section */}
      <div className="mt-6">
        <DashboardCard 
          title={
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-blue-600 mr-2" />
              <span>One-Time & Maintenance Jobs</span>
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {oneTimeJobs.length}
              </span>
            </div>
          } 
          fullWidth
          loading={loading}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Technician
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {oneTimeJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No one-time jobs found
                    </td>
                  </tr>
                ) : (
                  oneTimeJobs.map(job => (
                    <tr 
                      key={job.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => onSelectJob(job)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {job.job_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              {job.title}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {job.customer?.full_name || 'Unknown Customer'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {job.water_body?.type || 'Unknown Pool Type'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getJobTypeBadgeClass(job.job_type)}`}>
                          {job.job_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(job.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {job.technician?.full_name || 'Unassigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(job.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(job.status)}`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </div>
    </>
  );
}

// Job Detail View Component
function JobDetailView({
  job,
  workflow,
  chemicalLogs,
  onBack,
  onRefresh,
  formatCurrency,
  formatDate,
  formatTime,
  formatDuration,
  getStatusBadgeClass
}: {
  job: Job;
  workflow: JobWorkflow | null;
  chemicalLogs: ChemicalLog[];
  onBack: () => void;
  onRefresh: () => void;
  formatCurrency: (amount?: number) => string;
  formatDate: (date?: string) => string;
  formatTime: (time?: string) => string;
  formatDuration: (minutes?: number) => string;
  getStatusBadgeClass: (status: JobStatus) => string;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'workflow' | 'chemicals'>('details');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  
  const chemChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  
  // When the component mounts or chemical logs/active tab change, create the chart
  useEffect(() => {
    if (activeTab === 'chemicals' && chemicalLogs.length > 0 && chemChartRef.current) {
      createChemicalChart();
    }
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [activeTab, chemicalLogs]);
  
  // Update job status
  const updateJobStatus = async (status: JobStatus) => {
    try {
      setUpdateLoading(true);
      
      const updateData: Partial<Job> = { status };
      
      // If completing the job, set end time
      if (status === 'completed') {
        updateData.end_time = new Date().toISOString();
        
        // Calculate actual duration if we have a start time
        if (job.start_time) {
          const startTime = new Date(job.start_time).getTime();
          const endTime = new Date().getTime();
          const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
          updateData.actual_duration = durationMinutes;
        }
      }
      
      // If starting the job, set start time
      if (status === 'in_progress' && !job.start_time) {
        updateData.start_time = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', job.id);
      
      if (error) throw error;
      
      onRefresh();
    } catch (error) {
      console.error('Error updating job status:', error);
    } finally {
      setUpdateLoading(false);
    }
  };
  
  // Update workflow step status
  const updateWorkflowStep = async (stepNumber: number, completed: boolean) => {
    if (!workflow) return;
    
    try {
      setUpdateLoading(true);
      
      let completedSteps = [...workflow.completed_steps];
      
      if (completed) {
        // Add to completed steps if not already there
        if (!completedSteps.includes(stepNumber)) {
          completedSteps.push(stepNumber);
        }
      } else {
        // Remove from completed steps
        completedSteps = completedSteps.filter(step => step !== stepNumber);
      }
      
      // Sort completed steps
      completedSteps.sort((a, b) => a - b);
      
      // Check if this completes the workflow
      const workflowSteps = workflow.workflow?.steps || [];
      const requiredSteps = workflowSteps
        .filter(step => step.required)
        .map(step => step.step);
      
      const isCompleted = requiredSteps.every(step => completedSteps.includes(step));
      
      const { error } = await supabase
        .from('job_workflows')
        .update({
          completed_steps: completedSteps,
          current_step: completed ? Math.max(...completedSteps, stepNumber + 1) : stepNumber,
          is_completed: isCompleted
        })
        .eq('id', workflow.id);
      
      if (error) throw error;
      
      // If workflow is completed, also mark the job checklist as completed
      if (isCompleted) {
        await supabase
          .from('jobs')
          .update({ checklist_completed: true })
          .eq('id', job.id);
      }
      
      onRefresh();
    } catch (error) {
      console.error('Error updating workflow step:', error);
    } finally {
      setUpdateLoading(false);
    }
  };
  
  // Create chemical chart
  const createChemicalChart = () => {
    if (!chemChartRef.current || chemicalLogs.length === 0) return;
    
    // Destroy existing chart if any
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    // Prepare data for chart
    const sortedLogs = [...chemicalLogs].sort((a, b) => 
      new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime()
    );
    
    const dates = sortedLogs.map(log => formatDate(log.reading_date));
    
    const phData = sortedLogs.map(log => log.ph || null);
    const chlorineData = sortedLogs.map(log => log.free_chlorine || null);
    const alkalinityData = sortedLogs.map(log => log.alkalinity ? log.alkalinity / 100 : null); // Scale down for chart
    
    // Create new chart
    chartInstance.current = new Chart(chemChartRef.current, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'pH',
            data: phData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.2,
            yAxisID: 'y'
          },
          {
            label: 'Free Chlorine (ppm)',
            data: chlorineData,
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.2,
            yAxisID: 'y'
          },
          {
            label: 'Alkalinity (ppm ÷ 100)',
            data: alkalinityData,
            borderColor: 'rgb(245, 158, 11)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.2,
            yAxisID: 'y'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                
                if (label.includes('Alkalinity') && value !== null) {
                  return `${label}: ${value * 100}`;
                }
                
                return `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          y: {
            title: {
              display: true,
              text: 'Value'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        }
      }
    });
  };
  
  // Get chemical status class - determines if value is in target range
  const getChemicalStatusClass = (value: number | undefined, parameter: string) => {
    if (value === undefined) return 'bg-gray-100 text-gray-500';
    
    // Default ranges if not specified
    const ranges = {
      ph: { min: 7.2, max: 7.8 },
      free_chlorine: { min: 1, max: 3 },
      total_chlorine: { min: 1, max: 3 },
      alkalinity: { min: 80, max: 120 },
      calcium_hardness: { min: 200, max: 400 },
      cyanuric_acid: { min: 30, max: 50 },
      total_dissolved_solids: { min: 0, max: 1500 }
    };
    
    // Access correct range based on parameter
    const range = ranges[parameter as keyof typeof ranges];
    if (!range) return 'bg-gray-100 text-gray-500';
    
    if (value < range.min) return 'bg-blue-100 text-blue-800'; // Low
    if (value > range.max) return 'bg-red-100 text-red-800'; // High
    return 'bg-green-100 text-green-800'; // In range
  };
  
  return (
    <div>
      {/* Header with actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="mr-4 text-gray-500 hover:text-gray-700"
          >
            &larr; Back to jobs
          </button>
          <h1 className="text-2xl font-bold text-gray-800">
            Job {job.job_number}
          </h1>
          <span className={`ml-4 px-2 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(job.status)}`}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {job.status !== 'completed' && job.status !== 'cancelled' && (
            <>
              {job.status === 'scheduled' && (
                <button
                  onClick={() => updateJobStatus('in_progress')}
                  disabled={updateLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  {updateLoading ? 'Updating...' : 'Start Job'}
                </button>
              )}
              
              {job.status === 'in_progress' && (
                <button
                  onClick={() => updateJobStatus('completed')}
                  disabled={updateLoading || (workflow && !workflow.is_completed)}
                  className={`${workflow && !workflow.is_completed ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-md flex items-center`}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {updateLoading ? 'Updating...' : 'Complete Job'}
                </button>
              )}
              
              <button
                onClick={() => updateJobStatus('cancelled')}
                disabled={updateLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
              >
                <X className="w-4 h-4 mr-2" />
                {updateLoading ? 'Updating...' : 'Cancel Job'}
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Job Details
          </button>
          
          {workflow && (
            <button
              onClick={() => setActiveTab('workflow')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'workflow'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Workflow
              {workflow && !workflow.is_completed && (
                <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  In Progress
                </span>
              )}
              {workflow && workflow.is_completed && (
                <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  Complete
                </span>
              )}
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('chemicals')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'chemicals'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Chemical Logs
            {chemicalLogs.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {chemicalLogs.length}
              </span>
            )}
          </button>
        </nav>
      </div>
      
      {/* Content based on active tab */}
      <div className="mt-6">
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Job Information */}
            <div className="md:col-span-2">
              <DashboardCard title="Job Information" fullWidth>
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2">{job.title}</h2>
                  {job.description && (
                    <p className="text-gray-600 mb-4">{job.description}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Job Details</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm text-gray-500">Job Type:</div>
                        <div className="text-sm font-medium">
                          {job.job_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </div>
                        
                        <div className="text-sm text-gray-500">Scheduled Date:</div>
                        <div className="text-sm font-medium">{formatDate(job.date)}</div>
                        
                        <div className="text-sm text-gray-500">Start Time:</div>
                        <div className="text-sm font-medium">{job.start_time ? formatTime(job.start_time) : 'Not started'}</div>
                        
                        <div className="text-sm text-gray-500">End Time:</div>
                        <div className="text-sm font-medium">{job.end_time ? formatTime(job.end_time) : 'Not completed'}</div>
                        
                        <div className="text-sm text-gray-500">Est. Duration:</div>
                        <div className="text-sm font-medium">{formatDuration(job.estimated_duration)}</div>
                        
                        <div className="text-sm text-gray-500">Actual Duration:</div>
                        <div className="text-sm font-medium">{job.actual_duration ? formatDuration(job.actual_duration) : 'N/A'}</div>
                        
                        <div className="text-sm text-gray-500">Billable:</div>
                        <div className="text-sm font-medium">{job.is_billable ? 'Yes' : 'No'}</div>
                        
                        <div className="text-sm text-gray-500">Price:</div>
                        <div className="text-sm font-medium">{formatCurrency(job.price)}</div>
                        
                        <div className="text-sm text-gray-500">Invoice:</div>
                        <div className="text-sm font-medium">
                          {job.invoice_generated ? (
                            <span className="text-green-600">Generated</span>
                          ) : (
                            <span className="text-gray-500">Not generated</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Customer & Location</p>
                      <p className="font-medium">{job.customer?.full_name || 'Unknown Customer'}</p>
                      {job.customer?.email && (
                        <p className="text-sm text-gray-600">{job.customer.email}</p>
                      )}
                      {job.customer?.phone && (
                        <p className="text-sm text-gray-600">{job.customer.phone}</p>
                      )}
                      
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-1">Water Body</p>
                        <p className="text-sm">{job.water_body?.type || 'Unknown Type'}</p>
                        {job.water_body?.volume_gallons && (
                          <p className="text-sm text-gray-600">{job.water_body.volume_gallons.toLocaleString()} gallons</p>
                        )}
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-1">Technician</p>
                        <p className="text-sm font-medium">{job.technician?.full_name || 'Unassigned'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {job.notes && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-1">Notes</p>
                      <p className="text-sm bg-gray-50 p-3 rounded">{job.notes}</p>
                    </div>
                  )}
                </div>
              </DashboardCard>
              
              {/* Services */}
              <div className="mt-6">
                <DashboardCard title="Services & Materials" fullWidth>
                  <div className="p-4">
                    {job.services && job.services.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Service
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantity
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Unit Price
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Billable
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {job.services.map(service => (
                              <tr key={service.id}>
                                <td className="px-6 py-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {service.service?.name || 'Unknown Service'}
                                  </div>
                                  {service.notes && (
                                    <div className="text-sm text-gray-500">{service.notes}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-gray-500">
                                  {service.quantity}
                                </td>
                                <td className="px-6 py-4 text-right text-sm text-gray-500">
                                  {formatCurrency(service.unit_price)}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                                  {formatCurrency(service.total_price)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {service.is_billable ? (
                                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                                  ) : (
                                    <X className="w-5 h-5 text-red-500 mx-auto" />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                                Total
                              </td>
                              <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                                {formatCurrency(job.services.reduce((sum, service) => sum + service.total_price, 0))}
                              </td>
                              <td></td>
                            </tr>
                            <tr>
                              <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                                Billable Total
                              </td>
                              <td className="px-6 py-3 text-right text-sm font-bold text-green-600">
                                {formatCurrency(job.services.filter(s => s.is_billable).reduce((sum, service) => sum + service.total_price, 0))}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No services added to this job</p>
                    )}
                  </div>
                </DashboardCard>
              </div>
            </div>
            
            {/* Job Status and Actions */}
            <div>
              <DashboardCard title="Job Status" fullWidth>
                <div className="p-4">
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Current Status</p>
                    <div className={`px-3 py-2 rounded-md ${getStatusBadgeClass(job.status)}`}>
                      <span className="font-medium">
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Checklist completed</span>
                      <span>
                        {job.checklist_completed ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Invoice generated</span>
                      <span>
                        {job.invoice_generated ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </span>
                    </div>
                    
                    {job.status === 'completed' && !job.invoice_generated && job.is_billable && (
                      <button className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded">
                        Generate Invoice
                      </button>
                    )}
                  </div>
                </div>
              </DashboardCard>
              
              {job.invoice_id && (
                <div className="mt-4">
                  <DashboardCard title="Invoice" fullWidth>
                    <div className="p-4">
                      <p className="text-sm">Invoice has been generated for this job.</p>
                      <button className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded w-full">
                        View Invoice
                      </button>
                    </div>
                  </DashboardCard>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'workflow' && workflow && (
          <DashboardCard title={`Workflow: ${workflow.workflow?.name || 'Job Workflow'}`} fullWidth>
            <div className="p-4">
              {workflow.workflow?.steps.map((step, index) => (
                <div 
                  key={step.step} 
                  className={`border rounded-lg mb-3 ${
                    workflow.completed_steps.includes(step.step) 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div 
                    className={`flex items-center justify-between p-4 cursor-pointer ${
                      workflow.completed_steps.includes(step.step) 
                        ? 'bg-green-50' 
                        : 'bg-gray-50'
                    }`}
                    onClick={() => setExpandedStep(expandedStep === step.step ? null : step.step)}
                  >
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                        workflow.completed_steps.includes(step.step) 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {workflow.completed_steps.includes(step.step) ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <span>{step.step}</span>
                        )}
                      </div>
                      <div>
                        <h3 className={`font-medium ${
                          workflow.completed_steps.includes(step.step) 
                            ? 'text-green-700' 
                            : 'text-gray-800'
                        }`}>
                          {step.name}
                          {step.required && (
                            <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">Required</span>
                          )}
                        </h3>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 transform transition-transform ${
                      expandedStep === step.step ? 'rotate-180' : ''
                    }`} />
                  </div>
                  
                  {expandedStep === step.step && (
                    <div className="p-4 border-t border-gray-200">
                      {step.description && (
                        <p className="text-gray-600 mb-4">{step.description}</p>
                      )}
                      
                      {job.status === 'in_progress' && (
                        <div className="flex justify-end space-x-2 mt-2">
                          {workflow.completed_steps.includes(step.step) ? (
                            <button
                              onClick={() => updateWorkflowStep(step.step, false)}
                              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded"
                            >
                              Mark as Incomplete
                            </button>
                          ) : (
                            <button
                              onClick={() => updateWorkflowStep(step.step, true)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                            >
                              Mark as Complete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {workflow.workflow?.steps && workflow.workflow.steps.length > 0 && (
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>Progress</span>
                    <span className="font-medium">
                      {workflow.completed_steps.length} / {workflow.workflow.steps.length} steps completed
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ width: `${(workflow.completed_steps.length / workflow.workflow.steps.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </DashboardCard>
        )}
        
        {activeTab === 'chemicals' && (
          <div className="space-y-6">
            {/* Chemical Chart */}
            <DashboardCard title="Chemical Trends" fullWidth>
              <div className="p-4">
                {chemicalLogs.length > 0 ? (
                  <div style={{ height: '300px' }}>
                    <canvas ref={chemChartRef}></canvas>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No chemical logs recorded for this job</p>
                )}
              </div>
            </DashboardCard>
            
            {/* Chemical Logs */}
            <DashboardCard title="Chemical Readings" fullWidth>
              <div className="p-4">
                {chemicalLogs.length > 0 ? (
                  <div className="space-y-6">
                    {chemicalLogs.map((log, index) => (
                      <div key={log.id} className="border rounded-lg">
                        <div className="bg-gray-50 p-4 rounded-t-lg">
                          <div className="flex justify-between items-center">
                            <h3 className="font-medium">
                              Reading on {formatDate(log.reading_date)} at {formatTime(log.reading_date)}
                            </h3>
                            {index === 0 && (
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                Latest Reading
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="border rounded p-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-500">pH</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getChemicalStatusClass(log.ph, 'ph')}`}>
                                  {log.ph || 'N/A'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">Target: 7.2-7.8</div>
                            </div>
                            
                            <div className="border rounded p-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-500">Free Chlorine</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getChemicalStatusClass(log.free_chlorine, 'free_chlorine')}`}>
                                  {log.free_chlorine || 'N/A'} ppm
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">Target: 1-3 ppm</div>
                            </div>
                            
                            <div className="border rounded p-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-500">Total Chlorine</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getChemicalStatusClass(log.total_chlorine, 'total_chlorine')}`}>
                                  {log.total_chlorine || 'N/A'} ppm
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">Target: 1-3 ppm</div>
                            </div>
                            
                            <div className="border rounded p-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-500">Alkalinity</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getChemicalStatusClass(log.alkalinity, 'alkalinity')}`}>
                                  {log.alkalinity || 'N/A'} ppm
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">Target: 80-120 ppm</div>
                            </div>
                            
                            <div className="border rounded p-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-500">Calcium Hardness</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getChemicalStatusClass(log.calcium_hardness, 'calcium_hardness')}`}>
                                  {log.calcium_hardness || 'N/A'} ppm
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">Target: 200-400 ppm</div>
                            </div>
                            
                            <div className="border rounded p-3">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm text-gray-500">Temperature</span>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                                  {log.temperature || 'N/A'}°F
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Chemical Dosing */}
                          {log.dosing && log.dosing.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-medium text-gray-700 mb-2">Chemical Treatments</h4>
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Chemical
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Target Parameter
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Initial → Target
                                      </th>
                                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Completed
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {log.dosing.map(dose => (
                                      <tr key={dose.id}>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          <div className="text-sm font-medium text-gray-900">
                                            {dose.chemical_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          <div className="text-sm text-gray-900">
                                            {dose.dosage_amount} {dose.dosage_unit}
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          <div className="text-sm text-gray-900">
                                            {dose.target_parameter}
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          <div className="text-sm text-gray-900">
                                            {dose.initial_value} → {dose.target_value}
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-center">
                                          {dose.is_completed ? (
                                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                                          ) : (
                                            <X className="w-5 h-5 text-red-500 mx-auto" />
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          
                          {log.notes && (
                            <div className="mt-4">
                              <h4 className="font-medium text-gray-700 mb-1">Notes</h4>
                              <p className="text-sm bg-gray-50 p-3 rounded">{log.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No chemical logs recorded for this job</p>
                )}
              </div>
            </DashboardCard>
          </div>
        )}
      </div>
    </div>
  );
}

// Job Form View Component
function JobFormView({
  formData,
  jobServices,
  jobTemplates,
  services,
  workflows,
  isEditing,
  onCancel,
  onSave,
  formatCurrency
}: {
  formData: Partial<Job>;
  jobServices: JobService[];
  jobTemplates: JobTemplate[];
  services: Service[];
  workflows: Workflow[];
  isEditing: boolean;
  onCancel: () => void;
  onSave: () => void;
  formatCurrency: (amount?: number) => string;
}) {
  const [form, setForm] = useState<Partial<Job>>(formData);
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(null);
  const [items, setItems] = useState<JobService[]>(jobServices);
  const [customers, setCustomers] = useState<{id: string; full_name: string}[]>([]);
  const [waterBodies, setWaterBodies] = useState<{id: string; type: string; user_id: string}[]>([]);
  const [technicians, setTechnicians] = useState<{id: string; full_name: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  // Service being edited
  const [editingService, setEditingService] = useState<JobService | null>(null);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceForm, setServiceForm] = useState<Partial<JobService>>({
    quantity: 1,
    unit_price: 0,
    total_price: 0,
    is_billable: true
  });
  
  // Fetch data on mount
  useEffect(() => {
    fetchCustomers();
    fetchTechnicians();
    
    // If editing, load water bodies for selected customer
    if (isEditing && form.customer_id) {
      fetchWaterBodies(form.customer_id);
    }
    
    // If we have a job template, populate form from it
    if (form.job_template_id) {
      const template = jobTemplates.find(t => t.id === form.job_template_id);
      if (template) {
        setSelectedTemplate(template);
        // Update form based on template default values
        setForm(prev => ({
          ...prev,
          job_type: template.job_type,
          estimated_duration: template.estimated_duration,
          price: template.default_price,
          is_billable: template.is_billable
        }));
      }
    }
  }, []);
  
  // Calculate service total when quantity or unit price changes
  useEffect(() => {
    if (serviceForm.quantity && serviceForm.unit_price) {
      setServiceForm({
        ...serviceForm,
        total_price: serviceForm.quantity * serviceForm.unit_price
      });
    }
  }, [serviceForm.quantity, serviceForm.unit_price]);
  
  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .order('full_name');
      
      if (error) throw error;
      if (data) setCustomers(data);
      
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };
  
  // Fetch water bodies for a customer
  const fetchWaterBodies = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('water_bodies')
        .select('id, type, user_id')
        .eq('user_id', customerId)
        .order('type');
      
      if (error) throw error;
      if (data) setWaterBodies(data);
      
    } catch (error) {
      console.error('Error fetching water bodies:', error);
    }
  };
  
  // Fetch technicians
  const fetchTechnicians = async () => {
    try {
      const { data, error } = await supabase
        .from('technicians')
        .select('id, full_name')
        .eq('active', true)
        .order('full_name');
      
      if (error) throw error;
      if (data) setTechnicians(data);
      
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };
  
  // Handle form change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for customer selection
    if (name === 'customer_id' && value) {
      fetchWaterBodies(value);
    }
    
    setForm({ ...form, [name]: value });
  };
  
  // Handle checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setForm({ ...form, [name]: checked });
  };
  
  // Handle number input change
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: parseFloat(value) || 0 });
  };
  
  // Handle template selection
  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (!templateId) {
      setSelectedTemplate(null);
      return;
    }
    
    const template = jobTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      
      // Update form based on template default values
      setForm(prev => ({
        ...prev,
        job_template_id: template.id,
        job_type: template.job_type,
        title: prev.title || template.name,
        description: prev.description || template.description,
        estimated_duration: template.estimated_duration,
        price: template.default_price,
        is_billable: template.is_billable
      }));
      
      // Add required services from template
      if (template.required_services && template.required_services.length > 0) {
        const requiredServices = template.required_services
          .map(serviceId => {
            const service = services.find(s => s.id === serviceId);
            if (!service) return null;
            
            return {
              id: `temp-${Date.now()}-${service.id}`,
              job_id: '',
              service_id: service.id,
              quantity: 1,
              unit_price: service.price || 0,
              total_price: service.price || 0,
              is_billable: true,
              service
            } as JobService;
          })
          .filter((s): s is JobService => s !== null);
        
        setItems(prev => [...prev, ...requiredServices]);
      }
    }
  };
  
  // Handle service selection
  const handleServiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value;
    if (!serviceId) return;
    
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setServiceForm({
        service_id: serviceId,
        quantity: 1,
        unit_price: service.price || 0,
        total_price: service.price || 0,
        is_billable: true,
        service
      });
    }
  };
  
  // Handle service form change
  const handleServiceFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setServiceForm({ ...serviceForm, [name]: value });
  };
  
  // Handle service checkbox change
  const handleServiceCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setServiceForm({ ...serviceForm, [name]: checked });
  };
  
  // Handle service number input change
  const handleServiceNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    
    if (name === 'quantity') {
      const totalPrice = numValue * (serviceForm.unit_price || 0);
      setServiceForm({ 
        ...serviceForm, 
        quantity: numValue,
        total_price: totalPrice
      });
    } else if (name === 'unit_price') {
      const totalPrice = (serviceForm.quantity || 1) * numValue;
      setServiceForm({ 
        ...serviceForm, 
        unit_price: numValue,
        total_price: totalPrice
      });
    } else {
      setServiceForm({ ...serviceForm, [name]: numValue });
    }
  };
  
  // Add or update service
  const handleAddUpdateService = () => {
    if (!serviceForm.service_id) {
      alert('Please select a service');
      return;
    }
    
    if (editingService) {
      // Update existing service
      const updatedItems = items.map(item => 
        item.id === editingService.id ? { ...serviceForm, id: item.id } as JobService : item
      );
      setItems(updatedItems);
    } else {
      // Add new service
      const newItem: JobService = {
        id: `temp-${Date.now()}`,
        job_id: form.id || '',
        service_id: serviceForm.service_id || '',
        quantity: serviceForm.quantity || 1,
        unit_price: serviceForm.unit_price || 0,
        total_price: serviceForm.total_price || 0,
        is_billable: serviceForm.is_billable || true,
        notes: serviceForm.notes,
        service: serviceForm.service
      };
      
      setItems([...items, newItem]);
    }
    
    // Reset form
    setServiceForm({
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      is_billable: true
    });
    
    setEditingService(null);
    setShowServiceForm(false);
    
    // Update job duration based on services
    updateJobDuration();
  };
  
  // Edit service
  const handleEditService = (service: JobService) => {
    setEditingService(service);
    setServiceForm(service);
    setShowServiceForm(true);
  };
  
  // Remove service
  const handleRemoveService = (serviceId: string) => {
    if (confirm('Are you sure you want to remove this service?')) {
      setItems(items.filter(item => item.id !== serviceId));
      
      // Update job duration based on remaining services
      updateJobDuration();
    }
  };
  
  // Update job duration based on services
  const updateJobDuration = () => {
    // Start with base duration from template
    let baseDuration = selectedTemplate?.estimated_duration || 30;
    
    // Add time for each service
    const servicesDuration = items.reduce((total, item) => {
      const service = item.service;
      if (service?.estimated_duration) {
        return total + (service.estimated_duration * (item.quantity || 1));
      }
      return total + 15; // Default 15 minutes per service
    }, 0);
    
    setForm(prev => ({
      ...prev,
      estimated_duration: baseDuration + servicesDuration
    }));
  };
  
  // Calculate total price
  const calculateTotalPrice = () => {
    return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };
  
  // Save job
  const handleSaveJob = async () => {
    try {
      setLoading(true);
      setSubmitError('');
      
      // Validate form
      if (!form.customer_id) {
        setSubmitError('Please select a customer');
        return;
      }
      
      if (!form.water_body_id) {
        setSubmitError('Please select a water body');
        return;
      }
      
      if (!form.title) {
        setSubmitError('Please enter a title');
        return;
      }
      
      if (!form.date) {
        setSubmitError('Please select a date');
        return;
      }
      
      // Calculate total from services
      const totalPrice = calculateTotalPrice();
      
      // Prepare job data
      const jobData = {
        ...form,
        price: totalPrice,
        updated_at: new Date().toISOString()
      };
      
      let jobId = form.id;
      
      if (isEditing) {
        // Update existing job
        const { error } = await supabase
          .from('jobs')
          .update(jobData)
          .eq('id', jobId);
        
        if (error) throw error;
        
      } else {
        // Generate job number
        const jobNumber = `J-${Date.now().toString().slice(-6)}`;
        
        // Create new job
        const { data, error } = await supabase
          .from('jobs')
          .insert({
            ...jobData,
            job_number: jobNumber,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        jobId = data.id;
      }
      
      // Handle services
      if (jobId) {
        // Delete existing services if editing
        if (isEditing) {
          await supabase
            .from('job_services')
            .delete()
            .eq('job_id', jobId);
        }
        
        // Insert services
        if (items.length > 0) {
          const servicesToInsert = items.map(item => ({
            job_id: jobId,
            service_id: item.service_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            is_billable: item.is_billable,
            notes: item.notes
          }));
          
          const { error: itemsError } = await supabase
            .from('job_services')
            .insert(servicesToInsert);
          
          if (itemsError) throw itemsError;
        }
        
        // Create job workflow if a template with workflow exists
        if (form.job_template_id && !isEditing) {
          // Find a workflow for this template
          const matchingWorkflow = workflows.find(w => w.job_template_id === form.job_template_id);
          
          if (matchingWorkflow) {
            const { error: workflowError } = await supabase
              .from('job_workflows')
              .insert({
                job_id: jobId,
                workflow_id: matchingWorkflow.id,
                current_step: 1,
                completed_steps: [],
                is_completed: false
              });
            
            if (workflowError) console.error('Error creating workflow:', workflowError);
          }
        }
        
        // Call update job duration function if available
        if (items.length > 0) {
          await supabase.rpc('update_job_duration_from_services', { job_uuid: jobId });
        }
        
        // Success!
        onSave();
      }
      
    } catch (error) {
      console.error('Error saving job:', error);
      setSubmitError('Error saving job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditing ? 'Edit Job' : 'Create New Job'}
        </h1>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onCancel}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSaveJob}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Check className="w-4 h-4 mr-2" />
            {loading ? 'Saving...' : isEditing ? 'Update Job' : 'Create Job'}
          </button>
        </div>
      </div>
      
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-6">
          {submitError}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Job Information */}
        <div className="md:col-span-2">
          <DashboardCard title="Job Information" fullWidth>
            <div className="p-4">
              {/* Job Template */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Template
                </label>
                <select
                  value={form.job_template_id || ''}
                  onChange={handleTemplateSelect}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                >
                  <option value="">Select a Template (Optional)</option>
                  {jobTemplates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.job_type.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedTemplate.description}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer*
                  </label>
                  <select
                    name="customer_id"
                    value={form.customer_id || ''}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Water Body*
                  </label>
                  <select
                    name="water_body_id"
                    value={form.water_body_id || ''}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                    required
                    disabled={!form.customer_id}
                  >
                    <option value="">Select Water Body</option>
                    {waterBodies.map(wb => (
                      <option key={wb.id} value={wb.id}>
                        {wb.type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title*
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={form.title || ''}
                    onChange={handleFormChange}
                    placeholder="Job Title"
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Technician
                  </label>
                  <select
                    name="technician_id"
                    value={form.technician_id || ''}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                  >
                    <option value="">Select Technician</option>
                    {technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>
                        {tech.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Type*
                  </label>
                  <select
                    name="job_type"
                    value={form.job_type || 'one_time'}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                    required
                  >
                    <option value="route_stop">Route Stop</option>
                    <option value="one_time">One-Time</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="repair">Repair</option>
                    <option value="chemical_balance">Chemical Balance</option>
                    <option value="equipment_install">Equipment Install</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date*
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={form.date ? form.date.split('T')[0] : ''}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status || 'scheduled'}
                    onChange={handleFormChange}
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description || ''}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  placeholder="Job description"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="estimated_duration"
                    min="0"
                    value={form.estimated_duration || 0}
                    onChange={handleNumberChange}
                    className="w-full border border-gray-300 rounded-md py-2 px-3"
                  />
                </div>
                
                <div>
                  <label className="flex items-center space-x-2 mt-7">
                    <input
                      type="checkbox"
                      name="is_billable"
                      checked={form.is_billable ?? true}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Is Billable</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={form.notes || ''}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  placeholder="Additional notes"
                />
              </div>
            </div>
          </DashboardCard>
          
          {/* Services */}
          <div className="mt-6">
            <DashboardCard 
              title={
                <div className="flex items-center justify-between">
                  <span>Services & Materials</span>
                  <button
                    onClick={() => {
                      setEditingService(null);
                      setServiceForm({
                        quantity: 1,
                        unit_price: 0,
                        total_price: 0,
                        is_billable: true
                      });
                      setShowServiceForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    + Add Service
                  </button>
                </div>
              }
              fullWidth
            >
              {showServiceForm && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium mb-3">
                    {editingService ? 'Edit Service' : 'Add New Service'}
                  </h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service
                    </label>
                    <select
                      value={serviceForm.service_id || ''}
                      onChange={handleServiceSelect}
                      className="w-full border border-gray-300 rounded-md py-2 px-3"
                      disabled={editingService !== null}
                    >
                      <option value="">Select a Service</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} - {formatCurrency(service.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        min="0.01"
                        step="0.01"
                        value={serviceForm.quantity || ''}
                        onChange={handleServiceNumberChange}
                        className="w-full border border-gray-300 rounded-md py-2 px-3"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        name="unit_price"
                        min="0"
                        step="0.01"
                        value={serviceForm.unit_price || ''}
                        onChange={handleServiceNumberChange}
                        className="w-full border border-gray-300 rounded-md py-2 px-3"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total
                      </label>
                      <input
                        type="text"
                        value={formatCurrency(serviceForm.total_price || 0)}
                        className="w-full border border-gray-300 rounded-md py-2 px-3 bg-gray-50"
                        readOnly
                      />
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={serviceForm.notes || ''}
                      onChange={handleServiceFormChange}
                      rows={2}
                      className="w-full border border-gray-300 rounded-md py-2 px-3"
                      placeholder="Optional notes about this service"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name="is_billable"
                        checked={serviceForm.is_billable ?? true}
                        onChange={handleServiceCheckboxChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Is Billable</span>
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowServiceForm(false);
                        setEditingService(null);
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md"
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={handleAddUpdateService}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                    >
                      {editingService ? 'Update Service' : 'Add Service'}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="p-4">
                {items.length === 0 ? (
                  <p className="text-center text-gray-500 my-4">
                    No services added yet. Click "Add Service" to add services to this job.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Service
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit Price
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Billable
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {items.map(item => (
                          <tr key={item.id}>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {item.service?.name || 'Unknown Service'}
                              </div>
                              {item.notes && (
                                <div className="text-sm text-gray-500">{item.notes}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-500">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-500">
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                              {formatCurrency(item.total_price)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {item.is_billable ? (
                                <Check className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-red-500 mx-auto" />
                              )}
                            </td>
                            <td className="px-6 py-4 text-center text-sm font-medium">
                              <button
                                onClick={() => handleEditService(item)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleRemoveService(item.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            Total
                          </td>
                          <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                            {formatCurrency(items.reduce((sum, item) => sum + item.total_price, 0))}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-700">
                            Billable Total
                          </td>
                          <td className="px-6 py-3 text-right text-sm font-bold text-green-600">
                            {formatCurrency(items.filter(s => s.is_billable).reduce((sum, item) => sum + item.total_price, 0))}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </DashboardCard>
          </div>
        </div>
        
        {/* Sidebar */}
        <div>
          <DashboardCard title="Job Summary" fullWidth>
            <div className="p-4">
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Estimated Duration</h3>
                <div className="text-2xl font-bold">
                  {form.estimated_duration 
                    ? `${Math.floor(form.estimated_duration / 60)}h ${form.estimated_duration % 60}m` 
                    : '0m'}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Based on template and selected services
                </p>
              </div>
              
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Total Price</h3>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculateTotalPrice())}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Sum of all billable services
                </p>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-4">
                  Fields marked with * are required.
                </p>
                
                <button
                  onClick={handleSaveJob}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : isEditing ? 'Update Job' : 'Create Job'}
                </button>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
} 