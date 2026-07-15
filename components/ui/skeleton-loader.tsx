"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SkeletonLoaderProps {
  className?: string
  variant?: "text" | "circle" | "rect"
}

export function SkeletonLoader({ className, variant = "rect" }: SkeletonLoaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "bg-muted",
        variant === "circle" && "rounded-full",
        variant === "text" && "h-4 rounded",
        variant === "rect" && "rounded-lg",
        className
      )}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <SkeletonLoader className="h-4 w-24" variant="text" />
      <SkeletonLoader className="h-8 w-16" variant="text" />
      <SkeletonLoader className="h-3 w-32" variant="text" />
    </div>
  )
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border">
      <SkeletonLoader className="h-10 w-10" variant="circle" />
      <div className="flex-1 space-y-2">
        <SkeletonLoader className="h-4 w-48" variant="text" />
        <SkeletonLoader className="h-3 w-32" variant="text" />
      </div>
      <SkeletonLoader className="h-6 w-16" variant="text" />
    </div>
  )
}
