import { Plus } from 'lucide-react'
import { useDebts } from '@/hooks/useDebts'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { LogPaymentForm } from '@/components/modals/forms/LogPaymentForm'

export function DebtsPage() {
  const { debts, isLoading, markBNPLPaid } = useDebts()
  const [activeDebtId, setActiveDebtId] = useState<string | null>(null)

  if (isLoading) return <div className="text-foreground/50 text-center py-4 font-medium text-sm">Syncing debts...</div>

  const totalDebt = debts.reduce((sum, d) => sum + Number(d.current_balance), 0)
  const isHighDebt = totalDebt > 1000

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-5 pt-6 pb-2 shrink-0 flex justify-between items-center">
        <h1 className="text-2xl font-display font-semibold -tracking-[0.5px] text-foreground">Debts</h1>
        <button className="w-9 h-9 bg-foreground text-background rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all">
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="px-5 mb-8 mt-4 shrink-0">
        <p className="text-[12px] text-foreground/50 font-semibold uppercase tracking-wider mb-1">Total Outstanding</p>
        <p className={`text-[44px] font-display font-semibold leading-none -tracking-[1.5px] ${isHighDebt ? 'text-[#FF453A]' : 'text-foreground'}`}>
          {formatCurrency(totalDebt)}
        </p>
      </div>

      <div className="space-y-5 flex-1 overflow-y-auto pb-32 hide-scrollbar px-5">
        {debts.map(debt => {
          const original = Number(debt.original_balance)
          const current = Number(debt.current_balance)
          const percentPaid = Math.min(100, Math.round(((original - current) / original) * 100))
          const isSettled = current === 0

          return (
            <div 
              key={debt.id} 
              className="bg-card rounded-[24px] pt-5 px-6 pb-5 shadow-[0_-8px_20px_rgba(0,0,0,0.02)] border border-border relative overflow-hidden"
            >
              {/* Header Row */}
              <div className="flex justify-between items-start mb-6 relative z-10 w-full">
                <div className="flex items-center gap-2">
                  <h4 className="text-foreground text-[18px] font-bold tracking-tight">{debt.creditor_name}</h4>
                  <div className="flex gap-1 flex-wrap">
                    <span className="text-[9px] bg-foreground/5 text-foreground/60 font-bold uppercase tracking-widest py-0.5 px-2 rounded-sm border border-border/50">
                      {debt.type.replace('_', ' ')}
                    </span>
                    {debt.is_interest_free && (
                      <span className="text-[9px] bg-[#FF9F0A]/10 text-[#FF9F0A] font-bold uppercase tracking-widest py-0.5 px-2 rounded-sm border border-[#FF9F0A]/20">
                        0% APR
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-[20px] font-semibold tracking-tight ${isSettled ? 'text-[#30D158]' : 'text-foreground'}`}>
                    {isSettled ? '✓ Settled' : formatCurrency(current)}
                  </p>
                   <p className="text-[10px] text-foreground/40 font-medium mt-0.5 uppercase tracking-wider">of {formatCurrency(original)}</p>
                </div>
              </div>

              {/* Snowball Runway Track — fills as debt reduces */}
              <div className="relative z-10 w-full bg-foreground/5 rounded-full h-3 overflow-hidden mt-5 mb-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentPaid}%` }}
                  transition={{ type: 'spring', damping: 20 }}
                  className={`h-full rounded-full ${isSettled ? 'bg-[#30D158]' : 'bg-foreground/40'}`}
                />
              </div>
              <div className="flex justify-between items-center relative z-10">
                <span className="text-[11px] text-foreground/40 font-medium">{percentPaid}% paid off</span>
                {!isSettled && debt.minimum_payment && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveDebtId(debt.id)}
                    className="bg-foreground text-background px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide shadow-sm"
                  >
                    Log Payment
                  </motion.button>
                )}
                {!isSettled && !debt.minimum_payment && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveDebtId(debt.id)}
                    className="bg-foreground text-background px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide shadow-sm"
                  >
                    Log Payment
                  </motion.button>
                )}
              </div>

              {/* Klarna BNPL Instalment Pips */}
              {debt.type === 'bnpl' && debt.bnpl_instalments && (
                <div className="mt-4 relative z-10">
                  <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mb-2">Instalments</p>
                  <div className="flex gap-2">
                    {debt.bnpl_instalments.map((inst: any, i: number) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          const updated = debt.bnpl_instalments!.map((x: any, xi: number) =>
                            xi === i ? { ...x, paid: !x.paid } : x
                          )
                          markBNPLPaid.mutate({ debtId: debt.id, instalments: updated })
                        }}
                        className={`flex-1 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold border transition-all ${
                          inst.paid 
                            ? 'bg-[#30D158]/15 border-[#30D158]/30 text-[#30D158]' 
                            : 'bg-foreground/5 border-border text-foreground/40'
                        }`}
                      >
                        {inst.paid ? '✓' : `#${i + 1}`}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {debts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-[#30D158]/10 border border-[#30D158]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
            <p className="font-semibold text-foreground mb-1">Debt Free!</p>
            <p className="text-sm text-foreground/50">You have no outstanding debts. Great job!</p>
          </div>
        )}
      </div>

      <LogPaymentForm 
        isOpen={!!activeDebtId} 
        onClose={() => setActiveDebtId(null)} 
        debtId={activeDebtId || ''} 
        suggestedAmount={debts.find(d => d.id === activeDebtId)?.minimum_payment}
      />
    </div>
  )
}
