# Implementation Plan: Enhanced Uncommitted Changes Management

## Overview

This document outlines the implementation plan for upgrading the `ChangesPanel` to a full Git staging workflow with diff viewing, staged/unstaged separation, commit functionality, and improved UX with guidance text.

## Workspace Overview Restructure

The Workspace Overview page will be reorganized with this section order:

```
┌─────────────────────────────────────────────────────────────────┐
│ WORKSPACE: my-project                                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. LOCAL BRANCHES                                               │
│    Branch selector, recent commits grid                         │
├─────────────────────────────────────────────────────────────────┤
│ 2. UNCOMMITTED CHANGES                                          │
│    Staged/unstaged files, commit workflow                       │
├─────────────────────────────────────────────────────────────────┤
│ 3. AGENT SESSIONS (if any)                                      │
│    Agent branches, auto-commit history                          │
├─────────────────────────────────────────────────────────────────┤
│ 4. WORKSPACE SETTINGS                                           │
│    Permission mode, tools, model defaults                       │
└─────────────────────────────────────────────────────────────────┘
```

## Phase 1: Backend - Enhanced Git Status

### 1.1 Add Detailed Status Function

**File: `chorus/src/main/services/git-service.ts`**

```typescript
export interface DetailedGitStatus {
  staged: GitChange[]      // Index changes (will be committed)
  unstaged: GitChange[]    // Working tree changes
}

/**
 * Get detailed git status with staged/unstaged separation
 * Uses `git status --porcelain` XY format:
 *   X = index status, Y = worktree status
 *   ' ' = unmodified, M = modified, A = added, D = deleted, ? = untracked
 */
export async function getDetailedStatus(path: string): Promise<DetailedGitStatus> {
  const output = runGit(path, 'status --porcelain')
  const lines = output.split('\n').filter(Boolean)

  const staged: GitChange[] = []
  const unstaged: GitChange[] = []

  for (const line of lines) {
    const indexStatus = line[0]    // X - staged status
    const workStatus = line[1]     // Y - unstaged status
    const file = line.substring(3)

    // Staged changes (X is not space or ?)
    if (indexStatus !== ' ' && indexStatus !== '?') {
      staged.push({ file, status: indexStatus, staged: true })
    }

    // Unstaged changes (Y is not space, or untracked ??)
    if (workStatus !== ' ' || indexStatus === '?') {
      const status = indexStatus === '?' ? '?' : workStatus
      unstaged.push({ file, status, staged: false })
    }
  }

  return { staged, unstaged }
}
```

### 1.2 Add Missing Git Functions

```typescript
/**
 * Unstage all files (reset index to HEAD)
 */
export async function unstageAll(path: string): Promise<void> {
  runGit(path, 'reset HEAD')
}

/**
 * Discard all changes (reset working tree to HEAD)
 * WARNING: Destructive - loses all uncommitted work
 */
export async function discardAll(path: string): Promise<void> {
  runGit(path, 'checkout -- .')
  // Also remove untracked files
  runGit(path, 'clean -fd')
}

/**
 * Get diff for a specific file (unstaged changes)
 */
export async function getFileDiff(repoPath: string, filePath: string): Promise<string> {
  return runGit(repoPath, `diff -- "${filePath}"`)
}

/**
 * Get diff for a specific staged file
 */
export async function getStagedFileDiff(repoPath: string, filePath: string): Promise<string> {
  return runGit(repoPath, `diff --cached -- "${filePath}"`)
}
```

### 1.3 Add IPC Handlers

**File: `chorus/src/main/index.ts`**

```typescript
ipcMain.handle('git:detailed-status', async (_event, path: string) => {
  try {
    const status = await gitService.getDetailedStatus(path)
    return { success: true, data: status }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('git:unstage-all', async (_event, path: string) => {
  try {
    await gitService.unstageAll(path)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('git:discard-all', async (_event, path: string) => {
  try {
    await gitService.discardAll(path)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('git:file-diff', async (_event, repoPath: string, filePath: string, staged: boolean) => {
  try {
    const diff = staged
      ? await gitService.getStagedFileDiff(repoPath, filePath)
      : await gitService.getFileDiff(repoPath, filePath)
    return { success: true, data: diff }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('git:stage-all', async (_event, path: string) => {
  try {
    await gitService.stageAll(path)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})
```

