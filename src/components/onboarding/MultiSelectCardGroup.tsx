import type { LucideIcon } from 'lucide-react'
import { ChoiceCard } from './ChoiceCard'

type MultiSelectOption<T extends string> = {
  value: T
  title: string
  description?: string
  icon?: LucideIcon
}

type MultiSelectCardGroupProps<T extends string> = {
  options: MultiSelectOption<T>[]
  selectedValues: T[]
  onToggle: (value: T) => void
}

export function MultiSelectCardGroup<T extends string>({
  options,
  selectedValues,
  onToggle,
}: MultiSelectCardGroupProps<T>) {
  return (
    <div className="grid gap-3">
      {options.map((option) => (
        <ChoiceCard
          key={option.value}
          title={option.title}
          description={option.description}
          icon={option.icon}
          selected={selectedValues.includes(option.value)}
          onClick={() => onToggle(option.value)}
        />
      ))}
    </div>
  )
}