import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function ServiceCard({ icon, title, description }: ServiceCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Motion values for tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Smooth spring physics for rotation
  const rotateX = useSpring(useTransform(y, [-100, 100], [15, -15]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-15, 15]), { stiffness: 300, damping: 30 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    
    // Calculate mouse position relative to card center
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Update motion values
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  }

  function handleMouseLeave() {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="bg-white rounded-xl shadow-lg p-6 md:p-8 text-center transition-shadow duration-300 hover:shadow-xl cursor-pointer"
    >
      <motion.div
        style={{ 
          transformStyle: "preserve-3d",
          z: 20,
          translateZ: isHovered ? 20 : 0
        }}
        transition={{ duration: 0.3 }}
        className="flex justify-center mb-4 md:mb-6"
      >
        <motion.div
          animate={isHovered ? { rotateZ: 5 } : { rotateZ: 0 }}
          transition={{ duration: 0.3 }}
        >
          {icon}
        </motion.div>
      </motion.div>
      <motion.h3 
        style={{ transformStyle: "preserve-3d", translateZ: isHovered ? 30 : 0 }}
        transition={{ duration: 0.3 }}
        className="text-lg md:text-xl font-bold mb-2 md:mb-4 text-gray-900"
      >
        {title}
      </motion.h3>
      <motion.p 
        style={{ transformStyle: "preserve-3d", translateZ: isHovered ? 10 : 0 }}
        transition={{ duration: 0.3 }}
        className="text-sm md:text-base text-gray-600"
      >
        {description}
      </motion.p>
    </motion.div>
  );
}