import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { Input } from '../../ui/input'
import { FileText } from 'lucide-react'
import { useBills } from '@/hooks/useBills'
import { SheetPrimaryButton, SheetSection, SheetSelectorButton, sheetInputClassName } from '../sheet-primitives'

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
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Add Recurring Bill"
      contextLabel="Recurring Setup"
      headerMeta="Track fixed commitments with a clean billing cadence"
      headerIcon={<FileText size={16} strokeWidth={2.2} />}
    >
      <form onSubmit={handleSubmit} className="mt-2 space-y-4 pb-1">
        <SheetSection label="Details" meta="Bill identity and cost">
          <Input 
            placeholder="Bill Name (e.g. Netflix, Water)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            autoFocus
            className={sheetInputClassName}
          />
          <Input 
            type="number" 
            step="0.01" 
            placeholder="Cost Amount (£0.00)" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            required 
            className={`${sheetInputClassName} font-medium`}
          />
        </SheetSection>

        <SheetSection label="Frequency" meta="How often this bill returns">
          <div className="grid grid-cols-3 gap-2">
            {(['weekly', 'monthly', 'annual'] as const).map(t => (
              <SheetSelectorButton
                key={t}
                selected={frequency === t}
                tone="purple"
                onClick={() => setFrequency(t)}
                className="capitalize"
              >
                {t}
              </SheetSelectorButton>
            ))}
          </div>
        </SheetSection>

        <SheetSection label="Next Due Date" meta="First scheduled payment date">
          <Input 
            type="date"
            value={nextDate} 
            onChange={e => setNextDate(e.target.value)} 
            required 
            className={`${sheetInputClassName} w-full`}
          />
        </SheetSection>

        <SheetPrimaryButton type="submit" tone="purple">
          Save Bill
        </SheetPrimaryButton>
      </form>
    </BottomSheet>
  )
}
