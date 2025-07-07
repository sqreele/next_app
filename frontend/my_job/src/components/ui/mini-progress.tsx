// src/components/ui/mini-progress.tsx
import React from 'react'
import { motion } from 'framer-motion'

interface MiniProgressProps {
  current: number
  total: number
  showNumbers?: boolean
  className?: string
}

export function MiniProgress({ current, total, showNumbers = true, className }: MiniProgressProps) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <motion.div
          className="bg-blue-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      {showNumbers && (
        <span className="text-sm font-medium text-gray-600 min-w-max">
          {current}/{total}
        </span>
      )}
    </div>
  )
}