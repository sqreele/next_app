// src/components/ui/button-group.tsx
import React from 'react'

interface ButtonGroupOption {
  value: string | number
  label: string
  color?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface ButtonGroupProps {
  options: ButtonGroupOption[]
  value: string | number
  onChange: (value: string | number) => void
  className?: string
}

export function ButtonGroup({ options, value, onChange, className }: ButtonGroupProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {options.map((option) => {
        const IconComponent = option.icon
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
              value === option.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {IconComponent && <IconComponent className="h-4 w-4" />}
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}