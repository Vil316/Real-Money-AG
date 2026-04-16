import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { useAccounts } from '@/hooks/useAccounts'
import { Input } from '../../ui/input'
import { Wallet } from 'lucide-react'
import { SheetPrimaryButton, SheetSection, SheetSelectorButton, sheetInputClassName } from '../sheet-primitives'

export function AddAccountForm({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addAccount } = useAccounts()
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [type, setType] = useState<'bank'|'cash'|'credit_card'|'savings'>('bank')

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
      <form onSubmit={handleSubmit} className="mt-2 space-y-4 pb-1">
        <SheetSection label="Details" meta="Identity and opening amount">
          <Input 
            placeholder="Account Name (e.g. Monzo Joint)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            autoFocus
            className={sheetInputClassName}
          />
          <Input 
            type="number" 
            step="0.01" 
            placeholder="Starting Balance (£0.00)" 
            value={balance} 
            onChange={e => setBalance(e.target.value)} 
            required 
            className={`${sheetInputClassName} font-medium`}
          />
        </SheetSection>

        <SheetSection label="Category" meta="How this account behaves in your system">
          <div className="grid grid-cols-2 gap-2">
            {(['bank', 'cash', 'credit_card', 'savings'] as const).map(t => (
              <SheetSelectorButton
                key={t}
                selected={type === t}
                tone="neutral"
                onClick={() => setType(t)}
                className="capitalize"
              >
                {t.replace('_', ' ')}
              </SheetSelectorButton>
            ))}
          </div>
        </SheetSection>

        <SheetPrimaryButton type="submit" tone="neutral">
          Save Account
        </SheetPrimaryButton>
      </form>
    </BottomSheet>
  )
}
