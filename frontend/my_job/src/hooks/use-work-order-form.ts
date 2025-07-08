// src/hooks/use-work-order-form.ts - Enhanced with better validation
import { useState, useCallback } from 'react'
import { FormField } from '@/config/work-order-form-config'

interface ImageFile {
  file: File
  preview: string
  id: string
}

export function useWorkOrderForm(initialData: any) {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [imagePreviews, setImagePreviews] = useState<Record<string, string | null>>({})

  const setValue = useCallback((name: string, value: any) => {
    console.log(`🔧 setValue called: ${name}`, value)
    
    setFormData((prev: any) => {
      const newData = { ...prev, [name]: value }
      console.log(`📝 New form data:`, newData)
      return newData
    })
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }, [errors])

  const setImagePreview = useCallback((name: string, preview: string | null) => {
    setImagePreviews(prev => ({ ...prev, [name]: preview }))
  }, [])

  const validateField = useCallback((field: FormField, value: any): string => {
    // Required field validation
    if (field.required) {
      if (field.type === 'image-upload') {
        if (!value || !Array.isArray(value) || value.length === 0) {
          return `${field.label} is required`
        }
      } else if (field.conditional && !formData[field.conditional]) {
        // Skip validation if conditional field is not met
        return ''
      } else if (!value || value === '' || value === 0) {
        return `${field.label} is required`
      }
    }

    // Type-specific validation
    if (value && field.validation) {
      const { validation } = field

      // String length validation
      if (typeof value === 'string') {
        if (validation.minLength && value.length < validation.minLength) {
          return `${field.label} must be at least ${validation.minLength} characters`
        }
        if (validation.maxLength && value.length > validation.maxLength) {
          return `${field.label} must be no more than ${validation.maxLength} characters`
        }
      }

      // Pattern validation
      if (validation.pattern && typeof value === 'string') {
        if (!validation.pattern.test(value)) {
          return `${field.label} format is invalid`
        }
      }

      // Custom validation
      if (validation.custom) {
        const result = validation.custom(value)
        if (typeof result === 'string') {
          return result
        }
        if (result === false) {
          return `${field.label} is invalid`
        }
      }
    }

    // Image-specific validation
    if (field.type === 'image-upload' && Array.isArray(value) && value.length > 0) {
      // File count validation
      if (field.maxFiles && value.length > field.maxFiles) {
        return `Maximum ${field.maxFiles} files allowed for ${field.label}`
      }

      // Individual file size validation
      if (field.maxSize) {
        const oversizedFiles = value.filter(
          (img: ImageFile) => img.file.size > (field.maxSize! * 1024 * 1024)
        )
        if (oversizedFiles.length > 0) {
          return `Some files in ${field.label} exceed ${field.maxSize}MB limit`
        }
      }

      // Total size validation
      if (field.maxTotalSize) {
        const totalSize = value.reduce(
          (sum: number, img: ImageFile) => sum + img.file.size,
          0
        ) / (1024 * 1024)
        if (totalSize > field.maxTotalSize) {
          return `Total size of ${field.label} exceeds ${field.maxTotalSize}MB limit`
        }
      }

      // File format validation
      if (field.allowedFormats) {
        const invalidFiles = value.filter((img: ImageFile) => {
          const extension = img.file.name.split('.').pop()?.toLowerCase()
          return !field.allowedFormats!.map(f => f.toLowerCase()).includes(extension || '')
        })
        if (invalidFiles.length > 0) {
          return `Some files in ${field.label} have invalid formats. Allowed: ${field.allowedFormats.join(', ')}`
        }
      }
    }

    return ''
  }, [formData])

  const validateForm = useCallback((fields: FormField[]) => {
    const newErrors: Record<string, string> = {}
    
    fields.forEach(field => {
      const value = formData[field.name]
      const error = validateField(field, value)
      if (error) {
        newErrors[field.name] = error
      }
    })
    
    console.log(`❌ Validation errors:`, newErrors)
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, validateField])

  const validateSingleField = useCallback((field: FormField) => {
    const value = formData[field.name]
    const error = validateField(field, value)
    
    setErrors(prev => ({
      ...prev,
      [field.name]: error
    }))
    
    return !error
  }, [formData, validateField])

  const getImageFiles = useCallback((fieldName: string): File[] => {
    const value = formData[fieldName]
    console.log(`📁 Getting image files for ${fieldName}:`, value)
    
    if (Array.isArray(value)) {
      const files = value.map((item: ImageFile) => item.file)
      console.log(`📁 Extracted files:`, files)
      return files
    }
    return []
  }, [formData])

  const reset = useCallback(() => {
    // Clean up object URLs to prevent memory leaks
    Object.values(formData).forEach((value: any) => {
      if (Array.isArray(value)) {
        value.forEach((item: any) => {
          if (item && typeof item === 'object' && item.preview) {
            URL.revokeObjectURL(item.preview)
          }
        })
      }
    })

    setFormData(initialData)
    setErrors({})
    setImagePreviews({})
  }, [initialData, formData])

  const getFormProgress = useCallback(() => {
    const totalFields = Object.keys(initialData).length
    const completedFields = Object.values(formData).filter(value => {
      if (Array.isArray(value)) {
        return value.length > 0
      }
      return value !== null && value !== undefined && value !== ''
    }).length

    return Math.round((completedFields / totalFields) * 100)
  }, [formData, initialData])

  const hasErrors = useCallback(() => {
    return Object.values(errors).some(error => error !== '')
  }, [errors])

  return {
    formData,
    errors,
    imagePreviews,
    setValue,
    setImagePreview,
    validateForm,
    validateSingleField,
    getImageFiles,
    reset,
    getFormProgress,
    hasErrors,
  }
}
