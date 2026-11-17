'use client'

import { create } from 'zustand'

export type Section =
  | 'dashboard'
  | 'pages'
  | 'create'
  | 'schedule'
  | 'history'
  | 'logs'
  | 'users'
  | 'settings'

type AppState = {
  section: Section
  setSection: (s: Section) => void

  editingTargetId: string | null
  startEdit: (id: string) => void
  clearEdit: () => void

  refreshKey: number
  refresh: () => void
}

export const useAppStore = create<AppState>((set) => ({
  section: 'dashboard',
  setSection: (section) => set({ section }),

  editingTargetId: null,
  startEdit: (id) => set({ editingTargetId: id, section: 'create' }),
  clearEdit: () => set({ editingTargetId: null }),

  refreshKey: 0,
  refresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}))
