import { useEffect, useRef } from 'react'
import type { MentionFilter } from '../../hooks/useMentionTrigger'

interface WalkEntry {
  name: string
  path: string
  isDirectory: boolean
  relativePath: string
}

interface ChangedWalkEntry extends WalkEntry {
  status?: 'M' | 'A' | 'D' | '?'
}

interface MentionSections {
  changed?: ChangedWalkEntry[]
  recent?: WalkEntry[]
  filtered: WalkEntry[]
}

interface MentionDropdownProps {
  items?: WalkEntry[]  // Legacy flat list (deprecated, use sections)
  sections?: MentionSections  // New sectioned format
  selectedIndex: number
  position: { top: number; left: number }
  onSelect: (item: WalkEntry) => void
  onClose: () => void
  selectedPaths?: Set<string>  // Paths of files already selected (multi-select)
  filter?: MentionFilter | null  // Active filter
  onClearFilter?: () => void  // Callback to clear filter
  // Directory navigation
  expandedPaths?: Set<string>  // Set of expanded folder paths
  onToggleExpand?: (path: string) => void  // Toggle folder expansion
  getChildren?: (folderPath: string) => WalkEntry[]  // Get children of folder
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

// Checkmark icon for selected items
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-accent">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Status badge for git changes
function StatusBadge({ status }: { status: 'M' | 'A' | 'D' | '?' }) {
  const colors = {
    M: 'text-yellow-400',  // Modified
    A: 'text-green-400',   // Added
    D: 'text-red-400',     // Deleted
    '?': 'text-gray-400'   // Untracked
  }

  return (
    <span className={`text-xs font-mono font-bold ${colors[status]}`}>
      {status}
    </span>
  )
}

// Section header
function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="px-3 py-1.5 text-xs font-medium text-muted uppercase tracking-wide border-b border-default/50">
      {title} ({count})
    </div>
  )
}

