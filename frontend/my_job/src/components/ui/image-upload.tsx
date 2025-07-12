// src/components/ui/image-upload.tsx - With immediate upload functionality
import React, { useCallback, useState, useEffect } from 'react'
import { PhotoIcon, XMarkIcon, EyeIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

interface ImageFile {
  file: File
  preview: string
  id: string
  uploadStatus: 'pending' | 'uploading' | 'success' | 'error'
  uploadProgress?: number
  uploadedUrl?: string
  error?: string
}

interface ImageUploadProps {
  value: ImageFile[]
  onChange: (files: ImageFile[]) => void
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSize?: number
  minSize?: number
  maxTotalSize?: number
  allowedFormats?: string[]
  maxWidth?: number
  maxHeight?: number
  minWidth?: number
  minHeight?: number
  label?: string
  error?: string
  required?: boolean
  uploadEndpoint?: string
  uploadType?: 'before' | 'after'
}

export function ImageUpload({
  value = [],
  onChange,
  accept = 'image/*',
  multiple = true,
  maxFiles = 5,
  maxSize = 10,
  minSize = 0.01,
  maxTotalSize = 50,
  allowedFormats = ['jpeg', 'jpg', 'png', 'webp'],
  maxWidth = 4096,
  maxHeight = 4096,
  minWidth = 100,
  minHeight = 100,
  label,
  error,
  required = false,
  uploadEndpoint = '/api/v1/work_orders/upload_image',
  uploadType = 'before',
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Debug effect to monitor value changes
  useEffect(() => {
    console.log(`🔍 ImageUpload [${label}] value changed:`, value)
    console.log(`🔍 Successful uploads:`, value.filter(img => img.uploadStatus === 'success'))
    console.log(`🔍 URLs:`, value.filter(img => img.uploadStatus === 'success').map(img => img.uploadedUrl))
  }, [value, label])

  // Upload image to server
  const uploadImageToServer = async (file: File, imageId: string): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_type', uploadType)
    formData.append('category', 'work_order')

    try {
      console.log(`📤 Uploading ${file.name} to ${uploadEndpoint}`)
      
      // Get token from auth store with proper error handling
      const authState = useAuthStore.getState()
      const token = authState.token
      
      if (!token) {
        throw new Error('No authentication token available. Please log in again.')
      }

      console.log('📡 Request headers:', {
        'Authorization': `Bearer ${token.substring(0, 10)}...`,
        'Content-Type': 'multipart/form-data (auto-set by browser)'
      })

      console.log('📡 Request body:', {
        file: file.name,
        upload_type: uploadType,
        category: 'work_order'
      })
      
      const response = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      console.log(`✅ Upload successful for ${file.name}:`, result)
      
      // Handle different possible response formats and validate URL
      const uploadedUrl = result.file_path || result.url || result.path || result.data?.url || result.data?.file_path
      
      if (!uploadedUrl || typeof uploadedUrl !== 'string' || uploadedUrl.trim() === '') {
        console.error('❌ Server response missing valid URL:', result)
        throw new Error('Server did not return a valid file URL')
      }
      
      console.log(`✅ Extracted URL: ${uploadedUrl}`)
      return uploadedUrl.trim()
    } catch (error) {
      console.error(`❌ Upload failed for ${file.name}:`, error)
      throw error
    }
  }

  // Update image status
  const updateImageStatus = (id: string, updates: Partial<ImageFile>) => {
    console.log(`🔄 Updating image ${id} status:`, updates)
    onChange(value.map(img => 
      img.id === id ? { ...img, ...updates } : img
    ))
  }

  // Start upload process for an image
  const startImageUpload = async (imageFile: ImageFile) => {
    console.log(`🚀 Starting upload for ${imageFile.file.name}`)
    
    try {
      // Update status to uploading
      updateImageStatus(imageFile.id, { 
        uploadStatus: 'uploading', 
        uploadProgress: 0,
        error: undefined
      })

      // Simulate progress (since fetch doesn't provide real progress)
      const progressInterval = setInterval(() => {
        updateImageStatus(imageFile.id, { 
          uploadProgress: Math.min((imageFile.uploadProgress || 0) + 10, 90)
        })
      }, 200)

      try {
        // Upload the file
        const uploadedUrl = await uploadImageToServer(imageFile.file, imageFile.id)
        
        // Clear progress interval
        clearInterval(progressInterval)

        // Validate the uploaded URL
        if (!uploadedUrl || uploadedUrl.trim() === '') {
          throw new Error('Server returned an empty URL')
        }

        // Update with success
        updateImageStatus(imageFile.id, {
          uploadStatus: 'success',
          uploadProgress: 100,
          uploadedUrl: uploadedUrl,
          error: undefined
        })

        console.log(`✅ Upload completed for ${imageFile.file.name}, URL: ${uploadedUrl}`)
        toast.success(`${imageFile.file.name} uploaded successfully`)
        
      } catch (uploadError) {
        // Clear progress interval on error
        clearInterval(progressInterval)
        throw uploadError
      }
      
    } catch (error: any) {
      console.error(`❌ Upload failed for ${imageFile.file.name}:`, error)
      
      // Update with error
      updateImageStatus(imageFile.id, {
        uploadStatus: 'error',
        uploadProgress: 0,
        error: error.message || 'Upload failed'
      })

      toast.error(`Failed to upload ${imageFile.file.name}: ${error.message}`)
    }
  }

  // Retry upload for failed images
  const retryUpload = (imageFile: ImageFile) => {
    console.log(`🔄 Retrying upload for ${imageFile.file.name}`)
    updateImageStatus(imageFile.id, { 
      uploadStatus: 'pending',
      uploadProgress: 0,
      error: undefined 
    })
    startImageUpload(imageFile)
  }

  // Validate file
  const validateFile = async (file: File): Promise<{ isValid: boolean; errors: string[] }> => {
    const errors: string[] = []

    // File size validation
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSize) {
      errors.push(`File ${file.name} is too large. Maximum size is ${maxSize}MB.`)
    }
    if (fileSizeMB < minSize) {
      errors.push(`File ${file.name} is too small. Minimum size is ${minSize}MB.`)
    }

    // File type validation
    if (!file.type.startsWith('image/')) {
      errors.push(`File ${file.name} is not a valid image.`)
      return { isValid: false, errors }
    }

    // Format validation
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (fileExtension && !allowedFormats.map(f => f.toLowerCase()).includes(fileExtension)) {
      errors.push(`File ${file.name} format not allowed. Allowed formats: ${allowedFormats.join(', ')}`)
    }

    // Image dimension validation
    try {
      const dimensions = await getImageDimensions(file)
      if (dimensions.width > maxWidth) {
        errors.push(`Image ${file.name} width (${dimensions.width}px) exceeds maximum (${maxWidth}px)`)
      }
      if (dimensions.height > maxHeight) {
        errors.push(`Image ${file.name} height (${dimensions.height}px) exceeds maximum (${maxHeight}px)`)
      }
      if (dimensions.width < minWidth) {
        errors.push(`Image ${file.name} width (${dimensions.width}px) is below minimum (${minWidth}px)`)
      }
      if (dimensions.height < minHeight) {
        errors.push(`Image ${file.name} height (${dimensions.height}px) is below minimum (${minHeight}px)`)
      }
    } catch (error) {
      errors.push(`Could not validate dimensions for ${file.name}`)
    }

    return { isValid: errors.length === 0, errors }
  }

  // Get image dimensions
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(img.src) // Clean up
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  // Validate total file size
  const validateTotalSize = (newFiles: File[], existingFiles: ImageFile[]): boolean => {
    const existingSize = existingFiles.reduce((total, img) => total + img.file.size, 0)
    const newSize = newFiles.reduce((total, file) => total + file.size, 0)
    const totalSizeMB = (existingSize + newSize) / (1024 * 1024)
    
    if (totalSizeMB > maxTotalSize) {
      toast.error(`Total file size (${totalSizeMB.toFixed(2)}MB) exceeds maximum (${maxTotalSize}MB)`)
      return false
    }
    return true
  }

  const handleFiles = useCallback(
    async (files: FileList) => {
      console.log(`📁 [ImageUpload-${label}] Handling ${files.length} files`)
      
      const validFiles: File[] = []
      const allErrors: string[] = []
      
      // Check file count
      if (value.length + files.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed. You're trying to add ${files.length} more to ${value.length} existing files.`)
        return
      }

      // Check total size first
      if (!validateTotalSize(Array.from(files), value)) {
        return
      }

      // Validate each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        console.log(`🔍 [ImageUpload-${label}] Validating file ${i + 1}:`, file.name)
        
        const validation = await validateFile(file)
        if (validation.isValid) {
          validFiles.push(file)
        } else {
          allErrors.push(...validation.errors)
        }
      }

      // Show validation errors
      if (allErrors.length > 0) {
        setValidationErrors(allErrors)
        allErrors.forEach(error => toast.error(error))
      } else {
        setValidationErrors([])
      }

      // Add valid files and start uploads
      if (validFiles.length > 0) {
        const newImageFiles: ImageFile[] = validFiles.map(file => ({
          file,
          preview: URL.createObjectURL(file),
          id: Math.random().toString(36).substr(2, 9),
          uploadStatus: 'pending',
          uploadProgress: 0,
        }))

        const updatedValue = [...value, ...newImageFiles]
        onChange(updatedValue)
        
        console.log(`🚀 Starting uploads for ${newImageFiles.length} files`)
        
        // Start uploading each file immediately
        newImageFiles.forEach(imageFile => {
          startImageUpload(imageFile)
        })
        
        if (validFiles.length < files.length) {
          toast.warning(`${validFiles.length} of ${files.length} files were added. Check validation errors above.`)
        }
      }
    },
    [value, onChange, maxFiles, maxSize, minSize, maxTotalSize, allowedFormats, maxWidth, maxHeight, minWidth, minHeight, label, uploadEndpoint, uploadType]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
      e.target.value = '' // Reset input
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const removeImage = (id: string) => {
    console.log(`🗑️ Removing image ${id}`)
    const newValue = value.filter(img => img.id !== id)
    onChange(newValue)
    
    // Revoke object URL to prevent memory leaks
    const imageToRemove = value.find(img => img.id === id)
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview)
    }
  }

  const openPreview = (preview: string) => {
    setPreviewImage(preview)
  }

  const closePreview = () => {
    setPreviewImage(null)
  }

  // Get upload status summary
  const uploadStatus = {
    total: value.length,
    uploading: value.filter(img => img.uploadStatus === 'uploading').length,
    success: value.filter(img => img.uploadStatus === 'success').length,
    failed: value.filter(img => img.uploadStatus === 'error').length,
    pending: value.filter(img => img.uploadStatus === 'pending').length,
  }

  // Calculate current total size
  const currentTotalSizeMB = value.reduce((total, img) => total + img.file.size, 0) / (1024 * 1024)

  return (
    <div className="space-y-4">
      {/* Validation Status */}
      {required && value.length === 0 && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <span>At least one image is required</span>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Upload Progress Summary */}
      {value.length > 0 && (uploadStatus.uploading > 0 || uploadStatus.failed > 0 || uploadStatus.pending > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-800">
            <div className="flex items-center justify-between">
              <span>Upload Progress:</span>
              <span>{uploadStatus.success} / {uploadStatus.total} completed</span>
            </div>
            {uploadStatus.uploading > 0 && (
              <div className="text-blue-600 mt-1">
                {uploadStatus.uploading} file(s) uploading...
              </div>
            )}
            {uploadStatus.pending > 0 && (
              <div className="text-yellow-600 mt-1">
                {uploadStatus.pending} file(s) pending...
              </div>
            )}
            {uploadStatus.failed > 0 && (
              <div className="text-red-600 mt-1">
                {uploadStatus.failed} file(s) failed to upload
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : error || validationErrors.length > 0
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <label htmlFor={`file-upload-${label}`} className="cursor-pointer">
            <span className="mt-2 block text-sm font-medium text-gray-900">
              {multiple ? 'Upload images' : 'Upload image'}
            </span>
            <span className="mt-1 block text-xs text-gray-500">
              Drag and drop or click to select {multiple ? 'files' : 'file'}
            </span>
            <span className="mt-1 block text-xs text-red-500">
              Images will be uploaded immediately after selection
            </span>
            <div className="mt-2 text-xs text-gray-400 space-y-1">
              <div>Max {maxFiles} files, {maxSize}MB each, {maxTotalSize}MB total</div>
              <div>Formats: {allowedFormats.join(', ').toUpperCase()}</div>
              <div>Dimensions: {minWidth}×{minHeight} to {maxWidth}×{maxHeight} pixels</div>
            </div>
          </label>
          <input
            id={`file-upload-${label}`}
            type="file"
            className="hidden"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
          />
        </div>
      </div>

      {/* Usage Statistics */}
      {value.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-800">
            <div>Files: {value.length} / {maxFiles}</div>
            <div>Total size: {currentTotalSizeMB.toFixed(2)}MB / {maxTotalSize}MB</div>
            <div>Status: {uploadStatus.success} uploaded, {uploadStatus.uploading} uploading, {uploadStatus.failed} failed</div>
          </div>
        </div>
      )}

      {/* Image Previews */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {value.map((imageFile) => (
            <div key={imageFile.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={imageFile.preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                
                {/* Upload Status Overlay */}
                {imageFile.uploadStatus !== 'success' && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    {imageFile.uploadStatus === 'uploading' && (
                      <div className="text-center">
                        <ArrowPathIcon className="h-6 w-6 text-white animate-spin mx-auto mb-1" />
                        <div className="text-white text-xs">
                          {imageFile.uploadProgress || 0}%
                        </div>
                      </div>
                    )}
                    {imageFile.uploadStatus === 'pending' && (
                      <div className="text-center">
                        <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                        <div className="text-white text-xs">Pending...</div>
                      </div>
                    )}
                    {imageFile.uploadStatus === 'error' && (
                      <div className="text-center">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-400 mx-auto mb-1" />
                        <button
                          onClick={() => retryUpload(imageFile)}
                          className="text-white text-xs bg-red-600 px-2 py-1 rounded hover:bg-red-700"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Success Indicator */}
                {imageFile.uploadStatus === 'success' && (
                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              
              {/* Image Actions */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => openPreview(imageFile.preview)}
                    className="p-2 bg-white rounded-full text-gray-600 hover:text-gray-900"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(imageFile.id)}
                    className="p-2 bg-white rounded-full text-red-600 hover:text-red-900"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* File Info */}
              <div className="mt-1 text-xs text-gray-500 truncate">
                {imageFile.file.name}
              </div>
              <div className="text-xs text-gray-400 flex justify-between">
                <span>{(imageFile.file.size / 1024 / 1024).toFixed(1)}MB</span>
                {imageFile.uploadStatus === 'success' && (
                  <span className="text-green-600">✓ Uploaded</span>
                )}
                {imageFile.uploadStatus === 'error' && (
                  <span className="text-red-600">✗ Failed</span>
                )}
                {imageFile.uploadStatus === 'uploading' && (
                  <span className="text-blue-600">⏳ Uploading</span>
                )}
                {imageFile.uploadStatus === 'pending' && (
                  <span className="text-yellow-600">⏸ Pending</span>
                )}
              </div>
              {imageFile.error && (
                <div className="text-xs text-red-600 mt-1">{imageFile.error}</div>
              )}
              {imageFile.uploadedUrl && (
                <div className="text-xs text-green-600 mt-1 truncate" title={imageFile.uploadedUrl}>
                  URL: {imageFile.uploadedUrl}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closePreview}
              className="absolute top-4 right-4 p-2 bg-white rounded-full text-gray-600 hover:text-gray-900"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}