### 1.4 Update Preload API

**File: `chorus/src/preload/index.ts`**

```typescript
git: {
  // ... existing
  detailedStatus: (path: string) => ipcRenderer.invoke('git:detailed-status', path),
  stageAll: (path: string) => ipcRenderer.invoke('git:stage-all', path),
  unstageAll: (path: string) => ipcRenderer.invoke('git:unstage-all', path),
  discardAll: (path: string) => ipcRenderer.invoke('git:discard-all', path),
  fileDiff: (repoPath: string, filePath: string, staged: boolean) =>
    ipcRenderer.invoke('git:file-diff', repoPath, filePath, staged),
}
```

---

## Phase 2: UI Components

### 2.1 Rename and Restructure ChangesPanel

**Rename:** `ChangesPanel.tsx` → `GitChangesPanel.tsx`

**New Structure:**

```
GitChangesPanel/
├── GitChangesPanel.tsx      # Main container
├── StagedSection.tsx        # Staged files list
├── UnstagedSection.tsx      # Unstaged files list
├── FileChangeRow.tsx        # Single file row with actions
├── CommitSection.tsx        # Commit message + button
├── GuidanceTooltip.tsx      # Help tooltips for icons
└── DiffViewer.tsx           # Diff display component
```

### 2.2 FileChangeRow Component

**File: `chorus/src/renderer/src/components/MainPane/GitChangesPanel/FileChangeRow.tsx`**

```tsx
interface FileChangeRowProps {
  file: string
  status: string
  staged: boolean
  onStage: () => void
  onUnstage: () => void
  onDiscard: () => void
  onViewDiff: () => void
  isLoading: boolean
}

export function FileChangeRow({
  file, status, staged,
  onStage, onUnstage, onDiscard, onViewDiff,
  isLoading
}: FileChangeRowProps) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-hover group">
      {/* Status icon */}
      <span className="flex-shrink-0 w-5">{getStatusIcon(status)}</span>

      {/* File path */}
      <span className="font-mono text-sm text-muted truncate flex-1">
        {file}
      </span>

      {/* Actions - always visible but muted */}
      <div className="flex items-center gap-1 text-muted">
        {isLoading ? (
          <Spinner />
        ) : (
          <>
            {/* Stage/Unstage toggle */}
            {staged ? (
              <ActionButton
                icon={<MinusIcon />}
                onClick={onUnstage}
                tooltip="Unstage: Remove from next commit"
                className="hover:text-amber-400"
              />
            ) : (
              <ActionButton
                icon={<PlusIcon />}
                onClick={onStage}
                tooltip="Stage: Include in next commit"
                className="hover:text-green-400"
              />
            )}

            {/* View diff */}
            <ActionButton
              icon={<EyeIcon />}
              onClick={onViewDiff}
              tooltip="View changes"
              className="hover:text-blue-400"
            />

            {/* Discard */}
            <ActionButton
              icon={<DiscardIcon />}
              onClick={onDiscard}
              tooltip="Discard: Revert to last commit (cannot undo)"
              className="hover:text-red-400"
            />
          </>
        )}
      </div>
    </div>
  )
}
```

### 2.3 Section Headers with Guidance

```tsx
function SectionHeader({
  title,
  count,
  actions,
  guidance
}: {
  title: string
  count: number
  actions?: React.ReactNode
  guidance?: string
}) {
  return (
    <div className="flex items-center justify-between px-2 py-2 border-b border-default">
      <div className="flex items-center gap-2">
        <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
          {title} ({count})
        </h4>
        {guidance && (
          <Tooltip content={guidance}>
            <HelpIcon className="w-3.5 h-3.5 text-muted hover:text-secondary cursor-help" />
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-1">
        {actions}
      </div>
    </div>
  )
}

// Usage:
<SectionHeader
  title="Staged Changes"
  count={staged.length}
  guidance="These files will be included in your next commit. Click − to unstage."
  actions={
    <TextButton onClick={unstageAll}>Unstage All</TextButton>
  }
/>

<SectionHeader
  title="Unstaged Changes"
  count={unstaged.length}
  guidance="Modified files not yet staged. Click + to stage for commit."
  actions={
    <>
      <TextButton onClick={stageAll}>Stage All</TextButton>
      <TextButton onClick={discardAll} variant="danger">Discard All</TextButton>
    </>
  }
/>
```