// Filter badge component
function FilterBadge({ filter, onClear }: { filter: MentionFilter; onClear?: () => void }) {
  const label = filter.type === 'extension'
    ? `${filter.value}:`
    : filter.type === 'semantic'
      ? `${filter.value}:`
      : filter.value

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border-b border-default/50">
      <span className="text-xs text-accent font-medium">
        Filtering: @{label}
      </span>
      {onClear && (
        <button
          className="text-muted hover:text-primary transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          title="Clear filter"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}

// Chevron icons for folder expand/collapse
function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-muted">
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-muted">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function MentionDropdown({
  items,
  sections,
  selectedIndex,
  position,
  onSelect,
  onClose,
  selectedPaths,
  filter,
  onClearFilter,
  expandedPaths,
  onToggleExpand,
  getChildren
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

  // Build flat list for index calculation
  // Order: changed → recent → filtered
  const flatItems: Array<ChangedWalkEntry | WalkEntry> = []
  if (sections) {
    if (sections.changed?.length) flatItems.push(...sections.changed)
    if (sections.recent?.length) flatItems.push(...sections.recent)
    flatItems.push(...sections.filtered)
  } else if (items) {
    flatItems.push(...items)
  }

  // Track index globally for expanded items
  let globalIndex = 0

  // Render a single item with optional depth for tree view
  const renderItem = (
    item: ChangedWalkEntry | WalkEntry,
    index: number,
    showStatus: boolean = false,
    depth: number = 0
  ) => {
    const isSelected = selectedPaths?.has(item.path)
    const status = showStatus && 'status' in item ? item.status : undefined
    const isExpanded = expandedPaths?.has(item.relativePath)
    const hasExpansion = item.isDirectory && onToggleExpand && getChildren

    return (
      <div key={item.path}>
        <button
          ref={index === selectedIndex ? selectedItemRef : null}
          className={`w-full flex items-center gap-2 py-1.5 text-left text-sm transition-colors ${
            index === selectedIndex ? 'bg-hover' : 'hover:bg-hover/50'
          } ${isSelected ? 'bg-accent/10' : ''}`}
          style={{ paddingLeft: `${12 + depth * 16}px`, paddingRight: '12px' }}
          onClick={() => onSelect(item)}
          role="option"
          aria-selected={index === selectedIndex}
          id={`mention-option-${index}`}
        >
          {/* Expand/collapse chevron for directories */}
          {hasExpansion ? (
            <span
              className="flex-shrink-0 w-4 cursor-pointer hover:text-primary"
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand(item.relativePath)
              }}
            >
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </span>
          ) : (
            <span className="flex-shrink-0 w-4">
              {isSelected && <CheckIcon />}
            </span>
          )}
          {/* Git status badge */}
          {status && (
            <span className="flex-shrink-0 w-4">
              <StatusBadge status={status} />
            </span>
          )}
          <span className="flex-shrink-0">
            {item.isDirectory ? <FolderIcon /> : <FileIcon name={item.name} />}
          </span>
          <span className="truncate text-secondary">
            <span className="text-primary">{item.name}</span>
            {depth === 0 && item.relativePath !== item.name && (
              <span className="text-muted ml-1 text-xs">
                {item.relativePath.slice(0, -item.name.length - 1)}
              </span>
            )}
          </span>
          {/* Checkmark for selected files (shown at end when directory has chevron) */}
          {hasExpansion && isSelected && (
            <span className="flex-shrink-0 ml-auto">
              <CheckIcon />
            </span>
          )}
        </button>
        {/* Render children if expanded */}
        {isExpanded && getChildren && (
          <div>
            {getChildren(item.relativePath).map((child) => {
              globalIndex++
              return renderItem(child, globalIndex, false, depth + 1)
            })}
          </div>
        )}
      </div>
    )
  }

  if (flatItems.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-sidebar border border-default rounded-lg shadow-lg w-80"
        style={{ top: position.top, left: position.left, transform: 'translateY(-100%)' }}
      >
        {/* Filter badge if active */}
        {filter && <FilterBadge filter={filter} onClear={onClearFilter} />}
        <div className="py-2 px-3">
          <span className="text-muted text-sm">No files found</span>
        </div>
      </div>
    )
  }

  // If sections are provided, render with headers
  if (sections) {
    let currentIndex = 0

    return (
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-sidebar border border-default rounded-lg shadow-lg w-80 max-h-96 overflow-y-auto"
        style={{ top: position.top, left: position.left, transform: 'translateY(-100%)' }}
        role="listbox"
      >
        {/* Filter badge if active */}
        {filter && <FilterBadge filter={filter} onClear={onClearFilter} />}

        {/* Changed section */}
        {sections.changed && sections.changed.length > 0 && (
          <>
            <SectionHeader title="Changed" count={sections.changed.length} />
            {sections.changed.map((item) => {
              const idx = currentIndex++
              return renderItem(item, idx, true)
            })}
          </>
        )}

        {/* Recent section */}
        {sections.recent && sections.recent.length > 0 && (
          <>
            <SectionHeader title="Recent" count={sections.recent.length} />
            {sections.recent.map((item) => {
              const idx = currentIndex++
              return renderItem(item, idx)
            })}
          </>
        )}

        {/* Filtered/All Files section */}
        {sections.filtered.length > 0 && (
          <>
            {(sections.changed?.length || sections.recent?.length) ? (
              <SectionHeader title="All Files" count={sections.filtered.length} />
            ) : null}
            {sections.filtered.map((item) => {
              const idx = currentIndex++
              return renderItem(item, idx)
            })}
          </>
        )}
      </div>
    )
  }

  // Legacy flat list rendering
  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-sidebar border border-default rounded-lg shadow-lg py-1 w-80 max-h-64 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
      role="listbox"
    >
      {flatItems.map((item, index) => renderItem(item, index))}
    </div>
  )
}

// Export types for use in other components
export type { WalkEntry, ChangedWalkEntry, MentionSections }
