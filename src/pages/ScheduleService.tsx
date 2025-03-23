import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, CheckCircle, Mail, Phone, User, MessageSquare } from 'lucide-react';
import { Header } from '../components/Header';
import { InteractiveCard } from '../components/InteractiveCard';
import { InteractiveElement } from '../components/InteractiveElement';
import { AnimatedSection } from '../components/AnimatedSection';

export function ScheduleService() {
  const serviceTypes = [
    { value: 'weekly', label: 'Weekly Service', price: '$35/visit' },
    { value: 'biweekly', label: 'Bi-Weekly Service', price: '$45/visit' },
    { value: 'onetime', label: 'One-Time Service', price: '$75' },
    { value: 'repair', label: 'Equipment Repair', price: 'Custom Quote' }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <motion.div 
        className="relative h-[60vh] w-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: "url('/img/c300c4c5-8319-4a79-8c12-a88df9f8c067.jpeg')",
            filter: "brightness(0.7)"
          }}
        />
        <motion.div 
          className="absolute inset-0 flex flex-col justify-center items-center text-white px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <InteractiveElement depth={30} rotationIntensity={5} className="mb-6">
            <h1 className="text-5xl md:text-6xl font-bold text-center">
              Schedule Service
            </h1>
          </InteractiveElement>
          <InteractiveElement depth={15} className="mb-4">
            <p className="text-xl md:text-2xl text-center max-w-2xl">
              Let us take care of your pool maintenance needs
            </p>
          </InteractiveElement>
        </motion.div>
      </motion.div>
      {/* Main Content */}
      <AnimatedSection className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <InteractiveCard
            depth={40}
            rotationIntensity={20}
            className="bg-white rounded-xl shadow-lg p-8 md:p-12 max-w-4xl mx-auto"
          >
            <form className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InteractiveElement depth={15} className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
              </InteractiveElement>
              
              <InteractiveElement depth={15} className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
              </InteractiveElement>

              <InteractiveElement depth={15} className="relative">
                <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
              </InteractiveElement>

              <InteractiveElement depth={15} className="relative">
                <Calendar className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
              </InteractiveElement>

              <InteractiveElement depth={15} className="relative md:col-span-2">
                <MapPin className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Service Address"
                    className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
              </InteractiveElement>

              <InteractiveElement depth={15} className="relative md:col-span-2">
                  <select
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                    required
                  >
                    <option value="">Select a service type</option>
                    {serviceTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.price}
                      </option>
                    ))}
                  </select>
              </InteractiveElement>

              <InteractiveElement depth={15} className="relative md:col-span-2">
                <MessageSquare className="w-5 h-5 text-gray-400 absolute left-4 top-4" />
                  <textarea
                    className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Tell us about any specific concerns or requests..."
                  />
              </InteractiveElement>

              <InteractiveElement depth={25} rotationIntensity={8} scaleOnHover={1.08} className="md:col-span-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-[#00B4D8] text-white py-3 px-6 rounded-lg font-semibold"
                    type="submit"
                  >
                    Schedule Service
                  </motion.button>
              </InteractiveElement>
            </form>
          </InteractiveCard>
        </div>
      </AnimatedSection>
    </div>
  );
}