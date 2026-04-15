import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/glass/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Check, ArrowRight } from 'lucide-react'

// Mocking some pre-filled data based on prompt requirements
const prefilledData = {
  income: 400,
  tithe: 40,
  family: 200,
  savings: 100,
}

export function CheckInPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [complete, setComplete] = useState(false)

  const [form, setForm] = useState({
    income: prefilledData.income,
    incomeMethod: 'bank',
    titheDone: false,
    familySent: false,
    savingsAdded: false,
  })

  const handleNext = () => {
    if (step < 5) setStep(s => s + 1)
    else setComplete(true)
  }

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-semibold -tracking-[0.3px] text-white">Income received this week?</h2>
            
            <div className="space-y-4">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">£</span>
                <Input 
                  type="number" 
                  value={form.income} 
                  onChange={e => setForm({ ...form, income: Number(e.target.value) })}
                  className="pl-8 bg-white/5 border-white/10 text-white !text-lg h-14 rounded-xl"
                />
              </div>

              <div className="flex gap-2">
                <button onClick={() => setForm({ ...form, incomeMethod: 'bank' })} className={`flex-1 p-3 rounded-xl border ${form.incomeMethod === 'bank' ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>Bank</button>
                <button onClick={() => setForm({ ...form, incomeMethod: 'cash' })} className={`flex-1 p-3 rounded-xl border ${form.incomeMethod === 'cash' ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>Cash</button>
              </div>
            </div>

            <Button onClick={handleNext} className="w-full h-14 rounded-xl bg-white/10 hover:bg-white/20 text-white">Looks right ✓</Button>
          </div>
        )
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-display font-semibold -tracking-[0.3px] text-white">Tithe this week?</h2>
              <p className="text-glass-secondary mt-1">Based on {form.income}, that's £{(form.income * 0.1).toFixed(0)}</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button onClick={() => { setForm({ ...form, titheDone: true }); handleNext(); }} className="w-full h-14 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-100 border border-green-500/30">Done ✓</Button>
              <Button onClick={handleNext} variant="ghost" className="w-full h-14 rounded-xl text-white/50">Not yet</Button>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-display font-semibold -tracking-[0.3px] text-white">Family transfer?</h2>
              <p className="text-glass-secondary mt-1">Expected: £{prefilledData.family}</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button onClick={() => { setForm({ ...form, familySent: true }); handleNext(); }} className="w-full h-14 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-100 border border-green-500/30">Sent ✓</Button>
              <Button onClick={handleNext} variant="ghost" className="w-full h-14 rounded-xl text-white/50 border border-white/10 bg-white/5">Sent different amount</Button>
              <Button onClick={handleNext} variant="ghost" className="w-full h-14 rounded-xl text-white/50">Not this week</Button>
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-semibold -tracking-[0.3px] text-white">Savings this week?</h2>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">£</span>
              <Input 
                type="number" 
                defaultValue={prefilledData.savings}
                className="pl-8 bg-white/5 border-white/10 text-white !text-lg h-14 rounded-xl"
              />
            </div>
            
            <div className="flex flex-col gap-3">
              <Button onClick={() => { setForm({ ...form, savingsAdded: true }); handleNext(); }} className="w-full h-14 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-100 border border-green-500/30">Added ✓</Button>
              <Button onClick={handleNext} variant="ghost" className="w-full h-14 rounded-xl text-white/50">Skipped this week</Button>
            </div>
          </div>
        )
      case 5:
        return (
          <div className="space-y-6 text-center">
            <h2 className="text-2xl font-display font-semibold -tracking-[0.3px] text-white">Any debts paid?</h2>
            <p className="text-glass-secondary text-sm">Optional</p>
            
            <div className="space-y-2 text-left">
              <GlassCard className="p-4 flex justify-between items-center bg-white/5">
                <span className="text-white">Boss (informal)</span>
                <span className="text-white/50">£3,000 left</span>
              </GlassCard>
            </div>

            <Button onClick={handleNext} className="w-full h-14 rounded-xl bg-white/10 hover:bg-white/20 text-white mt-8">Finish check-in</Button>
          </div>
        )
    }
  }

  if (complete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-6 flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-green-400/20 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(7ade80,0.3)]">
            <Check size={48} className="text-green-400" />
          </div>
          <h1 className="text-4xl font-display font-semibold -tracking-[1px] text-white">Week locked in ✓</h1>
          
          <Button 
            onClick={() => navigate('/today')}
            className="h-14 px-8 rounded-full bg-white/10 hover:bg-white/20 text-white mt-8"
          >
            Back to today
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 relative -mt-6">
      <div className="absolute top-8 left-4 right-4">
        <p className="text-white/60 font-medium tracking-wider text-xs uppercase text-center mb-4">Week of 14 Apr</p>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= i ? 'bg-white' : 'bg-white/20'}`} />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm"
        >
          <GlassCard className="p-6">
            {renderStep()}
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
