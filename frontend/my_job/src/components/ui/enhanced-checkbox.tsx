// src/components/ui/enhanced-checkbox.tsx

import React from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'

interface EnhancedCheckboxProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  description?: string
  icon?: React.ComponentType<{ className?: string }>
}

export function EnhancedCheckbox({
  id,
  label,
  checked,
  onChange,
  description,
  icon: Icon
}: EnhancedCheckboxProps) {
  return (
    <div className="relative">
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor={id} className="font-medium text-gray-700 flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            {label}
          </label>
          {description && (
            <p className="text-gray-500">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}