// src/hooks/use-work-order-form.ts - Add comprehensive debugging
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
    console.log(`🔧 setValue called: ${name}`, value) // Debug log
    
    setFormData((prev: any) => {
      const newData = { ...prev, [name]: value }
      console.log(`📝 New form data:`, newData) // Debug log
      return newData
    })
    
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
          console.log(`🔍 Validating image field ${field.name}:`, value) // Debug log
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
    
    console.log(`❌ Validation errors:`, newErrors) // Debug log
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const getImageFiles = useCallback((fieldName: string): File[] => {
    const value = formData[fieldName]
    console.log(`📁 Getting image files for ${fieldName}:`, value) // Debug log
    
    if (Array.isArray(value)) {
      const files = value.map((item: ImageFile) => item.file)
      console.log(`📁 Extracted files:`, files) // Debug log
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

  // Debug helper function
  const debugFormData = useCallback(() => {
    console.log('=== FORM DEBUG ===')
    console.log('📋 Complete form data:', formData)
    console.log('🖼️ Before photos:', formData.beforePhotos)
    console.log('🖼️ After photos:', formData.afterPhotos)
    console.log('📁 Before files:', getImageFiles('beforePhotos'))
    console.log('📁 After files:', getImageFiles('afterPhotos'))
    console.log('❌ Errors:', errors)
    console.log('🔍 Image previews:', imagePreviews)
    console.log('==================')
  }, [formData, errors, imagePreviews, getImageFiles])

  return {
    formData,
    errors,
    imagePreviews,
    setValue,
    setImagePreview,
    validateForm,
    getImageFiles,
    reset,
    debugFormData, // Add this for debugging
  }
}
