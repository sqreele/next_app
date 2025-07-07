// src/hooks/use-work-order-form.ts
import { useState, useEffect } from 'react'
import { FormField } from '@/config/work-order-form-config'

export interface FormData {
  [key: string]: any
}

export interface FormErrors {
  [key: string]: string
}

export function useWorkOrderForm(initialData: FormData = {}) {
  const [formData, setFormData] = useState<FormData>(initialData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [imagePreviews, setImagePreviews] = useState<Record<string, string | null>>({})

  const setValue = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when value changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const setImagePreview = (name: string, preview: string | null) => {
    setImagePreviews(prev => ({ ...prev, [name]: preview }))
  }

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${field.label} is required`
    }

    if (field.validation) {
      const { pattern, message } = field.validation

      if (value && pattern) {
        const regex = new RegExp(pattern)
        if (!regex.test(value)) {
          return message || `${field.label} format is invalid`
        }
      }
    }

    return null
  }

  const validateForm = (fields: FormField[]): boolean => {
    const newErrors: FormErrors = {}

    fields.forEach(field => {
      const error = validateField(field, formData[field.name])
      if (error) {
        newErrors[field.name] = error
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const reset = () => {
    setFormData(initialData)
    setErrors({})
    setImagePreviews({})
  }

  return {
    formData,
    errors,
    imagePreviews,
    setValue,
    setImagePreview,
    validateForm,
    reset
  }
}