import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { HomePage } from './pages/HomePage';
import { About } from './pages/About';
import { Services } from './pages/Services';
import { Testimonials } from './pages/Testimonials';
import { ScheduleService } from './pages/ScheduleService';
import { Contact } from './pages/Contact';
import { Login } from './pages/Login';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { Scheduling } from './pages/dashboard/Scheduling';
import { ServiceHistory } from './pages/dashboard/ServiceHistory';
import { Billing } from './pages/dashboard/Billing';
import { Quotes } from './pages/dashboard/Quotes';
import { Jobs } from './pages/dashboard/Jobs';
import { PoolDNA } from './pages/dashboard/PoolDNA';
import { ContactDashboard } from './pages/dashboard/ContactDashboard';
import { AdminScheduling } from './pages/dashboard/AdminScheduling';
import { AdminQuotes } from './pages/dashboard/AdminQuotes';
import { AdminJobs } from './pages/dashboard/AdminJobs';
import { AdminProductsServices } from './pages/dashboard/AdminProductsServices';
import { AdminBilling } from './pages/admin/Billing';

function App() {
  const location = useLocation();
  
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<About />} />
      <Route path="/services" element={<Services />} />
      <Route path="/testimonials" element={<Testimonials />} />
      <Route path="/schedule" element={<ScheduleService />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      
      {/* Customer Dashboard */}
      <Route
        path="/customer-dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerDashboard />} />
        <Route path="scheduling" element={<Scheduling />} />
        <Route path="service-history" element={<ServiceHistory />} />
        <Route path="billing" element={<Billing />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="pool-dna" element={<PoolDNA />} />
        <Route path="contact" element={<ContactDashboard />} />
      </Route>

      {/* Admin Dashboard */}
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <DashboardLayout isAdmin />
          </ProtectedRoute>
        }
      >
        <Route index element={<CustomerDashboard />} />
        <Route path="scheduling" element={<AdminScheduling />} />
        <Route path="quotes" element={<AdminQuotes />} />
        <Route path="jobs" element={<AdminJobs />} />
        <Route path="billing" element={<AdminBilling />} />
        <Route path="products-services" element={<AdminProductsServices />} />
        <Route path="customers" element={<div>Customers</div>} />
        <Route path="water-bodies" element={<div>Water Bodies</div>} />
        <Route path="equipment" element={<div>Equipment</div>} />
        <Route path="alerts" element={<div>Alerts</div>} />
        <Route path="service-levels" element={<div>Service Levels</div>} />
        <Route path="technicians" element={<div>Technicians</div>} />
        <Route path="reports" element={<div>Reports</div>} />
      </Route>
    </Routes>
  );
}

export default App;