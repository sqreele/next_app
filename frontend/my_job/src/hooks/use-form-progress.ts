// src/hooks/use-form-progress.ts
import { useState, useEffect, useCallback, useMemo } from 'react'
import { FormField } from '@/config/work-order-form-config'

export interface FormSection {
  title: string
  fields: FormField[]
}

export function useFormProgress(sections: FormSection[], formData: any, errors: any) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [stepsWithErrors, setStepsWithErrors] = useState<number[]>([])
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]))

  // Check if a section is completed - memoized to prevent infinite loops
  const isSectionCompleted = useCallback((sectionIndex: number): boolean => {
    const section = sections[sectionIndex]
    if (!section) return false

    return section.fields.every(field => {
      if (!field.required) return true
      
      const value = formData[field.name]
      
      // Check if field has value
      if (value === null || value === undefined || value === '') return false
      if (typeof value === 'string' && !value.trim()) return false
      if (typeof value === 'number' && value === 0 && field.name.endsWith('_id')) return false
      
      return true
    })
  }, [sections, formData])

  // Check if a section has errors - memoized to prevent infinite loops
  const sectionHasErrors = useCallback((sectionIndex: number): boolean => {
    const section = sections[sectionIndex]
    if (!section) return false

    return section.fields.some(field => errors[field.name])
  }, [sections, errors])

  // Update progress based on form data and errors
  useEffect(() => {
    const newCompletedSteps: number[] = []
    const newStepsWithErrors: number[] = []

    sections.forEach((_, index) => {
      if (isSectionCompleted(index)) {
        newCompletedSteps.push(index)
      }
      
      if (sectionHasErrors(index)) {
        newStepsWithErrors.push(index)
      }
    })

    setCompletedSteps(newCompletedSteps)
    setStepsWithErrors(newStepsWithErrors)
  }, [sections, isSectionCompleted, sectionHasErrors])

  // Navigate to step
  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < sections.length) {
      setCurrentStep(stepIndex)
      setVisitedSteps(prev => new Set([...prev, stepIndex]))
    }
  }

  // Navigate to next step
  const nextStep = () => {
    if (currentStep < sections.length - 1) {
      const nextStepIndex = currentStep + 1
      setCurrentStep(nextStepIndex)
      setVisitedSteps(prev => new Set([...prev, nextStepIndex]))
    }
  }

  // Navigate to previous step
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Check if we can navigate to next step
  const canGoNext = () => {
    return currentStep < sections.length - 1
  }

  // Check if we can navigate to previous step
  const canGoPrev = () => {
    return currentStep > 0
  }

  // Get overall form completion percentage
  const getCompletionPercentage = () => {
    if (completedSteps.length === 0) return 0
    return Math.round((completedSteps.length / sections.length) * 100)
  }

  // Check if form is complete
  const isFormComplete = () => {
    return completedSteps.length === sections.length && stepsWithErrors.length === 0
  }

  return {
    currentStep,
    completedSteps,
    stepsWithErrors,
    visitedSteps: Array.from(visitedSteps),
    goToStep,
    nextStep,
    prevStep,
    canGoNext,
    canGoPrev,
    getCompletionPercentage,
    isFormComplete,
    isSectionCompleted,
    sectionHasErrors
  }
}