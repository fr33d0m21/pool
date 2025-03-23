import React from 'react';
import { motion } from 'framer-motion';
import { Award, Shield, Clock, Users, ThumbsUp, Star, CheckCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { InteractiveCard } from '../components/InteractiveCard';
import { InteractiveElement } from '../components/InteractiveElement';
import { AnimatedSection } from '../components/AnimatedSection';

export function About() {
  const achievements = [
    {
      icon: <Award className="w-12 h-12 text-blue-600" />,
      title: "20+ Years Experience",
      description: "Serving Florida since 2002 with professional pool maintenance expertise."
    },
    {
      icon: <Shield className="w-12 h-12 text-blue-600" />,
      title: "Licensed & Certified",
      description: "State certified commercial pool operator with extensive training."
    },
    {
      icon: <Clock className="w-12 h-12 text-blue-600" />,
      title: "Reliable Service",
      description: "Consistent, on-time service with clear communication."
    },
    {
      icon: <Users className="w-12 h-12 text-blue-600" />,
      title: "Family Owned",
      description: "Local family business committed to personal service and community values."
    }
  ];

  const values = [
    "Competitive pricing and transparent billing",
    "Strong work ethic and reliability",
    "Expert water chemistry knowledge",
    "Open communication with clients",
    "Attention to detail in every service",
    "Continuous learning and improvement"
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
              About Pool Spartans
            </h1>
          </InteractiveElement>
          <InteractiveElement depth={15} className="mb-4">
            <p className="text-xl md:text-2xl text-center max-w-2xl">
              Where Expertise Meets Integrity
            </p>
          </InteractiveElement>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <AnimatedSection className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
            <InteractiveCard 
              className="rounded-lg overflow-hidden"
              depth={40}
              rotationIntensity={20}
              scaleOnHover={1.08}
            >
              <img 
                src="/img/ed.jpeg" 
                alt="Edward McLaughlin" 
                className="w-full h-auto shadow-xl"
              />
            </InteractiveCard>
            
            <div>
              <InteractiveElement depth={20} className="mb-6">
                <h2 className="text-4xl font-bold text-gray-900">Meet Edward McLaughlin</h2>
              </InteractiveElement>
              <div className="space-y-4 text-gray-600">
                <InteractiveElement depth={15}>
                  <p>
                    Welcome to Pool Spartans! I'm Edward McLaughlin, owner and operator with over 20 years of experience in the pool industry. Since 2002, I've been dedicated to providing exceptional pool maintenance services to our community.
                  </p>
                </InteractiveElement>
                <InteractiveElement depth={15}>
                  <p>
                    As a state certified commercial pool operator in Florida, I bring professional expertise and deep understanding of water chemistry to every pool I service. This certification allows me to work on everything from residential pools to hotel pools and aquatic centers.
                  </p>
                </InteractiveElement>
                <InteractiveElement depth={15}>
                  <p>
                    What truly sets us apart is our commitment to excellence and personal service. I believe in being directly involved in every aspect of our service, ensuring the highest standards of quality and customer satisfaction.
                  </p>
                </InteractiveElement>
              </div>
            </div>
          </div>

          <AnimatedSection className="mb-20">
            <InteractiveElement depth={25} className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Our Core Values</h2>
            </InteractiveElement>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {values.map((value, index) => (
                <InteractiveElement 
                  key={index} 
                  depth={20} 
                  rotationIntensity={10}
                  className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg"
                >
                  <CheckCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <span className="text-gray-700">{value}</span>
                </InteractiveElement>
              ))}
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <InteractiveElement depth={25} className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">Why Choose Us</h2>
            </InteractiveElement>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {achievements.map((achievement, index) => (
                <InteractiveCard 
                  key={index}
                  depth={40}
                  rotationIntensity={20}
                  scaleOnHover={1.08}
                  className="bg-white rounded-xl p-6 shadow-lg"
                >
                  <InteractiveElement depth={30} rotationIntensity={15} className="flex justify-center mb-4">
                    {achievement.icon}
                  </InteractiveElement>
                  <InteractiveElement depth={20} className="text-center">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{achievement.title}</h3>
                    <p className="text-gray-600">{achievement.description}</p>
                  </InteractiveElement>
                </InteractiveCard>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </AnimatedSection>
    </div>
  );
}