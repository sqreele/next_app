'use client'
import React, { useState, useEffect } from 'react'
import { BottomNav } from '@/components/layout/BottomNav'
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useWorkOrderStore } from '@/stores/work-orders-store'
import { useMachineStore } from '@/stores/machines-store'
import { useRoomStore } from '@/stores/rooms-store'
import { useTechnicianStore } from '@/stores/technicians-store'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface FormData {
  task: string
  description: string
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  room_id: number | null
  machine_id: number | null
  assigned_to_id: number | null
  due_date: string
  datamising?: string | null
  before_image_path?: string 
  after_image_path?: string 
  pdf_file_path?: string 
}

export default function CreateJobPage() {
  const router = useRouter()
  const { createWorkOrder, loading } = useWorkOrderStore()
  const { machines, fetchMachines } = useMachineStore()
  const { rooms, fetchRooms } = useRoomStore()
  const { technicians, fetchTechnicians } = useTechnicianStore()
  
  const [beforeImagePreview, setBeforeImagePreview] = useState<string | null>(null)
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null)
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    task: '',
    description: '',
    status: 'Pending',
    priority: 'Medium',
    room_id: null,
    machine_id: null,
    assigned_to_id: null,
    due_date: '',
    datamising: ''
  })
  const [selectedPropertyId, setSelectedPropertyId] = useState<number>(1) // Default to property ID 1
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showImages, setShowImages] = useState(false)

  // Fetch initial data
  useEffect(() => {
    fetchMachines()
    fetchRooms()
    fetchTechnicians()
  }, [fetchMachines, fetchRooms, fetchTechnicians])

  function handleBeforeImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setBeforeImagePreview(URL.createObjectURL(file))
      setFormData(prev => ({ ...prev, before_image_path: file.name }))
    } else {
      setBeforeImagePreview(null)
      setFormData(prev => ({ ...prev, before_image_path: '' }))
    }
  }

  function handleAfterImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setAfterImagePreview(URL.createObjectURL(file))
      setFormData(prev => ({ ...prev, after_image_path: file.name }))
    } else {
      setAfterImagePreview(null)
      setFormData(prev => ({ ...prev, after_image_path: '' }))
    }
  }

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPdfFileName(file.name)
      setFormData(prev => ({ ...prev, pdf_file_path: file.name }))
    } else {
      setPdfFileName(null)
      setFormData(prev => ({ ...prev, pdf_file_path: '' }))
    }
  }

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}
    
    if (!formData.task.trim()) {
      newErrors.task = 'Task title is required'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Task description is required'
    }
    
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setIsSubmitting(true)
    
    try {
      const workOrderData = {
        task: formData.task,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        room_id: formData.room_id || undefined,
        machine_id: formData.machine_id || undefined,
        assigned_to_id: formData.assigned_to_id || undefined,
        due_date: formData.due_date,
        datamising: formData.datamising || undefined,
        before_image_path: formData.before_image_path || undefined,
        after_image_path: formData.after_image_path || undefined,
        pdf_file_path: formData.pdf_file_path || undefined,
      }

      await createWorkOrder(workOrderData, selectedPropertyId)
      toast.success('Job order created successfully!')
      router.push('/work-orders')
    } catch (error: any) {
      console.error('Error creating work order:', error)
      const errorMessage = error?.response?.data?.detail || 
                         error?.message || 
                         'Failed to create job order'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Colorful gradient blobs */}
      <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-gradient-to-br from-blue-400 to-purple-400 opacity-30 rounded-full z-0" />
      <div className="absolute bottom-[-60px] right-[-60px] w-56 h-56 bg-gradient-to-tr from-green-400 to-yellow-300 opacity-30 rounded-full z-0" />
      <div className="absolute top-1/2 left-[-40px] w-32 h-32 bg-gradient-to-br from-pink-400 to-yellow-400 opacity-20 rounded-full z-0" />
      
      {/* Top menu bar */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center bg-white rounded-full px-3 py-1 shadow w-full max-w-xs">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search jobs..."
            className="bg-transparent outline-none flex-1 text-sm text-green-900 placeholder-gray-400"
          />
        </div>
        <button className="ml-4 bg-white rounded-full p-2 shadow relative">
          <BellIcon className="h-6 w-6 text-green-500" />
          {/* Notification dot */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
      </div>
      
      <header className="relative z-10 text-center py-4 text-2xl font-semibold text-green-900 tracking-wide">
        Create Job Order
      </header>
      
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
          <h1 className="text-2xl font-semibold text-green-900 mb-6">Create Job Order</h1>
          
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <div>
              <input
                type="text"
                placeholder="Task Title"
                value={formData.task}
                onChange={(e) => handleInputChange('task', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 ${
                  errors.task ? 'border-red-500' : ''
                }`}
              />
              {errors.task && <p className="text-red-500 text-sm mt-1">{errors.task}</p>}
            </div>
            
            <div>
              <textarea
                placeholder="Task Description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 min-h-[80px] ${
                  errors.description ? 'border-red-500' : ''
                }`}
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>
            
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
            
            <div>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 ${
                  errors.due_date ? 'border-red-500' : ''
                }`}
              />
              {errors.due_date && <p className="text-red-500 text-sm mt-1">{errors.due_date}</p>}
            </div>
            
            <select
              value={formData.room_id || ''}
              onChange={(e) => handleInputChange('room_id', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Select Room (Optional)</option>
              {(rooms ?? []).map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.number})
                </option>
              ))}
            </select>
            
            <select
              value={formData.machine_id || ''}
              onChange={(e) => handleInputChange('machine_id', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Select Machine (Optional)</option>
              {(machines ?? []).map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name}
                </option>
              ))}
            </select>
            
            <select
              value={formData.assigned_to_id || ''}
              onChange={(e) => handleInputChange('assigned_to_id', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Assign to Technician (Optional)</option>
              {(technicians ?? []).map((technician) => (
                <option key={technician.id} value={technician.id}>
                  {technician.username}
                </option>
              ))}
            </select>
            
            {/* Datamising Field */}
            <div>
              <input
                type="text"
                placeholder="Datamising (Optional)"
                value={formData.datamising || ''}
                onChange={(e) => handleInputChange('datamising', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            
            {/* Attach Images Checkbox */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showImages}
                onChange={() => setShowImages((prev) => !prev)}
                className="accent-green-500"
              />
              <span className="text-green-900 font-medium">Attach Images</span>
            </label>
            
            {/* Before Image */}
            {showImages && (
              <>
                {beforeImagePreview && (
                  <img
                    src={beforeImagePreview}
                    alt="Before Preview"
                    className="w-full max-h-40 object-contain mb-2 rounded-lg border"
                  />
                )}
                <label className="block">
                  <span className="text-gray-700">Before Image (Optional)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBeforeImageChange}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </label>
                {/* After Image */}
                {afterImagePreview && (
                  <img
                    src={afterImagePreview}
                    alt="After Preview"
                    className="w-full max-h-40 object-contain mb-2 rounded-lg border"
                  />
                )}
                <label className="block">
                  <span className="text-gray-700">After Image (Optional)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAfterImageChange}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </label>
                {/* PDF File */}
                <label className="block mt-2">
                  <span className="text-gray-700">Attach PDF/Document (Optional)</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  {pdfFileName && (
                    <span className="text-green-700 text-xs mt-1 block">Selected: {pdfFileName}</span>
                  )}
                </label>
              </>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full bg-green-500 text-white font-semibold py-2 rounded-lg mt-2 hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Submit Job Order'}
            </button>
          </form>
        </div>
      </main>
      <BottomNav />
    </div>
  )
} 