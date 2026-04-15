import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Button } from '../../ui/button'
import { useTransactions } from '@/hooks/useTransactions'

export function AddTransactionForm({ isOpen, onClose, accountId }: { isOpen: boolean, onClose: () => void, accountId: string }) {
  const { addTransaction } = useTransactions(accountId)
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [isIncome, setIsIncome] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!merchant || amount === '') return;
    
    const finalAmount = isIncome ? Math.abs(Number(amount)) : -Math.abs(Number(amount))

    addTransaction.mutate({
      account_id: accountId,
      merchant,
      amount: finalAmount,
      is_pending: false,
      category: isIncome ? 'Income' : 'Expense'
    }, {
      onSuccess: () => {
        setMerchant(''); setAmount(''); setIsIncome(false);
        onClose();
      }
    })
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Log Transaction">
      <form onSubmit={handleSubmit} className="space-y-6 mt-4 pb-4">
        
        <div className="flex bg-foreground/5 p-1 rounded-2xl mb-2">
          <button type="button" onClick={() => setIsIncome(false)} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${!isIncome ? 'bg-foreground text-background shadow-md' : 'text-foreground/50 hover:bg-foreground/5'}`}>
            Expense (Spent)
          </button>
          <button type="button" onClick={() => setIsIncome(true)} className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${isIncome ? 'bg-emerald-500 text-white shadow-md' : 'text-foreground/50 hover:bg-foreground/5'}`}>
            Income (Added)
          </button>
        </div>

        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Transaction Details</Label>
          <Input 
            placeholder="Merchant (e.g. Tesco, Salary)" 
            value={merchant} 
            onChange={e => setMerchant(e.target.value)} 
            required 
            autoFocus
            className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent"
          />
        </div>

        <div className="space-y-3 pt-2">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Amount</Label>
          <Input 
            type="number" 
            step="0.01" 
            placeholder="£0.00" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            required 
            className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent font-medium"
          />
        </div>

        <div className="pt-6">
          <Button type="submit" className={`w-full h-14 rounded-2xl font-bold text-[15px] shadow-sm active:scale-95 transition-transform text-white ${isIncome ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-foreground hover:bg-foreground/90'}`}>
            Save to Ledger
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
