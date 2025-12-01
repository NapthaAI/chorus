import { useCallback, useEffect, useRef, useState } from 'react'

// Swap icon for swapping panes
const SwapIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 16V4M7 4L3 8M7 4L11 8" />
    <path d="M17 8V20M17 20L21 16M17 20L13 16" />
  </svg>
)

// Rotate icon for changing orientation
const RotateIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
)

interface SplitDividerProps {
  orientation: 'vertical' | 'horizontal'
  onDrag: (delta: number) => void
  onDragEnd: () => void
  onDoubleClick: () => void
  onSwap: () => void
  onOrientationChange: (orientation: 'vertical' | 'horizontal') => void
}

export function SplitDivider({
  orientation,
  onDrag,
  onDragEnd,
  onDoubleClick,
  onSwap,
  onOrientationChange
}: SplitDividerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const lastPosRef = useRef(0)

  const isVertical = orientation === 'vertical'

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    lastPosRef.current = isVertical ? e.clientY : e.clientX
  }, [isVertical])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    const currentPos = isVertical ? e.clientY : e.clientX
    const delta = currentPos - lastPosRef.current
    lastPosRef.current = currentPos
    onDrag(delta)
  }, [isDragging, isVertical, onDrag])

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      onDragEnd()
    }
  }, [isDragging, onDragEnd])

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      // Prevent text selection during drag
      document.body.style.userSelect = 'none'
      document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDragging, isVertical, handleMouseMove, handleMouseUp])

  const handleToggleOrientation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onOrientationChange(isVertical ? 'horizontal' : 'vertical')
  }, [isVertical, onOrientationChange])

  return (
    <div
      className={`relative group flex-shrink-0 ${isVertical ? 'cursor-row-resize h-2' : 'cursor-col-resize w-2'}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
    >
      {/* Visible divider line */}
      <div
        className={`
          transition-colors
          ${isDragging ? 'bg-accent' : 'bg-sidebar hover:bg-accent/50'}
          ${isVertical ? 'h-full w-full' : 'w-full h-full'}
        `}
      />

      {/* Expanded hit area (invisible) */}
      <div className={`absolute ${isVertical ? 'inset-x-0 -top-2 -bottom-2' : 'inset-y-0 -left-2 -right-2'}`} />

      {/* Control buttons - appear on hover */}
      <div
        className={`
          absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          flex items-center gap-1
          opacity-0 group-hover:opacity-100 transition-opacity
          z-10
        `}
      >
        {/* Swap button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSwap()
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-1.5 rounded bg-sidebar border border-default hover:bg-hover text-muted hover:text-primary"
          title="Swap panes"
        >
          <SwapIcon />
        </button>

        {/* Orientation toggle */}
        <button
          onClick={handleToggleOrientation}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-1.5 rounded bg-sidebar border border-default hover:bg-hover text-muted hover:text-primary"
          title={isVertical ? 'Switch to side-by-side' : 'Switch to top-bottom'}
        >
          <RotateIcon />
        </button>
      </div>
    </div>
  )
}
