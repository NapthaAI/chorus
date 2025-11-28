---
date: 2025-11-28
author: Claude
status: draft
type: implementation_plan
feature: General Agent (Chorus) per Workspace
---

# General Agent (Chorus) Implementation Plan

## Overview

Implement an auto-created "Chorus" agent for every workspace that exists without requiring a `.claude/agents/*.md` file. This enables users to immediately interact with Claude in any workspace, providing zero-friction onboarding and a default conversational experience.

## Current State Analysis

### Key Discoveries:

- **Agent Discovery** (`workspace-service.ts:28-59`): Only discovers file-based agents from `.claude/agents/*.md` - no changes needed here
- **Agent Interface** (`store/index.ts:7-12`): Currently has `id`, `name`, `filePath`, `workspaceId` - needs `isGeneral` flag
- **addWorkspace()** (`store/index.ts:110-137`): Receives discovered agents and assigns `workspaceId` - needs to prepend Chorus agent
- **updateWorkspace()** (`store/index.ts:144-174`): Replaces entire agents array - needs to preserve existing Chorus agent
- **CLI handling** (`agent-service.ts:119-120`): Already handles empty `agentFilePath` correctly - `existsSync('')` returns false, so no `--system-prompt-file` flag is added
- **UI Components**: `AgentItem.tsx` uses hash-based colors and initials - needs special handling for Chorus agent
- **Agent ordering**: Currently no sorting - needs to place Chorus first, then alphabetical

### What Already Works:
- The `sendMessage()` function already skips `--system-prompt-file` when path is empty/falsy
- Conversation storage works with any agent ID format (UUID or hash)
- Session resumption is independent of agent type

## What We're NOT Doing

- Renaming the Chorus agent per-workspace
- Hiding/disabling the Chorus agent
- Custom system prompt for Chorus agent
- Multiple general agents per workspace
- Changes to `discoverAgents()` function
- Changes to conversation storage paths

## Implementation Approach

1. **Data Model First**: Add `isGeneral` flag to Agent interface in both store and preload type definitions
2. **Store Logic**: Modify `addWorkspace()` to create Chorus agent, `updateWorkspace()` to preserve it, and add migration in `initStore()`
3. **UI Updates**: Update `AgentItem.tsx` with sparkle icon for Chorus, add sorting logic to display Chorus first

---

## Phase 1: Data Model & Store Changes

### Overview
Add the `isGeneral` flag to the Agent interface and modify store functions to create/preserve the Chorus agent. Add migration logic for existing workspaces.

### Changes Required:

#### 1. Agent Interface Updates

**File**: `chorus/src/main/store/index.ts`
**Changes**: Add optional `isGeneral` boolean to Agent interface

**Implementation Requirements:**
- Add `isGeneral?: boolean` field to the existing Agent interface at lines 7-12
- Field is optional to maintain backwards compatibility with existing stored data
- When `true`, indicates this is the auto-created Chorus agent

**File**: `chorus/src/preload/index.d.ts`
**Changes**: Mirror the `isGeneral` field in the renderer-side type definition

**Implementation Requirements:**
- Add `isGeneral?: boolean` to the Agent interface at lines 17-22
- Must match the main process definition exactly

#### 2. Helper Function for Chorus Agent Creation

**File**: `chorus/src/main/store/index.ts`
**Changes**: Add a helper function to create a Chorus agent object

**Implementation Requirements:**
- Create function `createChorusAgent(workspaceId: string): Agent`
- Generate UUID using existing `uuidv4()` import
- Return object with: `{ id: uuidv4(), name: 'Chorus', filePath: '', workspaceId, isGeneral: true }`
- This centralizes Chorus agent creation logic for reuse

#### 3. Modify addWorkspace()

**File**: `chorus/src/main/store/index.ts`
**Changes**: Prepend Chorus agent when creating a new workspace

**Implementation Requirements:**
- After generating workspace ID (line 121), create Chorus agent using the helper function
- Modify the agents array construction (line 131) to prepend Chorus agent
- Result: `agents: [chorusAgent, ...info.agents.map((a) => ({ ...a, workspaceId: id }))]`
- Chorus agent is always first in the array

#### 4. Modify updateWorkspace()

**File**: `chorus/src/main/store/index.ts`
**Changes**: Preserve existing Chorus agent during workspace refresh

