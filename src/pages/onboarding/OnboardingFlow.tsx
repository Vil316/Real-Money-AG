import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  BadgePoundSterling,
  CalendarClock,
  CircleHelp,
  CreditCard,
  HandCoins,
  HeartHandshake,
  Landmark,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { ProgressHeader } from '@/components/onboarding/ProgressHeader'
import { ChoiceCard } from '@/components/onboarding/ChoiceCard'
import { StickyActionBar } from '@/components/onboarding/StickyActionBar'

type PayCadence = 'weekly' | 'every_2_weeks' | 'monthly' | 'irregular'
type MoneyLifeArea =
  | 'bank_accounts'
  | 'cash_savings'
  | 'bills'
  | 'debt'
  | 'bnpl'
  | 'family_support'
  | 'saving_goals'
type FirstFocus = 'safe_to_spend' | 'stay_on_top_of_bills' | 'pay_off_debt' | 'save_more' | 'everything_in_one_place'
type StartMode = 'connect_account' | 'add_manually' | 'start_simple'
type MoneyRhythm = 'mostly_know' | 'bit_messy' | 'fresh_start'

type OnboardingAnswers = {
  payCadence: PayCadence | null
  moneyLife: MoneyLifeArea[]
  firstFocus: FirstFocus | null
  startMode: StartMode | null
  moneyRhythm: MoneyRhythm | null
}

type OnboardingScreen = 'welcome' | 'pay' | 'life' | 'focus' | 'begin' | 'rhythm' | 'summary'

const DRAFT_STORAGE_KEY = 'realmoney-onboarding-draft'
const PREFS_STORAGE_KEY = 'realmoney-onboarding-preferences'
const QUESTION_COUNT = 5

const initialAnswers: OnboardingAnswers = {
  payCadence: null,
  moneyLife: [],
  firstFocus: null,
  startMode: null,
  moneyRhythm: null,
}

const screens: OnboardingScreen[] = ['welcome', 'pay', 'life', 'focus', 'begin', 'rhythm', 'summary']

const payCadenceOptions = [
  { value: 'weekly' as const, title: 'Weekly', icon: CalendarClock },
  { value: 'every_2_weeks' as const, title: 'Every 2 weeks', icon: BadgePoundSterling },
  { value: 'monthly' as const, title: 'Monthly', icon: Landmark },
  { value: 'irregular' as const, title: 'Irregular', description: 'Income varies', icon: CircleHelp },
]

const moneyLifeOptions = [
  { value: 'bank_accounts' as const, title: 'Bank accounts', icon: Landmark },
  { value: 'cash_savings' as const, title: 'Cash savings', icon: PiggyBank },
  { value: 'bills' as const, title: 'Bills', icon: ReceiptText },
  { value: 'debt' as const, title: 'Debt', icon: CreditCard },
  { value: 'bnpl' as const, title: 'Buy now pay later', icon: Wallet },
  { value: 'family_support' as const, title: 'Family support', icon: HeartHandshake },
  { value: 'saving_goals' as const, title: 'Saving goals', icon: Target },
]

const firstFocusOptions = [
  { value: 'safe_to_spend' as const, title: 'Know what\'s safe to spend', description: '', icon: ShieldCheck },
  { value: 'stay_on_top_of_bills' as const, title: 'Stay on top of bills', description: '', icon: ReceiptText },
  { value: 'pay_off_debt' as const, title: 'Pay off debt', description: '', icon: CreditCard },
  { value: 'save_more' as const, title: 'Save consistently', description: '', icon: PiggyBank },
  { value: 'everything_in_one_place' as const, title: 'Everything in one place', description: '', icon: Sparkles },
]

const startModeOptions = [
  { value: 'connect_account' as const, title: 'Connect an account', description: 'Fastest way to begin', icon: Landmark },
  { value: 'add_manually' as const, title: 'Add manually', description: 'More control, your pace', icon: HandCoins },
  { value: 'start_simple' as const, title: 'Start simple', icon: Sparkles },
]

