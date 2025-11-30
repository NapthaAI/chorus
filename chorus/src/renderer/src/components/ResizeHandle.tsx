import { useCallback, useEffect, useState } from 'react'

interface ResizeHandleProps {
  position: 'left' | 'right'
  onResize: (delta: number) => void
  onResizeEnd?: () => void
}

export function ResizeHandle({ position, onResize, onResizeEnd }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setStartX(e.clientX)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      setStartX(e.clientX)
      // For left position, positive delta increases width
      // For right position, negative delta increases width
      onResize(position === 'left' ? delta : -delta)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      onResizeEnd?.()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, startX, position, onResize, onResizeEnd])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        w-1 cursor-col-resize hover:bg-accent/50 transition-colors flex-shrink-0
        ${isDragging ? 'bg-accent' : 'bg-transparent'}
      `}
      style={{ userSelect: isDragging ? 'none' : 'auto' }}
    />
  )
}
