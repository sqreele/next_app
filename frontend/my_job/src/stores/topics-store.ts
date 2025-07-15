import { create } from 'zustand'
import { topicsAPI, Topic } from '../services/topics-api'

interface TopicsState {
  topics: Topic[]
  loading: boolean
  error: string | null
  fetchTopics: () => Promise<void>
}

export const useTopicsStore = create<TopicsState>((set) => ({
  topics: [],
  loading: false,
  error: null,
  fetchTopics: async () => {
    set({ loading: true, error: null })
    try {
      const topics = await topicsAPI.getTopics()
      set({ topics, loading: false })
    } catch (error: any) {
      set({ error: error?.message || 'Failed to fetch topics', loading: false })
    }
  },
})) 