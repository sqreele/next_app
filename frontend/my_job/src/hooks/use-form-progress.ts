import { useState, useMemo } from 'react'

export function useFormProgress(sections: any[], formData: any, errors: any) {
  const [currentStep, setCurrentStep] = useState(0)

  const completedSteps = useMemo(() => {
    return sections.map((section, index) => {
      if (index > currentStep) return false
      
      return section.fields.every((field: any) => {
        if (!field.required) return true
        if (field.conditional && !formData[field.conditional]) return true
        
        const value = formData[field.name]
        
        if (field.type === 'image-upload') {
          if (!field.required) return true
          if (!value || !Array.isArray(value) || value.length === 0) return false
          
          // Check if all images are successfully uploaded
          const hasFailedUploads = value.some((img: any) => img.uploadStatus === 'error')
          const hasUploading = value.some((img: any) => 
            img.uploadStatus === 'pending' || img.uploadStatus === 'uploading'
          )
          
          return !hasFailedUploads && !hasUploading
        }
        
        return value !== null && value !== undefined && value !== '' && value !== 0
      })
    })
  }, [sections, formData, currentStep])

  const stepsWithErrors = useMemo(() => {
    return sections.map((section) => {
      return section.fields.some((field: any) => errors[field.name])
    })
  }, [sections, errors])

  const goToStep = (step: number) => {
    if (step >= 0 && step < sections.length) {
      setCurrentStep(step)
    }
  }

  const nextStep = () => {
    if (currentStep < sections.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canGoNext = () => currentStep < sections.length - 1
  const canGoPrev = () => currentStep > 0

  const getCompletionPercentage = () => {
    const completedCount = completedSteps.filter(Boolean).length
    return Math.round((completedCount / sections.length) * 100)
  }

  const isFormComplete = () => {
    return completedSteps.every(Boolean)
  }

  return {
    currentStep,
    completedSteps,
    stepsWithErrors,
    goToStep,
    nextStep,
    prevStep,
    canGoNext,
    canGoPrev,
    getCompletionPercentage,
    isFormComplete,
  }
}