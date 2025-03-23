import React from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import { FaCog, FaFileInvoiceDollar, FaCalendarAlt, FaUsers, FaTools, FaBoxes, FaTachometerAlt } from 'react-icons/fa';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="admin-layout">
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container fluid>
          <Navbar.Brand href="/admin-dashboard">Pool Spartans Admin</Navbar.Brand>
          <Navbar.Toggle aria-controls="admin-navbar-nav" />
          <Navbar.Collapse id="admin-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link href="/admin-dashboard"><FaTachometerAlt className="me-1" /> Dashboard</Nav.Link>
              <Nav.Link href="/admin-dashboard/scheduling"><FaCalendarAlt className="me-1" /> Schedules</Nav.Link>
              <Nav.Link href="/admin-dashboard/jobs"><FaTools className="me-1" /> Jobs</Nav.Link>
              <Nav.Link href="/admin-dashboard/customers"><FaUsers className="me-1" /> Customers</Nav.Link>
              <Nav.Link href="/admin-dashboard/products-services"><FaBoxes className="me-1" /> Products & Services</Nav.Link>
              <Nav.Link href="/admin-dashboard/billing"><FaFileInvoiceDollar className="me-1" /> Billing</Nav.Link>
              <Nav.Link href="/admin-dashboard/service-levels"><FaCog className="me-1" /> Settings</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      <main>
        {children}
      </main>
    </div>
  );
} 