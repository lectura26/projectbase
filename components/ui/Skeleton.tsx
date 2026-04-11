"use client";

import { motion } from "framer-motion";

export function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      className={className ? `rounded-[4px] ${className}` : "rounded-[4px]"}
      style={{
        background: "linear-gradient(90deg, #e8e8e8 25%, #f3f4f6 50%, #e8e8e8 75%)",
        backgroundSize: "200% 100%",
      }}
      animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
    />
  );
}
