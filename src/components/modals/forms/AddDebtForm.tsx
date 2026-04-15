import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Button } from '../../ui/button'
import { useDebts } from '@/hooks/useDebts'

export function AddDebtForm({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addDebt } = useDebts()
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [creditor, setCreditor] = useState('')
  const [rate, setRate] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || balance === '' || !creditor) return;
    
    addDebt.mutate({
      name,
      creditor_name: creditor,
      current_balance: Number(balance),
      original_balance: Number(balance),
      type: 'loan',
      interest_rate: Number(rate) || 0,
      is_interest_free: Number(rate) === 0,
      payment_frequency: 'monthly',
      is_settled: false
    }, {
      onSuccess: () => {
        setName(''); setBalance(''); setCreditor(''); setRate('');
        onClose();
      }
    })
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Log Liability / Debt">
      <form onSubmit={handleSubmit} className="space-y-6 mt-4 pb-4">
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Credit Details</Label>
          <Input 
            placeholder="Name (e.g. Car Loan)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            autoFocus
            className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent"
          />
          <Input 
            placeholder="Creditor (e.g. Barclays, Klarna)" 
            value={creditor} 
            onChange={e => setCreditor(e.target.value)} 
            required 
            className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent"
          />
        </div>

        <div className="space-y-3 pt-2">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Financials</Label>
          <div className="flex gap-3">
            <Input 
              type="number" 
              step="0.01" 
              placeholder="Balance (£0.00)" 
              value={balance} 
              onChange={e => setBalance(e.target.value)} 
              required 
              className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent font-medium w-2/3"
            />
            <Input 
              type="number" 
              step="0.1" 
              placeholder="APR (%)" 
              value={rate} 
              onChange={e => setRate(e.target.value)} 
              className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent font-medium w-1/3"
            />
          </div>
        </div>

        <div className="pt-6">
          <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-[15px] shadow-sm active:scale-95 transition-transform bg-rose-600 hover:bg-rose-700 text-white">
            Save Liability
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
