import { useState } from 'react'
import type { ConversationMessage } from '../../types'

interface ToolExecution {
  toolUse: ConversationMessage
  toolResult: ConversationMessage | null
}

interface ToolCallsGroupProps {
  executions: ToolExecution[]
}

// SVG Icons
const ToolIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
)

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const XIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const SpinnerIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)

// Format tool name for display
function formatToolName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^\s/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Summarize tool input for brief display
function summarizeInput(input?: Record<string, unknown>): string {
  if (!input) return ''
  const keys = Object.keys(input)
  if (keys.length === 0) return ''

  const relevantKeys = ['path', 'file', 'command', 'query', 'content', 'name', 'file_path']
  for (const key of relevantKeys) {
    if (input[key] && typeof input[key] === 'string') {
      const value = String(input[key])
      return value.length > 40 ? value.substring(0, 37) + '...' : value
    }
  }

  for (const key of keys) {
    if (typeof input[key] === 'string') {
      const value = String(input[key])
      return value.length > 40 ? value.substring(0, 37) + '...' : value
    }
  }

  return ''
}

// Get status for a single execution
function getStatus(exec: ToolExecution): 'pending' | 'success' | 'error' {
  if (!exec.toolResult) return 'pending'
  if (exec.toolResult.isToolError) return 'error'
  return 'success'
}

// Individual tool row component
function ToolRow({ exec, isLast }: { exec: ToolExecution; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const toolName = exec.toolUse.toolName || 'Unknown'
  const summary = summarizeInput(exec.toolUse.toolInput)
  const status = getStatus(exec)
  const resultContent = typeof exec.toolResult?.content === 'string' ? exec.toolResult.content : ''

  const statusColor = status === 'pending' ? 'text-yellow-400' : status === 'error' ? 'text-red-400' : 'text-green-400'

  return (
    <div className={`${!isLast ? 'border-b border-white/5' : ''}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-white/5 transition-colors"
      >
        <span className="text-muted w-4">
          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
        <span className="text-xs font-medium text-secondary truncate">
          {formatToolName(toolName)}
        </span>
        {summary && !isExpanded && (
          <span className="text-xs text-muted truncate flex-1">
            {summary}
          </span>
        )}
        <span className={`${statusColor} shrink-0`}>
          {status === 'pending' ? <SpinnerIcon /> : status === 'error' ? <XIcon /> : <CheckIcon />}
        </span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Input */}
          {exec.toolUse.toolInput && (
            <div className="ml-4 p-2 rounded bg-black/20 border border-white/5">
              <div className="text-[10px] text-muted mb-1 uppercase tracking-wide">Input</div>
              <pre className="text-xs text-secondary overflow-x-auto whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                {JSON.stringify(exec.toolUse.toolInput, null, 2)}
              </pre>
            </div>
          )}

          {/* Result */}
          {exec.toolResult && (
            <div className={`ml-4 p-2 rounded border ${status === 'error' ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
              <div className={`text-[10px] mb-1 uppercase tracking-wide ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {status === 'error' ? 'Error' : 'Result'}
              </div>
              <pre className={`text-xs overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto ${status === 'error' ? 'text-red-300' : 'text-green-300'}`}>
                {resultContent || '(empty)'}
              </pre>
            </div>
          )}

          {/* Pending indicator */}
          {!exec.toolResult && (
            <div className="ml-4 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 text-xs text-yellow-400">
                <SpinnerIcon />
                <span>Executing...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ToolCallsGroup({ executions }: ToolCallsGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const successCount = executions.filter(e => getStatus(e) === 'success').length
  const errorCount = executions.filter(e => getStatus(e) === 'error').length
  const pendingCount = executions.filter(e => getStatus(e) === 'pending').length

  const hasErrors = errorCount > 0

  // Summary text
  const summaryText = executions.length === 1
    ? formatToolName(executions[0].toolUse.toolName || 'Tool')
    : `${executions.length} tool calls`

  return (
    <div className="flex gap-3 my-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        hasErrors ? 'bg-red-500/20 text-red-400' :
        pendingCount > 0 ? 'bg-yellow-500/20 text-yellow-400' :
        'bg-green-500/20 text-green-400'
      }`}>
        <ToolIcon />
      </div>
      <div className="flex-1 min-w-0">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors w-full text-left ${
            hasErrors ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15' :
            pendingCount > 0 ? 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/15' :
            'bg-green-500/10 border-green-500/20 hover:bg-green-500/15'
          }`}
        >
          <span className={hasErrors ? 'text-red-400' : pendingCount > 0 ? 'text-yellow-400' : 'text-green-400'}>
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </span>
          <span className={`text-sm font-medium ${
            hasErrors ? 'text-red-400' : pendingCount > 0 ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {summaryText}
          </span>

          {/* Status indicators */}
          <div className="flex items-center gap-1 ml-auto">
            {pendingCount > 0 && (
              <span className="flex items-center gap-0.5 text-yellow-400">
                <SpinnerIcon />
                {pendingCount > 1 && <span className="text-xs">{pendingCount}</span>}
              </span>
            )}
            {successCount > 0 && (
              <span className="flex items-center gap-0.5 text-green-400">
                <CheckIcon />
                {successCount > 1 && <span className="text-xs">{successCount}</span>}
              </span>
            )}
            {errorCount > 0 && (
              <span className="flex items-center gap-0.5 text-red-400">
                <XIcon />
                {errorCount > 1 && <span className="text-xs">{errorCount}</span>}
              </span>
            )}
          </div>
        </button>

        {/* Expanded tool list */}
        {isExpanded && (
          <div className="mt-2 rounded-lg bg-input border border-default overflow-hidden">
            {executions.map((exec, idx) => (
              <ToolRow
                key={exec.toolUse.uuid}
                exec={exec}
                isLast={idx === executions.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
