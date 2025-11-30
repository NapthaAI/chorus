import { useChatStore } from '../../stores/chat-store'
import { useWorkspaceStore } from '../../stores/workspace-store'
import { ConversationDetails } from '../Chat/ConversationDetails'

// SVG Icons
const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      <div className="w-12 h-12 mb-3 rounded-xl bg-input flex items-center justify-center text-muted">
        <InfoIcon />
      </div>
      <p className="text-sm text-muted">{message}</p>
    </div>
  )
}

export function DetailsSection() {
  const { activeConversationId } = useChatStore()
  const { selectedWorkspaceId, workspaces } = useWorkspaceStore()

  const selectedWorkspace = workspaces.find((ws) => ws.id === selectedWorkspaceId)

  if (!activeConversationId) {
    return <EmptyState message="Select a conversation to view details" />
  }

  return (
    <ConversationDetails
      conversationId={activeConversationId}
      repoPath={selectedWorkspace?.path}
    />
  )
}
