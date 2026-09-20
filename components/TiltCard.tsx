'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxRotation?: number;
}

export default function TiltCard({
  children,
  className = '',
  maxRotation = 8,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const springConfig = { damping: 20, stiffness: 200 };
  const mouseXSpring = useSpring(x, springConfig);
  const mouseYSpring = useSpring(y, springConfig);

  const rotateX = useTransform(mouseYSpring, [0, 1], [maxRotation, -maxRotation]);
  const rotateY = useTransform(mouseXSpring, [0, 1], [-maxRotation, maxRotation]);
  const glareOpacity = useTransform(mouseXSpring, [0, 0.5, 1], [0.15, 0, 0.15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width);
    y.set(mouseY / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <div style={{ perspective: 1000 }} className="w-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        className={`relative transition-shadow duration-300 ${className}`}
      >
        {children}
        {/* Specular Glare Reflection */}
        <motion.div
          style={{ opacity: glareOpacity }}
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-tr from-cyan-400/10 via-white/10 to-transparent"
        />
      </motion.div>
    </div>
  );
}

// Specular reflection with 3D depth and smooth dampening
