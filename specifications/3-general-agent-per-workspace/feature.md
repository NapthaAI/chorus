---
date: 2025-11-28
author: Claude
status: draft
type: feature
---

# General Agent (Chorus) Feature

## Overview

Every workspace should have a default "Chorus" agent that exists automatically without requiring a `.claude/agents/*.md` file. This enables users to immediately start chatting with Claude in any workspace, even if no custom agents are defined.

## Business Value

### For Power Users
- Instant access to Claude in any workspace without setup
- No need to create boilerplate agent files for general-purpose tasks
- Quick experimentation before creating specialized agents

### For New Users
- Zero-friction onboarding - add a workspace and start chatting immediately
- No confusion about "why can't I chat with this workspace?"
- Intuitive default behavior matching expectations from other AI tools

## Current State

Currently, agents are discovered only from `.claude/agents/*.md` files. If a workspace has no agent files, users see an empty agent list and cannot interact with Claude in that workspace. This creates a poor experience for:
- New users who haven't learned about agent files
- Workspaces where custom agents aren't needed
- Quick tasks that don't warrant creating an agent file

## User Stories

### Core Functionality

1. **User**: **Given** I add a new workspace to Chorus, **when** the workspace loads, **then** I see a "Chorus" agent listed first - even if no `.claude/agents/` directory exists.

2. **User**: **Given** I click on the Chorus agent, **when** I send a message, **then** Claude responds using only the workspace's `CLAUDE.md` as context (no additional system prompt).

3. **User**: **Given** a workspace has both custom agents and the Chorus agent, **when** I view the agent list, **then** Chorus appears first, followed by custom agents alphabetically.

### Visual Distinction

4. **User**: **Given** I view the agent list, **when** I look at the Chorus agent, **then** it has a distinct appearance (different icon/avatar) that distinguishes it from custom agents.

### Persistence

5. **User**: **Given** I have conversations with the Chorus agent, **when** I refresh or restart the app, **then** my conversations persist and are linked to the same Chorus agent.

6. **User**: **Given** I remove and re-add a workspace, **when** I view the Chorus agent, **then** it has a new ID (conversations from previous workspace instance are orphaned - acceptable behavior).

## Core Functionality

### Agent Properties

The Chorus agent has special properties:

| Property | Value | Notes |
|----------|-------|-------|
| `id` | UUID v4 | Generated once when workspace is added, stored in config |
| `name` | `"Chorus"` | Fixed name, not derived from filename |
| `filePath` | `""` (empty string) | Indicates no system prompt file |
| `workspaceId` | Parent workspace ID | Same as custom agents |
| `isGeneral` | `true` | New flag to identify general agent |

### ID Generation Strategy

Unlike custom agents (which use SHA-256 hash of file path), the Chorus agent uses a **UUID generated once when the workspace is added**. This UUID is:
- Stored in `config.json` as part of the workspace's agents array
- Stable across app restarts and workspace refreshes
- Lost if workspace is removed and re-added (acceptable - same as moving an agent file)

### Agent Discovery Changes

The `discoverAgents()` function should NOT create the Chorus agent - it only discovers file-based agents. The Chorus agent is:
1. Created in `addWorkspace()` with a new UUID
2. Preserved in `updateWorkspace()` during refresh (not re-discovered)
3. Always placed first in the agents array

### No System Prompt File

When `agentFilePath` is empty string:
- Do NOT pass `--system-prompt-file` flag to Claude CLI
- Claude will use only the workspace's `CLAUDE.md` (automatically loaded by Claude Code)
- This is the "vanilla" Claude experience for the workspace

## Technical Requirements

### Data Model Changes

**Agent interface** (`src/main/store/index.ts`, `src/preload/index.d.ts`):
```typescript
interface Agent {
  id: string
  name: string
  filePath: string      // Empty string for Chorus agent
  workspaceId: string
  isGeneral?: boolean   // New optional flag, true for Chorus agent
}
```

### Store Changes (`src/main/store/index.ts`)

**`addWorkspace()`**:
- Create Chorus agent with `{ id: uuidv4(), name: 'Chorus', filePath: '', isGeneral: true }`
- Prepend to agents array (before discovered agents)

