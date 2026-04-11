"use client";

import { motion } from "framer-motion";

const squareTransition = {
  duration: 0.3,
  ease: "easeOut" as const,
};

export function Logo({ className }: { className?: string }) {
  const squares: {
    x: number;
    y: number;
    opacity: number;
    delay: number;
  }[] = [
    { x: 8, y: 8, opacity: 1, delay: 0 },
    { x: 22, y: 8, opacity: 0.5, delay: 0.08 },
    { x: 8, y: 22, opacity: 0.5, delay: 0.16 },
    { x: 22, y: 22, opacity: 1, delay: 0.24 },
  ];

  return (
    <svg width="160" height="40" viewBox="0 0 160 40" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="0" y="0" width="40" height="40" rx="7" fill="#1a3167" />
      {squares.map((s) => (
        <motion.rect
          key={`${s.x}-${s.y}`}
          x={s.x}
          y={s.y}
          width="10"
          height="10"
          rx="2"
          fill="#cce8f4"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: s.opacity, scale: 1 }}
          transition={{ ...squareTransition, delay: s.delay }}
          style={{ transformOrigin: `${s.x + 5}px ${s.y + 5}px` }}
        />
      ))}
      <motion.text
        x="50"
        y="20"
        fontFamily="system-ui,-apple-system,sans-serif"
        fontSize="18"
        dominantBaseline="central"
        letterSpacing="-0.3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
      >
        <tspan fontWeight="600" fill="#1a3167">
          project
        </tspan>
        <tspan fontWeight="300" fill="#1a3167">
          base
        </tspan>
      </motion.text>
    </svg>
  );
}
