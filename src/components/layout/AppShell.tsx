import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'

export function AppShell() {
  const location = useLocation()

  return (
    <>
      <div className="pb-28 pt-6 px-4 max-w-md mx-auto min-h-[100dvh] flex flex-col relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex-1 flex flex-col h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav />
    </>
  )
}