**`updateWorkspace()`**:
- When refreshing, preserve the existing Chorus agent (don't regenerate ID)
- Only update discovered agents from file system
- Merge: `[existingChorusAgent, ...newlyDiscoveredAgents]`

### Workspace Service Changes (`src/main/services/workspace-service.ts`)

**`discoverAgents()`**: No changes needed - continues to only discover file-based agents.

**`getWorkspaceInfo()`**: No changes needed - Chorus agent is handled at store level.

### Agent Service Changes (`src/main/services/agent-service.ts`)

**`sendMessage()`** (lines 117-122):
```typescript
// Only add agent system prompt file for NEW sessions with a valid file path
if (!effectiveSessionId && agentFilePath && agentFilePath !== '' && existsSync(agentFilePath)) {
  args.push('--system-prompt-file', agentFilePath)
}
```

The existing code already handles this correctly since `existsSync('')` returns `false`.

### UI Changes

**`AgentItem.tsx`**:
- Detect `agent.isGeneral` flag
- Show different avatar (Chorus logo or special icon instead of initials)
- Possibly different background color or styling

**`WorkspaceItem.tsx`** (or wherever agents are sorted):
- Ensure Chorus agent (where `isGeneral === true`) appears first
- Custom agents follow in alphabetical order

## Design Considerations

### Chorus Agent Avatar

Options for visual distinction:
1. **Chorus logo** - A small app icon
2. **Star/sparkle icon** - Indicates "default" or "featured"
3. **Different shape** - Circle instead of rounded square
4. **Gradient background** - Multi-color instead of solid color

Recommendation: Use a simple icon (like a chat bubble or sparkle) with a distinctive color (e.g., the app's accent color).

### Agent List Order

```
Workspace: my-project
├── Chorus          ← Always first (isGeneral: true)
├── code-reviewer   ← Custom agents alphabetically
├── docs-writer
└── test-helper
```

## Implementation Considerations

### Migration

Existing workspaces in `config.json` won't have a Chorus agent. Options:
1. **Lazy creation**: Add Chorus agent on first workspace refresh
2. **Migration on startup**: Scan all workspaces, add missing Chorus agents
3. **On-demand**: Add when user tries to access (complex)

Recommendation: **Option 2** - Run migration in `initStore()` to ensure all workspaces have a Chorus agent.

### Conversation Storage

Conversations are stored at:
```
.chorus/sessions/{workspaceId}/{agentId}/
```

The Chorus agent uses the same structure - no changes needed. The UUID ensures unique directory names.

## Success Criteria

### Core Functionality
- [ ] Every workspace has a Chorus agent after adding
- [ ] Chorus agent appears first in agent list
- [ ] Sending messages works without `--system-prompt-file` flag
- [ ] Conversations persist across app restarts
- [ ] Workspace refresh preserves Chorus agent ID

### Visual
- [ ] Chorus agent has distinct appearance from custom agents
- [ ] Clear visual hierarchy (Chorus first, then custom agents)

### Edge Cases
- [ ] Works for workspaces with no `.claude/` directory
- [ ] Works for workspaces with `.claude/agents/` but no `.md` files
- [ ] Existing workspaces get Chorus agent after migration

## Scope Boundaries

### Definitely In Scope
- Chorus agent auto-created for every workspace
- Distinct visual appearance
- Conversation persistence
- Migration for existing workspaces

### Definitely Out of Scope
- Renaming the Chorus agent per-workspace
- Hiding/disabling the Chorus agent
- Custom system prompt for Chorus agent (use custom agents for that)
- Multiple general agents per workspace

### Future Considerations
- User preference to hide Chorus agent globally
- Custom default name (instead of "Chorus")
- Workspace-specific Chorus agent settings

## Open Questions

1. **Avatar design**: What icon/visual should represent the Chorus agent?
   - Resolved: Will use a distinct icon (to be designed during implementation)

2. **Migration timing**: Should migration happen on app start or lazily?
   - Resolved: On app start in `initStore()`

## Next Steps

1. Create implementation plan with phased approach
2. Implement data model changes
3. Update store functions
4. Add UI components
5. Test migration path
