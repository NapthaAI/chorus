import { useState, useCallback } from 'react'

type DropPosition = 'top' | 'bottom' | 'left' | 'right' | 'center' | null

interface DropZoneOverlayProps {
  visible: boolean
  onDrop: (position: DropPosition) => void
}

export function DropZoneOverlay({ visible, onDrop }: DropZoneOverlayProps) {
  const [activeZone, setActiveZone] = useState<DropPosition>(null)

  const handleDragOver = useCallback((e: React.DragEvent, position: DropPosition) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveZone(position)
  }, [])

  const handleDragLeave = useCallback(() => {
    setActiveZone(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, position: DropPosition) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveZone(null)
    onDrop(position)
  }, [onDrop])

  if (!visible) return null

  return (
    <div className="absolute inset-0 z-50 pointer-events-auto">
      {/* Top drop zone */}
      <div
        className={`absolute top-0 left-0 right-0 h-1/4 flex items-center justify-center transition-colors ${
          activeZone === 'top' ? 'bg-accent/30' : 'bg-transparent hover:bg-accent/20'
        }`}
        onDragOver={(e) => handleDragOver(e, 'top')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'top')}
      >
        {activeZone === 'top' && (
          <div className="px-3 py-1 bg-accent text-white rounded text-sm font-medium">
            Split Top
          </div>
        )}
      </div>

      {/* Bottom drop zone */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-1/4 flex items-center justify-center transition-colors ${
          activeZone === 'bottom' ? 'bg-accent/30' : 'bg-transparent hover:bg-accent/20'
        }`}
        onDragOver={(e) => handleDragOver(e, 'bottom')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'bottom')}
      >
        {activeZone === 'bottom' && (
          <div className="px-3 py-1 bg-accent text-white rounded text-sm font-medium">
            Split Bottom
          </div>
        )}
      </div>

      {/* Left drop zone */}
      <div
        className={`absolute top-1/4 bottom-1/4 left-0 w-1/4 flex items-center justify-center transition-colors ${
          activeZone === 'left' ? 'bg-accent/30' : 'bg-transparent hover:bg-accent/20'
        }`}
        onDragOver={(e) => handleDragOver(e, 'left')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'left')}
      >
        {activeZone === 'left' && (
          <div className="px-3 py-1 bg-accent text-white rounded text-sm font-medium">
            Split Left
          </div>
        )}
      </div>

      {/* Right drop zone */}
      <div
        className={`absolute top-1/4 bottom-1/4 right-0 w-1/4 flex items-center justify-center transition-colors ${
          activeZone === 'right' ? 'bg-accent/30' : 'bg-transparent hover:bg-accent/20'
        }`}
        onDragOver={(e) => handleDragOver(e, 'right')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'right')}
      >
        {activeZone === 'right' && (
          <div className="px-3 py-1 bg-accent text-white rounded text-sm font-medium">
            Split Right
          </div>
        )}
      </div>

      {/* Center drop zone (for merging/replacing) */}
      <div
        className={`absolute top-1/4 bottom-1/4 left-1/4 right-1/4 flex items-center justify-center transition-colors ${
          activeZone === 'center' ? 'bg-accent/30' : 'bg-transparent hover:bg-accent/20'
        }`}
        onDragOver={(e) => handleDragOver(e, 'center')}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, 'center')}
      >
        {activeZone === 'center' && (
          <div className="px-3 py-1 bg-accent text-white rounded text-sm font-medium">
            Open Here
          </div>
        )}
      </div>
    </div>
  )
}

export type { DropPosition }
