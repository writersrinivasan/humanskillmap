'use client'

import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { UserRow } from '@/types/database'

interface AuthState {
  user: User | null
  userRow: UserRow | null
  isLoading: boolean

  setUser: (user: User | null) => void
  setUserRow: (row: UserRow | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userRow: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setUserRow: (userRow) => set({ userRow }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ user: null, userRow: null, isLoading: false }),
}))
