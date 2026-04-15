import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/glass/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, Landmark, CreditCard, Banknote, ShieldAlert, Target } from 'lucide-react'
import type { AccountType } from '@/types'

type AccountInput = {
  name: string
  type: AccountType
  balance: number
}

export function OnboardingFlow() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    incomeFrequency: 'weekly',
    incomeAmount: 400,
    incomeDay: 1, // 1=Mon, 5=Fri
    tithe: false,
    tithePercentage: 10,
    family: false,
    familyAmount: 200,
    familyFrequency: 'monthly',
    other: false,
    otherName: '',
    otherAmount: 0,
    accounts: [] as AccountInput[]
  })

  const handleNext = () => setStep(s => Math.min(4, s + 1))

  const handleComplete = async () => {
    if (!user) return
    setSubmitting(true)

    try {
      // 1. Update Profile natively
      const { error: profileErr } = await supabase.from('profiles').update({
        income_frequency: form.incomeFrequency,
        income_amount: form.incomeAmount,
        income_day: form.incomeDay,
        tithe_percentage: form.tithe ? form.tithePercentage : 0,
        onboarding_complete: true
      }).eq('id', user.id)
      
      if (profileErr) throw profileErr

      // 2. Add Obligations
      if (form.tithe) {
        await supabase.from('obligations').insert([{
          user_id: user.id, name: 'Tithe', type: 'tithe', amount_type: 'percentage', percentage_of: 'income_weekly', frequency: 'weekly', is_fulfilled_this_cycle: false, amount: form.tithePercentage, is_active: true
        }])
      }
      if (form.family) {
        await supabase.from('obligations').insert([{
          user_id: user.id, name: 'Family Support', type: 'family', amount_type: 'fixed', amount: form.familyAmount, frequency: 'monthly', is_fulfilled_this_cycle: false, is_active: true
        }])
      }

      // 3. Add Accounts
      if (form.accounts.length > 0) {
        const accountsToInsert = form.accounts.map(acc => ({
          user_id: user.id,
          name: acc.name,
          type: acc.type,
          balance: acc.balance,
          currency: 'GBP',
          colour: '#14b8a6',
          is_archived: false,
          is_manual: true
        }))
        await supabase.from('accounts').insert(accountsToInsert)
      }

      // Transition smoothly
      setTimeout(() => {
        navigate('/today')
      }, 500)
    } catch (error) {
      console.error("Setup failed:", error)
      setSubmitting(false)
    }
  }

  // Define components for each step
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-display font-semibold -tracking-[0.3px] text-white">How do you get paid?</h2>
      </div>

      <div className="space-y-4">
        <Label className="text-white/80">Frequency</Label>
        <div className="grid grid-cols-3 gap-2">
          {['weekly', 'monthly', 'irregular'].map(f => (
            <button
              key={f}
              onClick={() => setForm({ ...form, incomeFrequency: f })}
              className={`p-3 rounded-xl transition-all duration-200 capitalize ${form.incomeFrequency === f ? 'bg-white/20 border-white/40 ring-1 ring-white/50 text-white' : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-white/80">Roughly how much each time?</Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">£</span>
          <Input 
            type="number" 
            value={form.incomeAmount || ''} 
            onChange={e => setForm({ ...form, incomeAmount: Number(e.target.value) })}
            className="pl-8 bg-white/5 border-white/10 text-white !text-lg h-14 rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-4">
        <Label className="text-white/80">Which day do you get paid?</Label>
        <select 
          className="w-full bg-white/5 border border-white/10 text-white h-14 rounded-xl px-4 appearance-none focus:outline-none focus:ring-1 focus:ring-white/20"
          value={form.incomeDay}
          onChange={e => setForm({ ...form, incomeDay: Number(e.target.value) })}
        >
          <option value={1} className="text-black">Monday</option>
          <option value={2} className="text-black">Tuesday</option>
          <option value={3} className="text-black">Wednesday</option>
          <option value={4} className="text-black">Thursday</option>
          <option value={5} className="text-black">Friday</option>
        </select>
      </div>

      <Button onClick={handleNext} className="w-full h-14 rounded-xl bg-white/10 hover:bg-white/20 text-white">Next</Button>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-display font-semibold -tracking-[0.3px] text-white">Any regular commitments?</h2>
        <p className="text-glass-secondary text-sm">We'll help you track them effortlessly.</p>
      </div>

      <div className="space-y-6">
        <div>
          <Label className="text-white/80 block mb-2">Do you tithe or give a percentage?</Label>
          <div className="flex gap-2">
            <button onClick={() => setForm({ ...form, tithe: true })} className={`flex-1 p-3 rounded-xl border ${form.tithe ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>Yes</button>
            <button onClick={() => setForm({ ...form, tithe: false })} className={`flex-1 p-3 rounded-xl border ${!form.tithe ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>No</button>
          </div>
          {form.tithe && (
            <div className="mt-3 flex items-center gap-2">
              <Input type="number" value={form.tithePercentage} onChange={e => setForm({ ...form, tithePercentage: Number(e.target.value) })} className="w-20 bg-white/5 border-white/10 text-white" />
              <span className="text-white/50">%</span>
            </div>
          )}
        </div>

        <div>
          <Label className="text-white/80 block mb-2">Do you send money to family regularly?</Label>
          <div className="flex gap-2">
            <button onClick={() => setForm({ ...form, family: true })} className={`flex-1 p-3 rounded-xl border ${form.family ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>Yes</button>
            <button onClick={() => setForm({ ...form, family: false })} className={`flex-1 p-3 rounded-xl border ${!form.family ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>No</button>
          </div>
          {form.family && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-white/50">£</span>
              <Input type="number" placeholder="200" value={form.familyAmount || ''} onChange={e => setForm({ ...form, familyAmount: Number(e.target.value) })} className="bg-white/5 border-white/10 text-white flex-1" />
              <select className="bg-white/5 border-white/10 text-white rounded-md px-2 py-2 w-32" value={form.familyFrequency} onChange={e => setForm({ ...form, familyFrequency: e.target.value })}>
                <option value="weekly" className="text-black">Weekly</option>
                <option value="monthly" className="text-black">Monthly</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <Button onClick={handleNext} className="w-full h-14 rounded-xl bg-white/10 hover:bg-white/20 text-white mt-12">Next</Button>
    </div>
  )

  const accountTypes: { id: AccountType, label: string, icon: any }[] = [
    { id: 'bank', label: 'Bank', icon: Landmark },
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'credit_card', label: 'Credit Card', icon: CreditCard },
    { id: 'bnpl', label: 'BNPL', icon: Wallet },
    { id: 'loan', label: 'Debt/Loan', icon: ShieldAlert },
    { id: 'savings', label: 'Savings', icon: Target },
  ]

  const [newAcc, setNewAcc] = useState<Partial<AccountInput>>({ type: 'bank', name: '', balance: 0 })
  const [showAddAcc, setShowAddAcc] = useState(false)

  const addAccount = () => {
    if (newAcc.name && newAcc.type) {
      setForm({ ...form, accounts: [...form.accounts, newAcc as AccountInput] })
      setNewAcc({ type: 'bank', name: '', balance: 0 })
      setShowAddAcc(false)
    }
  }

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-display font-semibold -tracking-[0.3px] text-white">Add your accounts</h2>
        <p className="text-glass-secondary text-sm">You can add more later — just start with what matters.</p>
      </div>

      {form.accounts.length > 0 && (
        <div className="space-y-3">
          {form.accounts.map((acc, i) => (
            <GlassCard key={i} className="p-4 flex justify-between items-center">
              <div>
                <p className="text-white font-medium">{acc.name}</p>
                <p className="text-glass-secondary text-xs capitalize">{acc.type.replace('_', ' ')}</p>
              </div>
              <p className="text-white font-semibold">£{acc.balance.toFixed(2)}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {showAddAcc ? (
        <GlassCard className="p-4 space-y-4 border-dashed border-white/30">
          <div>
            <Label className="text-white/70">Account Name</Label>
            <Input value={newAcc.name} onChange={e => setNewAcc({ ...newAcc, name: e.target.value })} placeholder="e.g. Monzo, Specs Case" className="mt-1 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-white/70">Type</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {accountTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setNewAcc({ ...newAcc, type: t.id })}
                  className={`py-2 px-1 rounded-lg flex flex-col items-center gap-1 transition-colors ${newAcc.type === t.id ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                >
                  <t.icon size={16} />
                  <span className="text-[10px]">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-white/70">Current Balance</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">£</span>
              <Input type="number" value={newAcc.balance || ''} onChange={e => setNewAcc({ ...newAcc, balance: Number(e.target.value) })} className="pl-7 bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => setShowAddAcc(false)} variant="ghost" className="flex-1 text-white hover:bg-white/10">Cancel</Button>
            <Button onClick={addAccount} className="flex-1 bg-white/20 hover:bg-white/30 text-white">Save</Button>
          </div>
        </GlassCard>
      ) : (
        <button 
          onClick={() => setShowAddAcc(true)}
          className="w-full py-4 border border-dashed border-white/20 rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <span>+ Add Account</span>
        </button>
      )}

      <Button onClick={handleNext} className="w-full h-14 rounded-xl bg-white/10 hover:bg-white/20 text-white mt-12">
        {form.accounts.length === 0 ? 'Skip for now' : 'Next'}
      </Button>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-8 flex flex-col items-center text-center pt-8">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
        <Target size={40} className="text-green-400" />
      </div>
      <div>
        <h2 className="text-3xl font-display font-semibold -tracking-[0.3px] text-white">You're set up!</h2>
        <p className="text-glass-secondary mt-2">Ready to take control of your finances.</p>
      </div>

      <GlassCard className="w-full p-4 mt-8 flex flex-col gap-3 text-left">
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/60">Income</span>
          <span className="text-white font-medium">£{form.incomeAmount} {form.incomeFrequency}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/60">Obligations Tracked</span>
          <span className="text-white font-medium">
            {[form.tithe && 'Tithe', form.family && 'Family'].filter(Boolean).join(', ') || 'None'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/60">Accounts Tracked</span>
          <span className="text-white font-medium">{form.accounts.length}</span>
        </div>
      </GlassCard>

      <Button 
        onClick={handleComplete} 
        disabled={submitting}
        className="w-full h-16 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-display text-lg tracking-wide border border-white/20 shadow-lg"
      >
        {submitting ? 'Saving...' : 'Open my dashboard'}
      </Button>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm mb-6 flex justify-center gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-2 rounded-full transition-all duration-300 ${step >= i ? 'w-8 bg-white' : 'w-2 bg-white/20'}`} />
        ))}
      </div>

      <GlassCard className="w-full max-w-sm p-6 overflow-hidden relative min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </motion.div>
        </AnimatePresence>
      </GlassCard>
    </div>
  )
}