### 2.4 Commit Section

```tsx
function CommitSection({
  stagedCount,
  onCommit
}: {
  stagedCount: number
  onCommit: (message: string) => void
}) {
  const [message, setMessage] = useState('')
  const canCommit = stagedCount > 0 && message.trim().length > 0

  if (stagedCount === 0) {
    return (
      <div className="px-3 py-4 text-center text-muted text-sm">
        <p>Stage files to commit them</p>
        <p className="text-xs mt-1">
          Click <PlusIcon className="inline w-3 h-3" /> next to a file to stage it
        </p>
      </div>
    )
  }

  return (
    <div className="p-3 border-t border-default">
      <label className="text-xs text-secondary block mb-2">
        Commit Message
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Describe your changes..."
        className="w-full h-20 px-3 py-2 text-sm bg-input border border-default rounded resize-none focus:border-accent focus:outline-none"
      />
      <div className="flex justify-between items-center mt-3">
        <span className="text-xs text-muted">
          {stagedCount} file{stagedCount !== 1 ? 's' : ''} staged
        </span>
        <button
          onClick={() => {
            onCommit(message)
            setMessage('')
          }}
          disabled={!canCommit}
          className={`px-4 py-1.5 text-sm rounded transition-colors ${
            canCommit
              ? 'bg-accent hover:bg-accent-hover text-white'
              : 'bg-hover text-muted cursor-not-allowed'
          }`}
        >
          Commit
        </button>
      </div>
    </div>
  )
}
```

### 2.5 Diff Viewer Component

```tsx
interface DiffViewerProps {
  filePath: string
  diff: string
  onClose: () => void
  onStage?: () => void
  onDiscard?: () => void
}

export function DiffViewer({ filePath, diff, onClose, onStage, onDiscard }: DiffViewerProps) {
  const lines = parseDiffLines(diff)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-default bg-surface">
        <span className="font-mono text-sm">{filePath}</span>
        <button onClick={onClose} className="text-muted hover:text-primary">
          <CloseIcon />
        </button>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto font-mono text-sm">
        {lines.map((line, i) => (
          <DiffLine key={i} line={line} />
        ))}
      </div>

      {/* Footer with actions */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-default bg-surface">
        <DiffStats lines={lines} />
        <div className="flex gap-2">
          {onStage && (
            <button
              onClick={onStage}
              className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded"
            >
              Stage
            </button>
          )}
          {onDiscard && (
            <button
              onClick={onDiscard}
              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Discard
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function DiffLine({ line }: { line: ParsedDiffLine }) {
  const bgClass = line.type === 'add'
    ? 'bg-green-950/30'
    : line.type === 'remove'
    ? 'bg-red-950/30'
    : ''

  const textClass = line.type === 'add'
    ? 'text-green-400'
    : line.type === 'remove'
    ? 'text-red-400'
    : 'text-muted'

  return (
    <div className={`flex ${bgClass}`}>
      <span className="w-12 px-2 text-right text-muted border-r border-default select-none">
        {line.lineNumber || ''}
      </span>
      <span className={`flex-1 px-2 whitespace-pre ${textClass}`}>
        {line.content}
      </span>
    </div>
  )
}
```

---

## Phase 3: Integration

### 3.1 Update WorkspaceOverview

**File: `chorus/src/renderer/src/components/MainPane/WorkspaceOverview.tsx`**

Reorder sections:

```tsx
export function WorkspaceOverview({ workspace }: Props) {
  return (
    <div className="p-6 space-y-8 overflow-auto">
      {/* 1. Workspace Header */}
      <WorkspaceHeader workspace={workspace} />

      {/* 2. Local Branches Section */}
      <BranchSection workspace={workspace} />

      {/* 3. Uncommitted Changes - Enhanced */}
      <GitChangesPanel workspacePath={workspace.path} />

      {/* 4. Agent Sessions (conditional) */}
      <AgentSessionsSection workspace={workspace} />

      {/* 5. Workspace Settings */}
      <WorkspaceSettings workspace={workspace} />
    </div>
  )
}
```

### 3.2 Diff Viewer in Split Pane

When viewing a diff, open it in the split pane:

