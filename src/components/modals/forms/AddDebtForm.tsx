import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { CreditCard } from 'lucide-react'
import { useDebts } from '@/hooks/useDebts'
import { SheetPrimaryButton, SheetSection, SheetTextField } from '../sheet-primitives'

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
      creditor_name: creditor,
      current_balance: Number(balance),
      original_balance: Number(balance),
      type: 'loan',
      interest_rate: Number(rate) || 0,
      is_interest_free: Number(rate) === 0,
      payment_frequency: 'monthly',
      is_settled: false,
      notes: name
    }, {
      onSuccess: () => {
        setName(''); setBalance(''); setCreditor(''); setRate('');
        onClose();
      }
    })
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Log Liability / Debt"
      contextLabel="Debt Setup"
      headerMeta="Capture liability details and repayment baseline"
      headerIcon={<CreditCard size={16} strokeWidth={2.2} />}
    >
      <form onSubmit={handleSubmit} className="mt-1.5 space-y-3.5 pb-1">
        <SheetSection label="Credit Details" meta="Liability identity and creditor source">
          <SheetTextField
            placeholder="Name (e.g. Car Loan)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            autoFocus
            className="font-medium"
          />
          <SheetTextField
            placeholder="Creditor (e.g. Barclays, Klarna)" 
            value={creditor} 
            onChange={e => setCreditor(e.target.value)} 
            required 
            className="font-medium"
          />
        </SheetSection>

        <SheetSection label="Financial Snapshot" meta="Outstanding balance and interest baseline">
          <div className="flex gap-3">
            <SheetTextField
              type="number" 
              step="0.01" 
              placeholder="Balance (£0.00)" 
              value={balance} 
              onChange={e => setBalance(e.target.value)} 
              required 
              className="font-medium w-2/3"
            />
            <SheetTextField
              type="number" 
              step="0.1" 
              placeholder="APR (%)" 
              value={rate} 
              onChange={e => setRate(e.target.value)} 
              className="font-medium w-1/3"
            />
          </div>
        </SheetSection>

        <SheetPrimaryButton type="submit" tone="red" className="shadow-[0_12px_22px_rgba(141,72,72,0.28)]">
          Save Liability
        </SheetPrimaryButton>
      </form>
    </BottomSheet>
  )
}
