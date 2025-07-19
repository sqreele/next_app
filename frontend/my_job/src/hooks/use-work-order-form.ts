import { useState, useCallback } from 'react'
import { FormField } from '@/config/work-order-form-config'
import apiClient from '@/lib/api-client'

interface ImageFile {
  file: File
  preview: string
  id: string
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error'
  uploadProgress?: number
  uploadedUrl?: string
  error?: string
  isLocal?: boolean
  localUrl?: string
}

export function useWorkOrderForm(initialData: any) {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [imagePreviews, setImagePreviews] = useState<Record<string, string | null>>({})

  const setValue = useCallback((name: string, value: any) => {
    console.log(`🔧 setValue called: ${name}`, value)
    
    if (name === 'beforePhotos' || name === 'afterPhotos') {
      setFormData((prev: any) => {
        const newValue = typeof value === 'function' ? value(prev[name] || []) : value
        
        if (Array.isArray(newValue) && newValue.length === 0 && Array.isArray(prev[name]) && prev[name].length > 0) {
          console.warn(`⚠️ [setValue] Attempting to set empty array for ${name} when previous value had ${prev[name].length} items`)
          return prev
        }
        
        const newData = { ...prev, [name]: newValue }
        console.log(`📝 New form data for ${name}:`, newData[name])
        return newData
      })
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }))
    }
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }, [errors])

  const setImagePreview = useCallback((name: string, preview: string | null) => {
    setImagePreviews((prev) => ({ ...prev, [name]: preview }))
  }, [])

  const validateForm = useCallback((fields: FormField[]) => {
    const newErrors: Record<string, string> = {}

    fields.forEach((field) => {
      const value = formData[field.name]

      if (field.validation?.custom) {
        const customResult = field.validation.custom(value, formData)
        if (typeof customResult === 'string') {
          newErrors[field.name] = customResult
          return
        }
        if (customResult === false) {
          newErrors[field.name] = `${field.label} is invalid`
          return
        }
      }

      if (field.required && (!field.conditional || field.conditional(formData))) {
        if (field.type === 'image-upload') {
          if (!value || !Array.isArray(value) || value.length === 0) {
            newErrors[field.name] = `${field.label} is required`
          } else {
            const failedUploads = value.filter((img: ImageFile) => img.uploadStatus === 'error')
            const uploadingUploads = value.filter((img: ImageFile) => img.uploadStatus === 'uploading')
            const pendingUploads = value.filter((img: ImageFile) => img.uploadStatus === 'pending')

            if (failedUploads.length > 0) {
              newErrors[field.name] = `${failedUploads.length} image(s) failed to upload. Please retry or remove them.`
            } else if (uploadingUploads.length > 0) {
              newErrors[field.name] = `${uploadingUploads.length} image(s) are still uploading. Please wait for uploads to complete.`
            } else if (pendingUploads.length > 0) {
              newErrors[field.name] = `${pendingUploads.length} image(s) are pending upload. Please wait for uploads to complete.`
            }
          }
        } else if (!value && value !== 0) {
          newErrors[field.name] = `${field.label} is required`
        }
      }

      if (field.name === 'frequency' && formData.has_pm && !value) {
        newErrors[field.name] = 'Frequency is required for Preventive Maintenance'
      }
    })

    console.log('❌ Validation errors:', newErrors)
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const getImageFiles = useCallback(
    (fieldName: string): File[] => {
      const value = formData[fieldName]
      if (Array.isArray(value)) {
        const files = value.map((item: ImageFile) => item.file)
        return files
      }
      return []
    },
    [formData]
  )

  const getUploadedImageUrls = useCallback(
    (fieldName: string): string[] => {
      const value = formData[fieldName]
      if (!Array.isArray(value)) {
        return []
      }
      if (value.length === 0) {
        return []
      }
      const successfulUploads = value.filter((item: ImageFile) => {
        const isSuccess = item.uploadStatus === 'success'
        const hasUrl = item.uploadedUrl && typeof item.uploadedUrl === 'string' && item.uploadedUrl.trim() !== ''
        return isSuccess && hasUrl
      })
      const urls = successfulUploads.map((item: ImageFile) => item.uploadedUrl!)
      console.log(`🔗 [getUploadedImageUrls] Final URLs for ${fieldName}:`, urls)
      return urls
    },
    [formData]
  )

  const areAllImagesUploaded = useCallback((): boolean => {
    const beforePhotos = formData.beforePhotos || []
    const afterPhotos = formData.afterPhotos || []
    const allImages = [...beforePhotos, ...afterPhotos]
    if (allImages.length === 0) {
      return true
    }
    const allReady = allImages.every((img: ImageFile) => img.uploadStatus === 'success')
    console.log(`🔍 All images ready: ${allReady}`, {
      total: allImages.length,
      successful: allImages.filter((img: ImageFile) => img.uploadStatus === 'success').length,
      uploading: allImages.filter((img: ImageFile) => img.uploadStatus === 'uploading').length,
      pending: allImages.filter((img: ImageFile) => img.uploadStatus === 'pending').length,
      failed: allImages.filter((img: ImageFile) => img.uploadStatus === 'error').length,
    })
    return allReady
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
      local: allImages.filter((img: ImageFile) => img.isLocal).length,
    }
    return status
  }, [formData])

  const uploadAllLocalImages = useCallback(
    async (): Promise<{ beforePhotos: string[]; afterPhotos: string[] }> => {
      const beforePhotos = formData.beforePhotos || []
      const afterPhotos = formData.afterPhotos || []
      const allLocalImages = [...beforePhotos, ...afterPhotos].filter((img) => img.isLocal && img.uploadStatus === 'pending')
      
      if (allLocalImages.length === 0) {
        return { beforePhotos: getUploadedImageUrls('beforePhotos'), afterPhotos: getUploadedImageUrls('afterPhotos') }
      }
      
      console.log(`📤 Uploading ${allLocalImages.length} local images`)
      
      const uploadPromises = allLocalImages.map(async (img: ImageFile) => {
        try {
          setFormData((prev: any) => {
            const fieldName = beforePhotos.includes(img) ? 'beforePhotos' : 'afterPhotos'
            const images = prev[fieldName].map((i: ImageFile) =>
              i.id === img.id ? { ...i, uploadStatus: 'uploading', uploadProgress: 0 } : i
            )
            return { ...prev, [fieldName]: images }
          })

          const formData = new FormData()
          formData.append('file', img.file)
          
          const response = await apiClient.post('/api/v1/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total!)
              setFormData((prev: any) => {
                const fieldName = beforePhotos.includes(img) ? 'beforePhotos' : 'afterPhotos'
                const images = prev[fieldName].map((i: ImageFile) =>
                  i.id === img.id ? { ...i, uploadProgress: progress } : i
                )
                return { ...prev, [fieldName]: images }
              })
            },
          })

          const uploadedUrl = response.data.url
          setFormData((prev: any) => {
            const fieldName = beforePhotos.includes(img) ? 'beforePhotos' : 'afterPhotos'
            const images = prev[fieldName].map((i: ImageFile) =>
              i.id === img.id ? { ...i, uploadStatus: 'success', uploadedUrl, uploadProgress: 100 } : i
            )
            return { ...prev, [fieldName]: images }
          })

          return uploadedUrl
        } catch (error) {
          console.error(`Error uploading image ${img.id}:`, error)
          setFormData((prev: any) => {
            const fieldName = beforePhotos.includes(img) ? 'beforePhotos' : 'afterPhotos'
            const images = prev[fieldName].map((i: ImageFile) =>
              i.id === img.id ? { ...i, uploadStatus: 'error', error: 'Upload failed' } : i
            )
            return { ...prev, [fieldName]: images }
          })
          return null
        }
      })

      const urls = await Promise.all(uploadPromises)
      const beforeUrls = urls.filter((_, index) => beforePhotos.includes(allLocalImages[index]))
      const afterUrls = urls.filter((_, index) => afterPhotos.includes(allLocalImages[index]))

      return {
        beforePhotos: beforeUrls.filter((url): url is string => url !== null),
        afterPhotos: afterUrls.filter((url): url is string => url !== null),
      }
    },
    [formData, setFormData, getUploadedImageUrls]
  )

  const reset = useCallback(() => {
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
    uploadAllLocalImages,
    reset,
  }
}