```tsx
// In GitChangesPanel
const handleViewDiff = async (file: GitChange) => {
  const result = await window.api.git.fileDiff(workspacePath, file.file, file.staged)
  if (result.success) {
    // Open diff in split pane as a special tab
    openDiffTab({
      type: 'diff',
      filePath: file.file,
      diff: result.data,
      workspaceId: workspace.id
    })
  }
}
```

---

## Phase 4: Help & Guidance

### 4.1 First-Time Guidance Banner

Show a dismissible banner for new users:

```tsx
function GitGuidanceBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-4 mb-4 p-3 bg-blue-950/30 border border-blue-800/50 rounded-lg">
      <div className="flex items-start gap-3">
        <InfoIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-blue-200">
            <strong>Quick Git Guide:</strong>
          </p>
          <ul className="text-xs text-blue-300/80 mt-2 space-y-1">
            <li><PlusIcon className="inline w-3 h-3" /> <strong>Stage</strong> — Mark file for next commit</li>
            <li><MinusIcon className="inline w-3 h-3" /> <strong>Unstage</strong> — Remove from staging</li>
            <li><EyeIcon className="inline w-3 h-3" /> <strong>View</strong> — See line-by-line changes</li>
            <li><DiscardIcon className="inline w-3 h-3" /> <strong>Discard</strong> — Revert to last commit</li>
          </ul>
        </div>
        <button onClick={onDismiss} className="text-blue-400 hover:text-blue-300">
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
```

### 4.2 Inline Tooltips

All action buttons include tooltips:

```tsx
function ActionButton({
  icon,
  onClick,
  tooltip,
  className
}: {
  icon: React.ReactNode
  onClick: () => void
  tooltip: string
  className?: string
}) {
  return (
    <Tooltip content={tooltip} side="top">
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className={`p-1 rounded transition-colors ${className}`}
      >
        {icon}
      </button>
    </Tooltip>
  )
}
```

---

## Testing Checklist

### Backend
- [ ] `getDetailedStatus` correctly separates staged/unstaged
- [ ] `stageFile` moves file to staged
- [ ] `unstageFile` moves file back to unstaged
- [ ] `stageAll` stages all unstaged files
- [ ] `unstageAll` unstages all staged files
- [ ] `discardChanges` reverts single file
- [ ] `discardAll` reverts all files and removes untracked
- [ ] `commit` creates commit with message
- [ ] `getFileDiff` returns correct diff for unstaged
- [ ] `getStagedFileDiff` returns correct diff for staged

### UI
- [ ] Staged section shows only staged files
- [ ] Unstaged section shows only unstaged files
- [ ] Stage button moves file to staged section
- [ ] Unstage button moves file to unstaged section
- [ ] Stage All stages all unstaged files
- [ ] Unstage All unstages all staged files
- [ ] Discard shows confirmation dialog
- [ ] Discard All shows stronger warning
- [ ] Commit section appears when files are staged
- [ ] Commit button disabled when message empty
- [ ] Commit clears staged files and message on success
- [ ] View diff opens diff in split pane
- [ ] Diff shows additions in green, deletions in red
- [ ] Action icons always visible (not just on hover)
- [ ] Tooltips appear on all action buttons
- [ ] Guidance banner can be dismissed
- [ ] Sections in correct order (Branches → Changes → Sessions → Settings)

### Edge Cases
- [ ] Works with 0 changes (shows empty state)
- [ ] Works with 50+ changes (no performance issues)
- [ ] Binary files show "Binary file" message in diff
- [ ] Renamed files show old → new path
- [ ] Handles git errors gracefully

---

## File Changes Summary

| File | Change |
|------|--------|
| `git-service.ts` | Add `getDetailedStatus`, `unstageAll`, `discardAll`, `getFileDiff`, `getStagedFileDiff` |
| `main/index.ts` | Add IPC handlers for new git functions |
| `preload/index.ts` | Expose new git functions to renderer |
| `preload/index.d.ts` | Add type definitions |
| `ChangesPanel.tsx` | Rename to `GitChangesPanel.tsx`, complete rewrite |
| `WorkspaceOverview.tsx` | Reorder sections |
| New: `FileChangeRow.tsx` | File row component |
| New: `CommitSection.tsx` | Commit message + button |
| New: `DiffViewer.tsx` | Diff display component |
| New: `GitGuidanceBanner.tsx` | First-time help banner |

---

## Phase 5: Remote Sync Operations

