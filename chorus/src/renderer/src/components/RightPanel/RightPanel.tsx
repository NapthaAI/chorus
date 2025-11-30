import { useEffect } from 'react'
import { useUIStore } from '../../stores/ui-store'
import { useWorkspaceStore } from '../../stores/workspace-store'
import { FilesSection } from './FilesSection'
import { DetailsSection } from './DetailsSection'

// SVG Icons
const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon: React.ReactNode
}

function TabButton({ active, onClick, children, icon }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm transition-colors ${
        active
          ? 'text-white border-b-2 border-accent'
          : 'text-muted hover:text-secondary'
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function CollapsedRightPanel({ onExpand }: { onExpand: () => void }) {
  return (
    <div className="w-8 flex flex-col items-center bg-sidebar border-l border-default">
      {/* Titlebar spacing */}
      <div className="h-10 flex-shrink-0" />

      <button
        onClick={onExpand}
        className="p-2 text-muted hover:text-white transition-colors"
        title="Expand panel"
      >
        <ChevronLeftIcon />
      </button>

      {/* Vertical icons */}
      <div className="flex flex-col gap-2 mt-4">
        <button
          onClick={onExpand}
          className="p-2 text-muted hover:text-white transition-colors"
          title="Files"
        >
          <FolderIcon />
        </button>
        <button
          onClick={onExpand}
          className="p-2 text-muted hover:text-white transition-colors"
          title="Details"
        >
          <InfoIcon />
        </button>
      </div>
    </div>
  )
}

export function RightPanel() {
  const {
    rightPanelTab,
    setRightPanelTab,
    rightPanelWidth,
    rightPanelCollapsed,
    setRightPanelCollapsed
  } = useUIStore()

  const { tabs, activeTabId } = useWorkspaceStore()
  const activeTab = tabs.find(t => t.id === activeTabId)

  // Auto-switch to Details when a chat tab is active
  useEffect(() => {
    if (activeTab?.type === 'chat') {
      setRightPanelTab('details')
    }
  }, [activeTab?.type, activeTab?.id, setRightPanelTab])

  if (rightPanelCollapsed) {
    return <CollapsedRightPanel onExpand={() => setRightPanelCollapsed(false)} />
  }

  return (
    <div
      style={{ width: rightPanelWidth }}
      className="flex flex-col h-full bg-sidebar border-l border-default"
    >
      {/* Titlebar drag region for macOS */}
      <div className="h-10 titlebar-drag-region flex-shrink-0 flex items-center justify-end px-2">
        <button
          onClick={() => setRightPanelCollapsed(true)}
          className="p-1 text-muted hover:text-white transition-colors"
          title="Collapse panel"
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Tab headers */}
      <div className="flex border-b border-default">
        <TabButton
          active={rightPanelTab === 'files'}
          onClick={() => setRightPanelTab('files')}
          icon={<FolderIcon />}
        >
          Files
        </TabButton>
        <TabButton
          active={rightPanelTab === 'details'}
          onClick={() => setRightPanelTab('details')}
          icon={<InfoIcon />}
        >
          Details
        </TabButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {rightPanelTab === 'files' ? <FilesSection /> : <DetailsSection />}
      </div>
    </div>
  )
}
