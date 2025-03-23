import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface InteractiveElementProps {
  children: React.ReactNode;
  className?: string;
  depth?: number;
  rotationIntensity?: number;
  scaleOnHover?: number;
  as?: React.ElementType;
  preserveTransform?: boolean;
}

export function InteractiveElement({ 
  children, 
  className = '', 
  depth = 20, 
  rotationIntensity = 10,
  scaleOnHover = 1.05,
  as: Component = motion.div,
  preserveTransform = true
}: InteractiveElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Motion values for tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Smooth spring physics for rotation
  const rotateX = useSpring(useTransform(y, [-100, 100], [rotationIntensity, -rotationIntensity]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-100, 100], [-rotationIntensity, rotationIntensity]), { stiffness: 300, damping: 30 });
  
  const z = useSpring(isHovered ? depth : 0, { stiffness: 300, damping: 30 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!elementRef.current) return;
    
    const rect = elementRef.current.getBoundingClientRect();
    
    // Calculate mouse position relative to element center
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
    <Component
      ref={elementRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transform: preserveTransform ? `perspective(1000px)` : undefined,
        transformStyle: preserveTransform ? "preserve-3d" : "flat",
        backfaceVisibility: "hidden",
        scale: isHovered ? scaleOnHover : 1
      }}
      animate={{ 
        z: isHovered ? depth : 0
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 20 
      }}
      className={`will-change-transform transition-transform ${className}`}
    >
      {children}
    </Component>
  );
}