import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Button } from '../../ui/button'
import { useSavings } from '@/hooks/useSavings'
import { useAccounts } from '@/hooks/useAccounts'

export function AddContributionForm({ isOpen, onClose, goalId, suggestedAmount }: { isOpen: boolean, onClose: () => void, goalId: string, suggestedAmount?: number }) {
  const { addContribution } = useSavings()
  const { accounts } = useAccounts()
  
  const [amount, setAmount] = useState(suggestedAmount?.toString() || '')
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !accountId) return;
    
    addContribution.mutate({
      goalId,
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Add Contribution">
      <form onSubmit={handleSubmit} className="space-y-6 mt-4 pb-4">
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Deposit Amount</Label>
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
          <Label className="text-xs uppercase tracking-widest text-foreground/50">From Account</Label>
          <div className="grid grid-cols-1 gap-2">
            {accounts.filter(a => a.type === 'bank' || a.type === 'cash').map(acc => (
               <button 
                  type="button" 
                  key={acc.id} 
                  onClick={() => setAccountId(acc.id)} 
                  className={`p-4 rounded-2xl transition-all border text-left flex justify-between tracking-wide ${accountId === acc.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-transparent border-border text-foreground/80 hover:bg-foreground/5'}`}
                >
                 <span className="font-bold text-[14px]">{acc.name}</span>
                 <span className="font-medium text-[13px] opacity-70">£{acc.balance} available</span>
               </button>
            ))}
          </div>
        </div>

        <div className="pt-6">
          <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-[15px] shadow-sm active:scale-95 transition-transform bg-foreground hover:bg-foreground/90 text-background">
            Transfer Funds
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
