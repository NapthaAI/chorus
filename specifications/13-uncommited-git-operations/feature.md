# Feature: Enhanced Uncommitted Changes Management

## Overview

Upgrade the existing `ChangesPanel` to provide a complete Git staging workflow with diff viewing, staged/unstaged separation, commit functionality, and batch operations. Transform the current "view and discard" experience into a full "stage, review, commit" workflow without leaving Chorus.

**Current State:** Basic panel showing uncommitted files with stage/discard buttons (hover only)
**Target State:** Full Git staging area with diff viewer, commit workflow, and batch operations

## Problem Statement

The current `ChangesPanel` has significant limitations:

1. **No diff viewing** - Users can't see what actually changed in files
2. **No staged/unstaged separation** - Git's two-stage workflow not represented
3. **No commit workflow** - Users can stage files but can't commit from the UI
4. **Limited visibility** - Only shows first 10 files
5. **Poor discoverability** - Action buttons only appear on hover
6. **No batch operations** - Must stage/discard files one at a time
7. **No unstage support** - Once staged, can't remove from staging area

## User Stories

### US-1: View File Diff
**As a** user reviewing uncommitted changes
**I want to** see the actual line-by-line diff of a changed file
**So that** I can understand exactly what was modified before committing

**Acceptance Criteria:**
- [ ] Click on a file in changes list opens diff viewer
- [ ] Diff shows in split pane (or modal if split not active)
- [ ] Syntax highlighting for code files
- [ ] Line numbers shown
- [ ] Additions in green, deletions in red
- [ ] Unified diff format with context lines
- [ ] Close button returns to changes panel

### US-2: Separate Staged and Unstaged Changes
**As a** user managing my git workflow
**I want to** see staged and unstaged changes separately
**So that** I know exactly what will be included in my next commit

**Acceptance Criteria:**
- [ ] Two sections: "Staged Changes" and "Unstaged Changes"
- [ ] Staged section at top (these will be committed)
- [ ] File count shown for each section
- [ ] Empty sections show helpful text (e.g., "No staged changes")
- [ ] Files move between sections when staged/unstaged

### US-3: Unstage Files
**As a** user who staged a file by mistake
**I want to** remove it from the staging area
**So that** it won't be included in my commit

**Acceptance Criteria:**
- [ ] Unstage button (−) appears on staged files
- [ ] Clicking unstage moves file to unstaged section
- [ ] No confirmation needed (reversible action)
- [ ] File retains its changes (just moved out of staging)

### US-4: Stage All / Unstage All
**As a** user with many changed files
**I want to** stage or unstage all files at once
**So that** I can work efficiently

**Acceptance Criteria:**
- [ ] "Stage All" button in unstaged section header
- [ ] "Unstage All" button in staged section header
- [ ] Buttons only appear when section has files
- [ ] All files in section are affected

### US-5: Discard All Changes
**As a** user who wants to reset to last commit
**I want to** discard all uncommitted changes at once
**So that** I can start fresh without clicking each file

**Acceptance Criteria:**
- [ ] "Discard All" button in unstaged section header
- [ ] Confirmation dialog with strong warning
- [ ] Lists number of files to be affected
- [ ] Discards both staged and unstaged changes (full reset)

### US-6: Commit Staged Changes
**As a** user ready to commit
**I want to** write a commit message and commit from the UI
**So that** I don't need to switch to terminal

**Acceptance Criteria:**
- [ ] Commit message input appears when files are staged
- [ ] Multi-line input (textarea) for message
- [ ] "Commit" button enabled only when message is non-empty
- [ ] Commit button shows number of files (e.g., "Commit 3 files")
- [ ] Success notification after commit
- [ ] Staged section clears after successful commit
- [ ] Commit message clears after successful commit

### US-7: View All Changed Files
**As a** user with more than 10 changed files
**I want to** see all files, not just the first 10
**So that** I have full visibility into my changes

**Acceptance Criteria:**
- [ ] Show all files by default (remove 10-file limit)
- [ ] Virtualized list for performance with many files
- [ ] Or: Expandable "Show N more" that reveals all

### US-8: Always-Visible Actions
**As a** user managing changes
**I want to** see action buttons without hovering
**So that** I know what actions are available

**Acceptance Criteria:**
- [ ] Stage/unstage/discard icons always visible
- [ ] Icons are muted but visible, highlight on hover
- [ ] Touch-friendly (no hover required)

