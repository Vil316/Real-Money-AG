import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
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
import { cn } from '@/lib/utils'

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
  { value: 'irregular' as const, title: 'Irregular', icon: CircleHelp },
]

const moneyLifeOptions = [
  { value: 'bank_accounts' as const, title: 'Accounts', icon: Landmark },
  { value: 'bills' as const, title: 'Bills', icon: ReceiptText },
  { value: 'debt' as const, title: 'Debt', icon: CreditCard },
  { value: 'bnpl' as const, title: 'Buy now pay later', icon: Wallet },
  { value: 'family_support' as const, title: 'Family support', icon: HeartHandshake },
  { value: 'saving_goals' as const, title: 'Savings goals', icon: Target },
  { value: 'cash_savings' as const, title: 'Cash savings', icon: PiggyBank },
]

const firstFocusOptions = [
  { value: 'safe_to_spend' as const, title: 'Safe to spend', icon: ShieldCheck },
  { value: 'stay_on_top_of_bills' as const, title: 'Bills', icon: ReceiptText },
  { value: 'pay_off_debt' as const, title: 'Debt', icon: CreditCard },
  { value: 'save_more' as const, title: 'Saving', icon: PiggyBank },
  { value: 'everything_in_one_place' as const, title: 'Everything', icon: Sparkles },
]

const startModeOptions = [
  { value: 'connect_account' as const, title: 'Connect account', icon: Landmark },
  { value: 'add_manually' as const, title: 'Add manually', icon: HandCoins },
  { value: 'start_simple' as const, title: 'Start simple', icon: Sparkles },
]

const moneyRhythmOptions = [
  { value: 'mostly_know' as const, title: 'Mostly clear', icon: ShieldCheck },
  { value: 'bit_messy' as const, title: 'Bit messy', icon: Wallet },
  { value: 'fresh_start' as const, title: 'Fresh start', icon: Sparkles },
]

const payCadenceLabels: Record<PayCadence, string> = {
  weekly: 'weekly',
  every_2_weeks: 'every 2 weeks',
  monthly: 'monthly',
  irregular: 'irregular',
}

