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

  // In src/hooks/use-work-order-form.ts, update the setValue function:

const setValue = useCallback((name: string, value: any) => {
  console.log(`🔧 setValue called: ${name}`, value)
  
  if (name === 'beforePhotos' || name === 'afterPhotos') {
    console.log(`📸 [setValue] Image field ${name}:`, {
      isArray: Array.isArray(value),
      isFunction: typeof value === 'function',
      length: Array.isArray(value) ? value.length : 'not array',
      uploadStatuses: Array.isArray(value) ? value.map((img: any) => img.uploadStatus) : 'not array',
      ids: Array.isArray(value) ? value.map((img: any) => img.id) : 'not array'
    })
    
    // Add stack trace to see where this is being called from
    if (Array.isArray(value) && value.length === 0) {
      console.log(`⚠️ [setValue] Empty array passed for ${name}. Stack trace:`, new Error().stack)
      console.log(`⚠️ [setValue] Empty array call stack:`, new Error().stack?.split('\n').slice(0, 10).join('\n'))
    }
  }
  
  // Use functional update for image fields to prevent race conditions
  if (name === 'beforePhotos' || name === 'afterPhotos') {
    setFormData((prev: any) => {
      // Handle functional updates for image fields
      const newValue = typeof value === 'function' ? value(prev[name] || []) : value
      const newData = { ...prev, [name]: newValue }
      console.log(`📝 New form data for ${name}:`, newData[name])
      return newData
    })
  } else {
    setFormData((prev: any) => ({ ...prev, [name]: value }))
  }
  
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

  const getUploadedImageUrls = useCallback((fieldName: string): string[] => {
    const value = formData[fieldName]
    console.log(`🔗 [getUploadedImageUrls] Getting URLs for ${fieldName}:`, value)
    
    if (!Array.isArray(value)) {
      console.warn(`⚠️ [getUploadedImageUrls] ${fieldName} is not an array:`, typeof value, value)
      return []
    }
    
    if (value.length === 0) {
      console.log(`📝 [getUploadedImageUrls] ${fieldName} array is empty`)
      return []
    }
    
    const successfulUploads = value.filter((item: ImageFile) => {
      const isSuccess = item.uploadStatus === 'success'
      const hasUrl = item.uploadedUrl && typeof item.uploadedUrl === 'string' && item.uploadedUrl.trim() !== ''
      
      console.log(`🔍 [getUploadedImageUrls] Item ${item.id}:`, {
        status: item.uploadStatus,
        hasUrl: !!hasUrl,
        url: item.uploadedUrl,
        fileName: item.file?.name
      })
      
      return isSuccess && hasUrl
    })
    
    const urls = successfulUploads.map((item: ImageFile) => item.uploadedUrl!)
    
    console.log(`🔗 [getUploadedImageUrls] Final URLs for ${fieldName}:`, urls)
    return urls
  }, [formData])

  const areAllImagesUploaded = useCallback((): boolean => {
    const beforePhotos = formData.beforePhotos || []
    const afterPhotos = formData.afterPhotos || []
    
    const allImages = [...beforePhotos, ...afterPhotos]
    
    if (allImages.length === 0) {
      console.log('✅ No images to upload')
      return true
    }
    
    const allUploaded = allImages.every((img: ImageFile) => img.uploadStatus === 'success')
    console.log(`🔍 All images uploaded: ${allUploaded}`, {
      total: allImages.length,
      successful: allImages.filter((img: ImageFile) => img.uploadStatus === 'success').length
    })
    
    return allUploaded
  }, [formData])

  const getUploadStatus = useCallback(() => {
    const beforePhotos = formData.beforePhotos || []
    const afterPhotos = formData.afterPhotos || []
    
    const allImages = [...beforePhotos, ...afterPhotos]
    
    const status = {
      total: allImages.length,
      uploaded: allImages.filter((img: ImageFile) => img.uploadStatus === 'success').length,
      uploading: allImages.filter((img: ImageFile) => img.uploadStatus === 'uploading').length,
      failed: allImages.filter((img: ImageFile) => img.uploadStatus === 'error').length,
      pending: allImages.filter((img: ImageFile) => img.uploadStatus === 'pending').length,
    }
    
    console.log('📊 Upload status:', status)
    return status
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
    getUploadedImageUrls,
    areAllImagesUploaded,
    getUploadStatus,
    reset,
  }
}