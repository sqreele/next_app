import React from 'react'
import { Button } from '@/components/ui/button'
import { CheckIcon } from '@heroicons/react/24/outline'
import { useWorkOrderStore } from '@/stores/work-orders-store'
import { toast } from 'sonner'

interface StatusUpdateButtonProps {
  workOrderId: number
  currentStatus: string
  className?: string
}

export function StatusUpdateButton({ workOrderId, currentStatus, className }: StatusUpdateButtonProps) {
  const { updateWorkOrderStatus } = useWorkOrderStore()

  const handleComplete = async () => {
    try {
      await updateWorkOrderStatus(workOrderId, 'Completed')
      toast.success('Work order marked as completed!')
    } catch (error) {
      console.error('Error updating work order status:', error)
      toast.error('Failed to update work order status')
    }
  }

  // Only show the button if the work order is not already completed
  if (currentStatus === 'Completed') {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckIcon className="h-4 w-4" />
        <span className="text-sm font-medium">Completed</span>
      </div>
    )
  }

  return (
    <Button
      onClick={handleComplete}
      variant="secondary"
      size="sm"
      className={`text-green-600 border-green-600 hover:bg-green-50 ${className}`}
    >
      <CheckIcon className="h-4 w-4 mr-1" />
      Mark Complete
    </Button>
  )
} 