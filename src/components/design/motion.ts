import type { Transition, Variants } from 'framer-motion'

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 28,
  mass: 0.8,
}

export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 340,
  damping: 24,
  mass: 0.72,
}

export function fadeUp(delay = 0, distance = 10): Variants {
  return {
    initial: { opacity: 0, y: distance },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.24, delay, ease: 'easeOut' },
    },
    exit: {
      opacity: 0,
      y: distance * 0.6,
      transition: { duration: 0.18, ease: 'easeOut' },
    },
  }
}

export function fadeIn(delay = 0): Variants {
  return {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: 0.22, delay, ease: 'easeOut' },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.16, ease: 'easeOut' },
    },
  }
}

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
}
