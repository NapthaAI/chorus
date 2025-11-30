import { useWorkspaceStore } from '../../stores/workspace-store'
import { FileTree } from '../Sidebar/FileTree'

// SVG Icons
const FolderOpenIcon = () => (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" className="text-muted">
    <path d="M.513 1.513A1.75 1.75 0 011.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 00.2.1h6a1.75 1.75 0 011.75 1.75v8.5A1.75 1.75 0 0113.75 15H2.25A1.75 1.75 0 01.5 13.25V2.75c0-.464.184-.91.513-1.237z" />
  </svg>
)

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-muted">
    <path d="M8 3a5 5 0 104.546 2.914.75.75 0 011.366-.62A6.5 6.5 0 118 1.5v-1A.75.75 0 019.28.22l2.25 2.25a.75.75 0 010 1.06L9.28 5.78A.75.75 0 018 5.25v-2.25z" />
  </svg>
)

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <div className="w-12 h-12 mb-3 rounded-xl bg-input flex items-center justify-center">
        <FolderOpenIcon />
      </div>
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}

export function FilesSection() {
  const { workspaces, selectedWorkspaceId, selectFile, selectedFilePath, loadWorkspaces } =
    useWorkspaceStore()

  const selectedWorkspace = workspaces.find((ws) => ws.id === selectedWorkspaceId)

  const handleRefresh = () => {
    loadWorkspaces()
  }

  if (!selectedWorkspace) {
    return <EmptyState message="Select a workspace to browse files" />
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-default">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{selectedWorkspace.name}</p>
        </div>
        <button
          onClick={handleRefresh}
          className="p-1 rounded hover:bg-hover transition-colors"
          title="Refresh"
        >
          <RefreshIcon />
        </button>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto">
        <FileTree
          rootPath={selectedWorkspace.path}
          onFileSelect={selectFile}
          selectedPath={selectedFilePath}
        />
      </div>
    </div>
  )
}
