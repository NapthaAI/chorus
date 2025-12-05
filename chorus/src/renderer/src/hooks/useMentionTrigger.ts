import { useState, useEffect, useCallback, RefObject, useMemo } from 'react'
import getCaretCoordinates from 'textarea-caret'

// Filter types
type FilterType = 'extension' | 'path' | 'semantic'

interface MentionFilter {
  type: FilterType
  value: string  // e.g., 'ts', 'src/', 'test'
}

interface MentionTriggerState {
  isOpen: boolean
  query: string
  triggerIndex: number
  position: { top: number; left: number }
}

interface UseMentionTriggerResult {
  isOpen: boolean
  query: string               // Full query after @
  queryWithoutFilter: string  // Query with filter prefix removed
  filter: MentionFilter | null
  triggerIndex: number
  position: { top: number; left: number }
  close: () => void
}

// Extension filter map
const EXTENSION_FILTERS: Record<string, string[]> = {
  ts: ['.ts', '.tsx'],
  tsx: ['.tsx'],
  js: ['.js', '.jsx'],
  jsx: ['.jsx'],
  css: ['.css', '.scss', '.sass', '.less'],
  scss: ['.scss'],
  md: ['.md', '.mdx'],
  json: ['.json'],
  yaml: ['.yaml', '.yml'],
}

// Semantic filter patterns
const SEMANTIC_FILTERS = {
  test: {
    patterns: ['.test.', '.spec.', '__tests__/'],
    extensions: ['.test.ts', '.test.tsx', '.test.js', '.spec.ts', '.spec.tsx', '.spec.js']
  },
  config: {
    patterns: ['config', 'rc'],
    extensions: ['.json', '.yaml', '.yml', '.toml']
  }
}

// Parse filter from query
function parseFilter(query: string): { filter: MentionFilter | null; rest: string } {
  // Extension filters: @ts:, @js:, @css:, @md:, @json:, @yaml:
  const extMatch = query.match(/^(ts|tsx|js|jsx|css|scss|md|json|yaml):(.*)/)
  if (extMatch) {
    return {
      filter: { type: 'extension', value: extMatch[1] },
      rest: extMatch[2]
    }
  }

  // Semantic filters: @test:, @config:
  const semanticMatch = query.match(/^(test|config):(.*)/)
  if (semanticMatch) {
    return {
      filter: { type: 'semantic', value: semanticMatch[1] },
      rest: semanticMatch[2]
    }
  }

  // Path filters: @src/, @components/, @lib/utils/
  // Match patterns like "dir/" or "dir/subdir/" at the start
  const pathMatch = query.match(/^([a-zA-Z_][a-zA-Z0-9_.-]*\/)(.*)/)
  if (pathMatch) {
    // Check if this looks like a path filter (has more content after /)
    // or if it ends with / (user is typing a path filter)
    const potentialPath = pathMatch[1]
    // Only treat as path filter if it's a common directory or explicit
    const commonDirs = ['src/', 'lib/', 'components/', 'hooks/', 'stores/', 'utils/', 'services/', 'types/', 'tests/', 'test/']
    if (commonDirs.includes(potentialPath) || query.includes('/')) {
      // Extract full path prefix (everything up to and including last /)
      const lastSlash = query.lastIndexOf('/')
      if (lastSlash > 0) {
        return {
          filter: { type: 'path', value: query.slice(0, lastSlash + 1) },
          rest: query.slice(lastSlash + 1)
        }
      }
    }
  }

  return { filter: null, rest: query }
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

  // Parse filter from query
  const { filter, queryWithoutFilter } = useMemo(() => {
    if (!state.isOpen || !state.query) {
      return { filter: null, queryWithoutFilter: '' }
    }
    const { filter, rest } = parseFilter(state.query)
    return { filter, queryWithoutFilter: rest }
  }, [state.isOpen, state.query])

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
  // Strategy: Position dropdown so its BOTTOM is just above the textarea.
  // We set `top` to the textarea's top minus a gap, then use CSS transform
  // translateY(-100%) in the dropdown component to anchor by bottom edge.
  const calculatePosition = useCallback(
    (triggerIndex: number): { top: number; left: number } => {
      const textarea = textareaRef.current
      if (!textarea) return { top: 0, left: 0 }

      const rect = textarea.getBoundingClientRect()
      const dropdownWidth = 320
      const gap = 8

      // Position where the dropdown's BOTTOM should be (just above textarea)
      // The dropdown component will use transform: translateY(-100%) to anchor by bottom
      let top = rect.top - gap
      let left = rect.left

      // Ensure dropdown doesn't go off-screen (right)
      if (left + dropdownWidth > window.innerWidth - 16) {
        left = window.innerWidth - dropdownWidth - 16
      }

      // Ensure dropdown doesn't go off-screen (left)
      if (left < 16) {
        left = 16
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
    queryWithoutFilter,
    filter,
    triggerIndex: state.triggerIndex,
    position: state.position,
    close
  }
}

// Export filter types and utilities for use elsewhere
export type { MentionFilter, FilterType }
export { EXTENSION_FILTERS, SEMANTIC_FILTERS, parseFilter }
