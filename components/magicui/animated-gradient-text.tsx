"use client"

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface AnimatedGradientTextProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedGradientText({ children, className }: AnimatedGradientTextProps) {
  return (
    <div 
      className={`relative inline-block bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent ${className}`}
      style={{ 
        '--bg-size': '200% auto'
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}