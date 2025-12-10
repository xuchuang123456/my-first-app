"use client"

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface ShimmerButtonProps {
  children: ReactNode;
  className?: string;
  shimmerColor?: string;
  background?: string;
  onClick?: () => void;
}

export function ShimmerButton({ 
  children, 
  className = "",
  shimmerColor = "#60a5fa",
  background = "linear-gradient(90deg, #3b82f6, #8b5cf6)",
  onClick
}: ShimmerButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative overflow-hidden rounded-lg px-6 py-3 font-medium text-white transition-all ${className}`}
      style={{ background }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="relative z-10">{children}</span>
      <motion.span
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent, ${shimmerColor}, transparent)`,
        }}
        initial={{ x: "-100%" }}
        whileInView={{ x: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 2,
          ease: "linear",
        }}
        viewport={{ once: false }}
      />
    </motion.button>
  );
}