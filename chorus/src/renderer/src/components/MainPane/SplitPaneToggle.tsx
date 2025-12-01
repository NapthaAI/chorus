// Single pane icon (no split)
const SinglePaneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
)

// Vertical split icon (top/bottom)
const VerticalSplitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
)

// Horizontal split icon (left/right)
const HorizontalSplitIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
)

interface SplitPaneToggleProps {
  enabled: boolean
  orientation: 'vertical' | 'horizontal'
  onDisable: () => void
  onVertical: () => void
  onHorizontal: () => void
}

export function SplitPaneToggle({
  enabled,
  orientation,
  onDisable,
  onVertical,
  onHorizontal
}: SplitPaneToggleProps) {
  return (
    <div className="flex items-center gap-0.5">
      {/* No split button */}
      <button
        onClick={onDisable}
        className={`
          p-1.5 rounded-l transition-colors border-r border-default
          ${!enabled
            ? 'bg-accent/20 text-accent'
            : 'hover:bg-hover text-muted hover:text-primary'
          }
        `}
        title="No split view"
      >
        <SinglePaneIcon />
      </button>

      {/* Vertical split button (top/bottom) */}
      <button
        onClick={onVertical}
        className={`
          p-1.5 transition-colors border-r border-default
          ${enabled && orientation === 'vertical'
            ? 'bg-accent/20 text-accent'
            : 'hover:bg-hover text-muted hover:text-primary'
          }
        `}
        title="Split top/bottom (⌘\)"
      >
        <VerticalSplitIcon />
      </button>

      {/* Horizontal split button (left/right) */}
      <button
        onClick={onHorizontal}
        className={`
          p-1.5 rounded-r transition-colors
          ${enabled && orientation === 'horizontal'
            ? 'bg-accent/20 text-accent'
            : 'hover:bg-hover text-muted hover:text-primary'
          }
        `}
        title="Split left/right"
      >
        <HorizontalSplitIcon />
      </button>
    </div>
  )
}
