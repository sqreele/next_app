// src/components/ui/image-upload.tsx
import React, { useCallback } from 'react'
import { PhotoIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'

interface ImageFile {
  file: File
  preview: string
  id: string
}

interface ImageUploadProps {
  value: ImageFile[]
  onChange: (files: ImageFile[]) => void
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSize?: number // in MB
  label?: string
  error?: string
}

export function ImageUpload({
  value = [],
  onChange,
  accept = 'image/*',
  multiple = true,
  maxFiles = 5,
  maxSize = 10,
  label,
  error,
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [previewImage, setPreviewImage] = React.useState<string | null>(null)

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File ${file.name} is too large. Maximum size is ${maxSize}MB.`)
      return false
    }

    // Check file type
    if (accept === 'image/*' && !file.type.startsWith('image/')) {
      toast.error(`File ${file.name} is not a valid image.`)
      return false
    }

    return true
  }

  const handleFiles = useCallback(
    (files: FileList) => {
      const validFiles: File[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (validateFile(file)) {
          validFiles.push(file)
        }
      }

      if (value.length + validFiles.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed.`)
        return
      }

      const newImageFiles: ImageFile[] = validFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substr(2, 9),
      }))

      onChange([...value, ...newImageFiles])
    },
    [value, onChange, maxFiles, maxSize]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
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

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : error
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
            <span className="mt-1 block text-xs text-gray-400">
              Max {maxFiles} files, {maxSize}MB each
            </span>
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
              <div className="text-xs text-gray-400">
                {(imageFile.file.size / 1024 / 1024).toFixed(1)}MB
              </div>
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