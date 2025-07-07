// src/components/ui/progress-bar.tsx
import React from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ProgressStep {
  id: string
  label: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface ProgressBarProps {
  steps: ProgressStep[]
  currentStep: number
  completedSteps: boolean[]
  stepsWithErrors: boolean[]
  onStepClick?: (step: number) => void
  showProgress?: boolean
  className?: string
}

export function ProgressBar({
  steps,
  currentStep,
  completedSteps,
  stepsWithErrors,
  onStepClick,
  showProgress = true,
  className = '',
}: ProgressBarProps) {
  const getStepStatus = (index: number) => {
    if (stepsWithErrors[index]) return 'error'
    if (completedSteps[index]) return 'completed'
    if (index === currentStep) return 'current'
    return 'pending'
  }

  const getStepClasses = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600 border-green-600 text-white'
      case 'current':
        return 'bg-blue-600 border-blue-600 text-white'
      case 'error':
        return 'bg-red-600 border-red-600 text-white'
      default:
        return 'bg-white border-gray-300 text-gray-400'
    }
  }

  const getConnectorClasses = (index: number) => {
    if (completedSteps[index]) {
      return 'bg-green-600'
    }
    return 'bg-gray-300'
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(index)
          const IconComponent = step.icon

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onStepClick?.(index)}
                  disabled={!onStepClick}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-medium text-sm transition-all ${getStepClasses(
                    status
                  )} ${onStepClick ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}`}
                >
                  {status === 'completed' ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : status === 'error' ? (
                    <ExclamationTriangleIcon className="h-5 w-5" />
                  ) : IconComponent ? (
                    <IconComponent className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </button>
                <div className="mt-2 text-center">
                  <div className="text-sm font-medium text-gray-900">{step.label}</div>
                  {step.description && (
                    <div className="text-xs text-gray-500 max-w-20 mx-auto">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>

              {index < steps.length - 1 && (
                <div className="flex-1 mx-4">
                  <div className={`h-1 rounded-full transition-all ${getConnectorClasses(index)}`} />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {showProgress && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}