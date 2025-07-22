// frontend/my_job/src/hooks/use-form-data.ts
import { useState, useEffect, useCallback } from 'react'
import { machinesAPI } from '@/services/machines-api'
import { roomsAPI } from '@/services/rooms-api'
import { usersAPI } from '@/services/users-api'
import { propertiesAPI } from '@/services/properties-api'
import { topicsAPI } from '@/services/topics-api'

export interface Machine {
  id: number
  name: string
  status: 'Operational' | 'Maintenance' | 'Offline' | 'Decommissioned'
  room_id: number
  property_id: number
}

export interface Room {
  id: number
  name: string
  number: string
}

export interface User {
  id: number
  username: string
  email: string
  is_active: boolean
}

export interface Property {
  id: number
  name: string
}

export interface Topic {
  id: number
  title: string
}

export interface Procedure {
  id: number
  title: string
  remark?: string
}

interface FormDataState {
  machines: Machine[]
  rooms: Room[]
  technicians: User[]
  procedures: Procedure[]
  properties: Property[]
  topics: Topic[]
  loading: boolean
  error: string | null
}

export function useFormData() {
  const [state, setState] = useState<FormDataState>({
    machines: [],
    rooms: [],
    technicians: [],
    procedures: [],
    properties: [],
    topics: [],
    loading: false,
    error: null
  })

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  // Fetch initial data on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [roomsResult, techResult, propResult, topicResult] = await Promise.allSettled([
          roomsAPI.getRooms(),
          usersAPI.getUsers({ role: 'Technician', is_active: true }),
          propertiesAPI.getProperties(),
          topicsAPI.getTopics()
        ])

        setState(prev => ({
          ...prev,
          rooms: roomsResult.status === 'fulfilled' ? roomsResult.value.data || roomsResult.value : [],
          technicians: techResult.status === 'fulfilled' ? techResult.value : [],
          properties: propResult.status === 'fulfilled' ? propResult.value : [],
          topics: topicResult.status === 'fulfilled' ? topicResult.value : [],
        }))

        // Log any failed requests
        const failures = [
          { name: 'rooms', result: roomsResult },
          { name: 'technicians', result: techResult },
          { name: 'properties', result: propResult },
          { name: 'topics', result: topicResult }
        ].filter(item => item.result.status === 'rejected')

        if (failures.length > 0) {
          console.warn('Some data failed to load:', failures.map(f => f.name).join(', '))
        }
      } catch (error: any) {
        console.error('Error fetching initial data:', error)
        setError('Failed to load form data')
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // Fetch machines by work order type
  const fetchMachinesByType = useCallback(async (type: 'pm' | 'issue') => {
    try {
      setLoading(true)
      const machines = await machinesAPI.getMachines({ type })
      setState(prev => ({ ...prev, machines }))
    } catch (error: any) {
      console.error('Error fetching machines:', error)
      setError('Failed to load machines')
      setState(prev => ({ ...prev, machines: [] }))
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch procedures by machine
  const fetchProceduresByMachine = useCallback(async (machineId: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/procedures/machine/${machineId}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const procedures = await response.json()
      setState(prev => ({ ...prev, procedures }))
    } catch (error: any) {
      console.error('Error fetching procedures:', error)
      setState(prev => ({ ...prev, procedures: [] }))
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    ...state,
    fetchMachinesByType,
    fetchProceduresByMachine
  }
}
