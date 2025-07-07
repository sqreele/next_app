// src/components/ui/image-upload.tsx
import React from 'react'
import { PhotoIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface ImageUploadProps {
  preview: string | null
  onChange: (file: File | null) => void
  label: string
  helpText?: string
}

export function ImageUpload({ preview, onChange, label, helpText }: ImageUploadProps) {
  return (
    <div>
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt={label}
            className="w-full h-48 object-cover rounded-lg border"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
          >
            <XCircleIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <PhotoIcon className="w-8 h-8 mb-4 text-gray-500" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> {label.toLowerCase()}
            </p>
            {helpText && <p className="text-xs text-gray-500">{helpText}</p>}
            <p className="text-xs text-gray-400 mt-2">(Optional)</p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
      )}
    </div>
  )
}