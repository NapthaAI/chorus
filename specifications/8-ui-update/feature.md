# Sprint 8: UI Restructure - Chat as Tabs in Main Pane

## Overview

This sprint restructures the Chorus UI to move chat from the sidebar into the main pane as tabs, similar to how files are opened. The goal is a cleaner, more intuitive layout:

1. **Left Sidebar**: Navigation - workspaces, agents, and conversation lists
2. **Main Pane**: Content - workspace overview (permanent), file tabs, and chat tabs
3. **Right Panel**: Context - file browser OR conversation details (based on active tab)

## Implemented Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Application                                      │
├─────────────────┬──────────────────────────────────┬─────────────────────────┤
│   Left Panel    │           Main Pane              │      Right Panel        │
│   (300px)       │           (flex)                 │       (280px)           │
│                 │                                  │                         │
│  ┌───────────┐  │  ┌────────────────────────────┐  │  ┌───────────────────┐  │
│  │ Workspace │  │  │ TabBar: [Chat 1] [app.ts]  │  │  │ Files / Details   │  │
│  │   List    │  │  └────────────────────────────┘  │  │     (tabs)        │  │
│  │ ┌───────┐ │  │  ┌────────────────────────────┐  │  └───────────────────┘  │
│  │ │Agent 1│ │  │  │                            │  │  ┌───────────────────┐  │
│  │ └───────┘ │  │  │   ChatTab (messages +      │  │  │                   │  │
│  │ ┌───────┐ │  │  │   input) when chat tab     │  │  │   Details Panel   │  │
│  │ │Agent 2│ │  │  │   is active                │  │  │   (auto-shown     │  │
│  │ └───────┘ │  │  │                            │  │  │   for chat tabs)  │  │
│  └───────────┘  │  │   OR                       │  │  │                   │  │
│                 │  │                            │  │  │   - Files changed │  │
│  When agent     │  │   FileViewer when file     │  │  │   - Todo list     │  │
│  selected:      │  │   tab is active            │  │  │   - Tool calls    │  │
│  ┌───────────┐  │  │                            │  │  │   - Context       │  │
│  │ ← Back    │  │  │   OR                       │  │  │                   │  │
│  │ Agent Info│  │  │                            │  │  │   OR              │  │
│  │ ──────────│  │  │   WorkspaceOverview when   │  │  │                   │  │
│  │ [+New]    │  │  │   no tabs open             │  │  │   FileTree when   │  │
│  │ ──────────│  │  │                            │  │  │   file tab active │  │
│  │ Conv 1 🔵 │  │  └────────────────────────────┘  │  │                   │  │
│  │ Conv 2    │  │                                  │  └───────────────────┘  │
│  │ Conv 3    │  │                                  │                         │
│  └───────────┘  │                                  │                         │
└─────────────────┴──────────────────────────────────┴─────────────────────────┘
```

## User Stories

### US-1: Conversation Navigation in Sidebar
**As a** user working with Claude agents
**I want to** see a list of conversations when I select an agent
**So that** I can easily switch between different conversations

**Acceptance Criteria:**
- Clicking an agent shows conversation list in sidebar
- Each conversation shows title, timestamp, and unread badge
- Clicking a conversation opens it as a tab in the main pane
- "New conversation" button creates and opens a new chat tab

### US-2: Chat Opens as Main Pane Tab
**As a** user having conversations with agents
**I want to** have chat conversations open as tabs in the main pane
**So that** I can manage multiple chats like I manage files

**Acceptance Criteria:**
- Chat tabs appear alongside file tabs in the TabBar
- Chat tabs have a distinct chat icon (vs file icon)
- Chat tabs can be closed like file tabs
- Switching between chat tabs maintains conversation state
- Chat tab title shows conversation title

### US-3: Contextual Right Panel
**As a** user monitoring agent work
**I want to** see relevant details in the right panel based on what I'm viewing
**So that** I have appropriate context

**Acceptance Criteria:**
- When a chat tab is active, right panel auto-switches to Details tab
- Details tab shows: files changed, todo list, tool calls, context metrics
- When a file tab is active, right panel shows Files tab (file browser)
- User can still manually switch between Files/Details tabs

### US-4: Simplified Sidebar (No Chat UI)
**As a** user navigating workspaces and agents
**I want to** use the sidebar purely for navigation
**So that** the interface is cleaner and more focused

**Acceptance Criteria:**
- Sidebar does NOT contain chat messages or input
- Sidebar shows: workspaces list OR agent conversations list
- Back button returns from agent view to workspaces view
- Agent status (busy/error/ready) visible in conversation list

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Chat in main pane | As tabs | Consistent with file handling, more screen space |
| Sidebar purpose | Navigation only | Cleaner separation of concerns |
| Right panel auto-switch | To Details for chat | Contextual relevance |
| Tab type indicator | Icon color | Chat tabs have accent-colored icon |
| Conversation storage | Unchanged | JSONL format preserved |

## Technical Implementation

### Component Changes

| Component | Action | Description |
|-----------|--------|-------------|
| `Sidebar.tsx` | Modify | Switch between WorkspacesPanel and AgentConversationsPanel |
| `AgentChatPanel.tsx` | Remove | Chat UI moved to MainPane |
| `AgentConversationsPanel.tsx` | New | Shows conversation list for selected agent |
| `ChatTab.tsx` | New | Chat UI component for MainPane |
| `MainPane.tsx` | Modify | Render ChatTab for chat tabs |
| `TabBar.tsx` | Modify | Add chat icon support |
| `RightPanel.tsx` | Modify | Auto-switch to Details for chat tabs |
| `workspace-store.ts` | Modify | Add selectConversation action, conversationId tracking |

### Store Changes

| Store | Change | Description |
|-------|--------|-------------|
| `workspace-store.ts` | Add | `selectedConversationId`, `selectConversation()` |
| `workspace-store.ts` | Modify | Tab handling for chat tabs with conversationId |
| `ui-store.ts` | Unchanged | Right panel tab state |
| `chat-store.ts` | Unchanged | Conversation/message state |

### Type Changes

| Type | Change | Description |
|------|--------|-------------|
| `Tab` | Add | `conversationId?: string` field |

## Migration Notes

- Existing file tabs preserved
- Chat tabs need conversationId, agentId, workspaceId to open
- Session resumption works as before (via chat-store)

## Out of Scope

- Permanent "Workspace Overview" tab (nice to have, not implemented)
- Drag-and-drop tab reordering
- Split view for chat + file side by side
- Multiple chat panels

## Success Metrics

- Chat conversations open in main pane (more screen space)
- Sidebar is cleaner (navigation only)
- Right panel shows relevant context based on active tab
- Tab system unified for both files and chats
