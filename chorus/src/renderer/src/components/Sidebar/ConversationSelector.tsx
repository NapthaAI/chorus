import { useState } from 'react'
import { useChatStore } from '../../stores/chat-store'
import type { Conversation } from '../../types'

interface ConversationSelectorProps {
  workspaceId: string
  agentId: string
}

// SVG Icons
const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const ChevronUpIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 15l-6-6-6 6" />
  </svg>
)

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const MessageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const { getUnreadCount } = useChatStore()
  const unreadCount = getUnreadCount(conversation.id)

  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 text-left transition-colors flex items-center gap-2 ${
        isActive ? 'bg-selected text-white' : 'hover:bg-hover text-secondary'
      }`}
    >
      <MessageIcon />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{conversation.title}</p>
        <p className="text-xs text-muted">{formatDate(conversation.updatedAt)}</p>
      </div>
      {unreadCount > 0 && !isActive && (
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent text-white rounded-full min-w-[18px] text-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

export function ConversationSelector({ workspaceId, agentId }: ConversationSelectorProps) {
  const [expanded, setExpanded] = useState(false)
  const {
    conversations,
    activeConversationId,
    selectConversation,
    createConversation,
    isLoading
  } = useChatStore()

  const activeConv = conversations.find((c) => c.id === activeConversationId)

  const handleCreateConversation = async () => {
    await createConversation(workspaceId, agentId)
    setExpanded(false)
  }

  const handleSelectConversation = (id: string) => {
    selectConversation(id)
    setExpanded(false)
  }

  return (
    <div className="border-b border-default">
      {/* Current conversation header (click to expand) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-hover transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MessageIcon />
          <span className="text-sm truncate">
            {isLoading ? 'Loading...' : activeConv?.title || 'New conversation'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted">({conversations.length})</span>
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </div>
      </button>

      {/* Expanded list */}
      {expanded && (
        <div className="max-h-48 overflow-y-auto border-t border-default bg-sidebar">
          {conversations.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-muted">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onClick={() => handleSelectConversation(conv.id)}
              />
            ))
          )}

          {/* New conversation button */}
          <button
            onClick={handleCreateConversation}
            className="w-full px-3 py-2 text-sm text-accent hover:bg-hover flex items-center gap-2 border-t border-default transition-colors"
          >
            <PlusIcon />
            New conversation
          </button>
        </div>
      )}
    </div>
  )
}
