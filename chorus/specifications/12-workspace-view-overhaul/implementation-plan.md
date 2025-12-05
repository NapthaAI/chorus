# Workspace View Overhaul - Implementation Plan

## Overview

Redesign the WorkspaceOverview component with a tabbed interface to better organize workspace information into logical sections.

## Current Structure

Currently `WorkspaceOverview.tsx` displays everything in one scrolling view:
- Header (repo name, path)
- Status badges (uncommitted changes, CLAUDE.md)
- ChangesPanel (uncommitted files)
- BranchCommitsGrid (5 columns of branches)
- AgentSessionsPanel (auto-created branches)
- WorkspaceSettings
- Slash Commands
- Agents list
- Quick actions

## New Tabbed Structure

### Tab 1: Agents
- Agents list with avatars and descriptions
- Slash commands section
- Quick actions (Browse Files)

### Tab 2: Git
- **Branch selector dropdown** (local branches only, no remote spam)
- **Uncommitted changes** with action buttons (stage, discard)
- **Auto-created agent branches** (AgentSessionsPanel)
- When a branch is selected, show its commits

### Tab 3: Settings
- Workspace default settings (permission mode, allowed tools, model)

## Implementation Steps

### Phase 1: Add State Management

**File: `src/renderer/src/stores/ui-store.ts`**

Add new state:
```typescript
type WorkspaceOverviewTab = 'agents' | 'git' | 'settings'

// Add to UIStore interface:
workspaceOverviewTab: WorkspaceOverviewTab
setWorkspaceOverviewTab: (tab: WorkspaceOverviewTab) => void

// Add to initial state:
workspaceOverviewTab: 'agents'

// Add action:
setWorkspaceOverviewTab: (tab) => set({ workspaceOverviewTab: tab })
```

### Phase 2: Create Tab Components

**File: `src/renderer/src/components/MainPane/WorkspaceOverview.tsx`**

Refactor into:

1. **WorkspaceOverviewHeader** - Repo name, path, status badges (shared across tabs)

2. **WorkspaceAgentsTab** - Extract:
   - Agents list grid
   - Slash commands section
   - Quick actions

3. **WorkspaceGitTab** - Extract and enhance:
   - Local branch selector (filter out remotes)
   - ChangesPanel with actions
   - AgentSessionsPanel
   - Selected branch commits

4. **WorkspaceSettingsTab** - Extract:
   - WorkspaceSettings component

### Phase 3: Update BranchCommitsGrid

**File: `src/renderer/src/components/MainPane/BranchCommitsGrid.tsx`**

Modify to:
- Only show local branches by default
- Add option to show remote branches
- Better integrate with branch selection

### Phase 4: Filter Remote Branches

**File: `src/main/services/git-service.ts`**

The `listBranches` function already separates local/remote. UI just needs to filter.

## UI Design

```
┌─────────────────────────────────────────────────────────┐
│  [Repo Icon] workspace-name                             │
│  /path/to/workspace                                     │
│  [Uncommitted changes badge] [CLAUDE.md badge]          │
├─────────────────────────────────────────────────────────┤
│  [ Agents ]  [ Git ]  [ Settings ]     ← Tab buttons    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tab content here...                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Tab Button Style (from RightPanel pattern):
```typescript
function TabButton({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
        active
          ? 'text-white border-b-2 border-accent'
          : 'text-muted hover:text-secondary'
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}
```

## Files to Modify

1. `src/renderer/src/stores/ui-store.ts` - Add tab state
2. `src/renderer/src/components/MainPane/WorkspaceOverview.tsx` - Main refactor
3. `src/renderer/src/components/MainPane/BranchCommitsGrid.tsx` - Filter branches
4. `src/renderer/src/components/MainPane/ChangesPanel.tsx` - Already has actions (done)

## Files to Create

None - all changes within existing files

## Dependencies

- Existing TabButton pattern from RightPanel
- Existing ChangesPanel with actions (already implemented)
- Existing AgentSessionsPanel
- Existing WorkspaceSettings

## Testing

1. Verify tab switching works
2. Verify agents tab shows all agents and commands
3. Verify git tab shows only local branches
4. Verify uncommitted changes actions work
5. Verify settings persist correctly
6. Verify branch selection updates commits view