const moneyLifeLabels: Record<MoneyLifeArea, string> = {
  bank_accounts: 'accounts',
  cash_savings: 'cash savings',
  bills: 'bills',
  debt: 'debt',
  bnpl: 'buy now pay later',
  family_support: 'family support',
  saving_goals: 'savings goals',
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

function formatHumanList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function buildWarmSummaryLine(answers: OnboardingAnswers): string {
  const cadence = answers.payCadence ? payCadenceLabels[answers.payCadence] : 'irregular'
  const focusTone: Record<FirstFocus, string> = {
    safe_to_spend: 'a clearer safe-to-spend view',
    stay_on_top_of_bills: 'your bills in better shape',
    pay_off_debt: 'steady debt progress',
    save_more: 'more consistent saving',
    everything_in_one_place: 'everything in one place',
  }

  const selectedLife = answers.moneyLife
    .slice(0, 2)
    .map(item => moneyLifeLabels[item])

  const lifeMention = selectedLife.length > 0 ? formatHumanList(selectedLife) : 'main accounts'
  const focus = answers.firstFocus ? focusTone[answers.firstFocus] : 'a clearer spendable view'

  return `We'll start with your ${cadence} pay rhythm, your ${lifeMention}, and ${focus}.`
}

export function OnboardingFlow() {
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const { user } = useAuth()
  const [screenIndex, setScreenIndex] = useState(0)
  const [answers, setAnswers] = useState<OnboardingAnswers>(() => readSavedDraft())
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentScreen = screens[screenIndex]
  const questionStep = currentScreen === 'welcome' ? 0 : currentScreen === 'summary' ? QUESTION_COUNT : screenIndex
  const brandLayoutId = 'onboarding-brandmark'

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(answers))
  }, [answers])

  const goNext = () => setScreenIndex(current => Math.min(current + 1, screens.length - 1))
  const goBack = () => setScreenIndex(current => Math.max(current - 1, 0))

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
        initial: { opacity: 0, y: 3 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -2 },
        transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
      }

  const brandTransition = {
    type: 'tween' as const,
    duration: 0.38,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  }

  const questionTitleClass =
    'max-w-[17ch] text-[29px] font-semibold leading-[1.08] tracking-[-0.035em] text-white sm:text-[31px]'
  const questionSupportClass = 'mt-2.5 max-w-[34ch] text-[12px] leading-[1.78] tracking-[0.018em] text-white/34'
  const shellClassName =
    currentScreen === 'welcome' || currentScreen === 'summary' ? 'pb-20 pt-6' : 'pt-7'

  const quickChipClass =
    'inline-flex items-center gap-2 rounded-[13px] border px-3 py-2 text-[13px] font-medium tracking-[-0.01em] transition-all duration-150'
  const quickChipSelectedClass =
    'border-[#93e0eb]/48 bg-[linear-gradient(180deg,rgba(131,216,227,0.1),rgba(255,255,255,0.03))] text-white shadow-[0_4px_10px_rgba(74,164,176,0.14)]'
  const quickChipIdleClass =
    'border-white/[0.11] bg-white/[0.02] text-white/74 hover:border-white/[0.18] hover:text-white/88'
  const strongRowSelectedClass =
    'border-[#a4ecf5]/64 bg-[linear-gradient(180deg,rgba(150,232,243,0.18),rgba(255,255,255,0.06))] shadow-[0_12px_24px_rgba(59,145,157,0.24)]'

  return (
    <LayoutGroup id="onboarding-flow">
      <OnboardingShell
        className={shellClassName}
        header={
          <ProgressHeader
            title={currentScreen === 'welcome' || currentScreen === 'summary' ? '' : 'RealMoney'}
            brandLayoutId={brandLayoutId}
            currentStep={questionStep}
            totalSteps={QUESTION_COUNT}
            onBack={goBack}
            showBack={screenIndex > 0 && currentScreen !== 'summary'}
          />
        }
        footer={
          <StickyActionBar
            primaryLabel={currentScreen === 'welcome' ? 'Start setup' : currentScreen === 'summary' ? 'See my dashboard' : 'Continue'}
            onPrimary={currentScreen === 'summary' ? completeOnboarding : goNext}
            primaryDisabled={!canContinue}
            loading={isSubmitting}
            className={currentScreen === 'welcome' ? 'pt-1' : undefined}
          />
        }
      >
        <AnimatePresence initial={false} mode="sync">
          <motion.section key={currentScreen} {...transitionProps} className="flex min-h-full flex-col">
            {currentScreen === 'welcome' ? (
              <div className="relative flex flex-1 flex-col items-center justify-end px-3 pb-8 pt-14 text-center">
                <div className="pointer-events-none absolute left-1/2 top-[52%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(137,225,236,0.16),rgba(137,225,236,0)_70%)] blur-2xl" />

                <div className="relative flex flex-col items-center">
                  <motion.p
                    layout
                    layoutId={brandLayoutId}
                    transition={brandTransition}
                    className="text-[11px] font-medium tracking-[0.19em] text-white/42"
                  >
                    RealMoney
                  </motion.p>
                  <h1 className="mt-4 max-w-[11ch] text-[43px] font-semibold leading-[0.98] tracking-[-0.052em] text-white sm:text-[47px]">
                    A clearer view
                    <br />
                    of your money.
                  </h1>
                  <p className="mt-2.5 max-w-[28ch] text-[13px] leading-[1.72] tracking-[0.02em] text-white/36">
                    Built for real life money.
                  </p>
                </div>

                <div className="relative mt-3 flex w-full items-center justify-center">
                  <div className="h-px w-28 bg-gradient-to-r from-transparent via-[#93dfe9]/74 to-transparent" />
                </div>
              </div>
            ) : null}

            {currentScreen === 'pay' ? (
              <div className="pt-0">
                <h2 className={questionTitleClass}>How often are you paid?</h2>
                <p className={questionSupportClass}>This sets your money rhythm.</p>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  {payCadenceOptions.map(option => {
                    const selected = answers.payCadence === option.value
                    const Icon = option.icon

                    return (
                      <motion.button
                        key={option.value}
                        type="button"
                        onClick={() => setAnswers(current => ({ ...current, payCadence: option.value }))}
                        whileTap={{ scale: 0.985 }}
                        className={cn(
                          quickChipClass,
                          'min-h-[62px]',
                          selected ? quickChipSelectedClass : quickChipIdleClass,
                        )}
                      >
                        <Icon
                          size={14}
                          strokeWidth={1.9}
                          className={cn('shrink-0 transition-colors duration-150', selected ? 'text-[#c3f4fa]' : 'text-white/44')}
                        />
                        <span>{option.title}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {currentScreen === 'life' ? (
              <div className="pt-0">
                <h2 className={questionTitleClass}>What do you want in one place?</h2>
                <p className={questionSupportClass}>Pick what should stay visible first.</p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {moneyLifeOptions.map(option => {
                    const selected = answers.moneyLife.includes(option.value)
                    const Icon = option.icon

                    return (
                      <motion.button
                        key={option.value}
                        type="button"
                        onClick={() => toggleMoneyLife(option.value)}
                        whileTap={{ scale: 0.985 }}
                        className={cn(
                          quickChipClass,
                          selected ? quickChipSelectedClass : quickChipIdleClass,
                        )}
                      >
                        <Icon
                          size={14}
                          strokeWidth={2}
                          className={cn('shrink-0 transition-colors duration-150', selected ? 'text-[#c3f4fa]' : 'text-white/44')}
                        />
                        <span>{option.title}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {currentScreen === 'focus' ? (
              <div className="pt-0">
                <h2 className={questionTitleClass}>What matters most first?</h2>
                <p className={questionSupportClass}>We will prioritize this from day one.</p>

                <div className="mt-6 space-y-2">
                  {firstFocusOptions.map(option => (
                    <ChoiceCard
                      key={option.value}
                      title={option.title}
                      icon={option.icon}
                      compact
                      selected={answers.firstFocus === option.value}
                      className="min-h-[68px]"
                      onClick={() => setAnswers(current => ({ ...current, firstFocus: option.value }))}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {currentScreen === 'begin' ? (
              <div className="pt-0">
                <h2 className={questionTitleClass}>How do you want to start?</h2>
                <p className={questionSupportClass}>Pick the setup pace that fits today.</p>

                <div className="mt-6 space-y-2">
                  {startModeOptions.map(option => {
                    const selected = answers.startMode === option.value

                    return (
                      <ChoiceCard
                        key={option.value}
                        title={option.title}
                        icon={option.icon}
                        compact
                        selected={selected}
                        className={cn('min-h-[68px]', selected && strongRowSelectedClass)}
                        onClick={() => setAnswers(current => ({ ...current, startMode: option.value }))}
                      />
                    )
                  })}
                </div>
              </div>
            ) : null}

            {currentScreen === 'rhythm' ? (
              <div className="pt-0">
                <h2 className={questionTitleClass}>Where are you right now?</h2>
                <p className={questionSupportClass}>No pressure. We meet you where you are.</p>

                <div className="mt-6 space-y-2">
                  {moneyRhythmOptions.map(option => {
                    const selected = answers.moneyRhythm === option.value

                    return (
                      <ChoiceCard
                        key={option.value}
                        title={option.title}
                        icon={option.icon}
                        compact
                        selected={selected}
                        className={cn('min-h-[68px]', selected && strongRowSelectedClass)}
                        onClick={() => setAnswers(current => ({ ...current, moneyRhythm: option.value }))}
                      />
                    )
                  })}
                </div>
              </div>
            ) : null}

            {currentScreen === 'summary' ? (
              <div className="relative flex flex-1 flex-col items-center justify-end px-3 pb-8 pt-14 text-center">
                <div className="pointer-events-none absolute left-1/2 top-[52%] h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(137,225,236,0.14),rgba(137,225,236,0)_70%)] blur-2xl" />

                <div className="relative flex flex-col items-center">
                  <motion.p
                    layout
                    layoutId={brandLayoutId}
                    transition={brandTransition}
                    className="text-[11px] font-medium tracking-[0.19em] text-white/42"
                  >
                    RealMoney
                  </motion.p>
                  <h2 className="mt-4 max-w-[11ch] text-[41px] font-semibold leading-[1.01] tracking-[-0.052em] text-white">
                    A clearer starting point.
                  </h2>
                  <p className="mt-2.5 max-w-[32ch] text-[13px] leading-[1.74] tracking-[0.012em] text-white/62">
                    {buildWarmSummaryLine(answers)}
                  </p>
                </div>

                <div className="relative mt-3 flex w-full items-center justify-center">
                  <div className="h-px w-28 bg-gradient-to-r from-transparent via-[#93dfe9]/74 to-transparent" />
                </div>
              </div>
            ) : null}
          </motion.section>
        </AnimatePresence>
      </OnboardingShell>
    </LayoutGroup>
  )
}
