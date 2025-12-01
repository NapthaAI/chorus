import { create } from 'zustand'

type RightPanelTab = 'files' | 'details'
type WorkspaceOverviewTab = 'agents' | 'git' | 'settings'

interface UIStore {
  // Left panel state
  leftPanelWidth: number
  leftPanelCollapsed: boolean

  // Right panel state
  rightPanelTab: RightPanelTab
  rightPanelWidth: number
  rightPanelCollapsed: boolean

  // Dialog state
  isSettingsOpen: boolean
  isAddWorkspaceOpen: boolean

  // Workspace overview tab
  workspaceOverviewTab: WorkspaceOverviewTab

  // Left panel actions
  setLeftPanelWidth: (width: number) => void
  setLeftPanelCollapsed: (collapsed: boolean) => void
  toggleLeftPanel: () => void

  // Right panel actions
  setRightPanelTab: (tab: RightPanelTab) => void
  setRightPanelWidth: (width: number) => void
  setRightPanelCollapsed: (collapsed: boolean) => void
  toggleRightPanel: () => void

  // Dialog actions
  openSettings: () => void
  closeSettings: () => void
  openAddWorkspace: () => void
  closeAddWorkspace: () => void

  // Workspace overview actions
  setWorkspaceOverviewTab: (tab: WorkspaceOverviewTab) => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state - Left panel
  leftPanelWidth: 300,
  leftPanelCollapsed: false,

  // Initial state - Right panel
  rightPanelTab: 'files',
  rightPanelWidth: 280,
  rightPanelCollapsed: false,

  // Initial state - Dialogs
  isSettingsOpen: false,
  isAddWorkspaceOpen: false,

  // Initial state - Workspace overview tab
  workspaceOverviewTab: 'agents',

  // Left panel actions
  setLeftPanelWidth: (width) => set({ leftPanelWidth: Math.max(250, Math.min(500, width)) }),
  setLeftPanelCollapsed: (collapsed) => set({ leftPanelCollapsed: collapsed }),
  toggleLeftPanel: () => set({ leftPanelCollapsed: !get().leftPanelCollapsed }),

  // Right panel actions
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: Math.max(200, Math.min(400, width)) }),
  setRightPanelCollapsed: (collapsed) => set({ rightPanelCollapsed: collapsed }),
  toggleRightPanel: () => set({ rightPanelCollapsed: !get().rightPanelCollapsed }),

  // Dialog actions
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openAddWorkspace: () => set({ isAddWorkspaceOpen: true }),
  closeAddWorkspace: () => set({ isAddWorkspaceOpen: false }),

  // Workspace overview actions
  setWorkspaceOverviewTab: (tab) => set({ workspaceOverviewTab: tab })
}))