**Implementation Requirements:**
- When `updates.agents` is provided (line 168), find the existing Chorus agent from `workspace.agents`
- Look for agent where `isGeneral === true`
- If found, prepend it to the new agents array: `[existingChorus, ...updates.agents.map(...)]`
- If not found (shouldn't happen, but defensive), create new Chorus agent
- This ensures Chorus agent ID stays stable across refreshes

#### 5. Migration Logic in initStore()

**File**: `chorus/src/main/store/index.ts`
**Changes**: Add migration to create Chorus agents for existing workspaces

**Implementation Requirements:**
- In `initStore()` function (around line 49-70), after initializing the store
- Get all workspaces and check each for a Chorus agent (where `isGeneral === true`)
- For workspaces missing a Chorus agent, create one and prepend to agents array
- Persist the updated workspaces array back to store
- Log migration activity for debugging (optional)
- This runs on every app start but only modifies workspaces that lack Chorus agent

### Success Criteria:

**Automated verification**
- [ ] TypeScript compiles without errors (`bun run typecheck`)
- [ ] App starts without errors (`bun run dev`)

**Manual Verification**
- [ ] Add a new workspace - Chorus agent appears first in the list
- [ ] Refresh an existing workspace - Chorus agent ID remains the same
- [ ] Existing workspaces (without Chorus) get a Chorus agent after app restart
- [ ] Check `.chorus/config.json` - workspaces have Chorus agent with `isGeneral: true`

---

## Phase 2: UI Updates

### Overview
Update the sidebar and workspace overview to display the Chorus agent with a distinctive sparkle icon and ensure proper ordering (Chorus first, then custom agents alphabetically).

### Changes Required:

#### 1. Chorus Agent Avatar in AgentItem

**File**: `chorus/src/renderer/src/components/Sidebar/AgentItem.tsx`
**Changes**: Show sparkle icon instead of initials for Chorus agent

**Implementation Requirements:**
- Check `agent.isGeneral` flag before rendering avatar content
- If `isGeneral === true`:
  - Use a sparkle/star SVG icon (inline SVG, no icon library per project conventions)
  - Use app accent color for background (e.g., `bg-accent` or a distinctive blue/purple)
  - Icon should be white, centered in the avatar square
- If `isGeneral === false` or undefined:
  - Keep existing initials-based avatar with hash-based color
- Sparkle icon suggestion: 4-pointed star or AI sparkle (similar to other AI assistant indicators)

#### 2. Chorus Agent Avatar in WorkspaceOverview

**File**: `chorus/src/renderer/src/components/MainPane/WorkspaceOverview.tsx`
**Changes**: Mirror the sparkle icon treatment for Chorus agent in the overview grid

**Implementation Requirements:**
- Same logic as AgentItem - check `isGeneral` flag
- Use sparkle icon with accent background for Chorus agent
- Larger size (40px vs 28px) to match existing overview avatars
- Keep initials avatar for custom agents

#### 3. Agent Sorting in WorkspaceItem

**File**: `chorus/src/renderer/src/components/Sidebar/WorkspaceItem.tsx`
**Changes**: Sort agents with Chorus first, then alphabetically

**Implementation Requirements:**
- Before mapping `workspace.agents` (around line 156), sort the array
- Sorting logic:
  1. Agents with `isGeneral === true` come first
  2. Remaining agents sorted alphabetically by name (case-insensitive)
- Use `[...workspace.agents].sort()` to avoid mutating original array
- Sort comparator: `(a, b) => { if (a.isGeneral) return -1; if (b.isGeneral) return 1; return a.name.localeCompare(b.name); }`

#### 4. Agent Sorting in WorkspaceOverview

**File**: `chorus/src/renderer/src/components/MainPane/WorkspaceOverview.tsx`
**Changes**: Apply same sorting logic to the agent grid

**Implementation Requirements:**
- Before mapping agents in the grid (around line 138), apply same sort
- Chorus agent appears first, custom agents alphabetically after
- Consider extracting sort function to a shared utility if code duplication is a concern

### Success Criteria:

**Automated verification**
- [ ] TypeScript compiles without errors
- [ ] No console errors in dev tools

**Manual Verification**
- [ ] Chorus agent shows sparkle icon (not initials) in sidebar
- [ ] Chorus agent shows sparkle icon in workspace overview grid
- [ ] Chorus agent appears first in agent list
- [ ] Custom agents appear alphabetically after Chorus
- [ ] Status indicators (busy/error) still work on Chorus agent
- [ ] Unread badges still work on Chorus agent

---

## Phase 3: Integration Testing

### Overview
Verify the complete flow works end-to-end: creating workspaces, having conversations with Chorus agent, refreshing workspaces, and migration of existing data.

### Changes Required:

#### 1. Verify Conversation Flow

**No code changes** - manual testing only

**Testing Requirements:**
- Start a conversation with Chorus agent
- Verify no `--system-prompt-file` flag is passed (check process args or logs)
- Verify Claude responds using only workspace's `CLAUDE.md` context
- Verify conversation persists after app restart
- Verify session resumption works (send follow-up message after restart)

#### 2. Verify Workspace Refresh

**No code changes** - manual testing only

**Testing Requirements:**
- Note the Chorus agent ID from `.chorus/config.json`
- Trigger workspace refresh (via UI or IPC)
- Verify Chorus agent ID is unchanged
- Verify conversations are still linked to the same agent
- Verify custom agents are re-discovered correctly

#### 3. Verify Migration

**No code changes** - manual testing only

**Testing Requirements:**
- Manually edit `.chorus/config.json` to remove Chorus agent from a workspace
- Restart the app
- Verify Chorus agent is recreated for that workspace
- Verify new UUID is generated (old conversations orphaned - acceptable)

#### 4. Edge Case Testing

**No code changes** - manual testing only

**Testing Requirements:**
- Workspace with no `.claude/` directory - Chorus agent should appear
- Workspace with empty `.claude/agents/` directory - Chorus agent should appear
- Workspace with only custom agents - Chorus agent should appear first
- Remove and re-add workspace - new Chorus agent ID (acceptable behavior)

### Success Criteria:

**Manual Verification**
- [ ] Conversation with Chorus agent works without system prompt file
- [ ] Conversation persists across app restarts
- [ ] Session resumption works for Chorus agent
- [ ] Workspace refresh preserves Chorus agent ID
- [ ] Migration adds Chorus agent to existing workspaces
- [ ] Works for workspaces without `.claude/` directory

---

## Electron-Specific Considerations

### Main Process Changes
- `chorus/src/main/store/index.ts`: Agent interface, addWorkspace, updateWorkspace, initStore migration
- No new IPC handlers needed - existing workspace APIs work unchanged

### Renderer Process Changes
- `AgentItem.tsx`: Sparkle icon for Chorus agent
- `WorkspaceOverview.tsx`: Sparkle icon for Chorus agent
- `WorkspaceItem.tsx`: Agent sorting logic

### Preload Script Changes
- `chorus/src/preload/index.d.ts`: Add `isGeneral` to Agent interface
- No new APIs to expose

### Agent Service
- No changes needed - empty `filePath` handling already works correctly

---

## Performance Considerations

- **Migration**: Runs on every app start, but only iterates workspaces array (typically small)
- **Sorting**: Happens on render, but agent lists are typically small (<20 agents)
- **No new IPC calls**: Chorus agent is handled entirely in existing data flow

---

## Testing Strategy

### Unit Tests
- Test `createChorusAgent()` helper returns correct structure
- Test sorting function places Chorus first, then alphabetical

### Integration Tests
- Test `addWorkspace()` includes Chorus agent
- Test `updateWorkspace()` preserves Chorus agent ID
- Test migration adds Chorus to workspaces without one

### Manual Testing
- Full conversation flow with Chorus agent
- Workspace refresh preserves Chorus ID
- App restart triggers migration for legacy workspaces
- Visual verification of sparkle icon and sorting

---

## References

* Feature spec: `specifications/3-general-agent-per-workspace/feature.md`
* Agent discovery: `chorus/src/main/services/workspace-service.ts:28-59`
* Store implementation: `chorus/src/main/store/index.ts:110-174`
* Agent service: `chorus/src/main/services/agent-service.ts:119-120`
* AgentItem component: `chorus/src/renderer/src/components/Sidebar/AgentItem.tsx`
* WorkspaceOverview: `chorus/src/renderer/src/components/MainPane/WorkspaceOverview.tsx`
* Session management docs: `docs/3-tools/claude-code/session-management.md`
