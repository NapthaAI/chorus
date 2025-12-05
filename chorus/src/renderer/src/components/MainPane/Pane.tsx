import { PaneTabBar } from './PaneTabBar'
import { useWorkspaceStore } from '../../stores/workspace-store'
import type { TabGroup } from '../../types'

interface PaneProps {
  paneId: 'first' | 'second'
  group: TabGroup
  isActive: boolean
  renderContent: (tabId: string | null) => React.ReactNode
  showSplitToggle?: boolean
}

export function Pane({ paneId, group, isActive, renderContent, showSplitToggle = false }: PaneProps) {
  const { setActivePane, moveTabToPane } = useWorkspaceStore()

  const handleClick = () => {
    setActivePane(paneId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const tabId = e.dataTransfer.getData('text/plain')
    const sourcePaneId = e.dataTransfer.getData('application/x-pane-id')

    if (tabId && sourcePaneId !== paneId) {
      moveTabToPane(tabId, paneId)
    }
  }

  return (
    <div
      className="flex flex-col h-full"
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Pane Tab Bar */}
      <PaneTabBar
        paneId={paneId}
        group={group}
        isActivePane={isActive}
        onPaneClick={handleClick}
        showSplitToggle={showSplitToggle}
      />

      {/* Pane Content */}
      <div className="flex-1 overflow-hidden">
        {renderContent(group.activeTabId)}
      </div>
    </div>
  )
}
