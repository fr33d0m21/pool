import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, Clock, Shield, Droplets, ThermometerSun, ClipboardCheck, MapPin, Award, CheckCircle } from 'lucide-react';
import { AnimatedSection } from '../components/AnimatedSection';
import { ServiceCard } from '../components/ServiceCard';
import { ContactForm } from '../components/ContactForm';
import { Header } from '../components/Header';
import { InteractiveCard } from '../components/InteractiveCard';
import { InteractiveElement } from '../components/InteractiveElement';

export function HomePage() {
  const navigate = useNavigate();
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const galleryImages = [
    "/img/c9c907a6-cadd-4753-b262-5728f9c0b21c.jpeg",
    "/img/6fa06b84-adb4-4786-b99f-6d7283e748a8.jpeg",
    "/img/0acd450a-e1e4-44da-9328-36bd1537b7bc.jpeg",
    "/img/c300c4c5-8319-4a79-8c12-a88df9f8c067.jpeg",
    "/img/70de1c71-5e2f-4a33-bd45-9b8e1a54e328.jpeg",
    "/img/46ef1a9c-eef2-4592-9f9c-59b92d626404.jpeg"
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <motion.div 
        className="relative h-screen w-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        {!videoError ? (
          <video 
            autoPlay 
            muted 
            loop 
            playsInline
            poster="/img/c300c4c5-8319-4a79-8c12-a88df9f8c067.jpeg"
            className="absolute top-0 left-0 w-full h-full object-cover"
            onError={() => setVideoError(true)}
          >
            <source src="/mp4/ed.webm" type="video/webm" />
            <source src="/mp4/ed.mp4" type="video/mp4" />
          </video>
        ) : (
          <div 
            className="absolute top-0 left-0 w-full h-full bg-cover bg-center" 
            style={{ backgroundImage: "url('/img/c300c4c5-8319-4a79-8c12-a88df9f8c067.jpeg')" }}
          />
        )}
        <motion.div 
          className="absolute inset-0 bg-black/50 flex flex-col justify-center items-center text-white px-4 pt-[50px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <InteractiveElement depth={30} rotationIntensity={5} className="mb-6">
            <h1 className="text-5xl md:text-6xl font-bold text-center">
              Pool Spartans
            </h1>
          </InteractiveElement>
          <InteractiveElement depth={15} className="mb-4">
            <p className="text-xl md:text-2xl text-center max-w-2xl">
              Professional Pool Service & Maintenance in Flagler County, Florida
            </p>
          </InteractiveElement>
          <InteractiveElement depth={15} className="mb-8">
            <p className="text-xl md:text-2xl text-center max-w-2xl font-light italic">
              Where expertise meets integrity
            </p>
          </InteractiveElement>
          <InteractiveElement 
            depth={25} 
            rotationIntensity={8} 
            scaleOnHover={1.08}
          >
            <motion.button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-lg transition duration-300"
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/schedule')}
            >
              Schedule Service
            </motion.button>
          </InteractiveElement>
        </motion.div>
      </motion.div>

      {/* About Section */}
      <AnimatedSection className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <InteractiveCard 
              className="rounded-lg overflow-hidden"
              depth={40}
              rotationIntensity={20}
              scaleOnHover={1.08}
            >
              <InteractiveElement depth={20} rotationIntensity={10}>
                <img 
                  src="/img/ed.jpeg" 
                  alt="Pool Service Professional" 
                  className="w-full h-auto shadow-xl transform transition-transform duration-300"
                />
              </InteractiveElement>
            </InteractiveCard>
            <div>
              <InteractiveElement depth={20} className="mb-6">
                <h2 className="text-4xl font-bold text-gray-900">Meet Edward McLaughlin</h2>
              </InteractiveElement>
              <div className="prose prose-lg text-gray-600">
                <p className="mb-4">
                  Welcome to Pool Spartans! I'm Edward McLaughlin, owner and operator with over 20 years of experience in the pool industry since 2002. As a state certified commercial pool operator in Florida, I bring professional expertise to every pool I service.
                </p>
                <p className="mb-4">
                  What sets us apart is our deep understanding of water chemistry and unwavering commitment to quality service. As a family-owned business in Flagler County, we believe in:
                </p>
                <ul className="space-y-2 mb-6">
                  {['Competitive pricing', 'Strong work ethic', 'Expert water chemistry knowledge', 'Open communication'].map((item, index) => (
                    <InteractiveElement key={index} depth={10} rotationIntensity={5}>
                      <motion.li 
                        className="flex items-center"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.2 }}
                      >
                        <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                        {item}
                      </motion.li>
                    </InteractiveElement>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Services Section */}
      <AnimatedSection className="py-20 bg-gray-50" id="services">
        <div className="max-w-7xl mx-auto px-4">
          <InteractiveElement depth={25} className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Our Services</h2>
          </InteractiveElement>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ServiceCard
              icon={<Droplets className="w-12 h-12 text-blue-600" />}
              title="Pool Cleaning"
              description="Professional pool maintenance with attention to detail and consistent service schedules"
            />
            <ServiceCard
              icon={<ThermometerSun className="w-12 h-12 text-blue-600" />}
              title="Equipment Repair"
              description="Expert diagnosis and repair of all pool equipment and systems"
            />
            <ServiceCard
              icon={<ClipboardCheck className="w-12 h-12 text-blue-600" />}
              title="Water Testing"
              description="Comprehensive water chemistry analysis ensuring safe and balanced pool water"
            />
          </div>
        </div>
      </AnimatedSection>

      {/* Gallery Section */}
      <AnimatedSection className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <InteractiveElement depth={25} className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Our Work</h2>
          </InteractiveElement>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {galleryImages.map((image, index) => (
              <InteractiveCard 
                key={index}
                depth={40}
                rotationIntensity={20}
                scaleOnHover={1.08}
                className="relative aspect-square overflow-hidden rounded-lg"
              >
                <InteractiveElement 
                  depth={25} 
                  rotationIntensity={12} 
                  scaleOnHover={1.05}
                  preserveTransform={true}
                >
                  <img 
                    src={image} 
                    alt={`Pool Service ${index + 1}`}
                    className="w-full h-full object-cover transform transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-all duration-300" />
                </InteractiveElement>
              </InteractiveCard>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Contact Section */}
      <AnimatedSection className="py-20 bg-gray-50" id="contact">
        <div className="max-w-7xl mx-auto px-4">
          <InteractiveElement depth={25} className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900">Contact Us</h2>
          </InteractiveElement>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              {[
                { icon: <Phone className="w-6 h-6" />, title: "Phone", info: "(555) 123-4567" },
                { icon: <Mail className="w-6 h-6" />, title: "Email", info: "info@poolspartans.com" },
                { icon: <Clock className="w-6 h-6" />, title: "Hours", info: "Mon-Fri: 8am-6pm" },
                { icon: <MapPin className="w-6 h-6" />, title: "Service Area", info: "Serving all of Flagler County, FL" }
              ].map((item, index) => (
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
            <ContactForm />
          </div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <InteractiveElement depth={15} className="mb-4">
                <h3 className="text-xl font-bold">Pool Spartans</h3>
              </InteractiveElement>
              <p className="text-gray-400">Professional pool service and maintenance you can trust.</p>
              <p className="text-gray-400 mt-2 italic">Where expertise meets integrity</p>
            </div>
            <div>
              <InteractiveElement depth={15} className="mb-4">
                <h3 className="text-xl font-bold">Quick Links</h3>
              </InteractiveElement>
              <ul className="space-y-2">
                {['Home', 'Services', 'Contact'].map((link, index) => (
                  <InteractiveElement key={index} depth={10} rotationIntensity={5}>
                    <li>
                      <a href={index === 0 ? "#" : `#${link.toLowerCase()}`} className="text-gray-400 hover:text-white transition">
                        {link}
                      </a>
                    </li>
                  </InteractiveElement>
                ))}
              </ul>
            </div>
            <div>
              <InteractiveElement depth={15} className="mb-4">
                <h3 className="text-xl font-bold">Service Area</h3>
              </InteractiveElement>
              <p className="text-gray-400">Proudly serving Palm Coast and all of Flagler County, Florida.</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Pool Spartans. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}