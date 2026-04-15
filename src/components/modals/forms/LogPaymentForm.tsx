import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Button } from '../../ui/button'
import { useDebts } from '@/hooks/useDebts'
import { useAccounts } from '@/hooks/useAccounts'

export function LogPaymentForm({ isOpen, onClose, debtId, suggestedAmount }: { isOpen: boolean, onClose: () => void, debtId: string, suggestedAmount?: number }) {
  const { logPayment } = useDebts()
  const { accounts } = useAccounts()
  
  const [amount, setAmount] = useState(suggestedAmount?.toString() || '')
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !accountId) return;
    
    logPayment.mutate({
      debtId,
      amount: Number(amount),
      accountId
    }, {
      onSuccess: () => {
        setAmount('');
        onClose();
      }
    })
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Log Liability Payment">
      <form onSubmit={handleSubmit} className="space-y-6 mt-4 pb-4">
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Payment Amount</Label>
          <Input 
            type="number" 
            step="0.01" 
            placeholder="£0.00" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            required 
            autoFocus
            className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent font-medium"
          />
        </div>

        <div className="space-y-3 pt-2">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Source Account</Label>
          <div className="grid grid-cols-1 gap-2">
            {accounts.filter(a => a.type === 'bank' || a.type === 'cash').map(acc => (
               <button 
                  type="button" 
                  key={acc.id} 
                  onClick={() => setAccountId(acc.id)} 
                  className={`p-4 rounded-2xl transition-all border text-left flex justify-between tracking-wide ${accountId === acc.id ? 'bg-foreground text-background border-foreground shadow-md' : 'bg-transparent border-border text-foreground/80 hover:bg-foreground/5'}`}
                >
                 <span className="font-bold text-[14px]">{acc.name}</span>
                 <span className="font-medium text-[13px] opacity-70">£{acc.balance} available</span>
               </button>
            ))}
          </div>
        </div>

        <div className="pt-6">
          <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-[15px] shadow-sm active:scale-95 transition-transform bg-rose-600 hover:bg-rose-700 text-white">
            Execute Payment
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