### 5.1 Backend - Sync Status Functions

**File: `chorus/src/main/services/git-service.ts`**

```typescript
export interface BranchSyncStatus {
  ahead: number
  behind: number
  upstream: string | null  // e.g., "origin/main"
  remote: string | null    // e.g., "origin"
  branch: string
}

/**
 * Get sync status for current branch (ahead/behind upstream)
 */
export async function getBranchSyncStatus(path: string): Promise<BranchSyncStatus> {
  const branch = await getBranch(path)
  if (!branch) {
    return { ahead: 0, behind: 0, upstream: null, remote: null, branch: '' }
  }

  // Try to get upstream
  let upstream: string | null = null
  let remote: string | null = null
  try {
    upstream = runGit(path, 'rev-parse --abbrev-ref @{upstream}')
    // Extract remote name from upstream (e.g., "origin/main" -> "origin")
    const slashIndex = upstream.indexOf('/')
    if (slashIndex > 0) {
      remote = upstream.substring(0, slashIndex)
    }
  } catch {
    // No upstream configured
    return { ahead: 0, behind: 0, upstream: null, remote: null, branch }
  }

  // Get ahead/behind counts
  try {
    const output = runGit(path, 'rev-list --count --left-right @{upstream}...HEAD')
    const [behind, ahead] = output.split('\t').map(Number)
    return { ahead: ahead || 0, behind: behind || 0, upstream, remote, branch }
  } catch {
    return { ahead: 0, behind: 0, upstream, remote, branch }
  }
}

/**
 * Push current branch to upstream
 */
export async function push(path: string): Promise<void> {
  runGit(path, 'push')
}

/**
 * Push and set upstream tracking branch
 */
export async function pushSetUpstream(path: string, remote: string, branch: string): Promise<void> {
  runGit(path, `push -u ${remote} ${branch}`)
}

/**
 * Pull from upstream (merge)
 */
export async function pull(path: string): Promise<void> {
  runGit(path, 'pull')
}

/**
 * Pull from upstream (rebase)
 */
export async function pullRebase(path: string): Promise<void> {
  runGit(path, 'pull --rebase')
}

/**
 * Fetch from all remotes
 */
export async function fetchAll(path: string): Promise<void> {
  runGit(path, 'fetch --all')
}

/**
 * Check if repo has any remotes configured
 */
export async function hasRemotes(path: string): Promise<boolean> {
  try {
    const output = runGit(path, 'remote')
    return output.trim().length > 0
  } catch {
    return false
  }
}
```

### 5.2 IPC Handlers

**File: `chorus/src/main/index.ts`**

```typescript
ipcMain.handle('git:sync-status', async (_event, path: string) => {
  try {
    const status = await gitService.getBranchSyncStatus(path)
    return { success: true, data: status }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('git:push', async (_event, path: string) => {
  try {
    await gitService.push(path)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('git:push-set-upstream', async (_event, path: string, remote: string, branch: string) => {
  try {
    await gitService.pushSetUpstream(path, remote, branch)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('git:pull', async (_event, path: string) => {
  try {
    await gitService.pull(path)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('git:pull-rebase', async (_event, path: string) => {
  try {
    await gitService.pullRebase(path)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('git:fetch', async (_event, path: string) => {
  try {
    await gitService.fetchAll(path)
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})
```

### 5.3 Preload API

**File: `chorus/src/preload/index.ts`**

```typescript
git: {
  // ... existing
  syncStatus: (path: string) => ipcRenderer.invoke('git:sync-status', path),
  push: (path: string) => ipcRenderer.invoke('git:push', path),
  pushSetUpstream: (path: string, remote: string, branch: string) =>
    ipcRenderer.invoke('git:push-set-upstream', path, remote, branch),
  pull: (path: string) => ipcRenderer.invoke('git:pull', path),
  pullRebase: (path: string) => ipcRenderer.invoke('git:pull-rebase', path),
  fetch: (path: string) => ipcRenderer.invoke('git:fetch', path),
}
```

### 5.4 Type Definitions

**File: `chorus/src/preload/index.d.ts`**

