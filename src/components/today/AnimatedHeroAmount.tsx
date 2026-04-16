import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type AnimatedHeroAmountProps = {
  value: number
  formatValue: (value: number) => string
}

export function AnimatedHeroAmount({ value, formatValue }: AnimatedHeroAmountProps) {
  const prefersReducedMotion = useReducedMotion()
  const [displayValue, setDisplayValue] = useState(value)
  const previousValueRef = useRef(value)
  const renderedValue = prefersReducedMotion ? value : displayValue

  useEffect(() => {
    if (prefersReducedMotion) {
      previousValueRef.current = value
      return
    }

    const start = previousValueRef.current
    const end = value
    const delta = end - start
    const duration = 620
    const startTime = performance.now()
    let frame = 0

    const tick = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      setDisplayValue(start + delta * eased)

      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      } else {
        previousValueRef.current = end
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, prefersReducedMotion])

  return (
    <motion.h1
      key={value}
      initial={prefersReducedMotion ? { opacity: 0.9 } : { opacity: 0.84, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="text-[46px] font-semibold leading-none tracking-[-0.06em] text-white"
    >
        {formatValue(renderedValue)}
    </motion.h1>
  )
}
