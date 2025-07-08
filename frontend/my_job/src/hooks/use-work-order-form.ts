// src/hooks/use-work-order-form.ts - Updated to handle uploaded image URLs
import { useState, useCallback } from 'react'
import { FormField } from '@/config/work-order-form-config'

interface ImageFile {
  file: File
  preview: string
  id: string
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error'
  uploadProgress?: number
  uploadedUrl?: string
  error?: string
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

  const validateForm = useCallback((fields: FormField[]) => {
    const newErrors: Record<string, string> = {}
    
    fields.forEach(field => {
      if (field.required) {
        const value = formData[field.name]
        
        if (field.type === 'image-upload') {
          console.log(`🔍 Validating image field ${field.name}:`, value)
          if (!value || !Array.isArray(value) || value.length === 0) {
            newErrors[field.name] = `${field.label} is required`
          } else {
            // Check if all images are successfully uploaded
            const failedUploads = value.filter((img: ImageFile) => img.uploadStatus === 'error')
            const pendingUploads = value.filter((img: ImageFile) => 
              img.uploadStatus === 'pending' || img.uploadStatus === 'uploading'
            )
            
            if (failedUploads.length > 0) {
              newErrors[field.name] = `${failedUploads.length} image(s) failed to upload. Please retry or remove them.`
            } else if (pendingUploads.length > 0) {
              newErrors[field.name] = `${pendingUploads.length} image(s) are still uploading. Please wait for uploads to complete.`
            }
          }
        } else {
          if (!value || value === '' || value === 0) {
            newErrors[field.name] = `${field.label} is required`
          }
        }
      }
    })
    
    console.log(`❌ Validation errors:`, newErrors)
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

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

  // NEW: Get uploaded image URLs instead of files
  const getUploadedImageUrls = useCallback((fieldName: string): string[] => {
    const value = formData[fieldName]
    console.log(`🔗 Getting uploaded URLs for ${fieldName}:`, value)
    
    if (Array.isArray(value)) {
      const urls = value
        .filter((item: ImageFile) => item.uploadStatus === 'success' && item.uploadedUrl)
        .map((item: ImageFile) => item.uploadedUrl!)
      console.log(`🔗 Extracted URLs:`, urls)
      return urls
    }
    return []
  }, [formData])

  // NEW: Check if all images are uploaded
  const areAllImagesUploaded = useCallback((): boolean => {
    const beforePhotos = formData.beforePhotos || []
    const afterPhotos = formData.afterPhotos || []
    
    const allImages = [...beforePhotos, ...afterPhotos]
    
    if (allImages.length === 0) return true
    
    return allImages.every((img: ImageFile) => img.uploadStatus === 'success')
  }, [formData])

  // NEW: Get upload status summary
  const getUploadStatus = useCallback(() => {
    const beforePhotos = formData.beforePhotos || []
    const afterPhotos = formData.afterPhotos || []
    
    const allImages = [...beforePhotos, ...afterPhotos]
    
    return {
      total: allImages.length,
      uploaded: allImages.filter((img: ImageFile) => img.uploadStatus === 'success').length,
      uploading: allImages.filter((img: ImageFile) => img.uploadStatus === 'uploading').length,
      failed: allImages.filter((img: ImageFile) => img.uploadStatus === 'error').length,
      pending: allImages.filter((img: ImageFile) => img.uploadStatus === 'pending').length,
    }
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
    getUploadedImageUrls, // NEW
    areAllImagesUploaded, // NEW
    getUploadStatus, // NEW
    reset,
  }
}
