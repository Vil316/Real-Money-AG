import { PageHeader } from '@/components/layout/PageHeader'
import { Plus } from 'lucide-react'
import { useSavings } from '@/hooks/useSavings'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { AddContributionForm } from '@/components/modals/forms/AddContributionForm'

export function SavingsPage() {
  const { goals, isLoading } = useSavings()
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null)

  if (isLoading) return <div className="text-foreground/50 text-center py-4 font-medium text-sm">Syncing pots...</div>

  const totalSaved = goals.reduce((sum, g) => sum + Number(g.current_amount), 0)

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-5 pt-6 pb-2 shrink-0 flex justify-between items-center">
        <h1 className="text-2xl font-display font-semibold -tracking-[0.5px] text-foreground">Savings</h1>
        <button className="w-9 h-9 bg-foreground text-background rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all">
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="px-5 mb-8 mt-4 shrink-0">
        <p className="text-[12px] text-foreground/50 font-semibold uppercase tracking-wider mb-1">Total Accumulated</p>
        <p className="text-[44px] font-display font-semibold leading-none -tracking-[1.5px] text-foreground">
          {formatCurrency(totalSaved)}
        </p>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pb-32 hide-scrollbar px-3">
        {goals.map(goal => {
          const percent = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
          const isComplete = goal.is_completed || percent >= 100

          return (
            <div 
              key={goal.id} 
              className="bg-card rounded-[24px] pt-5 px-6 pb-5 shadow-[0_-8px_20px_rgba(0,0,0,0.02)] border border-border relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6 w-full">
                <div className="flex items-center gap-2">
                  <h4 className="text-foreground text-[18px] font-bold tracking-tight">{goal.name}</h4>
                  {goal.is_challenge && 
                    <span className="text-[9px] bg-foreground/5 text-foreground/60 font-bold uppercase tracking-widest py-0.5 px-2 rounded-sm border border-border/50">
                      Challenge
                    </span>
                  }
                </div>
                {!isComplete && (
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveGoalId(goal.id)}
                    className="bg-foreground/5 hover:bg-foreground/10 text-foreground px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wide border border-border transition-colors"
                  >
                    + {formatCurrency(goal.weekly_contribution)}
                  </motion.button>
                )}
                {isComplete && (
                  <div className="bg-[#30D158] text-background px-3 py-1 text-[11px] font-bold tracking-wide rounded-md">
                    ✓ Reached
                  </div>
                )}
              </div>

              {/* Progress Engine */}
              <div className="w-full bg-foreground/5 rounded-full h-3 overflow-hidden mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ type: 'spring', damping: 20 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: goal.colour || '#000' }}
                />
              </div>

              <div className="flex justify-between items-center mt-2">
                <span className="text-[12px] font-medium text-foreground/50">
                  <span className="text-foreground font-bold">{formatCurrency(goal.current_amount)}</span> / {formatCurrency(goal.target_amount)}
                </span>
                <span className="text-[13px] font-bold tracking-tight" style={{ color: percent >= 100 ? goal.colour : 'var(--foreground)' }}>
                  {percent}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
      
      <AddContributionForm 
        isOpen={!!activeGoalId} 
        onClose={() => setActiveGoalId(null)} 
        goalId={activeGoalId || ''} 
        suggestedAmount={goals.find(g => g.id === activeGoalId)?.weekly_contribution || 0}
      />
    </div>
  )
}
