import { WorkspacesPanel } from './WorkspacesPanel'
import { AgentConversationsPanel } from './AgentConversationsPanel'
import { useUIStore } from '../../stores/ui-store'
import { useWorkspaceStore } from '../../stores/workspace-store'

export function Sidebar() {
  const { leftPanelWidth } = useUIStore()
  const { selectedAgentId } = useWorkspaceStore()

  return (
    <div
      className="flex flex-col h-full bg-sidebar border-r border-default"
      style={{ width: leftPanelWidth }}
    >
      {/* Draggable title bar area for macOS */}
      <div className="h-10 titlebar-drag-region flex-shrink-0" />

      {/* Content - show conversations panel if agent selected, otherwise show workspaces */}
      <div className="flex-1 overflow-hidden">
        {selectedAgentId ? <AgentConversationsPanel /> : <WorkspacesPanel />}
      </div>
    </div>
  )
}
