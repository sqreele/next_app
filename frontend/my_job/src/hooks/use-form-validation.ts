// src/hooks/use-form-validation.ts
import { useState, useEffect } from 'react'

interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => boolean | string
}

interface ValidationRules {
  [key: string]: ValidationRule
}

interface ValidationErrors {
  [key: string]: string
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  rules: ValidationRules
) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = (name: string, value: any): string => {
    const rule = rules[name]
    if (!rule) return ''

    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${name} is required`
    }

    if (value && rule.minLength && value.length < rule.minLength) {
      return `${name} must be at least ${rule.minLength} characters`
    }

    if (value && rule.maxLength && value.length > rule.maxLength) {
      return `${name} must be no more than ${rule.maxLength} characters`
    }

    if (value && rule.pattern && !rule.pattern.test(value)) {
      return `${name} format is invalid`
    }

    if (rule.custom) {
      const customResult = rule.custom(value)
      if (typeof customResult === 'string') return customResult
      if (customResult === false) return `${name} is invalid`
    }

    return ''
  }

  const validateAll = (): boolean => {
    const newErrors: ValidationErrors = {}
    let isValid = true

    Object.keys(rules).forEach(name => {
      const error = validateField(name, values[name])
      if (error) {
        newErrors[name] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  const setValue = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }))
    
    // Clear error when value changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const setFieldTouched = (name: string, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }))
    
    // Validate field when touched
    if (isTouched) {
      const error = validateField(name, values[name])
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    validateField,
    reset,
    isValid: Object.keys(errors).length === 0,
  }
}
