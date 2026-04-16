import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { Target } from 'lucide-react'
import { useSavings } from '@/hooks/useSavings'
import { SheetPrimaryButton, SheetSection, SheetTextField } from '../sheet-primitives'

export function AddGoalForm({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { addGoal } = useSavings()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [current, setCurrent] = useState('0')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || target === '') return;
    
    addGoal.mutate({
      name,
      target_amount: Number(target),
      current_amount: Number(current) || 0,
      colour: '#10B981',
      is_completed: false
    }, {
      onSuccess: () => {
        setName(''); setTarget(''); setCurrent('0');
        onClose();
      }
    })
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Create Savings Goal"
      contextLabel="Savings Setup"
      headerMeta="Define a target and track progress in your OS"
      headerIcon={<Target size={16} strokeWidth={2.2} />}
    >
      <form onSubmit={handleSubmit} className="mt-1.5 space-y-3.5 pb-1">
        <SheetSection label="Goal Details" meta="Name and structure of this savings target">
          <SheetTextField
            placeholder="Name (e.g. Vacation, Emergency Fund)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            autoFocus
          />
        </SheetSection>

        <SheetSection label="Financials" meta="Current baseline and target amount">
          <div className="flex gap-3">
             <div className="space-y-1 w-1/2">
               <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Target (GBP)</p>
               <SheetTextField
                 type="number" 
                 step="0.01" 
                 placeholder="0.00" 
                 value={target} 
                 onChange={e => setTarget(e.target.value)} 
                 required 
                 className="font-medium"
               />
             </div>
             <div className="space-y-1 w-1/2">
               <p className="text-[10px] uppercase tracking-[0.12em] text-white/45">Already Saved (GBP)</p>
               <SheetTextField
                 type="number" 
                 step="0.01" 
                 placeholder="0.00" 
                 value={current} 
                 onChange={e => setCurrent(e.target.value)} 
                 className="font-medium"
               />
             </div>
          </div>
        </SheetSection>

        <SheetPrimaryButton type="submit" tone="green" className="shadow-[0_12px_22px_rgba(43,132,95,0.3)]">
          Pledge Goal
        </SheetPrimaryButton>
      </form>
    </BottomSheet>
  )
}
