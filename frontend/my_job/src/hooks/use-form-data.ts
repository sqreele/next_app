// frontend/my_job/src/hooks/use-form-data.ts
import { useState, useEffect, useCallback } from 'react'
import { machinesAPI, Machine } from '@/services/machines-api'
import { roomsAPI, Room } from '@/services/rooms-api'
import { usersAPI, User } from '@/services/users-api'
import { propertiesAPI, Property } from '@/services/properties-api'
import { topicsAPI, Topic } from '@/services/topics-api'

export interface Procedure {
  id: number
  title: string
  remark?: string
  frequency?: string
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

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true)
      setError(null)

      try {
        const [roomsResponse, techResponse, propResponse, topicResponse] = await Promise.allSettled([
          roomsAPI.getRooms(),
          usersAPI.getUsers({ role: 'Technician', is_active: true }),
          propertiesAPI.getProperties(),
          topicsAPI.getTopics()
        ])

        setState(prev => ({
          ...prev,
          rooms: roomsResponse.status === 'fulfilled' ? roomsResponse.value.data || [] : [],
          technicians: techResponse.status === 'fulfilled' ? techResponse.value : [],
          properties: propResponse.status === 'fulfilled' ? propResponse.value : [],
          topics: topicResponse.status === 'fulfilled' ? topicResponse.value : [],
        }))

        // Log any failed requests
        const failed = [roomsResponse, techResponse, propResponse, topicResponse]
          .filter(result => result.status === 'rejected')
        
        if (failed.length > 0) {
          console.warn('Some data failed to load:', failed)
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
  const fetchMachinesByType = useCallback(async (type: string) => {
    try {
      setLoading(true)
      const machines = await machinesAPI.getMachines({ type: type as 'pm' | 'issue' })
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
      if (!response.ok) throw new Error('Failed to fetch procedures')
      
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
