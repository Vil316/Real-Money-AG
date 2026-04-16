import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { FileText } from 'lucide-react'
import { useBills } from '@/hooks/useBills'
import {
  SheetPrimaryButton,
  SheetSection,
  SheetSegmentedSelector,
  SheetTextField,
  type SheetSegmentOption,
} from '../sheet-primitives'

export function AddBillForm({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addBill } = useBills()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [frequency, setFrequency] = useState<'monthly'|'weekly'|'annual'>('monthly')

  const frequencyOptions: SheetSegmentOption[] = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'annual', label: 'Annual' },
  ]

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
      <form onSubmit={handleSubmit} className="mt-1.5 space-y-3.5 pb-1">
        <SheetSection label="Details" meta="Bill identity and cost">
          <SheetTextField
            placeholder="Bill Name (e.g. Netflix, Water)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            autoFocus
          />
          <SheetTextField
            type="number" 
            step="0.01" 
            placeholder="Cost Amount (£0.00)" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            required 
            className="font-medium"
          />
        </SheetSection>

        <SheetSection label="Frequency" meta="How often this bill returns">
          <SheetSegmentedSelector
            value={frequency}
            onChange={(value) => setFrequency(value as typeof frequency)}
            options={frequencyOptions}
            tone="purple"
            columns={3}
            optionClassName="py-2.5"
          />
        </SheetSection>

        <SheetSection label="Next Due Date" meta="First scheduled payment date">
          <SheetTextField
            type="date"
            value={nextDate} 
            onChange={e => setNextDate(e.target.value)} 
            required 
            className="w-full"
          />
        </SheetSection>

        <SheetPrimaryButton type="submit" tone="purple" className="shadow-[0_12px_22px_rgba(88,72,170,0.3)]">
          Save Bill
        </SheetPrimaryButton>
      </form>
    </BottomSheet>
  )
}
