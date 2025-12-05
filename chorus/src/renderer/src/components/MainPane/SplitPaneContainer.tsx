import { useRef, useCallback } from 'react'
import { SplitDivider } from './SplitDivider'
import { Pane } from './Pane'
import type { TabGroup } from '../../types'

interface SplitPaneContainerProps {
  firstPaneGroup: TabGroup
  secondPaneGroup: TabGroup
  activePaneId: 'first' | 'second'
  ratio: number                    // 0-100, percentage for first pane
  orientation: 'vertical' | 'horizontal'
  onRatioChange: (ratio: number) => void
  onRatioChangeEnd: () => void
  onSwap: () => void
  onOrientationChange: (orientation: 'vertical' | 'horizontal') => void
  renderTabContent: (tabId: string | null) => React.ReactNode
}

const MIN_PANE_SIZE = 150 // pixels

export function SplitPaneContainer({
  firstPaneGroup,
  secondPaneGroup,
  activePaneId,
  ratio,
  orientation,
  onRatioChange,
  onRatioChangeEnd,
  onSwap,
  onOrientationChange,
  renderTabContent
}: SplitPaneContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle divider drag
  const handleDrag = useCallback((delta: number) => {
    if (!containerRef.current) return

    const containerSize = orientation === 'vertical'
      ? containerRef.current.offsetHeight
      : containerRef.current.offsetWidth

    if (containerSize === 0) return

    // Calculate new ratio based on pixel movement
    const deltaPercent = (delta / containerSize) * 100
    const newRatio = ratio + deltaPercent

    // Calculate min/max based on minimum pane size
    const minRatio = (MIN_PANE_SIZE / containerSize) * 100
    const maxRatio = 100 - minRatio

    // Clamp to valid range
    const clampedRatio = Math.min(Math.max(newRatio, minRatio), maxRatio)
    onRatioChange(clampedRatio)
  }, [ratio, orientation, onRatioChange])

  // Reset to 50/50 on double-click
  const handleDoubleClick = useCallback(() => {
    onRatioChange(50)
    onRatioChangeEnd()
  }, [onRatioChange, onRatioChangeEnd])

  const isVertical = orientation === 'vertical'

  return (
    <div
      ref={containerRef}
      className={`flex h-full overflow-hidden ${isVertical ? 'flex-col' : 'flex-row'}`}
    >
      {/* First pane (top or left) */}
      <div
        className={`overflow-hidden bg-main ${isVertical ? 'border-b border-default' : 'border-r border-default'}`}
        style={isVertical
          ? { height: `${ratio}%`, minHeight: MIN_PANE_SIZE }
          : { width: `${ratio}%`, minWidth: MIN_PANE_SIZE, height: '100%' }
        }
      >
        <Pane
          paneId="first"
          group={firstPaneGroup}
          isActive={activePaneId === 'first'}
          renderContent={renderTabContent}
          showSplitToggle={true}
        />
      </div>

      {/* Divider */}
      <SplitDivider
        orientation={orientation}
        onDrag={handleDrag}
        onDragEnd={onRatioChangeEnd}
        onDoubleClick={handleDoubleClick}
        onSwap={onSwap}
        onOrientationChange={onOrientationChange}
      />

      {/* Second pane (bottom or right) */}
      <div
        className={`flex-1 overflow-hidden bg-main ${isVertical ? 'border-t border-default' : 'border-l border-default'}`}
        style={isVertical
          ? { minHeight: MIN_PANE_SIZE }
          : { minWidth: MIN_PANE_SIZE, height: '100%' }
        }
      >
        <Pane
          paneId="second"
          group={secondPaneGroup}
          isActive={activePaneId === 'second'}
          renderContent={renderTabContent}
        />
      </div>
    </div>
  )
}
