import { useEffect, useState, useCallback } from 'react'
import type { DetailedGitStatus } from '../../types'
import { useFileTreeStore } from '../../stores/file-tree-store'

interface GitChangesPanelProps {
  workspacePath: string
  onViewDiff?: (file: string, staged: boolean, diff: string) => void
}

// SVG Icons
const FileModifiedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-amber-400">
    <path d="M2.75 14A1.75 1.75 0 011 12.25v-2.5a.75.75 0 011.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 00.25-.25v-2.5a.75.75 0 011.5 0v2.5A1.75 1.75 0 0113.25 14H2.75z" />
    <path d="M11.78 4.72a.75.75 0 00-1.06-1.06L8.75 5.63V1.5a.75.75 0 00-1.5 0v4.13L5.28 3.66a.75.75 0 00-1.06 1.06l3.25 3.25a.75.75 0 001.06 0l3.25-3.25z" />
  </svg>
)

const FileAddedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-green-400">
    <path d="M8 0a8 8 0 110 16A8 8 0 018 0zm1.5 4.75a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" />
  </svg>
)

const FileDeletedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-red-400">
    <path d="M8 0a8 8 0 110 16A8 8 0 018 0zM4.75 7.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" />
  </svg>
)

const FileUntrackedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="text-blue-400">
    <path d="M8 0a8 8 0 110 16A8 8 0 018 0zm.75 4.75a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5zM8 10.5a1 1 0 100 2 1 1 0 000-2z" />
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-green-400">
    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
  </svg>
)

// Action icons
const StageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z" />
  </svg>
)

const UnstageIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 8a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7A.5.5 0 014 8z" />
  </svg>
)

const ViewIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 010 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.831.88 9.577.43 8.899a1.62 1.62 0 010-1.798c.45-.678 1.367-1.932 2.637-3.023C4.329 2.992 6.019 2 8 2zM1.679 7.932a.12.12 0 000 .136c.411.622 1.241 1.75 2.366 2.717C5.175 11.758 6.527 12.5 8 12.5c1.473 0 2.824-.742 3.955-1.715 1.125-.967 1.955-2.095 2.366-2.717a.12.12 0 000-.136c-.411-.622-1.241-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.824.742-3.955 1.715-1.125.967-1.955 2.095-2.366 2.717zM8 10a2 2 0 110-4 2 2 0 010 4z" />
  </svg>
)

const DiscardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 1a7 7 0 11-4.95 11.95l-.707.707A8 8 0 108 0v1z" />
    <path d="M7.5 3v5.293L5.354 6.146a.5.5 0 10-.708.708l3 3a.5.5 0 00.708 0l3-3a.5.5 0 00-.708-.708L8.5 8.293V3a.5.5 0 00-1 0z" />
  </svg>
)

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 3a5 5 0 104.546 2.914.5.5 0 01.908-.418A6 6 0 118 2v1z" />
    <path d="M8 1v3.5l3-2L8 1z" />
  </svg>
)

const HelpIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-muted">
    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm.93 4.412l-.598 3.809a.5.5 0 01-.495.421h-.666a.5.5 0 01-.495-.579l.598-3.809A.5.5 0 017.769 3.833h.666a.5.5 0 01.495.579zM8 11a1 1 0 110 2 1 1 0 010-2z" />
  </svg>
)

function getStatusIcon(status: string) {
  switch (status.trim()) {
    case 'M':
      return <FileModifiedIcon />
    case 'A':
      return <FileAddedIcon />
    case 'D':
      return <FileDeletedIcon />
    case '?':
    case '??':
      return <FileUntrackedIcon />
    default:
      return <FileModifiedIcon />
  }
}

function getStatusLabel(status: string): string {
  switch (status.trim()) {
    case 'M':
      return 'Modified'
    case 'A':
      return 'Added'
    case 'D':
      return 'Deleted'
    case '?':
    case '??':
      return 'Untracked'
    case 'R':
      return 'Renamed'
    default:
      return 'Changed'
  }
}

