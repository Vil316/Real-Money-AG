import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { useAccounts } from '@/hooks/useAccounts'
import { Wallet } from 'lucide-react'
import {
  SheetPrimaryButton,
  SheetSection,
  SheetSegmentedSelector,
  SheetTextField,
  type SheetSegmentOption,
} from '../sheet-primitives'

export function AddAccountForm({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addAccount } = useAccounts()
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [type, setType] = useState<'bank'|'cash'|'credit_card'|'savings'>('bank')

  const accountTypeOptions: SheetSegmentOption[] = [
    { value: 'bank', label: 'Bank' },
    { value: 'cash', label: 'Cash' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'savings', label: 'Savings' },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || balance === '') return;
    
    addAccount.mutate({
      name,
      balance: Number(balance),
      type,
      currency: 'GBP',
      is_manual: true,
      colour: '#0B8289',
      icon: 'Wallet'
    }, {
      onSuccess: () => {
        setName(''); 
        setBalance('');
        setType('bank');
        onClose();
      }
    })
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Add Manual Account"
      contextLabel="Account Setup"
      headerMeta="Create a manual account source for your ledger"
      headerIcon={<Wallet size={16} strokeWidth={2.2} />}
    >
      <form onSubmit={handleSubmit} className="mt-1.5 space-y-3.5 pb-1">
        <SheetSection label="Details" meta="Identity and opening amount">
          <SheetTextField 
            placeholder="Account Name (e.g. Monzo Joint)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            autoFocus
          />
          <SheetTextField
            type="number" 
            step="0.01" 
            placeholder="Starting Balance (£0.00)" 
            value={balance} 
            onChange={e => setBalance(e.target.value)} 
            required 
            className="font-medium"
          />
        </SheetSection>

        <SheetSection label="Category" meta="How this account behaves in your system">
          <SheetSegmentedSelector
            value={type}
            onChange={(value) => setType(value as typeof type)}
            options={accountTypeOptions}
            tone="neutral"
            columns={2}
            optionClassName="py-2.5"
          />
        </SheetSection>

        <SheetPrimaryButton type="submit" tone="neutral" className="shadow-[0_12px_22px_rgba(0,0,0,0.2)]">
          Save Account
        </SheetPrimaryButton>
      </form>
    </BottomSheet>
  )
}
