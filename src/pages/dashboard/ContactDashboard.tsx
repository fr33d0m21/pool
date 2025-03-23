import { useState, useEffect } from 'react';
import { DashboardCard } from '../../components/DashboardCard';
import { supabase } from '../../lib/supabase';
import { submitContactForm } from '../../services/supabaseService';
import { MessageSquare, Phone, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export function ContactDashboard() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });

  // Check if there's a subject in the URL query params
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const subject = queryParams.get('subject');
    
    if (subject) {
      setFormData(prev => ({ ...prev, subject }));
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');
      
      await submitContactForm(user.id, formData.subject, formData.message);
      
      // Reset form and show success message
      setFormData({ subject: '', message: '' });
      setSuccess(true);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('Error submitting contact form:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Contact Us</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard
          title="Message Us"
          fullWidth
          className="md:col-span-2"
        >
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 flex items-start">
              <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Message sent successfully!</p>
                <p className="text-sm">We'll get back to you as soon as possible.</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a subject</option>
                <option value="Service Question">Service Question</option>
                <option value="Billing Inquiry">Billing Inquiry</option>
                <option value="Schedule Change">Schedule Change</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Quote Request">Quote Request</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="How can we help you?"
                required
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </DashboardCard>
        
        <div className="space-y-6">
          <DashboardCard title="Contact Information">
            <div className="space-y-4">
              <div className="flex items-start">
                <Phone className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                <div>
                  <div className="font-medium">Phone</div>
                  <a href="tel:5551234567" className="text-gray-600 hover:text-blue-600">
                    (555) 123-4567
                  </a>
                </div>
              </div>
              
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                <div>
                  <div className="font-medium">Email</div>
                  <a href="mailto:support@poolspartans.com" className="text-gray-600 hover:text-blue-600">
                    support@poolspartans.com
                  </a>
                </div>
              </div>
              
              <div className="flex items-start">
                <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
                <div>
                  <div className="font-medium">Response Time</div>
                  <div className="text-gray-600">
                    We typically respond within 24 hours during business days.
                  </div>
                </div>
              </div>
            </div>
          </DashboardCard>
          
          <DashboardCard title="Business Hours">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Monday - Friday</span>
                <span className="font-medium">8:00 AM - 6:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Saturday</span>
                <span className="font-medium">8:00 AM - 2:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sunday</span>
                <span className="font-medium">Closed</span>
              </div>
              <div className="pt-3 text-sm text-gray-500">
                * Emergency services available 24/7
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
} 