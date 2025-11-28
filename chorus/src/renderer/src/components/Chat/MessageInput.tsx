import { useState, useRef, useEffect, KeyboardEvent, useMemo } from 'react'
import type { Agent, Workspace } from '../../types'
import { useChatStore } from '../../stores/chat-store'
import { useFileSearch } from '../../hooks/useFileSearch'
import { useMentionTrigger } from '../../hooks/useMentionTrigger'
import { MentionDropdown } from './MentionDropdown'

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isStreaming, isLoading, sendMessage, activeConversationId, streamingConversationId } = useChatStore()

  // File search for @ mentions
  const { search } = useFileSearch(workspace.path)

  // Mention trigger detection
  const { isOpen, query, triggerIndex, position, close } = useMentionTrigger(
    textareaRef,
    message
  )

  // Filter files based on query
  const filteredFiles = useMemo(() => {
    if (!isOpen) return []
    return search(query)
  }, [isOpen, query, search])

  // Reset selected index when query changes or dropdown opens
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, isOpen])

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

  // Insert mention into message
  const insertMention = (item: { relativePath: string; isDirectory: boolean }) => {
    const path = item.isDirectory ? `${item.relativePath}/` : item.relativePath
    const before = message.slice(0, triggerIndex)
    const after = message.slice(textareaRef.current?.selectionStart ?? message.length)
    const newMessage = `${before}@${path}${after}`

    setMessage(newMessage)
    close()

    // Set cursor position after the inserted path
    const newCursorPos = triggerIndex + path.length + 1 // +1 for @
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
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
    // Handle dropdown navigation when open
    if (isOpen && filteredFiles.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % filteredFiles.length)
          return
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + filteredFiles.length) % filteredFiles.length)
          return
        case 'Enter':
          e.preventDefault()
          insertMention(filteredFiles[selectedIndex])
          return
        case 'Tab':
          e.preventDefault()
          insertMention(filteredFiles[selectedIndex])
          return
        case 'Escape':
          e.preventDefault()
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

      {/* Mention dropdown */}
      {isOpen && (
        <MentionDropdown
          items={filteredFiles}
          selectedIndex={selectedIndex}
          position={position}
          onSelect={insertMention}
          onClose={close}
        />
      )}

      <div className="flex justify-between mt-2 text-xs text-muted px-1">
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-hover font-mono">@</kbd> mention files
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 rounded bg-hover font-mono">Enter</kbd> send
          {' '}
          <kbd className="px-1.5 py-0.5 rounded bg-hover font-mono">Shift+Enter</kbd> new line
        </span>
      </div>
    </div>
  )
}