const moneyRhythmOptions = [
  { value: 'mostly_know' as const, title: 'I know where I stand', description: 'Just need a clearer view', icon: ShieldCheck },
  { value: 'bit_messy' as const, title: 'It\'s a bit messy', description: 'Ready to get clearer', icon: Wallet },
  { value: 'fresh_start' as const, title: 'Starting fresh', description: 'New approach to tracking', icon: Sparkles },
]

const moneyLifeOptionMap = new Map(moneyLifeOptions.map(option => [option.value, option]))
const firstFocusPrimary = firstFocusOptions[0]
const firstFocusSecondary = firstFocusOptions.slice(1)

const payCadenceLabels: Record<PayCadence, string> = {
  weekly: 'weekly pay',
  every_2_weeks: 'bi-weekly pay',
  monthly: 'monthly pay',
  irregular: 'variable income',
}

const moneyLifeLabels: Record<MoneyLifeArea, string> = {
  bank_accounts: 'spending accounts',
  cash_savings: 'cash savings',
  bills: 'bills',
  debt: 'debt',
  bnpl: 'buy now pay later',
  family_support: 'family support',
  saving_goals: 'saving goals',
}

const firstFocusLabels: Record<FirstFocus, string> = {
  safe_to_spend: 'what\'s available to spend',
  stay_on_top_of_bills: 'staying on top of bills',
  pay_off_debt: 'paying off debt',
  save_more: 'saving consistently',
  everything_in_one_place: 'seeing everything at once',
}

const startModeLabels: Record<StartMode, string> = {
  connect_account: 'connecting an account',
  add_manually: 'adding things manually',
  start_simple: 'starting simple',
}

const moneyRhythmLabels: Record<MoneyRhythm, string> = {
  mostly_know: 'a clearer view',
  bit_messy: 'clarity without pressure',
  fresh_start: 'a fresh start',
}

function readSavedDraft(): OnboardingAnswers {
  if (typeof window === 'undefined') return initialAnswers

  const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
  if (!raw) return initialAnswers

  try {
    return { ...initialAnswers, ...JSON.parse(raw) }
  } catch {
    return initialAnswers
  }
}

function mapPayCadenceToProfileFrequency(payCadence: PayCadence | null): string {
  switch (payCadence) {
    case 'every_2_weeks':
      return 'every_2_weeks'
    case 'monthly':
      return 'monthly'
    case 'irregular':
      return 'irregular'
    case 'weekly':
    default:
      return 'weekly'
  }
}

function buildSummaryLine(answers: OnboardingAnswers): string {
  const cadence = answers.payCadence ? payCadenceLabels[answers.payCadence] : 'money'
  const focus = answers.firstFocus ? firstFocusLabels[answers.firstFocus] : 'what matters'

  if (answers.moneyLife.length === 0) {
    return `We'll help you track ${cadence} and focus on ${focus} with clarity.`
  }

  const highlighted = answers.moneyLife.slice(0, 2).map(item => moneyLifeLabels[item]).join(' and ')
  return `We'll keep you in sync with ${cadence}, ${highlighted}, and make ${focus} easier to act on.`
}

function buildSupportLine(answers: OnboardingAnswers): string {
  const startMode = answers.startMode ? startModeLabels[answers.startMode] : 'begin'
  const rhythm = answers.moneyRhythm ? moneyRhythmLabels[answers.moneyRhythm] : 'where you are'
  return `You'll start by ${startMode}. We'll meet you with ${rhythm}, then deepen only when useful.`
}

