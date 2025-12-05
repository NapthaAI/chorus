import type { Agent, Workspace } from '../../types'
import { useChatStore } from '../../stores/chat-store'

interface AgentHeaderProps {
  agent: Agent
  workspace: Workspace
  onBack: () => void
}

// SVG Icons
const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

// Sparkle icon for Chorus (general) agent
const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
    <circle cx="8" cy="8" r="3" />
  </svg>
)

// Generate a consistent color based on agent name
function getAvatarColor(name: string): string {
  const colors = [
    '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
    '#00bcd4', '#009688', '#4caf50', '#ff9800', '#ff5722'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Get initials from agent name
function getInitials(name: string): string {
  const words = name.split(/[-_\s]+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export function AgentHeader({ agent, workspace, onBack }: AgentHeaderProps) {
  const { getAgentStatus } = useChatStore()
  const agentStatus = getAgentStatus(agent.id)

  const avatarColor = agent.isGeneral ? '#8b5cf6' : getAvatarColor(agent.name)
  const initials = getInitials(agent.name)

  return (
    <div className="px-3 py-2 border-b border-default">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted hover:text-secondary mb-2 transition-colors"
      >
        <ChevronLeftIcon />
        <span>Workspaces</span>
      </button>

      {/* Agent info */}
      <div className="flex items-center gap-2">
        {/* Avatar */}
        <div
          className="relative flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-white text-xs font-semibold"
          style={{ backgroundColor: avatarColor }}
        >
          {agent.isGeneral ? <SparkleIcon /> : initials}
          {/* Status indicator */}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar ${
              agentStatus === 'busy'
                ? 'bg-yellow-500 animate-pulse'
                : agentStatus === 'error'
                  ? 'bg-red-500'
                  : 'bg-green-500'
            }`}
          />
        </div>

        {/* Name and workspace */}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-sm">{agent.name}</p>
          <p className="text-xs text-muted truncate">{workspace.name}</p>
        </div>

        {/* Status badge */}
        {agentStatus === 'busy' && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/20 text-yellow-400 rounded shrink-0">
            Busy
          </span>
        )}
        {agentStatus === 'error' && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 rounded shrink-0">
            Error
          </span>
        )}
      </div>
    </div>
  )
}
