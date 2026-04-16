import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Button } from '../../ui/button'
import { useBills } from '@/hooks/useBills'

export function AddBillForm({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addBill } = useBills()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [frequency, setFrequency] = useState<'monthly'|'weekly'|'annual'>('monthly')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || amount === '' || !nextDate) return;
    
    addBill.mutate({
      name,
      amount: Number(amount),
      frequency,
      next_due_date: nextDate,
      category: 'utility',
      is_active: true
    }, {
      onSuccess: () => {
        setName(''); setAmount(''); setNextDate('');
        onClose();
      }
    })
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Add Recurring Bill">
      <form onSubmit={handleSubmit} className="space-y-6 mt-4 pb-4">
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Details</Label>
          <Input 
            placeholder="Bill Name (e.g. Netflix, Water)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            autoFocus
            className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent"
          />
          <Input 
            type="number" 
            step="0.01" 
            placeholder="Cost Amount (£0.00)" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            required 
            className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent font-medium"
          />
        </div>

        <div className="space-y-3 pt-2">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Frequency</Label>
          <div className="grid grid-cols-3 gap-2">
            {(['weekly', 'monthly', 'annual'] as const).map(t => (
               <button 
                  type="button" 
                  key={t} 
                  onClick={() => setFrequency(t)} 
                  className={`py-3.5 rounded-2xl transition-all border text-[13px] font-bold capitalize tracking-wide ${frequency === t ? 'bg-foreground text-background border-foreground shadow-md' : 'bg-transparent border-border text-foreground/60 hover:bg-foreground/5'}`}
                >
                 {t}
               </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Next Due Date</Label>
          <Input 
            type="date"
            value={nextDate} 
            onChange={e => setNextDate(e.target.value)} 
            required 
            className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent w-full"
          />
        </div>

        <div className="pt-6">
          <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-[15px] shadow-sm active:scale-95 transition-transform bg-purple-600 hover:bg-purple-700 text-white">
            Save Bill
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
