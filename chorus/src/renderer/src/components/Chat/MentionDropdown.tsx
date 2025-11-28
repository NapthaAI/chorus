import { useEffect, useRef } from 'react'

interface WalkEntry {
  name: string
  path: string
  isDirectory: boolean
  relativePath: string
}

interface MentionDropdownProps {
  items: WalkEntry[]
  selectedIndex: number
  position: { top: number; left: number }
  onSelect: (item: WalkEntry) => void
  onClose: () => void
}

// File icon based on extension
function FileIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase()

  // TypeScript/JavaScript
  if (ext === 'ts' || ext === 'tsx') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-blue-400">
        <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">
          TS
        </text>
      </svg>
    )
  }
  if (ext === 'js' || ext === 'jsx') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-yellow-400">
        <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">
          JS
        </text>
      </svg>
    )
  }

  // JSON
  if (ext === 'json') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-yellow-300">
        <path
          d="M4 6h2v2H4zm0 5h2v2H4zm0 5h2v2H4zm4-10h12v2H8zm0 5h12v2H8zm0 5h12v2H8z"
          fill="currentColor"
        />
      </svg>
    )
  }

  // Markdown
  if (ext === 'md' || ext === 'mdx') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-400">
        <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M5 8v8l3-3 3 3V8" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </svg>
    )
  }

  // CSS
  if (ext === 'css' || ext === 'scss' || ext === 'sass' || ext === 'less') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-purple-400">
        <path
          d="M4 4h16v16H4V4zm4 4v8h8V8H8z"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    )
  }

  // Default file icon
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-muted">
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

// Folder icon
function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-yellow-500">
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

export function MentionDropdown({
  items,
  selectedIndex,
  position,
  onSelect,
  onClose
}: MentionDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const selectedItemRef = useRef<HTMLButtonElement>(null)

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Scroll selected item into view
  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (items.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-sidebar border border-default rounded-lg shadow-lg py-2 px-3 w-80"
        style={{ top: position.top, left: position.left }}
      >
        <span className="text-muted text-sm">No files found</span>
      </div>
    )
  }

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-sidebar border border-default rounded-lg shadow-lg py-1 w-80 max-h-64 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
      role="listbox"
    >
      {items.map((item, index) => (
        <button
          key={item.path}
          ref={index === selectedIndex ? selectedItemRef : null}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
            index === selectedIndex ? 'bg-hover' : 'hover:bg-hover/50'
          }`}
          onClick={() => onSelect(item)}
          role="option"
          aria-selected={index === selectedIndex}
          id={`mention-option-${index}`}
        >
          <span className="flex-shrink-0">
            {item.isDirectory ? <FolderIcon /> : <FileIcon name={item.name} />}
          </span>
          <span className="truncate text-secondary">
            <span className="text-primary">{item.name}</span>
            {item.relativePath !== item.name && (
              <span className="text-muted ml-1 text-xs">
                {item.relativePath.slice(0, -item.name.length - 1)}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
