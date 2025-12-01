import { useWorkspaceStore } from '../../stores/workspace-store'
import { SplitPaneToggle } from './SplitPaneToggle'
import type { Tab, TabGroup } from '../../types'

// SVG Icons
const FileIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

const ChatIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

interface PaneTabItemProps {
  tab: Tab
  isActive: boolean
  onActivate: () => void
  onClose: (e: React.MouseEvent) => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
}

function PaneTabItem({ tab, isActive, onActivate, onClose, onDragStart, onDragEnd }: PaneTabItemProps) {
  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault()
      onClose(e)
    }
  }

  const Icon = tab.type === 'chat' ? ChatIcon : FileIcon

  return (
    <div
      draggable
      onClick={onActivate}
      onMouseDown={handleMiddleClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`
        group flex items-center gap-1 px-2 py-1 text-xs cursor-grab
        border-r border-default min-w-0 max-w-[140px]
        ${isActive
          ? 'bg-main text-primary border-b-2 border-b-accent'
          : 'bg-sidebar text-muted hover:text-secondary hover:bg-hover'
        }
      `}
      title={tab.title}
    >
      {/* Icon */}
      <span className={`flex-shrink-0 ${tab.type === 'chat' ? 'text-accent' : ''}`}>
        <Icon />
      </span>

      {/* Title */}
      <span className="truncate flex-1 text-xs">{tab.title}</span>

      {/* Close button */}
      <button
        onClick={onClose}
        className={`
          flex-shrink-0 p-0.5 rounded hover:bg-hover
          ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          transition-opacity
        `}
        title="Close tab"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

interface PaneTabBarProps {
  paneId: 'first' | 'second'
  group: TabGroup
  isActivePane: boolean
  onPaneClick: () => void
  showSplitToggle?: boolean  // Only show on first pane
}

export function PaneTabBar({ paneId, group, isActivePane, onPaneClick, showSplitToggle = false }: PaneTabBarProps) {
  const {
    tabs,
    setActivePaneTab,
    closeTabInPane,
    moveTabToPane,
    splitPaneEnabled,
    splitPaneOrientation,
    toggleSplitPane,
    setSplitPaneOrientation
  } = useWorkspaceStore()

  // Get tabs for this pane
  const paneTabs = group.tabIds
    .map(id => tabs.find(t => t.id === id))
    .filter((t): t is Tab => t !== undefined)

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    e.dataTransfer.setData('text/plain', tabId)
    e.dataTransfer.setData('application/x-pane-id', paneId)
    e.dataTransfer.effectAllowed = 'move'
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

  // Render split toggle if needed
  const renderSplitToggle = () => {
    if (!showSplitToggle) return null
    return (
      <div className="flex items-center px-2 border-l border-default ml-auto">
        <SplitPaneToggle
          enabled={splitPaneEnabled}
          orientation={splitPaneOrientation}
          onDisable={() => {
            if (splitPaneEnabled) toggleSplitPane()
          }}
          onVertical={() => {
            if (!splitPaneEnabled) toggleSplitPane()
            setSplitPaneOrientation('vertical')
          }}
          onHorizontal={() => {
            if (!splitPaneEnabled) toggleSplitPane()
            setSplitPaneOrientation('horizontal')
          }}
        />
      </div>
    )
  }

  // Empty pane with drop zone
  if (paneTabs.length === 0) {
    return (
      <div
        className={`
          h-8 flex items-center px-2 text-xs text-muted bg-sidebar border-b border-default
          ${isActivePane ? 'border-l-2 border-l-accent' : ''}
        `}
        onClick={onPaneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <span className="italic flex-1">Drop tabs here</span>
        {renderSplitToggle()}
      </div>
    )
  }

  return (
    <div
      className={`
        flex items-center bg-sidebar border-b border-default
        ${isActivePane ? 'border-l-2 border-l-accent' : ''}
      `}
      onClick={onPaneClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Tabs - scrollable */}
      <div className="flex-1 flex overflow-x-auto">
        {paneTabs.map((tab) => (
          <PaneTabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === group.activeTabId}
            onActivate={() => setActivePaneTab(paneId, tab.id)}
            onClose={(e) => {
              e.stopPropagation()
              closeTabInPane(paneId, tab.id)
            }}
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragEnd={() => {}}
          />
        ))}
      </div>
      {/* Split toggle on the right */}
      {renderSplitToggle()}
    </div>
  )
}
