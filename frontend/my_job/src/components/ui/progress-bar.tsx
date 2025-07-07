// src/components/ui/progress-bar.tsx
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

export interface ProgressStep {
  id: string
  title: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  required?: boolean
}

export interface ProgressBarProps {
  steps: ProgressStep[]
  currentStep: number
  completedSteps: number[]
  stepsWithErrors: number[]
  onStepClick?: (stepIndex: number) => void
  className?: string
  orientation?: 'horizontal' | 'vertical'
  showLabels?: boolean
  showProgress?: boolean
}

export function ProgressBar({
  steps,
  currentStep,
  completedSteps,
  stepsWithErrors,
  onStepClick,
  className,
  orientation = 'horizontal',
  showLabels = true,
  showProgress = true
}: ProgressBarProps) {
  const isHorizontal = orientation === 'horizontal'
  const progressPercentage = Math.round((completedSteps.length / steps.length) * 100)

  const getStepStatus = (stepIndex: number) => {
    if (stepsWithErrors.includes(stepIndex)) return 'error'
    if (completedSteps.includes(stepIndex)) return 'completed'
    if (stepIndex === currentStep) return 'current'
    if (stepIndex < currentStep) return 'visited'
    return 'upcoming'
  }

  const getStepStyles = (status: string) => {
    const baseStyles = "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 cursor-pointer"
    
    switch (status) {
      case 'completed':
        return `${baseStyles} bg-green-500 border-green-500 text-white hover:bg-green-600`
      case 'current':
        return `${baseStyles} bg-blue-500 border-blue-500 text-white shadow-lg ring-2 ring-blue-200`
      case 'error':
        return `${baseStyles} bg-red-500 border-red-500 text-white hover:bg-red-600`
      case 'visited':
        return `${baseStyles} bg-gray-200 border-gray-300 text-gray-600 hover:bg-gray-300`
      default:
        return `${baseStyles} bg-white border-gray-300 text-gray-400`
    }
  }

  const getConnectorStyles = (fromIndex: number) => {
    const fromStatus = getStepStatus(fromIndex)
    const toStatus = getStepStatus(fromIndex + 1)
    
    if (fromStatus === 'completed' || fromStatus === 'current') {
      return 'bg-blue-500'
    }
    return 'bg-gray-300'
  }

  const StepIcon = ({ step, status, index }: { step: ProgressStep; status: string; index: number }) => {
    if (status === 'completed') {
      return <CheckIcon className="w-5 h-5" />
    }
    if (status === 'error') {
      return <ExclamationTriangleIcon className="w-5 h-5" />
    }
    if (step.icon) {
      const Icon = step.icon
      return <Icon className="w-5 h-5" />
    }
    return <span className="text-sm font-semibold">{index + 1}</span>
  }

  if (isHorizontal) {
    return (
      <div className={cn("w-full", className)}>
        {/* Progress Summary */}
        {showProgress && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Form Progress
              </span>
              <span className="text-sm font-medium text-gray-700">
                {progressPercentage}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(index)
            const isClickable = onStepClick && (status !== 'upcoming' || index <= currentStep + 1)

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center relative">
                  {/* Step Circle */}
                  <motion.button
                    type="button"
                    onClick={() => isClickable && onStepClick?.(index)}
                    className={getStepStyles(status)}
                    disabled={!isClickable}
                    whileHover={isClickable ? { scale: 1.05 } : {}}
                    whileTap={isClickable ? { scale: 0.95 } : {}}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <StepIcon step={step} status={status} index={index} />
                    
                    {/* Current step pulse animation */}
                    {status === 'current' && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-blue-400"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </motion.button>

                  {/* Step Label */}
                  {showLabels && (
                    <div className="mt-3 text-center max-w-20">
                      <div className={cn(
                        "text-xs font-medium",
                        status === 'current' ? 'text-blue-600' :
                        status === 'completed' ? 'text-green-600' :
                        status === 'error' ? 'text-red-600' :
                        'text-gray-500'
                      )}>
                        {step.title}
                      </div>
                      {step.description && (
                        <div className="text-xs text-gray-400 mt-1">
                          {step.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Connector */}
                {index < steps.length - 1 && (
                  <motion.div
                    className={cn(
                      "flex-1 h-0.5 mx-4",
                      getConnectorStyles(index)
                    )}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    )
  }

  // Vertical layout
  return (
    <div className={cn("flex flex-col", className)}>
      {showProgress && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-gray-700">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {steps.map((step, index) => {
        const status = getStepStatus(index)
        const isClickable = onStepClick && (status !== 'upcoming' || index <= currentStep + 1)
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="flex">
            <div className="flex flex-col items-center mr-4">
              {/* Step Circle */}
              <motion.button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                className={getStepStyles(status)}
                disabled={!isClickable}
                whileHover={isClickable ? { scale: 1.05 } : {}}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <StepIcon step={step} status={status} index={index} />
                
                {status === 'current' && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-blue-400"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </motion.button>

              {/* Vertical Connector */}
              {!isLast && (
                <motion.div
                  className={cn(
                    "w-0.5 h-16 mt-2",
                    getConnectorStyles(index)
                  )}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                />
              )}
            </div>

            {/* Step Content */}
            {showLabels && (
              <div className="flex-1 pb-8">
                <div className={cn(
                  "text-sm font-medium",
                  status === 'current' ? 'text-blue-600' :
                  status === 'completed' ? 'text-green-600' :
                  status === 'error' ? 'text-red-600' :
                  'text-gray-500'
                )}>
                  {step.title}
                </div>
                {step.description && (
                  <div className="text-sm text-gray-400 mt-1">
                    {step.description}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}