```typescript
export interface BranchSyncStatus {
  ahead: number
  behind: number
  upstream: string | null
  remote: string | null
  branch: string
}

// Add to git API
syncStatus: (path: string) => Promise<Result<BranchSyncStatus>>
push: (path: string) => Promise<Result<void>>
pushSetUpstream: (path: string, remote: string, branch: string) => Promise<Result<void>>
pull: (path: string) => Promise<Result<void>>
pullRebase: (path: string) => Promise<Result<void>>
fetch: (path: string) => Promise<Result<void>>
```

---

## Phase 6: Remote Sync UI

### 6.1 Branch Sync Status Component

**File: `chorus/src/renderer/src/components/MainPane/BranchSyncStatus.tsx`**

```tsx
interface BranchSyncStatusProps {
  workspacePath: string
  currentBranch: string
}

export function BranchSyncStatus({ workspacePath, currentBranch }: BranchSyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<BranchSyncStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pullStrategy, setPullStrategy] = useState<'merge' | 'rebase'>('merge')
  const [showPullMenu, setShowPullMenu] = useState(false)

  const loadSyncStatus = async () => {
    const result = await window.api.git.syncStatus(workspacePath)
    if (result.success && result.data) {
      setSyncStatus(result.data)
    }
  }

  useEffect(() => {
    loadSyncStatus()
  }, [workspacePath, currentBranch])

  const handleFetch = async () => {
    setIsLoading(true)
    try {
      await window.api.git.fetch(workspacePath)
      await loadSyncStatus()
    } finally {
      setIsLoading(false)
    }
  }

  const handlePush = async () => {
    setIsLoading(true)
    try {
      if (!syncStatus?.upstream) {
        // Publish branch
        await window.api.git.pushSetUpstream(workspacePath, 'origin', currentBranch)
      } else {
        await window.api.git.push(workspacePath)
      }
      await loadSyncStatus()
    } finally {
      setIsLoading(false)
    }
  }

  const handlePull = async (rebase: boolean) => {
    setIsLoading(true)
    setShowPullMenu(false)
    try {
      if (rebase) {
        await window.api.git.pullRebase(workspacePath)
      } else {
        await window.api.git.pull(workspacePath)
      }
      await loadSyncStatus()
    } finally {
      setIsLoading(false)
    }
  }

  if (!syncStatus) return null

  const { ahead, behind, upstream } = syncStatus
  const hasUpstream = !!upstream

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Upstream info */}
      {hasUpstream ? (
        <span className="text-muted">{upstream}</span>
      ) : (
        <span className="text-muted/60 italic">No remote</span>
      )}

      {/* Ahead/Behind indicators */}
      {hasUpstream && (
        <div className="flex items-center gap-1.5">
          {ahead > 0 && (
            <span className="text-green-400 flex items-center gap-0.5">
              <ArrowUpIcon className="w-3 h-3" />
              {ahead}
            </span>
          )}
          {behind > 0 && (
            <span className="text-amber-400 flex items-center gap-0.5">
              <ArrowDownIcon className="w-3 h-3" />
              {behind}
            </span>
          )}
          {ahead === 0 && behind === 0 && (
            <span className="text-green-400 flex items-center gap-0.5">
              <CheckIcon className="w-3 h-3" />
              Synced
            </span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 ml-auto">
        {isLoading ? (
          <Spinner className="w-4 h-4" />
        ) : (
          <>
            {/* Fetch button */}
            <Tooltip content="Fetch from remote">
              <button
                onClick={handleFetch}
                className="p-1 rounded hover:bg-hover text-muted hover:text-primary"
              >
                <RefreshIcon className="w-4 h-4" />
              </button>
            </Tooltip>

            {/* Pull button (with dropdown for strategy) */}
            {(behind > 0 || !hasUpstream) && hasUpstream && (
              <div className="relative">
                <Tooltip content={`Pull ${behind} commit${behind !== 1 ? 's' : ''}`}>
                  <button
                    onClick={() => setShowPullMenu(!showPullMenu)}
                    className="px-2 py-1 rounded hover:bg-hover text-muted hover:text-primary flex items-center gap-1"
                  >
                    <ArrowDownIcon className="w-3 h-3" />
                    Pull
                    <ChevronDownIcon className="w-3 h-3" />
                  </button>
                </Tooltip>
                {showPullMenu && (
                  <PullStrategyMenu
                    onSelect={handlePull}
                    onClose={() => setShowPullMenu(false)}
                  />
                )}
              </div>
            )}

            {/* Push / Publish button */}
            {(ahead > 0 || !hasUpstream) && (
              <Tooltip content={hasUpstream ? `Push ${ahead} commit${ahead !== 1 ? 's' : ''}` : 'Publish branch'}>
                <button
                  onClick={handlePush}
                  className="px-2 py-1 rounded bg-green-600/20 hover:bg-green-600/30 text-green-400 flex items-center gap-1"
                >
                  <ArrowUpIcon className="w-3 h-3" />
                  {hasUpstream ? 'Push' : 'Publish'}
                </button>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

### 6.2 Pull Strategy Menu

```tsx
function PullStrategyMenu({
  onSelect,
  onClose
}: {
  onSelect: (rebase: boolean) => void
  onClose: () => void
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div className="absolute top-full right-0 mt-1 w-48 bg-surface border border-default rounded shadow-lg z-50">
        <button
          onClick={() => onSelect(false)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-hover flex items-center gap-2"
        >
          <MergeIcon className="w-4 h-4 text-muted" />
          <div>
            <div className="text-primary">Pull (merge)</div>
            <div className="text-xs text-muted">Create merge commit</div>
          </div>
        </button>
        <button
          onClick={() => onSelect(true)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-hover flex items-center gap-2"
        >
          <RebaseIcon className="w-4 h-4 text-muted" />
          <div>
            <div className="text-primary">Pull (rebase)</div>
            <div className="text-xs text-muted">Rebase local commits</div>
          </div>
        </button>
      </div>
    </>
  )
}
```

### 6.3 Integration with Local Branches Panel

Update the existing branch display to include sync status:

```tsx
// In BranchSelector.tsx or BranchesPanel.tsx
function CurrentBranchRow({ workspace }: { workspace: Workspace }) {
  return (
    <div className="p-3 border-b border-default">
      {/* Branch name with indicator */}
      <div className="flex items-center gap-2 mb-2">
        <BranchIcon className="w-4 h-4 text-green-400" />
        <span className="font-medium text-primary">{workspace.branch}</span>
      </div>

      {/* Sync status - compact, below branch name */}
      <BranchSyncStatus
        workspacePath={workspace.path}
        currentBranch={workspace.branch || 'main'}
      />
    </div>
  )
}
```

---

## Testing Checklist - Remote Sync

### Backend
- [ ] `getBranchSyncStatus` returns correct ahead/behind counts
- [ ] `getBranchSyncStatus` handles no upstream gracefully
- [ ] `push` pushes commits to upstream
- [ ] `pushSetUpstream` creates tracking branch
- [ ] `pull` merges from upstream
- [ ] `pullRebase` rebases on upstream
- [ ] `fetchAll` updates remote refs
- [ ] All operations handle errors gracefully

### UI
- [ ] Sync status displays correctly for current branch
- [ ] Ahead indicator shows when local has commits
- [ ] Behind indicator shows when remote has commits
- [ ] "Synced" shows when up to date
- [ ] "No remote" shows when no upstream
- [ ] Fetch button updates status
- [ ] Pull dropdown shows merge/rebase options
- [ ] Pull merge works correctly
- [ ] Pull rebase works correctly
- [ ] Push button pushes commits
- [ ] Publish button sets upstream for new branches
- [ ] Loading spinner during operations
- [ ] Error messages display on failure

### Edge Cases
- [ ] Works with no remote configured (disables sync)
- [ ] Handles push rejection (needs pull first)
- [ ] Handles pull conflicts (shows error message)
- [ ] Works on detached HEAD (shows warning or hides)
- [ ] Handles network errors gracefully

---

## File Changes Summary - Phase 5 & 6

| File | Change |
|------|--------|
| `git-service.ts` | Add `getBranchSyncStatus`, `push`, `pushSetUpstream`, `pull`, `pullRebase`, `fetchAll` |
| `main/index.ts` | Add IPC handlers for sync operations |
| `preload/index.ts` | Expose sync functions to renderer |
| `preload/index.d.ts` | Add `BranchSyncStatus` type and function signatures |
| New: `BranchSyncStatus.tsx` | Sync status display with push/pull/fetch |
| New: `PullStrategyMenu.tsx` | Dropdown for merge vs rebase |
| `BranchSelector.tsx` or `BranchesPanel.tsx` | Integrate sync status into branch display |
