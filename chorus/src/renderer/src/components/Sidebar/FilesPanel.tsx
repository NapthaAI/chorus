import { useEffect, useState, useCallback } from 'react'
import { Tree, NodeRendererProps } from 'react-arborist'
import { useWorkspaceStore } from '../../stores/workspace-store'
import { useFileTreeStore } from '../../stores/file-tree-store'
import type { DirectoryEntry } from '../../types'

interface TreeNode {
  id: string
  name: string
  path: string
  isDirectory: boolean
  children?: TreeNode[]
}

// ============================================
// SVG ICONS - Modern VS Code-style file icons
// ============================================

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    className={`transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
  >
    <path
      d="M4.5 2.5L8 6L4.5 9.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const FolderIcon = ({ open }: { open?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    {open ? (
      <>
        <path
          d="M1.5 4.5V3.5C1.5 2.94772 1.94772 2.5 2.5 2.5H5.37868C5.64424 2.5 5.89845 2.60536 6.08579 2.79289L7 3.70711C7.18753 3.89464 7.44174 4 7.70711 4H13.5C14.0523 4 14.5 4.44772 14.5 5V5.5"
          stroke="#dcb67a"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M2.5 13.5H13.5C14.0523 13.5 14.5 13.0523 14.5 12.5V6.5C14.5 5.94772 14.0523 5.5 13.5 5.5H2.5C1.94772 5.5 1.5 5.94772 1.5 6.5V12.5C1.5 13.0523 1.94772 13.5 2.5 13.5Z"
          fill="#dcb67a"
          fillOpacity="0.2"
          stroke="#dcb67a"
          strokeWidth="1.2"
        />
      </>
    ) : (
      <>
        <path
          d="M2.5 13.5H13.5C14.0523 13.5 14.5 13.0523 14.5 12.5V5C14.5 4.44772 14.0523 4 13.5 4H7.70711C7.44174 4 7.18753 3.89464 7 3.70711L6.08579 2.79289C5.89845 2.60536 5.64424 2.5 5.37868 2.5H2.5C1.94772 2.5 1.5 2.94772 1.5 3.5V12.5C1.5 13.0523 1.94772 13.5 2.5 13.5Z"
          fill="#dcb67a"
          fillOpacity="0.15"
          stroke="#dcb67a"
          strokeWidth="1.2"
        />
      </>
    )}
  </svg>
)

const TypeScriptIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#3178c6" />
    <path
      d="M5 7.5H9M7 7.5V12"
      stroke="white"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <path
      d="M10 9.5C10 8.67157 10.6716 8 11.5 8C12.3284 8 13 8.67157 13 9.5C13 10 12.7 10.3 12.3 10.5C12.7 10.7 13 11 13 11.5C13 12.3284 12.3284 13 11.5 13C10.6716 13 10 12.3284 10 11.5"
      stroke="white"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
  </svg>
)

const JavaScriptIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#f7df1e" />
    <path
      d="M6 8V11.5C6 12.3284 5.32843 13 4.5 13C3.67157 13 3 12.3284 3 11.5"
      stroke="#323330"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <path
      d="M9 9.5C9 8.67157 9.67157 8 10.5 8C11.3284 8 12 8.67157 12 9.5C12 10 11.7 10.3 11.3 10.5C11.7 10.7 12 11 12 11.5C12 12.3284 11.3284 13 10.5 13C9.67157 13 9 12.3284 9 11.5"
      stroke="#323330"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
  </svg>
)

const ReactIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="1.5" fill="#61dafb" />
    <ellipse
      cx="8"
      cy="8"
      rx="6.5"
      ry="2.5"
      stroke="#61dafb"
      strokeWidth="1"
      fill="none"
    />
    <ellipse
      cx="8"
      cy="8"
      rx="6.5"
      ry="2.5"
      stroke="#61dafb"
      strokeWidth="1"
      fill="none"
      transform="rotate(60 8 8)"
    />
    <ellipse
      cx="8"
      cy="8"
      rx="6.5"
      ry="2.5"
      stroke="#61dafb"
      strokeWidth="1"
      fill="none"
      transform="rotate(120 8 8)"
    />
  </svg>
)

const JsonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#cbcb41" fillOpacity="0.15" stroke="#cbcb41" strokeWidth="1" />
    <path
      d="M5 5C4 5 4 6 4 6.5V7.5C4 8 3.5 8 3 8C3.5 8 4 8 4 8.5V9.5C4 10 4 11 5 11"
      stroke="#cbcb41"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M11 5C12 5 12 6 12 6.5V7.5C12 8 12.5 8 13 8C12.5 8 12 8 12 8.5V9.5C12 10 12 11 11 11"
      stroke="#cbcb41"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
)

const MarkdownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="3" width="14" height="10" rx="1.5" fill="#519aba" fillOpacity="0.15" stroke="#519aba" strokeWidth="1" />
    <path
      d="M3.5 10V6L5.5 8.5L7.5 6V10"
      stroke="#519aba"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 8.5L12 6.5V10L12 6.5L14 8.5"
      stroke="#519aba"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const CssIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#563d7c" />
    <path
      d="M10 5H6C5.44772 5 5 5.44772 5 6V6C5 6.55228 5.44772 7 6 7H10C10.5523 7 11 7.44772 11 8V8C11 8.55228 10.5523 9 10 9H6C5.44772 9 5 9.44772 5 10V10C5 10.5523 5.44772 11 6 11H10"
      stroke="white"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
)

const HtmlIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#e44d26" />
    <path d="M4 5L6 8L4 11" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 5L10 8L12 11" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PythonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 1C5 1 5 2.5 5 3.5V5H8.5V5.5H3.5C2 5.5 1 6.5 1 8.5C1 10.5 2 11.5 3.5 11.5H5V10C5 8.5 6 7.5 8 7.5H11C12 7.5 13 6.5 13 5.5V3.5C13 2 11 1 8 1Z"
      fill="#3776ab"
    />
    <path
      d="M8 15C11 15 11 13.5 11 12.5V11H7.5V10.5H12.5C14 10.5 15 9.5 15 7.5C15 5.5 14 4.5 12.5 4.5H11V6C11 7.5 10 8.5 8 8.5H5C4 8.5 3 9.5 3 10.5V12.5C3 14 5 15 8 15Z"
      fill="#ffd43b"
    />
    <circle cx="6.5" cy="3.5" r="0.75" fill="white" />
    <circle cx="9.5" cy="12.5" r="0.75" fill="white" />
  </svg>
)

const YamlIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#cb171e" fillOpacity="0.15" stroke="#cb171e" strokeWidth="1" />
    <path
      d="M4 5L6 8V11"
      stroke="#cb171e"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 5L6 8"
      stroke="#cb171e"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 5V11" stroke="#cb171e" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M12 5V11" stroke="#cb171e" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const GitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M14.7 7.3L8.7 1.3C8.3 0.9 7.7 0.9 7.3 1.3L5.7 2.9L7.7 4.9C8.1 4.8 8.6 4.8 9 5.1C9.4 5.5 9.5 6 9.3 6.5L11.2 8.4C11.7 8.2 12.3 8.3 12.6 8.7C13.1 9.2 13.1 9.9 12.6 10.4C12.1 10.9 11.4 10.9 10.9 10.4C10.5 10 10.4 9.4 10.7 8.9L8.9 7.1V11.1C9 11.2 9.2 11.3 9.3 11.5C9.8 12 9.8 12.7 9.3 13.2C8.8 13.7 8.1 13.7 7.6 13.2C7.1 12.7 7.1 12 7.6 11.5C7.7 11.4 7.9 11.2 8 11.1V7C7.9 6.9 7.7 6.8 7.6 6.6C7.2 6.2 7.1 5.6 7.3 5.1L5.4 3.2L1.3 7.3C0.9 7.7 0.9 8.3 1.3 8.7L7.3 14.7C7.7 15.1 8.3 15.1 8.7 14.7L14.7 8.7C15.1 8.3 15.1 7.7 14.7 7.3Z"
      fill="#f05032"
    />
  </svg>
)

const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="#a074c4" fillOpacity="0.15" stroke="#a074c4" strokeWidth="1" />
    <circle cx="5" cy="6" r="1.5" fill="#a074c4" />
    <path
      d="M2 11.5L5 8.5L7 10.5L10 7L14 11.5"
      stroke="#a074c4"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="7" rx="1.5" fill="#848484" fillOpacity="0.2" stroke="#848484" strokeWidth="1" />
    <path
      d="M5 7V5C5 3.34315 6.34315 2 8 2C9.65685 2 11 3.34315 11 5V7"
      stroke="#848484"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <circle cx="8" cy="10.5" r="1" fill="#848484" />
  </svg>
)

const DefaultFileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3.5 1.5H9.5L12.5 4.5V14.5H3.5V1.5Z"
      fill="#848484"
      fillOpacity="0.1"
      stroke="#848484"
      strokeWidth="1"
      strokeLinejoin="round"
    />
    <path d="M9.5 1.5V4.5H12.5" stroke="#848484" strokeWidth="1" strokeLinejoin="round" />
  </svg>
)

const FolderOpenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-muted">
    <path d="M.513 1.513A1.75 1.75 0 011.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 00.2.1h6a1.75 1.75 0 011.75 1.75v8.5A1.75 1.75 0 0113.75 15H2.25A1.75 1.75 0 01.5 13.25V2.75c0-.464.184-.91.513-1.237z" />
  </svg>
)

// ============================================
// FILE ICON RESOLVER
// ============================================

function getFileIcon(filename: string): JSX.Element {
  const ext = filename.split('.').pop()?.toLowerCase()
  const name = filename.toLowerCase()

  // Special filenames
  if (name === '.gitignore' || name === '.gitattributes') return <GitIcon />
  if (name === 'package.json' || name === 'package-lock.json') return <JsonIcon />
  if (name === 'tsconfig.json') return <TypeScriptIcon />
  if (name === '.env' || name.startsWith('.env.')) return <LockIcon />
  if (name === 'dockerfile' || name === 'docker-compose.yml') return <DefaultFileIcon />

  // By extension
  switch (ext) {
    case 'ts':
      return <TypeScriptIcon />
    case 'tsx':
      return <ReactIcon />
    case 'js':
      return <JavaScriptIcon />
    case 'jsx':
      return <ReactIcon />
    case 'json':
      return <JsonIcon />
    case 'md':
    case 'mdx':
      return <MarkdownIcon />
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <CssIcon />
    case 'html':
    case 'htm':
      return <HtmlIcon />
    case 'py':
    case 'pyw':
    case 'pyx':
      return <PythonIcon />
    case 'yml':
    case 'yaml':
      return <YamlIcon />
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'webp':
    case 'ico':
      return <ImageIcon />
    case 'lock':
      return <LockIcon />
    default:
      return <DefaultFileIcon />
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function FilesPanel(): JSX.Element {
  const { workspaces, selectedWorkspaceId, selectedFilePath, selectFile } = useWorkspaceStore()
  const { expandedPaths, toggleExpanded } = useFileTreeStore()
  const [treeData, setTreeData] = useState<TreeNode[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const selectedWorkspace = workspaces.find((ws) => ws.id === selectedWorkspaceId)

  // Load directory contents
  const loadDirectory = useCallback(async (path: string): Promise<TreeNode[]> => {
    try {
      const result = await window.api.fs.listDirectory(path)
      if (result.success && result.data) {
        return result.data.map((entry: DirectoryEntry) => ({
          id: entry.path,
          name: entry.name,
          path: entry.path,
          isDirectory: entry.isDirectory,
          children: entry.isDirectory ? [] : undefined
        }))
      }
    } catch (error) {
      console.error('Failed to load directory:', error)
    }
    return []
  }, [])

  // Load root directory when workspace changes
  useEffect(() => {
    if (!selectedWorkspace) {
      setTreeData([])
      return
    }

    setIsLoading(true)
    loadDirectory(selectedWorkspace.path).then((data) => {
      setTreeData(data)
      setIsLoading(false)
    })
  }, [selectedWorkspace, loadDirectory])

  // Handle node toggle
  const handleToggle = async (id: string) => {
    toggleExpanded(id)
  }

  // Handle node select
  const handleSelect = (nodes: TreeNode[]) => {
    const node = nodes[0]
    if (node && !node.isDirectory) {
      selectFile(node.path)
    }
  }

  // Custom node renderer
  const Node = ({ node, style, dragHandle }: NodeRendererProps<TreeNode>) => {
    const data = node.data
    const isExpanded = expandedPaths.has(data.id)
    const isSelected = selectedFilePath === data.path

    const handleClick = async () => {
      if (data.isDirectory) {
        handleToggle(data.id)
        // Load children if expanding and no children loaded
        if (!isExpanded && (!node.children || node.children.length === 0)) {
          const children = await loadDirectory(data.path)
          setTreeData((prev) => updateTreeNode(prev, data.id, children))
        }
      } else {
        selectFile(data.path)
      }
    }

    return (
      <div
        ref={dragHandle}
        style={style}
        className={`
          group flex items-center gap-1.5 px-2 py-1 mx-2 rounded-md cursor-pointer transition-colors
          ${isSelected ? 'bg-selected' : 'hover:bg-hover'}
        `}
        onClick={handleClick}
      >
        {/* Chevron for directories */}
        {data.isDirectory ? (
          <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-muted">
            <ChevronIcon expanded={isExpanded} />
          </span>
        ) : (
          <span className="flex-shrink-0 w-4" />
        )}

        {/* File/Folder icon */}
        <span className="flex-shrink-0">
          {data.isDirectory ? (
            <FolderIcon open={isExpanded} />
          ) : (
            getFileIcon(data.name)
          )}
        </span>

        {/* File name */}
        <span className={`truncate text-sm ${data.isDirectory ? 'font-medium' : ''}`}>
          {data.name}
        </span>
      </div>
    )
  }

  // Empty state - no workspace selected
  if (!selectedWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="w-12 h-12 mb-3 rounded-xl bg-input flex items-center justify-center">
          <FolderOpenIcon />
        </div>
        <p className="text-secondary font-medium mb-1">No workspace selected</p>
        <p className="text-sm text-muted">
          Select a workspace from the Workspaces tab to browse files
        </p>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-8 h-8 mb-3 rounded-lg bg-input flex items-center justify-center animate-pulse">
          <FolderIcon />
        </div>
        <p className="text-sm text-muted">Loading files...</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-default">
        <div className="flex-shrink-0 text-muted">
          <FolderIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{selectedWorkspace.name}</p>
        </div>
        <span className="text-xs text-muted px-1.5 py-0.5 rounded bg-input">
          {treeData.length} items
        </span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-hidden py-2">
        {treeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <p className="text-sm text-muted">This folder is empty</p>
          </div>
        ) : (
          <Tree
            data={treeData}
            openByDefault={false}
            width="100%"
            height={600}
            indent={14}
            rowHeight={32}
            onSelect={handleSelect}
          >
            {Node}
          </Tree>
        )}
      </div>
    </div>
  )
}

// Helper to update a node in the tree
function updateTreeNode(tree: TreeNode[], id: string, children: TreeNode[]): TreeNode[] {
  return tree.map((node) => {
    if (node.id === id) {
      return { ...node, children }
    }
    if (node.children) {
      return { ...node, children: updateTreeNode(node.children, id, children) }
    }
    return node
  })
}
