import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { useAccounts } from '@/hooks/useAccounts'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Button } from '../../ui/button'

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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Add Manual Account">
      <form onSubmit={handleSubmit} className="space-y-6 mt-4 pb-4">
        
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Details</Label>
          <Input 
            placeholder="Account Name (e.g. Monzo Joint)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            autoFocus
            className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent"
          />
          <Input 
            type="number" 
            step="0.01" 
            placeholder="Starting Balance (£0.00)" 
            value={balance} 
            onChange={e => setBalance(e.target.value)} 
            required 
            className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent font-medium"
          />
        </div>

        <div className="space-y-3 pt-2">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Category</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['bank', 'cash', 'credit_card', 'savings'] as const).map(t => (
               <button 
                  type="button" 
                  key={t} 
                  onClick={() => setType(t)} 
                  className={`py-3.5 rounded-2xl transition-all border text-[13px] font-bold capitalize tracking-wide ${type === t ? 'bg-foreground text-background border-foreground shadow-md' : 'bg-transparent border-border text-foreground/60 hover:bg-foreground/5'}`}
                >
                 {t.replace('_', ' ')}
               </button>
            ))}
          </div>
        </div>

        <div className="pt-6">
          <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-[15px] shadow-sm active:scale-95 transition-transform">
            Save Account
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
