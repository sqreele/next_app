// src/components/forms/dynamic-form-renderer.tsx
import React from 'react'
import { FormField as FormFieldConfig } from '@/config/work-order-form-config'

// Use type assertion to bypass complex type issues
type ExtendedFormField = FormFieldConfig & {
  rows?: number
  helpText?: string
  className?: string
  type: 'text' | 'textarea' | 'select' | 'datetime-local' | 'date' | 'file' | 'checkbox' | 'radio' | 'autocomplete'
}
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Autocomplete } from '@/components/ui/autocomplete'
import { ImageUpload } from '@/components/ui/image-upload'
import { ButtonGroup } from '@/components/ui/button-group'

interface DynamicFormRendererProps {
  field: ExtendedFormField
  value: any
  error?: string
  onChange: (value: any) => void
  // Data providers for selects and autocomplete
  selectOptions?: Array<{ value: any; label: string }>
  autocompleteItems?: Array<{ id: number; name: string; number?: string; room_type?: string }>
  onAutocompleteSelect?: (item: any) => void
  // Image handling
  imagePreview?: string | null
  onImageChange?: (file: File | null) => void
}

export function DynamicFormRenderer({
  field,
  value,
  error,
  onChange,
  selectOptions = [],
  autocompleteItems = [],
  onAutocompleteSelect,
  imagePreview,
  onImageChange
}: DynamicFormRendererProps) {
  const renderField = () => {
    switch (field.type as any) {
      case 'text':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={error ? 'border-red-500' : ''}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={field.rows || 3}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full ${error ? 'border-red-500' : ''}`}
          />
        )

      case 'datetime-local':
        return (
          <Input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full min-w-[280px] ${error ? 'border-red-500' : ''}`}
          />
        )

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">{field.placeholder}</option>
            {selectOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'autocomplete':
        return (
          <Autocomplete
            items={autocompleteItems}
            value={value || ''}
            onChange={onChange}
            onSelect={onAutocompleteSelect || (() => {})}
            placeholder={field.placeholder}
            className={error ? 'border-red-500' : ''}
          />
        )

      case 'button-group':
        return (
          <ButtonGroup
            options={field.options || []}
            value={value}
            onChange={onChange}
          />
        )

      case 'file':
        return (
          <ImageUpload
            preview={imagePreview || null}
            onChange={onImageChange || (() => {})}
            label={field.label}
            helpText={field.helpText}
          />
        )

      default:
        return null
    }
  }

  return (
    <FormField
      label={field.label}
      required={field.required}
      error={error}
      helpText={field.helpText}
      className={field.className}
    >
      {renderField()}
    </FormField>
  )
}