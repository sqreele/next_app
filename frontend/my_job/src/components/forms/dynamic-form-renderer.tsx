import React, { useRef } from 'react'
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const filteredItems = autocompleteItems.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.number?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
      case 'tel':
      case 'url':
        return (
          <Input
            type={field.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={field.placeholder}
            className={error ? 'border-red-500' : ''}
            min={field.validation?.min}
            max={field.validation?.max}
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
            <option value="">{field.placeholder || `Select ${field.label}`}</option>
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

      case 'enhanced-checkbox':
        const checkboxOptions = field.options || selectOptions
        const selectedValues = Array.isArray(value) ? value : []
        
        return (
          <div className="space-y-2">
            {checkboxOptions.map((option) => (
              <div key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  id={`${field.name}-${option.value}`}
                  checked={selectedValues.includes(option.value)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter(v => v !== option.value)
                    onChange(newValues)
                  }}
                  onBlur={onBlur}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`${field.name}-${option.value}`} className="text-sm text-gray-700">
                  {option.label}
                </label>
              </div>
            ))}
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
                // Clear any existing timeout
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current)
                }
                // Set new timeout with ref
                timeoutRef.current = setTimeout(() => {
                  setShowAutocomplete(false)
                }, 200)
                onBlur?.()
              }}
              placeholder={field.placeholder}
              className={error ? 'border-red-500' : ''}
            />
            {showAutocomplete && filteredItems.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onMouseDown={() => {
                      // Clear timeout when selecting
                      if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current)
                      }
                      onAutocompleteSelect?.(item)
                      setSearchTerm(item.name || item.number || '')
                      setShowAutocomplete(false)
                    }}
                  >
                    {item.name || item.number}
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'image-upload':
        return (
          <ImageUpload
            value={value}
            onChange={onChange}
            accept={field.accept}
            multiple={field.multiple}
            maxFiles={field.maxFiles}
            maxSize={field.maxSize}
            maxTotalSize={field.maxTotalSize}
            allowedFormats={field.allowedFormats}
            maxWidth={field.maxWidth}
            maxHeight={field.maxHeight}
            minWidth={field.minWidth}
            minHeight={field.minHeight}
          />
        )

      case 'file':
        return (
          <Input
            type="file"
            onChange={(e) => onChange(e.target.files)}
            onBlur={onBlur}
            accept={field.accept}
            multiple={field.multiple}
            className={error ? 'border-red-500' : ''}
          />
        )

      default:
        return null
    }
  }

  return (
    <div>
      {field.label && field.type !== 'checkbox' && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {renderField()}
      {field.description && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}