import { useState, useEffect, useCallback, RefObject } from 'react'
import getCaretCoordinates from 'textarea-caret'

interface MentionTriggerState {
  isOpen: boolean
  query: string
  triggerIndex: number
  position: { top: number; left: number }
}

interface UseMentionTriggerResult {
  isOpen: boolean
  query: string
  triggerIndex: number
  position: { top: number; left: number }
  close: () => void
}

export function useMentionTrigger(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  value: string
): UseMentionTriggerResult {
  const [state, setState] = useState<MentionTriggerState>({
    isOpen: false,
    query: '',
    triggerIndex: -1,
    position: { top: 0, left: 0 }
  })

  // Check if character is a word boundary
  const isWordBoundary = (char: string | undefined): boolean => {
    if (char === undefined) return true
    return /\s/.test(char) || char === ''
  }

  // Find the @ trigger position and extract query
  const findTrigger = useCallback(
    (text: string, cursorPos: number): { triggerIndex: number; query: string } | null => {
      // Look backwards from cursor for @
      let i = cursorPos - 1
      while (i >= 0) {
        if (text[i] === '@') {
          // Check if @ is at word boundary
          const charBefore = text[i - 1]
          if (isWordBoundary(charBefore)) {
            const query = text.slice(i + 1, cursorPos)
            // If query contains space, user moved past the mention
            if (query.includes(' ') || query.includes('\n')) {
              return null
            }
            return { triggerIndex: i, query }
          }
          // @ is part of another word (like email), keep looking
        }
        // Stop at whitespace - no @ found in current word
        if (/\s/.test(text[i])) {
          break
        }
        i--
      }
      return null
    },
    []
  )

  // Calculate dropdown position
  const calculatePosition = useCallback(
    (triggerIndex: number): { top: number; left: number } => {
      const textarea = textareaRef.current
      if (!textarea) return { top: 0, left: 0 }

      // Get caret coordinates at the @ position
      const coords = getCaretCoordinates(textarea, triggerIndex)
      const rect = textarea.getBoundingClientRect()

      // Position below the @, with offset
      let top = rect.top + coords.top + coords.height + 4
      let left = rect.left + coords.left

      // Ensure dropdown doesn't go off-screen (right)
      const dropdownWidth = 320
      if (left + dropdownWidth > window.innerWidth - 16) {
        left = window.innerWidth - dropdownWidth - 16
      }

      // Ensure dropdown doesn't go off-screen (bottom)
      const dropdownHeight = 264 // max-h-64 = 16rem = 256px + padding
      if (top + dropdownHeight > window.innerHeight - 16) {
        // Position above the @ instead
        top = rect.top + coords.top - dropdownHeight - 4
      }

      // Ensure dropdown doesn't go off-screen (left)
      if (left < 16) {
        left = 16
      }

      // Ensure dropdown doesn't go off-screen (top)
      if (top < 16) {
        top = 16
      }

      return { top, left }
    },
    [textareaRef]
  )

  // Update state when value or cursor changes
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const handleUpdate = () => {
      const cursorPos = textarea.selectionStart
      const trigger = findTrigger(value, cursorPos)

      if (trigger) {
        const position = calculatePosition(trigger.triggerIndex)
        setState({
          isOpen: true,
          query: trigger.query,
          triggerIndex: trigger.triggerIndex,
          position
        })
      } else {
        setState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev))
      }
    }

    // Run on value change
    handleUpdate()

    // Also listen for cursor movement (selection change)
    textarea.addEventListener('select', handleUpdate)
    textarea.addEventListener('click', handleUpdate)
    textarea.addEventListener('keyup', handleUpdate)

    return () => {
      textarea.removeEventListener('select', handleUpdate)
      textarea.removeEventListener('click', handleUpdate)
      textarea.removeEventListener('keyup', handleUpdate)
    }
  }, [value, textareaRef, findTrigger, calculatePosition])

  // Close handler
  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  return {
    isOpen: state.isOpen,
    query: state.query,
    triggerIndex: state.triggerIndex,
    position: state.position,
    close
  }
}
