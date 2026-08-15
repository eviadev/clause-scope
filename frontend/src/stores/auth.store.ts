import { create } from 'zustand'
import type { Credentials, User } from '@/types'

interface AuthState {
  user: User | null
  credentials: Credentials | null
  isAuthenticated: boolean
  login: (credentials: Credentials) => void
  logout: () => void
}

/**
 * Authentication is intentionally kept in memory. Persisting a Basic Auth
 * password in localStorage would expose it to any script running on the origin.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  credentials: null,
  isAuthenticated: false,

  login: (credentials) => {
    set({
      user: { username: credentials.username },
      credentials,
      isAuthenticated: true,
    })
  },

  logout: () => {
    set({
      user: null,
      credentials: null,
      isAuthenticated: false,
    })
  },
}))
