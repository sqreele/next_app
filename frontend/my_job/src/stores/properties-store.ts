// src/stores/properties-store.ts
import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { 
  propertiesAPI, 
  Property, 
  CreatePropertyData, 
  PropertyFilters,
  getApiErrorMessage,
  getApiValidationErrors
} from '@/services/properties-api'

interface PropertyState {
  // Data
  properties: Property[]
  selectedProperty: Property | null
  filters: PropertyFilters
  loading: boolean
  error: string | null
  
  // Pagination
  pagination: {
    page: number
    limit: number
    total: number
  }
  
  // Statistics
  stats: {
    total: number
  }
  
  // Actions
  setProperties: (properties: Property[]) => void
  addProperty: (property: Property) => void
  updateProperty: (id: number, updates: Partial<Property>) => void
  deleteProperty: (id: number) => void
  setSelectedProperty: (property: Property | null) => void
  
  // Filtering & Search
  setFilters: (filters: Partial<PropertyFilters>) => void
  clearFilters: () => void
  getFilteredProperties: () => Property[]
  
  // Pagination
  setPagination: (pagination: Partial<PropertyState['pagination']>) => void
  
  // Status Management
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  // API Actions
  fetchProperties: (filters?: PropertyFilters) => Promise<void>
  fetchProperty: (id: number) => Promise<void>
  createProperty: (data: CreatePropertyData) => Promise<Property>
  updatePropertyData: (id: number, data: Partial<Property>) => Promise<void>
  removeProperty: (id: number) => Promise<void>
  searchProperties: (query: string) => Promise<void>
  
  // Utilities
  getPropertyById: (id: number) => Property | undefined
  getPropertyByName: (name: string) => Property | undefined
  updateStats: () => void
  refreshProperties: () => Promise<void>
  reset: () => void
}

export const usePropertyStore = create<PropertyState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        properties: [],
        selectedProperty: null,
        filters: {},
        loading: false,
        error: null,
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
        },
        stats: {
          total: 0,
        },

        // Basic state management
        setProperties: (properties) => {
          set({ properties })
          get().updateStats()
        },

        addProperty: (property) => {
          set((state) => ({
            properties: [property, ...state.properties]
          }))
          get().updateStats()
        },

        updateProperty: (id, updates) => {
          set((state) => ({
            properties: state.properties.map((property) =>
              property.id === id ? { ...property, ...updates } : property
            ),
            selectedProperty: state.selectedProperty?.id === id 
              ? { ...state.selectedProperty, ...updates } 
              : state.selectedProperty
          }))
          get().updateStats()
        },

        deleteProperty: (id) => {
          set((state) => ({
            properties: state.properties.filter((property) => property.id !== id),
            selectedProperty: state.selectedProperty?.id === id ? null : state.selectedProperty
          }))
          get().updateStats()
        },

        setSelectedProperty: (property) => {
          set({ selectedProperty: property })
        },

        // Filtering
        setFilters: (newFilters) => {
          set((state) => ({
            filters: { ...state.filters, ...newFilters }
          }))
        },

        clearFilters: () => {
          set({ filters: {} })
        },

        getFilteredProperties: () => {
          const { properties, filters } = get()
          
          return properties.filter((property) => {
            // Search filter
            if (filters.search) {
              const searchTerm = filters.search.toLowerCase()
              const searchableText = property.name.toLowerCase()
              
              if (!searchableText.includes(searchTerm)) return false
            }
            
            return true
          })
        },

        // Pagination
        setPagination: (newPagination) => {
          set((state) => ({
            pagination: { ...state.pagination, ...newPagination }
          }))
        },

        // Status Management
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        // API Actions using Axios
        fetchProperties: async (filters) => {
          set({ loading: true, error: null })
          
          try {
            const properties = await propertiesAPI.getProperties(filters)
            get().setProperties(properties)
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            console.error('Error fetching properties:', error)
          } finally {
            set({ loading: false })
          }
        },

        fetchProperty: async (id) => {
          set({ loading: true, error: null })
          
          try {
            const property = await propertiesAPI.getProperty(id)
            set({ selectedProperty: property })
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            console.error('Error fetching property:', error)
          } finally {
            set({ loading: false })
          }
        },

        createProperty: async (data) => {
          set({ loading: true, error: null })
          
          try {
            const newProperty = await propertiesAPI.createProperty(data)
            get().addProperty(newProperty)
            return newProperty
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            throw error
          } finally {
            set({ loading: false })
          }
        },

        updatePropertyData: async (id, data) => {
          set({ loading: true, error: null })
          
          try {
            const updatedProperty = await propertiesAPI.updateProperty(id, data)
            get().updateProperty(id, updatedProperty)
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            throw error
          } finally {
            set({ loading: false })
          }
        },

        removeProperty: async (id) => {
          set({ loading: true, error: null })
          
          try {
            await propertiesAPI.deleteProperty(id)
            get().deleteProperty(id)
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            throw error
          } finally {
            set({ loading: false })
          }
        },

        searchProperties: async (query) => {
          set({ loading: true, error: null })
          
          try {
            const properties = await propertiesAPI.searchProperties(query)
            get().setProperties(properties)
          } catch (error: any) {
            const errorMessage = getApiErrorMessage(error)
            set({ error: errorMessage })
            console.error('Error searching properties:', error)
          } finally {
            set({ loading: false })
          }
        },

        // Utilities
        getPropertyById: (id) => {
          return get().properties.find(property => property.id === id)
        },

        getPropertyByName: (name) => {
          return get().properties.find(property => 
            property.name.toLowerCase() === name.toLowerCase()
          )
        },

        updateStats: () => {
          const { properties } = get()
          
          const stats = {
            total: properties.length,
          }
          
          set({ stats })
        },

        refreshProperties: async () => {
          const { filters } = get()
          await get().fetchProperties(filters)
        },

        reset: () => {
          set({
            properties: [],
            selectedProperty: null,
            filters: {},
            loading: false,
            error: null,
            pagination: { page: 1, limit: 20, total: 0 },
            stats: { total: 0 },
          })
        },
      }),
      {
        name: 'properties-storage',
        partialize: (state) => ({
          properties: state.properties,
          filters: state.filters,
          pagination: state.pagination,
        }),
      }
    )
  )
)

// Export types
export type { Property, CreatePropertyData }