// Tooltip component - positions from right to avoid cutoff
function Tooltip({ children, content, position = 'top' }: { children: React.ReactNode; content: string; position?: 'top' | 'top-right' }) {
  const positionClasses = position === 'top-right'
    ? 'bottom-full right-0 mb-1'
    : 'bottom-full left-1/2 -translate-x-1/2 mb-1'

  return (
    <div className="relative group/tooltip">
      {children}
      <div className={`absolute ${positionClasses} px-2 py-1.5 bg-zinc-800 border border-zinc-600 rounded shadow-lg text-xs text-zinc-100 whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[100]`}>
        {content}
        {/* Arrow */}
        <div className={`absolute top-full ${position === 'top-right' ? 'right-2' : 'left-1/2 -translate-x-1/2'} border-4 border-transparent border-t-zinc-600`} />
      </div>
    </div>
  )
}

// Action button with tooltip
function ActionButton({
  icon,
  onClick,
  tooltip,
  className = '',
  disabled = false,
  tooltipPosition = 'top-right'
}: {
  icon: React.ReactNode
  onClick: () => void
  tooltip: string
  className?: string
  disabled?: boolean
  tooltipPosition?: 'top' | 'top-right'
}) {
  return (
    <Tooltip content={tooltip} position={tooltipPosition}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled) onClick()
        }}
        disabled={disabled}
        className={`p-1 rounded transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        {icon}
      </button>
    </Tooltip>
  )
}

// File row component
function FileChangeRow({
  file,
  status,
  staged,
  isLoading,
  onStage,
  onUnstage,
  onDiscard,
  onViewDiff
}: {
  file: string
  status: string
  staged: boolean
  isLoading: boolean
  onStage: () => void
  onUnstage: () => void
  onDiscard: () => void
  onViewDiff: () => void
}) {
  return (
    <div className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-hover group">
      {/* Staged indicator */}
      {staged && (
        <span className="flex-shrink-0 w-4">
          <CheckIcon />
        </span>
      )}

      {/* Status icon */}
      <Tooltip content={getStatusLabel(status)}>
        <span className="flex-shrink-0">{getStatusIcon(status)}</span>
      </Tooltip>

      {/* File path */}
      <span className="font-mono text-muted truncate min-w-0 flex-1 text-xs">{file}</span>

      {/* Actions - always visible but muted */}
      <div className="flex-shrink-0 flex items-center gap-0.5 text-muted/60 group-hover:text-muted transition-colors">
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {/* Stage/Unstage */}
            {staged ? (
              <ActionButton
                icon={<UnstageIcon />}
                onClick={onUnstage}
                tooltip="Unstage: Remove from next commit"
                className="hover:text-amber-400"
              />
            ) : (
              <ActionButton
                icon={<StageIcon />}
                onClick={onStage}
                tooltip="Stage: Include in next commit"
                className="hover:text-green-400"
              />
            )}

            {/* View diff */}
            <ActionButton
              icon={<ViewIcon />}
              onClick={onViewDiff}
              tooltip="View changes"
              className="hover:text-blue-400"
            />

            {/* Discard */}
            <ActionButton
              icon={<DiscardIcon />}
              onClick={onDiscard}
              tooltip="Discard: Revert to last commit"
              className="hover:text-red-400"
            />
          </>
        )}
      </div>
    </div>
  )
}

// Section header component
function SectionHeader({
  title,
  count,
  helpText,
  actions
}: {
  title: string
  count: number
  helpText: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 border-b border-default/50">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
          {title} ({count})
        </h4>
        <Tooltip content={helpText}>
          <span className="cursor-help">
            <HelpIcon />
          </span>
        </Tooltip>
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  )
}

// Commit section component
function CommitSection({
  stagedCount,
  isCommitting,
  onCommit
}: {
  stagedCount: number
  isCommitting: boolean
  onCommit: (message: string) => void
}) {
  const [message, setMessage] = useState('')
  const canCommit = stagedCount > 0 && message.trim().length > 0 && !isCommitting

  const handleCommit = () => {
    if (canCommit) {
      onCommit(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && canCommit) {
      handleCommit()
    }
  }

  if (stagedCount === 0) {
    return (
      <div className="px-3 py-2 border-t border-default/50 flex items-center gap-2 text-muted/60 text-xs">
        <span className="text-muted/40"><StageIcon /></span>
        <span>Stage files to commit</span>
      </div>
    )
  }

  return (
    <div className="p-3 border-t border-default/50">
      <label className="text-xs text-secondary block mb-2">Commit Message</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe your changes..."
        className="w-full h-16 px-2 py-1.5 text-xs bg-main border border-default rounded resize-none focus:border-accent focus:outline-none text-primary placeholder-muted/50"
      />
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-muted">
          {stagedCount} file{stagedCount !== 1 ? 's' : ''} staged
        </span>
        <button
          onClick={handleCommit}
          disabled={!canCommit}
          className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1.5 ${
            canCommit
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-hover text-muted cursor-not-allowed'
          }`}
        >
          {isCommitting && (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          Commit
        </button>
      </div>
    </div>
  )
}

