import { useState } from 'react'
import { useBills } from '@/hooks/useBills'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useIncome } from '@/hooks/useIncome'
import { formatCurrency, advanceDueDate, daysUntil, dueDateLabel, totalBillsThisMonth, totalActiveSubscriptions, totalCancelledSavings } from '@/lib/utils'
import { Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

function BillsTab() {
  const { bills, isLoading, markPaid } = useBills()
  if (isLoading) return <div className="text-foreground/50 text-center py-4 font-medium text-sm">Syncing...</div>

  const total = totalBillsThisMonth(bills)
  
  return (
    <div className="space-y-4">
      <div className="bg-card rounded-[20px] p-5 text-center border border-border shadow-sm">
        <p className="text-foreground/50 text-[11px] uppercase tracking-widest font-bold mb-1">Monthly Total</p>
        <p className="text-4xl font-display font-semibold -tracking-[1px] text-foreground">{formatCurrency(total)}</p>
      </div>

      <div className="bg-card rounded-[20px] border border-border overflow-hidden shadow-sm">
        <AnimatePresence>
          {bills.map((bill, i) => {
            const dueDays = daysUntil(bill.next_due_date)
            const isDueSoon = dueDays >= 0 && dueDays <= 3 && !bill.is_paid_this_cycle
            const isLate = dueDays < 0 && !bill.is_paid_this_cycle

            return (
              <motion.div key={bill.id} layout exit={{ opacity: 0, scale: 0.9 }}>
                <div className={`p-4 flex items-center justify-between ${bill.is_paid_this_cycle ? 'opacity-40' : ''} ${i !== bills.length - 1 ? 'border-b border-border' : ''}`}>
                  <div>
                    <h4 className="text-foreground font-semibold text-[15px]">{bill.name}</h4>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-[9px] bg-foreground/5 border border-border/50 text-foreground/60 font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest">{bill.frequency}</span>
                      <span className={`text-[12px] font-medium ${isLate ? 'text-[#FF453A]' : isDueSoon ? 'text-[#FF9F0A]' : 'text-foreground/40'}`}>
                        {dueDateLabel(bill.next_due_date)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="font-semibold text-lg -tracking-[0.3px]">{formatCurrency(bill.amount)}</p>
                    {!bill.is_paid_this_cycle && (
                      <button 
                        onClick={() => markPaid.mutate({ id: bill.id, nextDueDate: advanceDueDate(bill.next_due_date, bill.frequency) })}
                        className="bg-foreground/5 border border-border hover:bg-foreground/10 text-foreground px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wide mt-2 transition-colors"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
      
      <button className="w-full py-4 bg-foreground/5 border border-dashed border-border/50 rounded-xl text-foreground/60 font-bold hover:bg-foreground/10 transition-colors flex items-center justify-center gap-2">
        <Plus size={18} strokeWidth={2.5}/> Add Bill
      </button>
    </div>
  )
}

function SubscriptionsTab() {
  const { subscriptions, isLoading } = useSubscriptions()
  if (isLoading) return <div className="text-foreground/50 text-center py-4 font-medium text-sm">Syncing...</div>

  const active = subscriptions.filter(s => s.status === 'active')
  const cancelled = subscriptions.filter(s => s.status === 'cancelled')
  const totalActive = totalActiveSubscriptions(subscriptions)
  const totalSaved = totalCancelledSavings(subscriptions)

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-[20px] p-5 text-center border border-border shadow-sm">
        <p className="text-foreground/50 text-[11px] uppercase tracking-widest font-bold mb-1">Monthly Active</p>
        <p className="text-4xl font-display font-semibold -tracking-[1px] text-foreground">{formatCurrency(totalActive)}</p>
      </div>

      {totalSaved > 0 && (
        <div className="bg-[#30D158]/10 border border-[#30D158]/20 rounded-2xl p-4 text-center">
          <p className="text-[13px] text-[#30D158] font-semibold tracking-wide">You've freed up {formatCurrency(totalSaved)}/month</p>
        </div>
      )}

      <div className="bg-card rounded-[20px] border border-border overflow-hidden shadow-sm">
        {active.map((sub, i) => (
          <div key={sub.id} className={`p-4 flex items-center justify-between ${i !== active.length - 1 ? 'border-b border-border' : ''}`}>
            <div>
              <h4 className="text-foreground font-semibold text-[15px]">{sub.name}</h4>
              <p className="text-foreground/40 text-[12px] font-medium mt-1 capitalize">{sub.category} • {dueDateLabel(sub.next_billing_date)}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-lg -tracking-[0.3px]">{formatCurrency(sub.amount)}</p>
            </div>
          </div>
        ))}
      </div>
      
      {cancelled.length > 0 && (
        <div className="mt-6 mb-2">
          <h4 className="text-foreground/40 text-[11px] font-bold uppercase tracking-widest pl-2 mb-3">Cancelled</h4>
          <div className="space-y-2">
            {cancelled.map(sub => (
              <div key={sub.id} className="p-3 flex justify-between opacity-60 bg-card rounded-[14px] border border-border">
                <span className="text-foreground font-medium line-through">{sub.name}</span>
                <span className="text-foreground/60 font-semibold">{formatCurrency(sub.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="w-full py-4 border border-dashed border-foreground/20 rounded-2xl text-foreground/50 font-semibold hover:bg-foreground/5 transition-colors flex items-center justify-center gap-2 mt-4">
        <Plus size={18} strokeWidth={2.5}/> Add Subscription
      </button>
    </div>
  )
}

function IncomeTab() {
  const { incomeEntries, isLoading, logIncome } = useIncome()
  if (isLoading) return <div className="text-foreground/50 text-center py-4 font-medium text-sm">Syncing...</div>

  // Mock past 4 weeks logic for the CSS velocity chart
  const weeklyTotals = [400, 380, 420, 400]
  const maxVal = Math.max(...weeklyTotals)

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-[20px] p-5 pt-6 border border-border shadow-sm flex flex-col items-center">
        <p className="text-foreground/50 text-[11px] uppercase tracking-widest font-bold mb-1">Expected Weekly</p>
        <p className="text-4xl font-display font-semibold -tracking-[1px] text-foreground">£400.00</p>
        
        {/* CSS Velocity Chart */}
        <div className="w-full mt-8 flex items-end justify-between h-32 px-2 gap-3">
          {weeklyTotals.map((val, i) => {
            const heightPct = (val / maxVal) * 100
            return (
              <div key={i} className="flex flex-col items-center flex-1 gap-2 border-b-2 border-border h-full relative">
                <div className="absolute -top-6 text-foreground/40 text-[10px] font-bold">£{val}</div>
                <div className="w-full relative flex items-end overflow-hidden h-full">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ type: 'spring', damping: 20 }}
                    className="w-full bg-foreground rounded-t-sm"
                  />
                </div>
                <div className="absolute -bottom-6 text-foreground/40 text-[10px] font-bold">W{i+1}</div>
              </div>
            )
          })}
        </div>
        <div className="h-6" /> {/* Spacer for bottom labels */}
      </div>

      <div>
        <h4 className="text-foreground/40 text-[11px] font-bold uppercase tracking-widest pl-2 mb-3 mt-6">Recent Pay Logs</h4>
        <div className="bg-card rounded-[20px] border border-border overflow-hidden shadow-sm">
          {incomeEntries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-foreground/50 text-sm font-medium">No income logged.</p>
            </div>
          ) : (
            incomeEntries.map((inc, i) => (
              <div key={inc.id} className={`p-4 flex items-center justify-between hover:bg-foreground/5 ${i !== incomeEntries.length - 1 ? 'border-b border-border' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#30D158]/10 text-[#30D158] flex flex-col items-center justify-center font-bold text-lg shrink-0">
                    ↓
                  </div>
                  <div>
                    <h4 className="text-foreground font-semibold text-[15px] capitalize">{inc.payment_method.replace('_', ' ')}</h4>
                    <p className="text-foreground/40 text-[12px] font-medium mt-0.5">{format(new Date(inc.date), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[16px] -tracking-[0.4px] text-[#30D158]">+{formatCurrency(inc.amount)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <button 
        onClick={() => logIncome.mutate({ amount: 400, payment_method: 'bank_transfer' })}
        className="w-full py-4 bg-foreground text-background rounded-[16px] font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 mt-4 shadow-xl"
      >
        <Plus size={18} strokeWidth={2.5}/> Log £400 Income Now
      </button>
    </div>
  )
}

export function MoneyPage() {
  const [activeTab, setActiveTab] = useState<'bills'|'subs'|'income'>('bills')

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-2 shrink-0 flex justify-between items-center">
        <h1 className="text-2xl font-display font-semibold -tracking-[0.5px] text-foreground">Money</h1>
        <button className="w-9 h-9 bg-foreground text-background rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all">
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="px-5 mb-5 shrink-0">
        <div className="flex bg-foreground/5 p-1 rounded-[16px] border border-border relative overflow-hidden">
          <button 
            onClick={() => setActiveTab('bills')} 
            className={`flex-1 py-2.5 rounded-[12px] text-[12px] font-bold tracking-wide transition-all z-10 ${activeTab === 'bills' ? 'text-background' : 'text-foreground/50 hover:text-foreground/80'}`}
          >
            Bills
          </button>
          <button 
            onClick={() => setActiveTab('subs')} 
            className={`flex-1 py-2.5 rounded-[12px] text-[12px] font-bold tracking-wide transition-all z-10 ${activeTab === 'subs' ? 'text-background' : 'text-foreground/50 hover:text-foreground/80'}`}
          >
            Subscr.
          </button>
          <button 
            onClick={() => setActiveTab('income')} 
            className={`flex-1 py-2.5 rounded-[12px] text-[12px] font-bold tracking-wide transition-all z-10 ${activeTab === 'income' ? 'text-background' : 'text-foreground/50 hover:text-foreground/80'}`}
          >
            Income
          </button>
          
          {/* Animated Background Pill */}
          <motion.div
            className="absolute top-1 bottom-1 w-[calc(33.33%-2.66px)] bg-foreground rounded-[12px] shadow-sm z-0"
            animate={{ 
              x: activeTab === 'bills' ? '0px' : activeTab === 'subs' ? '100%' : '200%' 
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32 hide-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'bills' && <BillsTab />}
            {activeTab === 'subs' && <SubscriptionsTab />}
            {activeTab === 'income' && <IncomeTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
