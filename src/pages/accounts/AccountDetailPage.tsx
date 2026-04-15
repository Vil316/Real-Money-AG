import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Plus, Send, MoreHorizontal, Store, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { AddTransactionForm } from '@/components/modals/forms/AddTransactionForm'

export function AccountDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const { accounts, isLoading: accLoad } = useAccounts()
  const { transactions, isLoading: txLoad } = useTransactions(id)
  
  const account = accounts.find(a => a.id === id)

  if (accLoad) return <div className="p-8 text-foreground text-center">Loading account...</div>
  if (!account) return <div className="p-8 text-foreground text-center">Account not found or access denied</div>

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 nav-glass px-4 py-3 flex items-center justify-between h-14">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-foreground/5 text-foreground active:scale-95 transition-transform -ml-2">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <span className="font-semibold text-foreground text-base">{account.name}</span>
        <div className="w-10" />
      </div>

      {/* Hero Card */}
      <div className="px-5 py-6 flex justify-center">
        <div 
          className="w-full max-w-[320px] aspect-[1.586/1] rounded-[20px] p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden"
          style={{ backgroundColor: account.colour || '#10b981' }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          
          <div className="relative z-10 flex justify-between items-start">
             <span className="text-white/90 font-semibold tracking-wider text-sm">RealMoney</span>
             <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center text-xl shadow-inner border border-white/20">
              {account.type === 'bank' ? '🏦' : account.type === 'credit_card' ? '💳' : account.type === 'savings' ? '💰' : '📋'}
             </div>
          </div>

          <div className="relative z-10">
            <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1.5 opacity-90">Balance</p>
            <p className="text-3xl font-display font-semibold -tracking-[1px] text-white">
              {formatCurrency(account.balance, account.currency)}
            </p>
            {(account.type === 'bank' || account.type === 'credit_card') && (
              <p className="text-white/60 text-[12px] font-mono tracking-widest mt-3">•••• •••• •••• {account.id.substring(account.id.length - 4).padStart(4, '0')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-7 px-5 mb-8">
        <button onClick={() => setIsAddOpen(true)} className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center shadow-sm text-foreground group-active:scale-95 transition-transform"><Plus size={24} strokeWidth={2}/></div>
          <span className="text-[11px] font-semibold text-foreground/70">Add Log</span>
        </button>
        <button className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center shadow-sm text-foreground group-active:scale-95 transition-transform"><Send size={22} strokeWidth={2}/></div>
          <span className="text-[11px] font-semibold text-foreground/70">Transfer</span>
        </button>
        <button className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center shadow-sm text-foreground group-active:scale-95 transition-transform"><MoreHorizontal size={24} strokeWidth={2}/></div>
          <span className="text-[11px] font-semibold text-foreground/70">Manage</span>
        </button>
      </div>

      {/* Transactions Feed */}
      <div className="px-3 pb-32">
        <h3 className="text-lg text-foreground font-semibold mb-3 px-2">History</h3>
        
        {txLoad ? (
          <div className="text-center py-8">
            <RefreshCw className="animate-spin text-foreground/20 mx-auto" size={24} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-foreground/40 text-sm font-medium">No transactions logged yet.</p>
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
            {transactions.map((t, idx) => (
              <div key={t.id} className={`p-4 flex items-center justify-between hover:bg-foreground/5 cursor-pointer transition-colors active:bg-foreground/10 ${idx !== transactions.length - 1 ? 'border-b border-border' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-foreground/5 border border-border flex items-center justify-center text-foreground shrink-0">
                    <Store size={18} />
                  </div>
                  <div>
                    <h4 className="text-foreground font-medium text-[15px]">{t.merchant}</h4>
                    <p className="text-foreground/50 text-[12px] font-medium mt-0.5">{format(new Date(t.date), 'dd MMM yyyy')} {t.is_pending ? '· Pending' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-[16px] -tracking-[0.4px] ${t.amount > 0 ? 'text-[#30D158]' : 'text-foreground'}`}>
                    {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount, account.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddTransactionForm isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} accountId={account.id} />
    </div>
  )
}