// Confirmation dialog
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isDestructive = false
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  isDestructive?: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-[15%] z-50">
      <div className="bg-surface border border-default rounded shadow-lg w-[400px]">
        <div className="p-4">
          <p className="text-primary text-sm font-medium">{title}</p>
          <p className="text-xs text-muted mt-2">{message}</p>
        </div>
        <div className="px-4 pb-3 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded border border-default hover:bg-hover text-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs rounded text-white transition-colors ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function GitChangesPanel({ workspacePath, onViewDiff }: GitChangesPanelProps) {
  const [status, setStatus] = useState<DetailedGitStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [isCommitting, setIsCommitting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    message: string
    confirmLabel: string
    onConfirm: () => void
    isDestructive?: boolean
  } | null>(null)
  const triggerFileTreeRefresh = useFileTreeStore((state) => state.triggerRefresh)

  const loadStatus = useCallback(async () => {
    const result = await window.api.git.detailedStatus(workspacePath)
    if (result.success && result.data) {
      setStatus(result.data)
    }
  }, [workspacePath])

  useEffect(() => {
    setIsLoading(true)
    loadStatus().finally(() => setIsLoading(false))
  }, [loadStatus])

  const handleStageFile = async (file: string) => {
    setActionInProgress(file)
    try {
      const result = await window.api.git.stageFile(workspacePath, file)
      if (result.success) {
        await loadStatus()
      }
    } finally {
      setActionInProgress(null)
    }
  }

  const handleUnstageFile = async (file: string) => {
    setActionInProgress(file)
    try {
      const result = await window.api.git.unstageFile(workspacePath, file)
      if (result.success) {
        await loadStatus()
      }
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDiscardFile = (file: string, fileStatus: string) => {
    const getMessage = () => {
      if (fileStatus === 'D') return 'This will restore the deleted file.'
      if (fileStatus === '?' || fileStatus === 'A') return 'This will delete the untracked file permanently.'
      return 'This will revert the file to the last commit. Changes will be lost.'
    }

    setConfirmDialog({
      title: `Discard changes to ${file}?`,
      message: getMessage(),
      confirmLabel: 'Discard',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(null)
        setActionInProgress(file)
        try {
          const result = await window.api.git.discardChanges(workspacePath, file)
          if (result.success) {
            await loadStatus()
            triggerFileTreeRefresh()
          }
        } finally {
          setActionInProgress(null)
        }
      }
    })
  }

  const handleViewDiff = async (file: string, staged: boolean) => {
    const result = await window.api.git.fileDiff(workspacePath, file, staged)
    if (result.success && result.data !== undefined) {
      onViewDiff?.(file, staged, result.data)
    }
  }

  const handleStageAll = async () => {
    setActionInProgress('__all__')
    try {
      const result = await window.api.git.stageAll(workspacePath)
      if (result.success) {
        await loadStatus()
      }
    } finally {
      setActionInProgress(null)
    }
  }

  const handleUnstageAll = async () => {
    setActionInProgress('__all__')
    try {
      const result = await window.api.git.unstageAll(workspacePath)
      if (result.success) {
        await loadStatus()
      }
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDiscardAll = () => {
    const totalFiles = (status?.staged.length || 0) + (status?.unstaged.length || 0)
    setConfirmDialog({
      title: `Discard ALL changes?`,
      message: `This will discard all ${totalFiles} changed files and remove untracked files. This action cannot be undone.`,
      confirmLabel: 'Discard All',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(null)
        setActionInProgress('__all__')
        try {
          const result = await window.api.git.discardAll(workspacePath)
          if (result.success) {
            await loadStatus()
            triggerFileTreeRefresh()
          }
        } finally {
          setActionInProgress(null)
        }
      }
    })
  }

  const handleCommit = async (message: string) => {
    setIsCommitting(true)
    try {
      const result = await window.api.git.commit(workspacePath, message)
      if (result.success) {
        await loadStatus()
        triggerFileTreeRefresh()
      }
    } finally {
      setIsCommitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg bg-input border border-default p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted">
          <div className="w-4 h-4 border-2 border-muted border-t-transparent rounded-full animate-spin" />
          Loading changes...
        </div>
      </div>
    )
  }

  const totalChanges = (status?.staged.length || 0) + (status?.unstaged.length || 0)

  if (!status || totalChanges === 0) {
    return null
  }

  return (
    <div className="rounded-lg bg-input border border-default mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface/50 border-b border-default">
        <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">
          Uncommitted Changes ({totalChanges})
        </h3>
        <div className="flex items-center gap-1">
          <ActionButton
            icon={<RefreshIcon />}
            onClick={loadStatus}
            tooltip="Refresh status"
            className="text-muted hover:text-primary"
          />
        </div>
      </div>

      {/* Staged section */}
      {status.staged.length > 0 && (
        <div>
          <SectionHeader
            title="Staged"
            count={status.staged.length}
            helpText="These files will be included in your next commit"
            actions={
              <button
                onClick={handleUnstageAll}
                disabled={actionInProgress === '__all__'}
                className="text-xs text-muted hover:text-amber-400 transition-colors disabled:opacity-50"
              >
                Unstage All
              </button>
            }
          />
          <div className="px-1 py-1">
            {status.staged.map((change, i) => (
              <FileChangeRow
                key={`staged-${i}`}
                file={change.file}
                status={change.status}
                staged={true}
                isLoading={actionInProgress === change.file}
                onStage={() => {}}
                onUnstage={() => handleUnstageFile(change.file)}
                onDiscard={() => handleDiscardFile(change.file, change.status)}
                onViewDiff={() => handleViewDiff(change.file, true)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unstaged section */}
      {status.unstaged.length > 0 && (
        <div>
          <SectionHeader
            title="Changes"
            count={status.unstaged.length}
            helpText="Modified files not yet staged for commit"
            actions={
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStageAll}
                  disabled={actionInProgress === '__all__'}
                  className="text-xs text-muted hover:text-green-400 transition-colors disabled:opacity-50"
                >
                  Stage All
                </button>
                <button
                  onClick={handleDiscardAll}
                  disabled={actionInProgress === '__all__'}
                  className="text-xs text-muted hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  Discard All
                </button>
              </div>
            }
          />
          <div className="px-1 py-1">
            {status.unstaged.map((change, i) => (
              <FileChangeRow
                key={`unstaged-${i}`}
                file={change.file}
                status={change.status}
                staged={false}
                isLoading={actionInProgress === change.file}
                onStage={() => handleStageFile(change.file)}
                onUnstage={() => {}}
                onDiscard={() => handleDiscardFile(change.file, change.status)}
                onViewDiff={() => handleViewDiff(change.file, false)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Commit section */}
      <CommitSection
        stagedCount={status.staged.length}
        isCommitting={isCommitting}
        onCommit={handleCommit}
      />

      {/* Confirmation dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          isDestructive={confirmDialog.isDestructive}
        />
      )}
    </div>
  )
}
