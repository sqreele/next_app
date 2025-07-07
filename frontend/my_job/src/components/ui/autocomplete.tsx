// src/components/ui/autocomplete.tsx
import React, { useState, useRef, useEffect } from 'react'
import { Input } from './input'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

interface AutocompleteProps {
  items: Array<{ id: number; name: string; number?: string; room_type?: string }>
  value: string
  onChange: (value: string) => void
  onSelect: (item: any) => void
  placeholder?: string
  className?: string
}

export function Autocomplete({ 
  items, 
  value, 
  onChange, 
  onSelect, 
  placeholder,
  className 
}: AutocompleteProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [filteredItems, setFilteredItems] = useState(items)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stringValue = String(value || '')
    if (stringValue.trim() === '') {
      setFilteredItems(items)
    } else {
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(stringValue.toLowerCase()) ||
        item.number?.toLowerCase().includes(stringValue.toLowerCase()) ||
        item.room_type?.toLowerCase().includes(stringValue.toLowerCase())
      )
      setFilteredItems(filtered)
    }
  }, [value, items])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className={`pr-10 ${className}`}
        />
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2"
        >
          {showDropdown ? (
            <ChevronUpIcon className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredItems.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No items found</div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item)
                  setShowDropdown(false)
                }}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                <div className="text-sm font-medium text-gray-900">
                  {item.name} {item.number && `(${item.number})`}
                </div>
                {item.room_type && (
                  <div className="text-xs text-gray-500">{item.room_type}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}