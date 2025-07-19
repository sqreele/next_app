import { create } from 'zustand'
import apiClient from '@/lib/api-client'

export interface Procedure {
  id: number
  title: string
  remark?: string
  frequency?: string
  // Add other fields as needed
}

interface ProceduresState {
  procedures: Procedure[]
  loading: boolean
  error: string | null
  fetchProcedures: () => Promise<void>
}

export const useProceduresStore = create<ProceduresState>((set) => ({
  procedures: [],
  loading: false,
  error: null,
  fetchProcedures: async () => {
    set({ loading: true, error: null })
    try {
      const res = await apiClient.get<Procedure[]>('/api/v1/procedures')
      set({ procedures: res.data, loading: false })
    } catch (error: any) {
      set({ error: error?.message || 'Failed to fetch procedures', loading: false })
    }
  },
})) 