import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, Clock, MapPin } from 'lucide-react';
import { Header } from '../components/Header';
import { ContactForm } from '../components/ContactForm';
import { InteractiveCard } from '../components/InteractiveCard';
import { InteractiveElement } from '../components/InteractiveElement';
import { AnimatedSection } from '../components/AnimatedSection';

export function Contact() {
  const contactInfo = [
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Phone",
      info: "(555) 123-4567"
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email",
      info: "info@poolspartans.com"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Hours",
      info: "Mon-Fri: 8am-6pm"
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Service Area",
      info: "Serving all of Flagler County, FL"
    }
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
              Contact Us
            </h1>
          </InteractiveElement>
          <InteractiveElement depth={15} className="mb-4">
            <p className="text-xl md:text-2xl text-center max-w-2xl">
              Let's discuss your pool maintenance needs
            </p>
          </InteractiveElement>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <AnimatedSection className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <InteractiveElement depth={15}>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Have questions about our pool services? We're here to help!
              </p>
            </InteractiveElement>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
            <div>
              <InteractiveElement depth={20} className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                <p className="text-gray-600 mb-8">
                  Whether you need regular pool maintenance, equipment repair, or just have questions about our services,
                  we're always happy to hear from you.
                </p>
              </InteractiveElement>

              <div className="space-y-6 mb-8">
                {contactInfo.map((item, index) => (
                  <InteractiveElement key={index} depth={15} rotationIntensity={8}>
                    <motion.div
                      className="flex items-center space-x-4"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.2 }}
                    >
                      <InteractiveElement depth={25} rotationIntensity={15} className="text-blue-600">
                        {item.icon}
                      </InteractiveElement>
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.title}</h4>
                        <p className="text-gray-600">{item.info}</p>
                      </div>
                    </motion.div>
                  </InteractiveElement>
                ))}
              </div>
            </div>
            
            <div>
              <InteractiveCard
                depth={40}
                rotationIntensity={20}
                className="bg-white rounded-xl p-8"
              >
                <InteractiveElement depth={20} className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900">Send Us a Message</h2>
                </InteractiveElement>
                <ContactForm />
              </InteractiveCard>
            </div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}