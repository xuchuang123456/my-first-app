"use client"

import { ReactNode, useRef, useState } from "react";
import { motion } from "framer-motion";

interface MagicCardProps {
  children: ReactNode;
  gradientSize?: number;
  gradientColor?: string;
  className?: string;
}

export function MagicCard({ 
  children, 
  gradientSize = 200, 
  gradientColor = "#3b82f6",
  className = ""
}: MagicCardProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (divRef.current) {
      const rect = divRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(${gradientSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${gradientColor}, transparent 100%)`,
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}