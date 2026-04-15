import { useState } from 'react'
import { BottomSheet } from '../../ui/bottom-sheet'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'
import { Button } from '../../ui/button'
import { useSavings } from '@/hooks/useSavings'

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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Create Savings Goal">
      <form onSubmit={handleSubmit} className="space-y-6 mt-4 pb-4">
        <div className="space-y-3">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Goal Details</Label>
          <Input 
            placeholder="Name (e.g. Vacation, Emergency Fund)" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            autoFocus
            className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent"
          />
        </div>

        <div className="space-y-3 pt-2">
          <Label className="text-xs uppercase tracking-widest text-foreground/50">Financials</Label>
          <div className="flex gap-3">
             <div className="space-y-1 w-1/2">
               <Label className="text-[10px] uppercase text-foreground/40">Target (£)</Label>
               <Input 
                 type="number" 
                 step="0.01" 
                 placeholder="0.00" 
                 value={target} 
                 onChange={e => setTarget(e.target.value)} 
                 required 
                 className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent font-medium"
               />
             </div>
             <div className="space-y-1 w-1/2">
               <Label className="text-[10px] uppercase text-foreground/40">Already Saved (£)</Label>
               <Input 
                 type="number" 
                 step="0.01" 
                 placeholder="0.00" 
                 value={current} 
                 onChange={e => setCurrent(e.target.value)} 
                 className="h-14 rounded-2xl bg-foreground/5 border-transparent focus-visible:ring-1 focus-visible:bg-transparent font-medium"
               />
             </div>
          </div>
        </div>

        <div className="pt-6">
          <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-[15px] shadow-sm active:scale-95 transition-transform bg-emerald-600 hover:bg-emerald-700 text-white">
            Pledge Goal
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
