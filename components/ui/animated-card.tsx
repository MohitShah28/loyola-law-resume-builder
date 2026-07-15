"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  delay?: number
  hover?: boolean
}

export function AnimatedCard({ children, className, delay = 0, hover = true }: AnimatedCardProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={hover ? { y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" } : undefined}
      className={cn(
        "bg-card rounded-xl border border-border p-6 transition-shadow",
        className
      )}
    >
      {children}
    </motion.div>
  )
}