## UI Design

### Enhanced Changes Panel Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ UNCOMMITTED CHANGES                                    [Refresh]│
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ STAGED CHANGES (2)                         [Unstage All]    │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ ✓ M  src/components/App.tsx              [−] [👁] [↩]      │ │
│ │ ✓ A  src/utils/helpers.ts                [−] [👁] [↩]      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ UNSTAGED CHANGES (4)              [Stage All] [Discard All] │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │   M  src/main/index.ts                   [+] [👁] [↩]      │ │
│ │   M  src/renderer/store.ts               [+] [👁] [↩]      │ │
│ │   D  src/old-file.ts                     [+] [👁] [↩]      │ │
│ │   ?? .env.local                          [+] [👁] [↩]      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ COMMIT MESSAGE                                              │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ Add helper utilities and update App component          │ │ │
│ │ │                                                         │ │ │
│ │ │ - Extract common functions to helpers.ts                │ │ │
│ │ │ - Refactor App.tsx to use new helpers                   │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                        [Commit 2 files]     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Icon Legend

| Icon | Action | Location |
|------|--------|----------|
| `[+]` | Stage file | Unstaged files |
| `[−]` | Unstage file | Staged files |
| `[👁]` | View diff | All files |
| `[↩]` | Discard changes | All files |
| `[✓]` | Staged indicator | Staged files |

