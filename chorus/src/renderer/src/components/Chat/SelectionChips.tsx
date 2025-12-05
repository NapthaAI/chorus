interface WalkEntry {
  name: string
  path: string
  isDirectory: boolean
  relativePath: string
}

interface SelectionChipsProps {
  files: WalkEntry[]
  onRemove: (path: string) => void
}

// Get file extension for icon color
function getExtensionColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()

  if (ext === 'ts' || ext === 'tsx') return 'text-blue-400'
  if (ext === 'js' || ext === 'jsx') return 'text-yellow-400'
  if (ext === 'json') return 'text-yellow-300'
  if (ext === 'md' || ext === 'mdx') return 'text-gray-400'
  if (ext === 'css' || ext === 'scss' || ext === 'sass' || ext === 'less') return 'text-purple-400'
  return 'text-muted'
}

// Small file icon
function SmallFileIcon({ name, isDirectory }: { name: string; isDirectory: boolean }) {
  if (isDirectory) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-yellow-500 flex-shrink-0">
        <path
          d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`flex-shrink-0 ${getExtensionColor(name)}`}>
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Close icon
function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

export function SelectionChips({ files, onRemove }: SelectionChipsProps) {
  if (files.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border-b border-default bg-sidebar/50">
      {files.map((file) => (
        <div
          key={file.path}
          className="flex items-center gap-1.5 pl-2 pr-1 py-1 bg-hover rounded-full text-xs group"
          title={file.relativePath}
        >
          <SmallFileIcon name={file.name} isDirectory={file.isDirectory} />
          <span className="truncate max-w-[140px] text-secondary">
            {file.name}
            {file.isDirectory && '/'}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove(file.path)
            }}
            className="p-0.5 rounded-full hover:bg-surface text-muted hover:text-primary transition-colors"
            aria-label={`Remove ${file.name}`}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
      <span className="self-center text-xs text-muted ml-1">
        {files.length} selected
      </span>
    </div>
  )
}
