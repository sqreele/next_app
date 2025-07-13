// src/app/machines/[id]/edit/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMachineStore } from '@/stores/machines-store'
import { useRoomStore } from '@/stores/rooms-store'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'

const statusOptions = [
  { value: 'Operational', label: 'Operational' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Offline', label: 'Offline' },
  { value: 'Decommissioned', label: 'Decommissioned' },
]

export default function EditMachinePage() {
  const params = useParams()
  const router = useRouter()
  const machineId = parseInt(params.id as string)

  const {
    selectedMachine,
    loading,
    error,
    fetchMachine,
    updateMachineData,
  } = useMachineStore()
  const { rooms, fetchRooms } = useRoomStore()

  const [form, setForm] = useState({
    name: '',
    status: 'Operational',
    room_id: '',
    property_id: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (machineId) {
      fetchMachine(machineId)
    }
    if (rooms.length === 0) {
      fetchRooms()
    }
  }, [machineId, fetchMachine, fetchRooms, rooms.length])

  useEffect(() => {
    if (selectedMachine) {
      setForm({
        name: selectedMachine.name || '',
        status: selectedMachine.status || 'Operational',
        room_id: selectedMachine.room_id ? String(selectedMachine.room_id) : '',
        property_id: selectedMachine.property_id ? String(selectedMachine.property_id) : '',
      })
    }
  }, [selectedMachine])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await updateMachineData(machineId, {
        name: form.name,
        status: form.status as any,
        room_id: form.room_id ? Number(form.room_id) : undefined,
        property_id: form.property_id ? Number(form.property_id) : undefined,
      })
      toast.success('Machine updated successfully!')
      router.push(`/machines/${machineId}`)
    } catch (err) {
      toast.error('Failed to update machine')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2">Loading machine...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <Button onClick={() => fetchMachine(machineId)} variant="secondary" className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  if (!selectedMachine) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Machine not found</p>
        <Link href="/machines">
          <Button variant="secondary" className="mt-4">
            Back to Machines
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Machine</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Machine Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter machine name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
                <select
                  name="room_id"
                  value={form.room_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Select Room (Optional)</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} ({room.number})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
                <Input
                  name="property_id"
                  value={form.property_id}
                  onChange={handleChange}
                  required
                  placeholder="Enter property ID..."
                  type="number"
                  min={1}
                />
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-4 pt-6 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
