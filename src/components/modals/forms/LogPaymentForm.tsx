import { useEffect, useMemo, useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Button } from '../../ui/button'
import { useDebts } from '@/hooks/useDebts'
import { useAccounts } from '@/hooks/useAccounts'

export function LogPaymentForm({ isOpen, onClose, debtId, suggestedAmount }: { isOpen: boolean, onClose: () => void, debtId: string, suggestedAmount?: number }) {
  const { logPayment } = useDebts()
  const { accounts } = useAccounts()

  const fundingAccounts = useMemo(
    () => accounts.filter(a => a.type === 'bank' || a.type === 'cash'),
    [accounts],
  )
  
  const [amount, setAmount] = useState(suggestedAmount?.toString() || '')
  const [accountId, setAccountId] = useState('')

  useEffect(() => {
    if (!isOpen) return

    const suggested = Number(suggestedAmount || 0)
    setAmount(suggested > 0 ? String(suggested) : '')

    if (!fundingAccounts.some(account => account.id === accountId)) {
      setAccountId(fundingAccounts[0]?.id || '')
    }
  }, [accountId, fundingAccounts, isOpen, suggestedAmount])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !accountId) return

    console.info('[debt-payment-form] Submitting debt payment payload', {
      debtId,
      accountId,
      amount: parsedAmount,
    })
    
    logPayment.mutate({
      debtId,
      amount: parsedAmount,
      accountId
    }, {
      onSuccess: () => {
        setAmount('')
        onClose()
      },
      onError: (error) => {
        console.error('[debt-payment-form] Failed to log debt payment', {
          debtId,
          accountId,
          amount: parsedAmount,
          error,
        })
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
            {fundingAccounts.map(acc => (
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
          <Button type="submit" disabled={logPayment.isPending || !accountId} className="w-full h-14 rounded-2xl font-bold text-[15px] shadow-sm active:scale-95 transition-transform bg-rose-600 hover:bg-rose-700 text-white">
            {logPayment.isPending ? 'Saving...' : 'Execute Payment'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
