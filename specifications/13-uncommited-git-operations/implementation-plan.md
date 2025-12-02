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
