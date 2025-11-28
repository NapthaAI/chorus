import { useState, useEffect } from 'react'

interface GitBranch {
  name: string
  isCurrent: boolean
  isRemote: boolean
}

interface BranchListProps {
  workspacePath: string
  onBranchChange: () => void
}

const GitBranchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
  </svg>
)

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
  </svg>
)

const LoadingSpinner = () => (
  <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
    <path
      d="M14 8a6 6 0 00-6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
)

const MAX_VISIBLE_BRANCHES = 5

export function BranchList({ workspacePath, onBranchChange }: BranchListProps) {
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBranches()
  }, [workspacePath])

  const loadBranches = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.api.git.listBranches(workspacePath)
      if (result.success && result.data) {
        // Sort: current branch first, then local branches, then remote
        const sorted = [...result.data].sort((a, b) => {
          if (a.isCurrent) return -1
          if (b.isCurrent) return 1
          if (a.isRemote !== b.isRemote) return a.isRemote ? 1 : -1
          return a.name.localeCompare(b.name)
        })
        setBranches(sorted)
      } else {
        setError(result.error || 'Failed to load branches')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckout = async (branch: GitBranch) => {
    if (branch.isCurrent || isCheckingOut) return

    setIsCheckingOut(branch.name)
    setError(null)

    try {
      const result = await window.api.git.checkout(workspacePath, branch.name)
      if (result.success) {
        onBranchChange()
        // Reload branches to update current status
        await loadBranches()
      } else {
        setError(result.error || 'Failed to checkout branch')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsCheckingOut(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted py-2">
        <LoadingSpinner />
        <span className="text-sm">Loading branches...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-400 py-2">{error}</div>
    )
  }

  // Separate local and remote branches
  const localBranches = branches.filter(b => !b.isRemote)
  const remoteBranches = branches.filter(b => b.isRemote)

  // Combine: local branches first, then remote (excluding those that match local names)
  const localNames = new Set(localBranches.map(b => b.name))
  const uniqueRemoteBranches = remoteBranches.filter(b => {
    // Extract branch name without origin/ prefix
    const remoteName = b.name.split('/').slice(1).join('/')
    return !localNames.has(remoteName)
  })

  const allBranches = [...localBranches, ...uniqueRemoteBranches]
  const visibleBranches = showAll ? allBranches : allBranches.slice(0, MAX_VISIBLE_BRANCHES)
  const hiddenCount = allBranches.length - MAX_VISIBLE_BRANCHES

  // Helper to get display name for a branch
  const getDisplayName = (branch: GitBranch) => {
    if (branch.isRemote) {
      // Show without origin/ prefix but with a remote indicator
      return branch.name.split('/').slice(1).join('/')
    }
    return branch.name
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visibleBranches.map((branch) => {
          const isChecking = isCheckingOut === branch.name
          const displayName = getDisplayName(branch)
          return (
            <button
              key={branch.name}
              onClick={() => handleCheckout(branch)}
              disabled={branch.isCurrent || isCheckingOut !== null}
              className={`
                inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all
                ${branch.isCurrent
                  ? 'bg-accent/20 border border-accent/50 text-accent font-medium'
                  : branch.isRemote
                    ? 'bg-input border border-dashed border-default text-muted hover:bg-hover hover:border-accent/30 hover:text-secondary'
                    : 'bg-input border border-default text-secondary hover:bg-hover hover:border-accent/30 hover:text-primary'
                }
                ${isCheckingOut && !isChecking ? 'opacity-50' : ''}
                disabled:cursor-default
              `}
              title={branch.isRemote ? `Remote: ${branch.name}` : branch.name}
            >
              {isChecking ? (
                <LoadingSpinner />
              ) : (
                <span className={branch.isCurrent ? 'text-accent' : 'text-muted'}>
                  <GitBranchIcon />
                </span>
              )}
              <span className="truncate max-w-32">{displayName}</span>
              {branch.isCurrent && (
                <span className="text-accent">
                  <CheckIcon />
                </span>
              )}
            </button>
          )
        })}

        {/* Show more / Show less button */}
        {hiddenCount > 0 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-input border border-default text-muted hover:bg-hover hover:text-secondary transition-all"
          >
            +{hiddenCount} more
          </button>
        )}
        {showAll && allBranches.length > MAX_VISIBLE_BRANCHES && (
          <button
            onClick={() => setShowAll(false)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-input border border-default text-muted hover:bg-hover hover:text-secondary transition-all"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  )
}
