import React from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'

interface GlassCardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'green' | 'amber' | 'red'
  children: React.ReactNode
}

export function GlassCard({ variant = 'default', className, children, ...props }: GlassCardProps) {
  const variantClass = {
    default: 'glass',
    green: 'glass glass-green',
    amber: 'glass glass-amber',
    red: 'glass glass-red',
  }[variant]

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={cn(variantClass, className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}
