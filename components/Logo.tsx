"use client";

import { motion } from "framer-motion";

const squareTransition = {
  duration: 0.3,
  ease: "easeOut" as const,
};

/** Scale: 1.125 vs 160×40 (180×45) */
const S = 1.125;

export function Logo({ className }: { className?: string }) {
  const squares: {
    x: number;
    y: number;
    opacity: number;
    delay: number;
  }[] = [
    { x: 8 * S, y: 8 * S, opacity: 1, delay: 0 },
    { x: 22 * S, y: 8 * S, opacity: 0.5, delay: 0.08 },
    { x: 8 * S, y: 22 * S, opacity: 0.5, delay: 0.16 },
    { x: 22 * S, y: 22 * S, opacity: 1, delay: 0.24 },
  ];

  const sqSize = 10 * S;
  const sqRx = 2 * S;
  const sqHalf = sqSize / 2;

  return (
    <svg
      width="180"
      height="45"
      viewBox="0 0 180 45"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="0"
        y="0"
        width={40 * S}
        height={40 * S}
        rx={7 * S}
        fill="#1a3167"
      />
      {squares.map((s) => (
        <motion.rect
          key={`${s.x}-${s.y}`}
          x={s.x}
          y={s.y}
          width={sqSize}
          height={sqSize}
          rx={sqRx}
          fill="#cce8f4"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: s.opacity, scale: 1 }}
          transition={{ ...squareTransition, delay: s.delay }}
          style={{
            transformOrigin: `${s.x + sqHalf}px ${s.y + sqHalf}px`,
          }}
        />
      ))}
      <motion.text
        x={50 * S}
        y={20 * S}
        fontFamily="system-ui,-apple-system,sans-serif"
        fontSize={18 * S}
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
