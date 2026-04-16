import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Wallet, PieChart, Target, CreditCard } from 'lucide-react'
import { motion, useScroll, useMotionValueEvent, type Transition } from 'framer-motion'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Today', path: '/today', icon: Home },
  { label: 'Accounts', path: '/accounts', icon: Wallet },
  { label: 'Money', path: '/money', icon: PieChart },
  { label: 'Savings', path: '/savings', icon: Target },
  { label: 'Debts', path: '/debts', icon: CreditCard },
]

const springConfig: Transition = { type: 'spring', stiffness: 350, damping: 28, mass: 0.8 }

export function BottomNav() {
  const location = useLocation()
  const { scrollY } = useScroll()
  const [scrolled, setScrolled] = useState(false)

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 15)
  })

  return (
    <div className="fixed bottom-6 left-0 right-0 px-4 z-50 flex justify-center pointer-events-none">
      <motion.nav 
        layout
        transition={springConfig}
        className={cn(
          "flex items-center justify-between pointer-events-auto overflow-hidden rounded-full border border-white/[0.08] bg-[#111418]/88 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl",
          scrolled ? "gap-2 p-[8px]" : "w-full max-w-sm gap-1 p-[6px]"
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)

          return (
            <motion.div
              layout
              transition={springConfig}
              key={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-full overflow-hidden",
                scrolled ? "w-12 h-12 flex-none" : "flex-1 py-[10px] w-full"
              )}
            >
              <Link
                to={item.path}
                className={cn(
                  "absolute inset-0 z-20 rounded-full transition-colors duration-300",
                  isActive
                    ? "bg-[#0B8289]/16 shadow-[inset_0_0_0_1px_rgba(11,130,137,0.26),0_0_24px_rgba(11,130,137,0.18)]"
                    : "hover:bg-white/[0.04]"
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              />
              
              <motion.div layout="position" transition={springConfig} className={cn("relative z-10 pointer-events-none transition-colors duration-300", isActive ? "text-white" : "text-white/40")}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </motion.div>
              
              <motion.span
                layout="position"
                transition={springConfig}
                initial={false}
                animate={{ 
                  height: scrolled ? 0 : "auto",
                  opacity: scrolled ? 0 : (isActive ? 1 : 0.8),
                  scale: scrolled ? 0.8 : 1,
                  filter: scrolled ? "blur(4px)" : "blur(0px)",
                  marginTop: scrolled ? 0 : 2
                }}
                className={cn(
                  "text-[10px] font-medium tracking-wide block overflow-hidden relative z-10 pointer-events-none transition-colors duration-300 whitespace-nowrap",
                  isActive ? "text-white" : "text-white/50"
                )}
              >
                {item.label}
              </motion.span>
            </motion.div>
          )
        })}
      </motion.nav>
    </div>
  )
}
