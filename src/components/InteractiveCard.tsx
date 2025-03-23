import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { InteractiveElement } from './InteractiveElement';

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  depth?: number;
  rotationIntensity?: number;
  scaleOnHover?: number;
}

export function InteractiveCard({ 
  children, 
  className = '', 
  depth = 30,
  rotationIntensity = 15,
  scaleOnHover = 1.05 
}: InteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Motion values for tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Smooth spring physics for rotation
  const rotateX = useSpring(useTransform(y, [-100, 100], [10, -10]), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-10, 10]), { stiffness: 300, damping: 25 });

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
        transform: `perspective(1000px)`,
        transformStyle: "preserve-3d",
        backfaceVisibility: "hidden"
      }}
      whileHover={{ 
        scale: scaleOnHover, 
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
      className={`will-change-transform transition-transform duration-300 transform-gpu ${className}`}
    >
      <motion.div 
        style={{ 
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden"
        }}
        animate={{ 
          z: isHovered ? depth : 0
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
      >
        {React.Children.map(children, child => {
          if (React.isValidElement(child) && child.type === 'img') {
            return (
              <InteractiveElement 
                depth={depth * 0.5} 
                rotationIntensity={rotationIntensity * 0.5}
                scaleOnHover={1}
              >
                {child}
              </InteractiveElement>
            );
          }
          return child;
        })}
      </motion.div>
    </motion.div>
  );
}