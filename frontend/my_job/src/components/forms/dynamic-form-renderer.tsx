// src/components/forms/dynamic-form-renderer.tsx - Updated to handle new validation props
import React from 'react'
import { Input } from '@/components/ui/input'
import { ImageUpload } from '@/components/ui/image-upload'
import { FormField, FormFieldOption } from '@/config/work-order-form-config'

interface DynamicFormRendererProps {
  field: FormField
  value: any
  error?: string
  onChange: (value: any) => void
  selectOptions?: { value: any; label: string }[]
  autocompleteItems?: any[]
  onAutocompleteSelect?: (item: any) => void
  onBlur?: () => void
}

export function DynamicFormRenderer({
  field,
  value,
  error,
  onChange,
  selectOptions = [],
  autocompleteItems = [],
  onAutocompleteSelect,
  onBlur,
}: DynamicFormRendererProps) {
  const [showAutocomplete, setShowAutocomplete] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')

  const filteredItems = autocompleteItems.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
        return (
          <Input
            type={field.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={field.placeholder}
            className={error ? 'border-red-500' : ''}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={field.placeholder}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )

      case 'select':
        const options = field.options || selectOptions
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select {field.label}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={field.name}
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              onBlur={onBlur}
              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={field.name} className="text-sm text-gray-700">
              {field.label}
            </label>
          </div>
        )

      case 'datetime-local':
      case 'date':
        return (
          <Input
            type={field.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            className={error ? 'border-red-500' : ''}
          />
        )

      case 'autocomplete':
        return (
          <div className="relative">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowAutocomplete(true)
              }}
              onFocus={() => setShowAutocomplete(true)}
              onBlur={() => {
                setTimeout(() => setShowAutocomplete(false), 200)
                onBlur?.()
              }}
              placeholder={field.placeholder}
              className={error ? 'border-red-500' : ''}
            />
            {showAutocomplete && filteredItems.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredItems.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
                    onClick={() => {
                      if (onAutocompleteSelect) {
                        onAutocompleteSelect(item)
                        setSearchTerm(`${item.name} (${item.number})`)
                      } else {
                        onChange(item.value || item.name)
                      }
                      setShowAutocomplete(false)
                    }}
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.number} - {item.room_type}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )

      case 'image-upload':
        return (
          <ImageUpload
            value={value || []}
            onChange={onChange}
            accept={field.accept}
            multiple={field.multiple}
            maxFiles={field.maxFiles}
            maxSize={field.maxSize}
            minSize={field.minSize}
            maxTotalSize={field.maxTotalSize}
            allowedFormats={field.allowedFormats}
            maxWidth={field.maxWidth}
            maxHeight={field.maxHeight}
            minWidth={field.minWidth}
            minHeight={field.minHeight}
            label={field.name}
            error={error}
            required={field.required}
          />
        )

      case 'file':
        return (
          <div className="space-y-2">
            <input
              type="file"
              accept={field.accept}
              multiple={field.multiple}
              onChange={(e) => {
                if (field.multiple) {
                  const files = Array.from(e.target.files || [])
                  onChange(files)
                } else {
                  const file = e.target.files?.[0] || null
                  onChange(file)
                }
              }}
              onBlur={onBlur}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {field.multiple && value && Array.isArray(value) && (
              <div className="text-sm text-gray-600">
                {value.length} file(s) selected
              </div>
            )}
          </div>
        )

      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={field.placeholder}
            className={error ? 'border-red-500' : ''}
          />
        )
    }
  }

  if (field.type === 'checkbox') {
    return (
      <div>
        {renderField()}
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      
      {/* Show validation hints */}
      {field.validation && !error && (
        <div className="mt-1 text-xs text-gray-500">
          {field.validation.minLength && field.validation.maxLength && (
            <div>Length: {field.validation.minLength}-{field.validation.maxLength} characters</div>
          )}
          {field.type === 'image-upload' && (
            <div>
              {field.maxFiles && <span>Max {field.maxFiles} files • </span>}
              {field.maxSize && <span>{field.maxSize}MB per file • </span>}
              {field.allowedFormats && <span>Formats: {field.allowedFormats.join(', ')}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