### Diff Viewer (Split Pane)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Workspace Overview] [src/components/App.tsx (diff)]        [×] │
├─────────────────────────────────────────────────────────────────┤
│ src/components/App.tsx                              Unified ▾   │
├─────────────────────────────────────────────────────────────────┤
│   10 │   import { useState } from 'react'                       │
│   11 │   import { Button } from './Button'                      │
│   12 │ - import { formatDate } from './utils'                   │
│   12 │ + import { formatDate, capitalize } from './helpers'     │
│   13 │                                                          │
│   14 │   export function App() {                                │
│   15 │     const [count, setCount] = useState(0)                │
│   16 │ +   const [name, setName] = useState('')                 │
│   17 │                                                          │
├─────────────────────────────────────────────────────────────────┤
│ +2 additions, -1 deletion                    [Stage] [Discard]  │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Requirements

### Backend Changes

**git-service.ts additions:**
```typescript
// Get status with staged/unstaged separation
export async function getDetailedStatus(path: string): Promise<DetailedGitStatus>

// Stage all files
export async function stageAll(path: string): Promise<void>

// Unstage all files
export async function unstageAll(path: string): Promise<void>

// Discard all changes (hard reset working directory)
export async function discardAll(path: string): Promise<void>

// Get diff for a specific file
export async function getFileDiff(path: string, filePath: string): Promise<string>
```

**New types:**
```typescript
interface DetailedGitStatus {
  staged: GitChange[]      // Changes in index (will be committed)
  unstaged: GitChange[]    // Changes in working tree
  untracked: GitChange[]   // New files not tracked
}

interface GitChange {
  file: string
  status: 'M' | 'A' | 'D' | 'R' | '?'
  staged: boolean
}
```

### IPC Handlers

| Handler | Purpose |
|---------|---------|
| `git:detailed-status` | Get staged/unstaged/untracked separation |
| `git:stage-all` | Stage all changes |
| `git:unstage-all` | Unstage all staged changes |
| `git:discard-all` | Discard all changes |
| `git:file-diff` | Get diff for specific file |

### Component Changes

**ChangesPanel.tsx:**
- Rename to `GitChangesPanel.tsx` (more descriptive)
- Split into sections: StagedSection, UnstagedSection
- Add CommitSection with message input
- Add DiffViewerModal or integrate with split pane

**New Components:**
- `DiffViewer.tsx` - Syntax-highlighted diff display
- `CommitForm.tsx` - Commit message input + button
- `FileChangeRow.tsx` - Single file row with actions

### State Management

```typescript
// workspace-store.ts additions
interface GitPanelState {
  staged: GitChange[]
  unstaged: GitChange[]
  commitMessage: string
  diffFile: string | null  // File currently being diffed
  isLoading: boolean
}

// Actions
loadGitStatus: (workspaceId: string) => Promise<void>
stageFile: (workspaceId: string, filePath: string) => Promise<void>
unstageFile: (workspaceId: string, filePath: string) => Promise<void>
stageAll: (workspaceId: string) => Promise<void>
unstageAll: (workspaceId: string) => Promise<void>
discardFile: (workspaceId: string, filePath: string) => Promise<void>
discardAll: (workspaceId: string) => Promise<void>
commit: (workspaceId: string, message: string) => Promise<void>
setCommitMessage: (message: string) => void
viewDiff: (filePath: string) => void
closeDiff: () => void
```

## Edge Cases

1. **Binary files** - Show "Binary file changed" instead of diff
2. **Large files** - Warn user, offer to skip diff loading
3. **Renamed files** - Show old and new path
4. **Empty commit message** - Disable commit button
5. **Commit fails** - Show error, preserve message
6. **Concurrent changes** - Refresh status after any operation
7. **File deleted externally** - Handle gracefully in diff viewer

---

## Part 2: Remote Sync Operations

### Overview

Add push, pull, and sync capabilities to the Local Branches panel. Users can synchronize their local branch with the remote, with options for merge or rebase workflows.

### User Stories

#### US-9: View Sync Status
**As a** user working on a branch
**I want to** see how my branch compares to the remote
**So that** I know if I need to push or pull

**Acceptance Criteria:**
- [ ] Show ahead/behind counts next to current branch (e.g., ↑2 ↓1)
- [ ] "Up to date" indicator when synced
- [ ] "No upstream" indicator when branch has no remote tracking
- [ ] Status refreshes after push/pull operations

#### US-10: Push to Remote
**As a** user with local commits
**I want to** push my commits to the remote
**So that** others can access my changes

**Acceptance Criteria:**
- [ ] Push button visible when ahead of remote
- [ ] Shows commit count (e.g., "Push 3")
- [ ] Handles "no upstream" by offering to publish branch
- [ ] Shows error if push rejected (needs pull first)
- [ ] Success feedback after push completes

#### US-11: Pull from Remote
**As a** user whose remote has new commits
**I want to** pull changes from the remote
**So that** I have the latest code

**Acceptance Criteria:**
- [ ] Pull button visible when behind remote
- [ ] Shows commit count (e.g., "Pull 2")
- [ ] User can choose: Merge or Rebase
- [ ] Handles merge conflicts gracefully (show message, don't crash)
- [ ] Success feedback after pull completes

#### US-12: Sync (Pull + Push)
**As a** user with both local and remote changes
**I want to** sync my branch in one action
**So that** I can quickly get up to date and share my work

**Acceptance Criteria:**
- [ ] Sync button when both ahead and behind
- [ ] User chooses sync strategy before first sync:
  - Merge then Push
  - Rebase then Push
- [ ] Remember user's preference per workspace
- [ ] Shows progress during operation

#### US-13: Publish Branch
**As a** user on a local-only branch
**I want to** publish it to the remote
**So that** others can see and collaborate on it

**Acceptance Criteria:**
- [ ] "Publish" button when no upstream tracking branch
- [ ] Sets upstream to `origin/<branch-name>`
- [ ] Shows success with new tracking info

#### US-14: Fetch Updates
**As a** user wanting to check for remote changes
**I want to** fetch without merging
**So that** I can see what's new before pulling

**Acceptance Criteria:**
- [ ] Fetch/refresh button in branch section header
- [ ] Updates ahead/behind counts
- [ ] Non-destructive (doesn't change working directory)

### UI Design

#### Local Branches Panel with Sync Status

```
┌─────────────────────────────────────────────────────────────────┐
│ LOCAL BRANCHES                                          [⟳ Fetch]│
├─────────────────────────────────────────────────────────────────┤
│ ● main                                                          │
│   origin/main · ↑2 ↓1                    [↓ Pull ▾] [↑ Push]   │
├─────────────────────────────────────────────────────────────────┤
│   feature/auth                                                  │
│   feature/ui-update                                             │
│   bugfix/login                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Sync Status Indicators

| State | Display | Actions |
|-------|---------|---------|
| Up to date | `✓ Synced` | Fetch only |
| Ahead only | `↑3` | Push |
| Behind only | `↓2` | Pull (with strategy dropdown) |
| Ahead & behind | `↑2 ↓1` | Pull then Push, or Sync button |
| No upstream | `No remote` | Publish Branch |
| No remote configured | `No remote` | (disabled) |

#### Pull Strategy Dropdown

```
┌──────────────────────┐
│ ↓ Pull ▾             │
├──────────────────────┤
│ ● Pull (merge)       │
│ ○ Pull (rebase)      │
├──────────────────────┤
│ □ Remember choice    │
└──────────────────────┘
```

### Technical Requirements

#### Git Commands

```typescript
// Get ahead/behind counts relative to upstream
git rev-list --count --left-right @{upstream}...HEAD
// Returns: "2\t3" (2 behind, 3 ahead)

// Check if upstream exists
git rev-parse --abbrev-ref @{upstream}
// Returns upstream name or error if none

// Get remote name for current branch
git config --get branch.<branch>.remote

// Push to existing upstream
git push

// Push and set upstream (publish)
git push -u origin <branch>

// Pull with merge (default)
git pull

// Pull with rebase
git pull --rebase

// Fetch all remotes
git fetch --all
```

#### New Backend Functions

**File: `git-service.ts`**

```typescript
interface BranchSyncStatus {
  ahead: number
  behind: number
  upstream: string | null  // e.g., "origin/main" or null if no tracking
  remote: string | null    // e.g., "origin" or null
}

// Get sync status for current branch
export async function getBranchSyncStatus(path: string): Promise<BranchSyncStatus>

// Push current branch
export async function push(path: string): Promise<void>

// Push and set upstream (for new branches)
export async function pushSetUpstream(path: string, remote: string, branch: string): Promise<void>

// Pull with merge
export async function pull(path: string): Promise<void>

// Pull with rebase
export async function pullRebase(path: string): Promise<void>

// Fetch from all remotes
export async function fetchAll(path: string): Promise<void>
```

#### New IPC Handlers

| Handler | Purpose |
|---------|---------|
| `git:sync-status` | Get ahead/behind/upstream info |
| `git:push` | Push to upstream |
| `git:push-set-upstream` | Push and set tracking branch |
| `git:pull` | Pull with merge |
| `git:pull-rebase` | Pull with rebase |
| `git:fetch` | Fetch from all remotes |

#### State Management

```typescript
// workspace-store.ts additions
interface BranchSyncState {
  ahead: number
  behind: number
  upstream: string | null
  isLoading: boolean
  lastFetched: Date | null
  preferredPullStrategy: 'merge' | 'rebase' | null
}

// Actions
fetchSyncStatus: (workspaceId: string) => Promise<void>
push: (workspaceId: string) => Promise<void>
pull: (workspaceId: string, rebase?: boolean) => Promise<void>
publishBranch: (workspaceId: string) => Promise<void>
setPullStrategy: (workspaceId: string, strategy: 'merge' | 'rebase') => void
```

### Edge Cases

1. **Push rejected** - Remote has changes, need to pull first → Show error message
2. **Pull conflicts** - Merge/rebase has conflicts → Show conflict message, suggest resolution
3. **No remote configured** - Repo has no remotes → Disable sync features, show info
4. **Detached HEAD** - Not on a branch → Hide sync UI or show warning
5. **Protected branch** - Push rejected by server → Show server error message
6. **Network offline** - Operations fail → Show network error
7. **Large push/pull** - Many commits → Show progress indicator

## Out of Scope

- Interactive staging (hunk-level staging)
- Amend previous commit
- Multiple file diff tabs
- Commit history viewer (covered by existing BranchCommitsGrid)
- Stash management UI (backend exists, no UI priority)
- Force push (too dangerous for UI)
- Remote management (add/remove remotes)

## Success Metrics

- Users can complete full stage → commit workflow in Chorus
- Diff viewer provides clear understanding of changes
- Batch operations reduce clicks for multi-file workflows
- No regression in existing discard functionality
- Panel remains responsive with 50+ changed files

## Dependencies

- Existing `git-service.ts` functions
- Split pane system for diff viewing
- `prism-react-renderer` for syntax highlighting in diff

## Implementation Priority

| Priority | Feature | Complexity |
|----------|---------|------------|
| P0 | Staged/unstaged separation | Medium |
| P0 | Commit workflow | Medium |
| P1 | View diff | High |
| P1 | Stage/unstage all | Low |
| P2 | Discard all | Low |
| P2 | Always-visible actions | Low |
| P3 | Remove 10-file limit | Low |
