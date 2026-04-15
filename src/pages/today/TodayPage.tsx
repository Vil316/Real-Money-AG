import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ActionCard } from '@/components/cards/ActionCard'
import { formatCurrency, calculateNetPosition, getActionItems, advanceDueDate } from '@/lib/utils'
import { useAccounts } from '@/hooks/useAccounts'
import { useBills } from '@/hooks/useBills'
import { useObligations } from '@/hooks/useObligations'
import { useSubscriptions } from '@/hooks/useSubscriptions'
import { useDebts } from '@/hooks/useDebts'
import { useSavings } from '@/hooks/useSavings'
import { useIncome } from '@/hooks/useIncome'
import { useProfile } from '@/hooks/useProfile'
import { Bell, PieChart, Plus, User, Settings, CreditCard, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/components/theme-provider'
import { ProfileDrawer } from '@/components/modals/ProfileDrawer'
import { AddMenuDrawer } from '@/components/modals/AddMenuDrawer'
import { AddAccountForm } from '@/components/modals/forms/AddAccountForm'
import { AddBillForm } from '@/components/modals/forms/AddBillForm'
import { AddDebtForm } from '@/components/modals/forms/AddDebtForm'
import { AddGoalForm } from '@/components/modals/forms/AddGoalForm'

export function TodayPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [activeActionForm, setActiveActionForm] = useState<string | null>(null)
  
  const { accounts } = useAccounts()
  const { bills, markPaid } = useBills()
  const { subscriptions } = useSubscriptions()
  const { debts } = useDebts()
  const { obligations, markDone } = useObligations()
  const { goals: savingsGoals } = useSavings()
  const { incomeEntries, logIncome } = useIncome()

  const { profile } = useProfile()

  const netPosition = calculateNetPosition(accounts)

  const actionItems = getActionItems({
    bills, subscriptions, debts, obligations, savingsGoals, incomeEntries, profile: profile ?? null
  })

  const [toasts, setToasts] = useState<string[]>([])

  const handleAction = (item: any) => {
    if (item.type === 'payday') {
      logIncome.mutate({ amount: profile?.income_amount || 0, payment_method: 'bank_transfer' })
      toast("Income logged! ✓")
    } else if (item.canMarkPaid) {
      if (item.referenceId) {
        const bill = bills.find(b => b.id === item.referenceId)
        if (bill) {
          markPaid.mutate({ id: bill.id, nextDueDate: advanceDueDate(bill.next_due_date, bill.frequency) })
          toast(`${bill.name} marked paid`)
        }
      }
    } else if (item.canMarkDone) {
      if (item.referenceId) {
        const ob = obligations.find(o => o.id === item.referenceId)
        if (ob) {
          markDone.mutate({ id: ob.id, amount: ob.amount || 0 })
          toast(`${ob.name} marked done`)
        }
      }
    }
  }

  const toast = (msg: string) => {
    setToasts(prev => [...prev, msg])
    setTimeout(() => setToasts(prev => prev.slice(1)), 3000)
  }

  return (
    <>
      {/* Header — Profile Left, Pill + Teal Add Button Right */}
      <div className="flex justify-between items-center mb-6 px-3 mt-4">
        <div 
          onClick={() => setIsProfileOpen(true)}
          className="w-12 h-12 rounded-full border border-border overflow-hidden bg-card/80 flex items-center justify-center p-0.5 shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
        >
          <div className="w-full h-full rounded-full bg-foreground/10 flex items-center justify-center">
            <User size={20} className="text-foreground/70" />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-card flex items-center px-4 py-2.5 rounded-full shadow-sm border border-border gap-4 h-[44px]">
            <PieChart size={18} className="text-foreground cursor-pointer hover:opacity-70" />
            <Bell size={18} className="text-foreground cursor-pointer hover:opacity-70" />
          </div>
          <button 
            onClick={() => setIsAddMenuOpen(true)}
            className="w-11 h-11 bg-[#0B8289] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="mb-4 px-4 mt-2">
        <p className="text-[12px] text-foreground/50 font-semibold uppercase tracking-wider mb-1">Total Balance</p>
        <h2 className="text-[44px] font-display font-semibold leading-none -tracking-[1.5px] text-foreground">
          {formatCurrency(netPosition)}
        </h2>
      </div>

      {accounts.length > 0 && (
        <div className="px-2 mb-2 pb-0">
          <div className="flex flex-col relative w-full pt-2">
            {accounts.map((account, index) => {
              const isBottom = index === accounts.length - 1;
              return (
                <div 
                  key={account.id}
                  onClick={() => navigate(`/accounts/${account.id}`)}
                  className="rounded-[24px] shadow-[0_-8px_20px_rgba(0,0,0,0.04)] relative cursor-pointer active:scale-[0.99] transition-transform overflow-hidden bg-card border border-border"
                  style={{
                    zIndex: index + 1,
                    marginTop: index === 0 ? 0 : '-100px',
                    height: isBottom ? '210px' : '160px' 
                  }}
                >
                  <div className="pt-5 px-6 pb-5 flex flex-col justify-between h-full relative z-10 w-full">
                    <div className="flex justify-between items-start w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground text-[18px] font-bold tracking-tight">{account.name}</span>
                        {account.type !== 'bank' && (
                          <span className="text-[9px] bg-foreground/5 text-foreground/60 font-bold uppercase tracking-widest py-0.5 px-2 rounded-sm border border-border/50">
                            {account.type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[20px] font-semibold text-foreground tracking-tight">
                          {formatCurrency(account.balance, account.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isBottom && (
                    <div className="absolute bottom-5 left-5 right-5 flex justify-between items-center z-10">
                      <div className="flex gap-2">
                        <button className="bg-foreground/5 hover:bg-foreground/10 text-foreground px-4 py-2 rounded-full text-[13px] font-semibold flex items-center gap-1.5 transition-colors border border-border">
                          <Plus size={14} strokeWidth={3} /> Add money
                        </button>
                        <button className="bg-foreground/5 hover:bg-foreground/10 text-foreground px-4 py-2 rounded-full text-[13px] font-semibold flex items-center gap-1.5 transition-colors border border-border">
                          <CreditCard size={14} /> Card
                        </button>
                      </div>
                      <button className="w-10 h-10 bg-foreground/5 hover:bg-foreground/10 text-foreground rounded-full flex items-center justify-center transition-colors border border-border border-dashed">
                        <span className="flex gap-0.5">
                          <div className="w-1 h-1 bg-foreground rounded-full"></div>
                          <div className="w-1 h-1 bg-foreground rounded-full"></div>
                          <div className="w-1 h-1 bg-foreground rounded-full"></div>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activity Feed Container */}
      <div className="bg-card rounded-t-[32px] rounded-b-[24px] border border-border mx-1 shadow-sm pt-6 pb-20 z-0 relative">
        <div className="px-6 flex justify-between items-center mb-6">
          <h3 className="text-[17px] font-bold text-foreground">Activity</h3>
          <div className="flex gap-1 cursor-pointer p-2 hover:bg-foreground/5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0B8289]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#0B8289]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#0B8289]"></div>
          </div>
        </div>
        
        <div className="px-2">
          <AnimatePresence>
            {actionItems.map((item, index) => (
              <motion.div 
                key={item.id} 
                layout 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="mb-2">
                  <ActionCard item={item} onAction={() => handleAction(item)} />
                </div>
              </motion.div>
            ))}
            {actionItems.length === 0 && (
              <div className="text-center py-8 opacity-50">
                <p className="text-sm font-medium">No recent activity.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="fixed bottom-28 left-0 right-0 flex flex-col items-center pointer-events-none z-50 space-y-2 px-4">
        <AnimatePresence>
          {toasts.map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-foreground text-background text-[13px] font-medium px-5 py-3 rounded-full flex items-center justify-between shadow-2xl pointer-events-auto min-w-[200px]">
              <span>{t}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <AddMenuDrawer 
        isOpen={isAddMenuOpen} 
        onClose={() => setIsAddMenuOpen(false)} 
        onSelectAction={(actionId) => setActiveActionForm(actionId)}
      />
      <AddAccountForm isOpen={activeActionForm === 'account'} onClose={() => setActiveActionForm(null)} />
      <AddBillForm isOpen={activeActionForm === 'bill'} onClose={() => setActiveActionForm(null)} />
      <AddDebtForm isOpen={activeActionForm === 'debt'} onClose={() => setActiveActionForm(null)} />
      <AddGoalForm isOpen={activeActionForm === 'goal'} onClose={() => setActiveActionForm(null)} />
    </>
  )
}