export function OnboardingFlow() {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const { user } = useAuth()
  const [screenIndex, setScreenIndex] = useState(0)
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => readSavedDraft())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const directionRef = useRef(1)

  const currentScreen = screens[screenIndex]
  const questionStep = currentScreen === 'welcome' ? 0 : currentScreen === 'summary' ? QUESTION_COUNT : screenIndex

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(answers))
  }, [answers])

  const goNext = () => {
    directionRef.current = 1
    setScreenIndex(current => Math.min(current + 1, screens.length - 1))
  }
  const goBack = () => {
    directionRef.current = -1
    setScreenIndex(current => Math.max(current - 1, 0))
  }

  const toggleMoneyLife = (value: MoneyLifeArea) => {
    setAnswers(current => {
      const exists = current.moneyLife.includes(value)
      return {
        ...current,
        moneyLife: exists ? current.moneyLife.filter(item => item !== value) : [...current.moneyLife, value],
      }
    })
  }

  const canContinue = (() => {
    switch (currentScreen) {
      case 'welcome':
        return true
      case 'pay':
        return !!answers.payCadence
      case 'life':
        return answers.moneyLife.length > 0
      case 'focus':
        return !!answers.firstFocus
      case 'begin':
        return !!answers.startMode
      case 'rhythm':
        return !!answers.moneyRhythm
      case 'summary':
        return true
      default:
        return false
    }
  })()

  const completeOnboarding = async () => {
    if (!user) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          income_frequency: mapPayCadenceToProfileFrequency(answers.payCadence),
          onboarding_complete: true,
        })
        .eq('id', user.id)

      if (error) throw error

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY)
        window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(answers))
      }

      window.setTimeout(() => {
        navigate('/today', { replace: true })
      }, 240)
    } catch (error) {
      console.error('Onboarding save failed:', error)
      setIsSubmitting(false)
    }
  }

  const transitionProps = prefersReducedMotion
    ? {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
      }

  return (
    <OnboardingShell
      header={
        <ProgressHeader
          currentStep={questionStep}
          totalSteps={QUESTION_COUNT}
          onBack={goBack}
          showBack={screenIndex > 0 && currentScreen !== 'summary'}
        />
      }
      footer={
        <StickyActionBar
          primaryLabel={currentScreen === 'welcome' ? 'Begin' : currentScreen === 'summary' ? 'Open dashboard' : 'Continue'}
          onPrimary={currentScreen === 'summary' ? completeOnboarding : goNext}
          primaryDisabled={!canContinue}
          loading={isSubmitting}
        />
      }
    >
      <AnimatePresence mode="wait">
        <motion.section key={currentScreen} {...transitionProps} className="flex min-h-full flex-col">
          {currentScreen === 'welcome' ? (
            <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.05] px-3.5 py-1.5">
                <Sparkles size={13} className="text-[#9ce8f1]" />
                <span className="text-[11px] font-medium tracking-[0.04em] text-white/70">RealMoney onboarding</span>
              </div>

              <h1 className="mt-7 text-[36px] font-semibold leading-[1.02] tracking-[-0.045em] text-white">
                Your money, finally clear.
              </h1>

              <p className="mt-5 max-w-[30ch] text-[14px] leading-[1.65] text-white/44">
                Five quick choices, then a dashboard that fits how you actually live.
              </p>
            </div>
          ) : null}

          {currentScreen === 'pay' ? (
            <div className="pt-4">
              <div>
                <h2 className="text-[31px] font-semibold leading-[1.04] tracking-[-0.038em] text-white">How often are you paid?</h2>
                <p className="mt-3 text-[13px] leading-6 text-white/42">We'll tune your rhythm around this.</p>
              </div>

              <div className="mt-9 grid grid-cols-2 gap-3">
                {payCadenceOptions.map(option => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    description={option.description}
                    icon={option.icon}
                    tile
                    selected={answers.payCadence === option.value}
                    className="min-h-[128px]"
                    onClick={() => setAnswers(current => ({ ...current, payCadence: option.value }))}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {currentScreen === 'life' ? (
            <div className="pt-4">
              <div>
                <h2 className="text-[31px] font-semibold leading-[1.04] tracking-[-0.038em] text-white">What needs attention right now?</h2>
                <p className="mt-3 text-[13px] leading-6 text-white/42">Pick what you want in your first view.</p>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-2.5">
                {moneyLifeOptions.map(option => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    icon={option.icon}
                    tile
                    className="min-h-[90px]"
                    selected={answers.moneyLife.includes(option.value)}
                    onClick={() => toggleMoneyLife(option.value)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {currentScreen === 'focus' ? (
            <div className="pt-4">
              <div>
                <h2 className="text-[31px] font-semibold leading-[1.04] tracking-[-0.038em] text-white">What needs the most support?</h2>
                <p className="mt-3 text-[13px] leading-6 text-white/42">We'll prioritize this first.</p>
              </div>

              <div className="mt-9 space-y-3">
                <ChoiceCard
                  title={firstFocusPrimary.title}
                  description={firstFocusPrimary.description}
                  icon={firstFocusPrimary.icon}
                  selected={answers.firstFocus === firstFocusPrimary.value}
                  className="min-h-[116px]"
                  onClick={() => setAnswers(current => ({ ...current, firstFocus: firstFocusPrimary.value }))}
                />

                <div className="grid grid-cols-2 gap-3">
                  {firstFocusSecondary.map(option => (
                    <ChoiceCard
                      key={option.value}
                      title={option.title}
                      description={option.description}
                      icon={option.icon}
                      tile
                      className="min-h-[130px]"
                      selected={answers.firstFocus === option.value}
                      onClick={() => setAnswers(current => ({ ...current, firstFocus: option.value }))}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {currentScreen === 'begin' ? (
            <div className="pt-4">
              <div>
                <h2 className="text-[31px] font-semibold leading-[1.04] tracking-[-0.038em] text-white">How should we start?</h2>
                <p className="mt-3 text-[13px] leading-6 text-white/42">Choose your setup pace.</p>
              </div>

              <div className="mt-9 grid grid-cols-2 gap-3">
                {startModeOptions.slice(0, 2).map(option => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    description={option.description}
                    icon={option.icon}
                    tile
                    className="min-h-[136px]"
                    selected={answers.startMode === option.value}
                    onClick={() => setAnswers(current => ({ ...current, startMode: option.value }))}
                  />
                ))}
                <ChoiceCard
                  title={startModeOptions[2].title}
                  description={startModeOptions[2].description}
                  icon={startModeOptions[2].icon}
                  selected={answers.startMode === startModeOptions[2].value}
                  className="col-span-2 min-h-[108px]"
                  onClick={() => setAnswers(current => ({ ...current, startMode: startModeOptions[2].value }))}
                />
              </div>
            </div>
          ) : null}

          {currentScreen === 'rhythm' ? (
            <div className="pt-4">
              <div>
                <h2 className="text-[31px] font-semibold leading-[1.04] tracking-[-0.038em] text-white">Where are you right now?</h2>
                <p className="mt-3 text-[13px] leading-6 text-white/42">We'll meet you there.</p>
              </div>

              <div className="mt-9 space-y-3">
                {moneyRhythmOptions.map(option => (
                  <ChoiceCard
                    key={option.value}
                    title={option.title}
                    description={option.description}
                    icon={option.icon}
                    selected={answers.moneyRhythm === option.value}
                    className="min-h-[106px]"
                    onClick={() => setAnswers(current => ({ ...current, moneyRhythm: option.value }))}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {currentScreen === 'summary' ? (
            <div className="flex flex-1 flex-col pt-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.05] px-3.5 py-1.5">
                <Sparkles size={13} className="text-[#9ce8f1]" />
                <span className="text-[11px] font-medium tracking-[0.04em] text-white/70">Setup complete</span>
              </div>

              <h2 className="mt-8 max-w-[11ch] text-[46px] font-semibold leading-[0.96] tracking-[-0.06em] text-white">
                You are ready.
              </h2>

              <p className="mt-7 max-w-[30ch] text-[15px] leading-[1.72] text-white/50">
                {buildSummaryLine(answers)}
              </p>

              <div className="mt-9 rounded-[28px] border border-white/[0.11] bg-[linear-gradient(170deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.11em] text-white/44">Your first dashboard</p>
                <p className="mt-4 text-[15px] leading-[1.7] text-white/80">{buildSupportLine(answers)}</p>
              </div>

              <p className="mt-6 text-[13px] leading-[1.62] text-white/42">
                We'll keep this light. You can add detail any time.
              </p>
            </div>
          ) : null}
        </motion.section>
      </AnimatePresence>
    </OnboardingShell>
  )
}
