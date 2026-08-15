import { create } from 'zustand'
import type { Deal } from '@/types'

interface DealsState {
  deals: Deal[]
  currentDeal: Deal | null
  isLoading: boolean
  error: string | null
  
  // Actions
  setDeals: (deals: Deal[]) => void
  setCurrentDeal: (deal: Deal | null) => void
  addDeal: (deal: Deal) => void
  updateDeal: (id: number, deal: Partial<Deal>) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

/**
 * Deals store using Zustand
 * Manages deal state and operations
 */
export const useDealsStore = create<DealsState>((set) => ({
  deals: [],
  currentDeal: null,
  isLoading: false,
  error: null,

  setDeals: (deals) => set({ deals, error: null }),
  
  setCurrentDeal: (deal) => set({ currentDeal: deal, error: null }),
  
  addDeal: (deal) => set((state) => ({ 
    deals: [...state.deals, deal],
    error: null 
  })),
  
  updateDeal: (id, updatedDeal) => set((state) => ({
    deals: state.deals.map((deal) => 
      deal.id === id ? { ...deal, ...updatedDeal } : deal
    ),
    currentDeal: state.currentDeal?.id === id 
      ? { ...state.currentDeal, ...updatedDeal } 
      : state.currentDeal,
    error: null,
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  reset: () => set({ 
    deals: [], 
    currentDeal: null, 
    isLoading: false, 
    error: null 
  }),
}))
