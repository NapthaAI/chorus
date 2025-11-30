import { create } from 'zustand'

type RightPanelTab = 'files' | 'details'

interface UIStore {
  // Left panel state
  leftPanelWidth: number

  // Right panel state
  rightPanelTab: RightPanelTab
  rightPanelWidth: number
  rightPanelCollapsed: boolean

  // Dialog state
  isSettingsOpen: boolean
  isAddWorkspaceOpen: boolean

  // Left panel actions
  setLeftPanelWidth: (width: number) => void

  // Right panel actions
  setRightPanelTab: (tab: RightPanelTab) => void
  setRightPanelWidth: (width: number) => void
  setRightPanelCollapsed: (collapsed: boolean) => void

  // Dialog actions
  openSettings: () => void
  closeSettings: () => void
  openAddWorkspace: () => void
  closeAddWorkspace: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  // Initial state - Left panel
  leftPanelWidth: 300,

  // Initial state - Right panel
  rightPanelTab: 'files',
  rightPanelWidth: 280,
  rightPanelCollapsed: false,

  // Initial state - Dialogs
  isSettingsOpen: false,
  isAddWorkspaceOpen: false,

  // Left panel actions
  setLeftPanelWidth: (width) => set({ leftPanelWidth: Math.max(250, Math.min(500, width)) }),

  // Right panel actions
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: Math.max(200, Math.min(400, width)) }),
  setRightPanelCollapsed: (collapsed) => set({ rightPanelCollapsed: collapsed }),

  // Dialog actions
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openAddWorkspace: () => set({ isAddWorkspaceOpen: true }),
  closeAddWorkspace: () => set({ isAddWorkspaceOpen: false })
}))
