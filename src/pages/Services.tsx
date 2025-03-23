import React from 'react';
import { motion } from 'framer-motion';
import { Droplets, ThermometerSun, ClipboardCheck, Wrench, Shield, Clock, PenTool as Tool, Gauge, CheckCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { InteractiveCard } from '../components/InteractiveCard';
import { InteractiveElement } from '../components/InteractiveElement';
import { AnimatedSection } from '../components/AnimatedSection';

export function Services() {
  const services = [
    {
      icon: <Droplets className="w-12 h-12 text-blue-600" />,
      title: "Weekly Pool Service",
      price: "$35/visit",
      description: "Our comprehensive weekly service includes water testing and balancing, cleaning, equipment checks, and detailed reporting.",
      features: [
        "Complete chemical balance testing",
        "Skimming and debris removal",
        "Filter cleaning and backwashing",
        "Equipment inspection",
        "Detailed service reports"
      ],
      image: "/img/c9c907a6-cadd-4753-b262-5728f9c0b21c.jpeg"
    },
    {
      icon: <ThermometerSun className="w-12 h-12 text-blue-600" />,
      title: "Bi-Weekly Service",
      price: "$45/visit",
      description: "Perfect for pools with lower usage or those with automated systems. Includes all standard services with extended cleaning.",
      features: [
        "Comprehensive chemical testing",
        "Deep cleaning of all surfaces",
        "Equipment performance check",
        "Chemical level optimization",
        "Preventive maintenance"
      ],
      image: "/img/6fa06b84-adb4-4786-b99f-6d7283e748a8.jpeg"
    },
    {
      icon: <Tool className="w-12 h-12 text-blue-600" />,
      title: "Equipment Repair",
      price: "Custom Quote",
      description: "Expert diagnosis and repair of all pool equipment, from pumps to heaters. We service all major brands.",
      features: [
        "Pump repair and replacement",
        "Heater maintenance",
        "Filter system repairs",
        "Salt system service",
        "Automation system setup"
      ],
      image: "/img/70de1c71-5e2f-4a33-bd45-9b8e1a54e328.jpeg"
    },
    {
      icon: <Shield className="w-12 h-12 text-blue-600" />,
      title: "Green Pool Recovery",
      price: "From $150",
      description: "Specialized treatment to restore green or neglected pools to pristine condition quickly and effectively.",
      features: [
        "Algae treatment",
        "Chemical rebalancing",
        "Deep cleaning",
        "Filter maintenance",
        "Progress monitoring"
      ],
      image: "/img/0acd450a-e1e4-44da-9328-36bd1537b7bc.jpeg"
    }
  ];

  const additionalServices = [
    {
      icon: <Gauge className="w-8 h-8" />,
      title: "Pressure Testing",
      description: "Identify and locate leaks in your pool system"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Vacation Service",
      description: "Extra care while you're away"
    },
    {
      icon: <Wrench className="w-8 h-8" />,
      title: "Equipment Installation",
      description: "Professional installation of new pool equipment"
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
              Our Services
            </h1>
          </InteractiveElement>
          <InteractiveElement depth={15} className="mb-4">
            <p className="text-xl md:text-2xl text-center max-w-2xl">
              Professional pool maintenance tailored to your needs
            </p>
          </InteractiveElement>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <AnimatedSection className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 gap-16">
            {services.map((service, index) => (
              <InteractiveCard
                key={service.title}
                depth={40}
                rotationIntensity={20}
                className="bg-white rounded-xl shadow-lg overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="order-2 lg:order-1 p-8">
                    <InteractiveElement depth={30} rotationIntensity={15} className="flex items-center mb-6">
                      {service.icon}
                      <div className="ml-4">
                        <h3 className="text-2xl font-bold text-gray-900">{service.title}</h3>
                        <p className="text-blue-600 font-semibold">{service.price}</p>
                      </div>
                    </InteractiveElement>
                    
                    <InteractiveElement depth={20} className="mb-6">
                      <p className="text-gray-600">{service.description}</p>
                    </InteractiveElement>

                    <InteractiveElement depth={15}>
                      <ul className="space-y-3">
                        {service.features.map((feature, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center text-gray-700"
                          >
                            <CheckCircle className="w-5 h-5 text-blue-600 mr-3" />
                            {feature}
                          </motion.li>
                        ))}
                      </ul>
                    </InteractiveElement>
                  </div>
                  
                  <div className="order-1 lg:order-2 relative h-64 lg:h-auto">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                </div>
              </InteractiveCard>
            ))}
          </div>

          {/* Additional Services */}
          <div className="mt-20">
            <InteractiveElement depth={25} className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Additional Services</h2>
            </InteractiveElement>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {additionalServices.map((service, index) => (
                <InteractiveCard
                  key={service.title}
                  depth={30}
                  rotationIntensity={15}
                  scaleOnHover={1.08}
                  className="bg-white rounded-xl p-6 shadow-lg"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <InteractiveElement depth={20} className="flex justify-center mb-4">
                      <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                        {service.icon}
                      </div>
                    </InteractiveElement>
                    <InteractiveElement depth={15} className="text-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
                      <p className="text-gray-600">{service.description}</p>
                    </InteractiveElement>
                  </motion.div>
                </InteractiveCard>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>
    </div>
  );
}