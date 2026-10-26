'use client';

import React, { useRef, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

interface HoloCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function HoloCard({ children, className = '', style }: HoloCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sheenPos, setSheenPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const rotateX = useSpring(0, { stiffness: 300, damping: 20 });
  const rotateY = useSpring(0, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const normX = centerX > 0 ? (x - centerX) / centerX : 0;
    const normY = centerY > 0 ? (y - centerY) / centerY : 0;

    rotateX.set(normY * -10);
    rotateY.set(normX * 10);
    setSheenPos({ x, y });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        rotateX,
        rotateY,
        transformPerspective: 1100,
        transformStyle: 'preserve-3d',
      }}
      className={`relative will-change-transform ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 z-20"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle at ${sheenPos.x}px ${sheenPos.y}px, rgba(255,255,255,0.08), transparent 70%)`,
        }}
      />
      {children}
    </motion.div>
  );
}
