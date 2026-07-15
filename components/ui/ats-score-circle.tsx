"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface AtsScoreCircleProps {
  score: number
  size?: "sm" | "md" | "lg"
  className?: string
}

export function AtsScoreCircle({ score, size = "md", className }: AtsScoreCircleProps) {
  const sizes = {
    sm: { width: 80, stroke: 6, fontSize: "text-lg" },
    md: { width: 120, stroke: 8, fontSize: "text-2xl" },
    lg: { width: 160, stroke: 10, fontSize: "text-4xl" }
  }

  const { width, stroke, fontSize } = sizes[size]
  const radius = (width - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const getScoreColor = (score: number) => {
    if (score >= 85) return "#10b981" // green
    if (score >= 70) return "#f59e0b" // amber
    return "#ef4444" // red
  }

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={width} height={width} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted"
        />
        {/* Progress circle */}
        <motion.circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={cn("font-bold", fontSize)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ color: getScoreColor(score) }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground">ATS Score</span>
      </div>
    </div>
  )
}
