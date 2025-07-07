// src/hooks/use-work-order-form.ts
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
    setFormData((prev: any) => ({ ...prev, [name]: value }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }, [errors])

  const setImagePreview = useCallback((name: string, preview: string | null) => {
    setImagePreviews(prev => ({ ...prev, [name]: preview }))
  }, [])

  const validateForm = useCallback((fields: FormField[]) => {
    const newErrors: Record<string, string> = {}
    
    fields.forEach(field => {
      if (field.required) {
        const value = formData[field.name]
        
        if (field.type === 'image-upload') {
          if (!value || !Array.isArray(value) || value.length === 0) {
            newErrors[field.name] = `${field.label} is required`
          }
        } else {
          if (!value || value === '' || value === 0) {
            newErrors[field.name] = `${field.label} is required`
          }
        }
      }
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const getImageFiles = useCallback((fieldName: string): File[] => {
    const value = formData[fieldName]
    if (Array.isArray(value)) {
      return value.map((item: ImageFile) => item.file)
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

  return {
    formData,
    errors,
    imagePreviews,
    setValue,
    setImagePreview,
    validateForm,
    getImageFiles,
    reset,
  }
}