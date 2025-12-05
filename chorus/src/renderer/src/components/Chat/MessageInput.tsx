import { useState, useRef, useEffect, KeyboardEvent, useMemo, useCallback } from 'react'
import type { Agent, Workspace, SlashCommand } from '../../types'
import { useChatStore } from '../../stores/chat-store'
import { useWorkspaceStore } from '../../stores/workspace-store'
import { useFileSearch } from '../../hooks/useFileSearch'
import { useMentionTrigger, EXTENSION_FILTERS, SEMANTIC_FILTERS } from '../../hooks/useMentionTrigger'
import type { MentionFilter } from '../../hooks/useMentionTrigger'
import { useSlashCommandTrigger } from '../../hooks/useSlashCommandTrigger'
import { useSmartSuggestions } from '../../hooks/useSmartSuggestions'
import { MentionDropdown } from './MentionDropdown'
import type { MentionSections } from './MentionDropdown'
import { SlashCommandDropdown } from './SlashCommandDropdown'
import { SelectionChips } from './SelectionChips'

interface WalkEntry {
  name: string
  path: string
  isDirectory: boolean
  relativePath: string
}

interface MessageInputProps {
  agent: Agent
  workspace: Workspace
}

// SVG Icons
const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

export function MessageInput({ agent, workspace }: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [commandSelectedIndex, setCommandSelectedIndex] = useState(0)
  const [selectedFiles, setSelectedFiles] = useState<WalkEntry[]>([])  // Multi-select state
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())  // Directory expansion
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isStreaming, isLoading, sendMessage, activeConversationId, streamingConversationId } = useChatStore()
  const { getCommands, loadCommands } = useWorkspaceStore()

  // Track selected file paths for quick lookup
  const selectedPaths = useMemo(() => new Set(selectedFiles.map(f => f.path)), [selectedFiles])

  // Load slash commands when workspace changes
  useEffect(() => {
    loadCommands(workspace.id)
  }, [workspace.id, loadCommands])

  // File search for @ mentions
  const { files, search, searchInPath, getChildren } = useFileSearch(workspace.path)

  // Smart suggestions (git changed files, recently viewed)
  const smartSuggestions = useSmartSuggestions(workspace.path, workspace.id, files)

  // Mention trigger detection (with filter support)
  const { isOpen, query, queryWithoutFilter, filter, triggerIndex, position, close } = useMentionTrigger(
    textareaRef,
    message
  )

  // Slash command trigger detection
  const {
    isOpen: isCommandOpen,
    query: commandQuery,
    position: commandPosition,
    close: closeCommand
  } = useSlashCommandTrigger(textareaRef, message)

  // Get and filter slash commands
  const allCommands = getCommands(workspace.id)
  const filteredCommands = useMemo(() => {
    if (!isCommandOpen) return []
    const q = commandQuery.toLowerCase()
    return allCommands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q)
    )
  }, [isCommandOpen, commandQuery, allCommands])

  // Apply filter to files
  const applyFilter = (items: WalkEntry[], mentionFilter: MentionFilter | null): WalkEntry[] => {
    if (!mentionFilter) return items

    switch (mentionFilter.type) {
      case 'extension': {
        const extensions = EXTENSION_FILTERS[mentionFilter.value] || []
        return items.filter(f => extensions.some(ext => f.name.endsWith(ext)))
      }
      case 'semantic': {
        if (mentionFilter.value === 'test') {
          const { patterns } = SEMANTIC_FILTERS.test
          return items.filter(f =>
            patterns.some(p => f.relativePath.includes(p)) ||
            f.name.includes('.test.') || f.name.includes('.spec.')
          )
        }
        if (mentionFilter.value === 'config') {
          return items.filter(f =>
            f.name.endsWith('.json') ||
            f.name.endsWith('.yaml') ||
            f.name.endsWith('.yml') ||
            f.name.endsWith('.toml') ||
            f.name.match(/^\.[a-z]+rc$/) ||
            f.name.includes('config')
          )
        }
        return items
      }
      case 'path': {
        return items.filter(f => f.relativePath.startsWith(mentionFilter.value))
      }
      default:
        return items
    }
  }

  // Build sections for dropdown (changed, recent, filtered)
  const mentionSections = useMemo((): MentionSections | null => {
    if (!isOpen) return null

    // Use queryWithoutFilter for fuzzy search (filter prefix removed)
    const searchQuery = filter ? queryWithoutFilter : query

    // For path filters, search within that path directly
    // For other filters, search globally then filter
    let filtered: WalkEntry[]
    if (filter?.type === 'path') {
      filtered = searchInPath(searchQuery, filter.value)
    } else {
      filtered = search(searchQuery)
    }

    // Apply non-path filters to results (extension, semantic)
    const filteredByType = filter?.type === 'path' ? filtered : applyFilter(filtered, filter)

    // If there's a search query (after filter), filter smart suggestions too
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      let filteredChanged = smartSuggestions.changed.filter(
        f => f.name.toLowerCase().includes(q) || f.relativePath.toLowerCase().includes(q)
      )
      let filteredRecent = smartSuggestions.recent.filter(
        f => f.name.toLowerCase().includes(q) || f.relativePath.toLowerCase().includes(q)
      )

      // Also apply type filter to smart suggestions
      filteredChanged = applyFilter(filteredChanged, filter) as typeof filteredChanged
      filteredRecent = applyFilter(filteredRecent, filter)

      // Remove items already in changed/recent from filtered
      const changedPaths = new Set(filteredChanged.map(f => f.path))
      const recentPaths = new Set(filteredRecent.map(f => f.path))
      const dedupedFiltered = filteredByType.filter(
        f => !changedPaths.has(f.path) && !recentPaths.has(f.path)
      )
      return {
        changed: filteredChanged,
        recent: filteredRecent,
        filtered: dedupedFiltered
      }
    }

    // No search query - apply filter to all and show sections
    let filteredChanged = applyFilter(smartSuggestions.changed, filter) as typeof smartSuggestions.changed
    let filteredRecent = applyFilter(smartSuggestions.recent, filter)

    const changedPaths = new Set(filteredChanged.map(f => f.path))
    const recentPaths = new Set(filteredRecent.map(f => f.path))
    const dedupedFiltered = filteredByType.filter(
      f => !changedPaths.has(f.path) && !recentPaths.has(f.path)
    ).slice(0, 20) // Limit to 20 items

    return {
      changed: filteredChanged,
      recent: filteredRecent,
      filtered: dedupedFiltered
    }
  }, [isOpen, query, queryWithoutFilter, filter, search, searchInPath, smartSuggestions])

  // Flat list for keyboard navigation (order: changed → recent → filtered)
  const flatFiles = useMemo((): WalkEntry[] => {
    if (!mentionSections) return []
    return [
      ...(mentionSections.changed || []),
      ...(mentionSections.recent || []),
      ...mentionSections.filtered
    ]
  }, [mentionSections])

  // Reset selected index when query changes or dropdown opens
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, isOpen])

  // Reset command selected index when command query changes
  useEffect(() => {
    setCommandSelectedIndex(0)
  }, [commandQuery, isCommandOpen])

  // Only disable if THIS conversation is streaming
  const isThisConversationStreaming = isStreaming && streamingConversationId === activeConversationId
  const isDisabled = isThisConversationStreaming || isLoading

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 150) // Max 4 lines approx
      textarea.style.height = `${newHeight}px`
    }
  }, [message])

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Toggle folder expansion
  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  // Add all files from a folder to selection (bulk selection)
  const addFolderToSelection = useCallback((folderPath: string) => {
    const children = getChildren(folderPath).filter(c => !c.isDirectory)
    setSelectedFiles(prev => {
      const existingPaths = new Set(prev.map(f => f.path))
      const newFiles = children.filter(c => !existingPaths.has(c.path))
      return [...prev, ...newFiles]
    })
  }, [getChildren])

  // Add file to multi-select (Shift+Enter)
  const addToSelection = (item: WalkEntry) => {
    if (!selectedPaths.has(item.path)) {
      setSelectedFiles(prev => [...prev, item])
    }
    // Move to next item
    setSelectedIndex(prev => (prev + 1) % flatFiles.length)
  }

  // Remove file from selection
  const removeFromSelection = (path: string) => {
    setSelectedFiles(prev => prev.filter(f => f.path !== path))
  }

  // Insert all selected mentions (or single mention if no multi-select)
  const insertMentions = (additionalItem?: WalkEntry) => {
    // Collect all files to insert
    const filesToInsert = [...selectedFiles]
    if (additionalItem && !selectedPaths.has(additionalItem.path)) {
      filesToInsert.push(additionalItem)
    }

    // Build the paths string
    const paths = filesToInsert.map(f => {
      const path = f.isDirectory ? `${f.relativePath}/` : f.relativePath
      return `@${path}`
    }).join(' ')

    const before = message.slice(0, triggerIndex)
    const after = message.slice(textareaRef.current?.selectionStart ?? message.length)
    const newMessage = `${before}${paths}${after}`

    setMessage(newMessage)
    setSelectedFiles([])
    close()

    // Set cursor position after the inserted paths
    const newCursorPos = triggerIndex + paths.length
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Insert single mention (legacy behavior, used when no multi-select)
  const insertMention = (item: { relativePath: string; isDirectory: boolean }) => {
    const path = item.isDirectory ? `${item.relativePath}/` : item.relativePath
    const before = message.slice(0, triggerIndex)
    const after = message.slice(textareaRef.current?.selectionStart ?? message.length)
    const newMessage = `${before}@${path}${after}`

    setMessage(newMessage)
    setSelectedFiles([])
    close()

    // Set cursor position after the inserted path
    const newCursorPos = triggerIndex + path.length + 1 // +1 for @
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Execute slash command - send the command text directly to the SDK
  const executeSlashCommand = async (command: SlashCommand) => {
    closeCommand()

    // Extract args from current message (everything after command name)
    const commandWithSlash = `/${command.name}`
    const fullMessage = message.trim()

    // Build the full command message
    let commandMessage = commandWithSlash
    if (fullMessage.startsWith(commandWithSlash)) {
      // Keep any args the user typed
      const args = fullMessage.slice(commandWithSlash.length).trim()
      if (args) {
        commandMessage = `${commandWithSlash} ${args}`
      }
    }

    // Clear input and send the slash command directly - SDK will handle it
    setMessage('')
    await sendMessage(commandMessage, workspace.id, agent.id, workspace.path, agent.filePath)

    // Refocus
    textareaRef.current?.focus()
  }

  const handleSubmit = async () => {
    const trimmed = message.trim()
    if (!trimmed || isDisabled) return

    // Clear input immediately
    setMessage('')

    // Send message with agent's system prompt file
    await sendMessage(trimmed, workspace.id, agent.id, workspace.path, agent.filePath)

    // Refocus
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle slash command dropdown navigation when open
    if (isCommandOpen && filteredCommands.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setCommandSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
          return
        case 'ArrowUp':
          e.preventDefault()
          setCommandSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
          return
        case 'Enter':
          e.preventDefault()
          executeSlashCommand(filteredCommands[commandSelectedIndex])
          return
        case 'Tab':
          e.preventDefault()
          // Tab completes the command name in the input
          const selectedCmd = filteredCommands[commandSelectedIndex]
          setMessage(`/${selectedCmd.name} `)
          closeCommand()
          setTimeout(() => {
            const pos = selectedCmd.name.length + 2
            textareaRef.current?.setSelectionRange(pos, pos)
          }, 0)
          return
        case 'Escape':
          e.preventDefault()
          closeCommand()
          return
      }
    }

    // Handle mention dropdown navigation when open
    if (isOpen && flatFiles.length > 0) {
      const highlightedItem = flatFiles[selectedIndex]

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % flatFiles.length)
          return
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + flatFiles.length) % flatFiles.length)
          return
        case 'ArrowRight':
          // Expand folder on right arrow
          if (highlightedItem?.isDirectory && !expandedPaths.has(highlightedItem.relativePath)) {
            e.preventDefault()
            toggleExpand(highlightedItem.relativePath)
          }
          return
        case 'ArrowLeft':
          // Collapse folder on left arrow
          if (highlightedItem?.isDirectory && expandedPaths.has(highlightedItem.relativePath)) {
            e.preventDefault()
            toggleExpand(highlightedItem.relativePath)
          }
          return
        case 'Enter':
          e.preventDefault()
          if (e.shiftKey && highlightedItem?.isDirectory) {
            // Shift+Enter on folder: bulk select all files in folder
            addFolderToSelection(highlightedItem.relativePath)
          } else if (e.shiftKey) {
            // Shift+Enter: add to selection, stay open
            addToSelection(flatFiles[selectedIndex])
          } else if (highlightedItem?.isDirectory && !expandedPaths.has(highlightedItem.relativePath)) {
            // First Enter on collapsed folder: expand it
            toggleExpand(highlightedItem.relativePath)
          } else if (selectedFiles.length > 0) {
            // Enter with selections: insert all selected + current
            insertMentions(flatFiles[selectedIndex])
          } else {
            // Enter without selections: insert single (legacy)
            insertMention(flatFiles[selectedIndex])
          }
          return
        case 'Tab':
          e.preventDefault()
          if (selectedFiles.length > 0) {
            insertMentions(flatFiles[selectedIndex])
          } else {
            insertMention(flatFiles[selectedIndex])
          }
          return
        case 'Escape':
          e.preventDefault()
          setSelectedFiles([])  // Clear selection on escape
          setExpandedPaths(new Set())  // Clear expansion
          close()
          return
      }
    }

    // Enter to send, Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }

    // Escape to stop streaming (only if this conversation is streaming)
    if (e.key === 'Escape' && isThisConversationStreaming) {
      useChatStore.getState().stopAgent(agent.id)
    }
  }

  return (
    <div className="p-4 border-t border-default bg-sidebar">
      {/* Selection chips for multi-select */}
      {selectedFiles.length > 0 && (
        <div className="mb-2">
          <SelectionChips files={selectedFiles} onRemove={removeFromSelection} />
        </div>
      )}
      <div className="flex items-end gap-3 bg-input rounded-xl border border-default focus-within:border-accent transition-colors">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${agent.name}...`}
          disabled={isDisabled}
          rows={1}
          className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-muted resize-none outline-none disabled:opacity-50 max-h-[150px]"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="mention-listbox"
          aria-activedescendant={isOpen ? `mention-option-${selectedIndex}` : undefined}
        />
        <button
          onClick={handleSubmit}
          disabled={isDisabled || !message.trim()}
          className="p-3 text-accent hover:text-accent-hover disabled:text-muted disabled:cursor-not-allowed transition-colors"
        >
          <SendIcon />
        </button>
      </div>

      {/* Slash command dropdown */}
      {isCommandOpen && (
        <SlashCommandDropdown
          commands={filteredCommands}
          selectedIndex={commandSelectedIndex}
          position={commandPosition}
          onSelect={executeSlashCommand}
          onClose={closeCommand}
        />
      )}

      {/* Mention dropdown */}
      {isOpen && (
        <MentionDropdown
          sections={mentionSections || undefined}
          selectedIndex={selectedIndex}
          position={position}
          onSelect={(item) => {
            // Click selects and inserts (including any already selected)
            if (selectedFiles.length > 0) {
              insertMentions(item)
            } else {
              insertMention(item)
            }
          }}
          onClose={() => {
            setSelectedFiles([])
            close()
          }}
          selectedPaths={selectedPaths}
          filter={filter}
          onClearFilter={() => {
            // Remove the filter prefix from message, keep rest
            if (filter && triggerIndex >= 0) {
              const filterText = filter.type === 'path' ? filter.value : `${filter.value}:`
              const before = message.slice(0, triggerIndex + 1)  // Keep @
              const afterFilter = message.slice(triggerIndex + 1 + filterText.length)
              setMessage(before + afterFilter)
            }
          }}
          // Directory navigation props
          expandedPaths={expandedPaths}
          onToggleExpand={toggleExpand}
          getChildren={getChildren}
        />
      )}

      <div className="flex justify-between mt-2 text-xs text-muted px-1">
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-hover font-mono">/</kbd> commands
          {' '}
          <kbd className="px-1.5 py-0.5 rounded bg-hover font-mono">@</kbd> mention files
        </span>
        <span>
          {isOpen && selectedFiles.length > 0 ? (
            <>
              <kbd className="px-1.5 py-0.5 rounded bg-hover font-mono">Enter</kbd> insert {selectedFiles.length + 1}
              {' '}
              <kbd className="px-1.5 py-0.5 rounded bg-hover font-mono">Shift+Enter</kbd> add more
            </>
          ) : isOpen ? (
            <>
              <kbd className="px-1.5 py-0.5 rounded bg-hover font-mono">→</kbd> expand
              {' '}
              <kbd className="px-1.5 py-0.5 rounded bg-hover font-mono">Shift+Enter</kbd> multi
            </>
          ) : (
            <>
              <kbd className="px-1.5 py-0.5 rounded bg-hover font-mono">Enter</kbd> send
              {' '}
              <kbd className="px-1.5 py-0.5 rounded bg-hover font-mono">Shift+Enter</kbd> new line
            </>
          )}
        </span>
      </div>
    </div>
  )
}
