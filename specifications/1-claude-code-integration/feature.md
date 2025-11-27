---
date: 2025-11-27
author: Arshy/Claude
status: draft
type: feature
feature_id: 1
---

# Claude Code Integration Feature

## Overview

This feature enables real-time chat with Claude Code agents in Chorus. Each agent can have multiple conversations, all persisted in a `.chorus/` directory. The chat interface introduces a secondary collapsible sidebar within the main pane for managing conversations, with the main chat area for messages. Conversations can be resumed, and all messages are stored in JSONL format for history and debugging.

## Business Value

### For Power Users (like Richard)
- Direct chat with Claude Code agents without leaving Chorus
- Resume conversations exactly where you left off
- Multiple conversation threads per agent for different tasks
- Full conversation history accessible via sidebar
- JSONL logs for debugging and auditing agent interactions

### For New Users
- Familiar chat interface (Slack-like)
- Easy conversation management - start new or continue existing
- Clear visual feedback on agent status (ready/working)
- Intuitive two-pane chat layout

## Current State

Feature 0 established:
- Electron app with two-pane layout (sidebar + main pane)
- Workspace and agent management
- `ChatPlaceholder.tsx` shows "Chat Coming Soon" when agent selected
- `chorus-data.json` stores workspaces and settings at repo root
- POC at `/electron/chorus/` demonstrates Claude CLI integration with streaming JSON

**What's Missing:**
- Real chat functionality with Claude Code
- Conversation persistence and resume
- `.chorus/` directory structure
- Chat sidebar for conversation management
- JSONL message logging

## User Stories

### Conversation Management

1. **User**: **Given** I select an agent, **when** the chat view opens, **then** I see my most recent conversation with that agent (or empty chat if none exists) - *Acceptance: Most recent conversation loads automatically*

2. **User**: **Given** I have no conversations with an agent, **when** I send my first message, **then** a new conversation is created and saved - *Acceptance: Conversation appears in sidebar, persisted to disk*

3. **User**: **Given** I have existing conversations, **when** I click "New Conversation" button, **then** a new empty conversation starts and becomes active - *Acceptance: New conversation created, old ones preserved*

4. **User**: **Given** I have multiple conversations, **when** I click a past conversation in the sidebar, **then** it loads and I can continue from where I left off - *Acceptance: Full message history shown, session resumed*

5. **User**: **Given** I am chatting, **when** the agent finishes responding, **then** the conversation is auto-saved - *Acceptance: Messages persisted to JSONL file*

### Chat Interface

6. **User**: **Given** I am in the chat view, **when** I type a message and press Enter/Send, **then** my message appears and the agent starts responding - *Acceptance: User message shows immediately, agent status changes to "busy"*

7. **User**: **Given** the agent is responding, **when** text streams in, **then** I see it appear in real-time - *Acceptance: Streaming text visible, smooth updates*

8. **User**: **Given** the agent is working, **when** it uses a tool (Read, Write, Bash, etc.), **then** I see an indicator of the tool being used - *Acceptance: Tool use shown inline (e.g., "Reading file: src/main.ts")*

9. **User**: **Given** the agent is busy, **when** I click "Stop", **then** the agent stops and I can send a new message - *Acceptance: Process killed, status returns to ready*

10. **User**: **Given** I am in chat view, **when** I look at the header, **then** I see the agent name, status badge, and workspace path - *Acceptance: Clear agent identification*

### Chat Sidebar (Within Main Pane)

11. **User**: **Given** I have an agent selected, **when** I view the chat, **then** I see a collapsible sidebar on the left of the chat area - *Acceptance: Secondary sidebar visible, can be collapsed*

12. **User**: **Given** the chat sidebar is visible, **when** I look at Tab 1 (Conversations), **then** I see a list of past conversations sorted by most recent - *Acceptance: Conversations listed with title/date*

13. **User**: **Given** the chat sidebar is visible, **when** I look at Tab 2, **then** I see "Coming Soon" placeholder - *Acceptance: Tab exists but content is placeholder*

14. **User**: **Given** I click the collapse button on chat sidebar, **when** it collapses, **then** only the chat area is visible (more space for messages) - *Acceptance: Sidebar animates closed, state persisted*

### Data Storage (.chorus/ Directory)

15. **User**: **Given** I use Chorus, **when** data is stored, **then** all Chorus data lives in `.chorus/` directory (not repo root) - *Acceptance: `chorus-data.json` moved to `.chorus/config.json`*

16. **User**: **Given** I have conversations, **when** I check the file system, **then** each conversation has a `{session-id}-messages.jsonl` file - *Acceptance: JSONL files exist per conversation*

## Core Functionality

### Chat Layout Structure

When an agent is selected, the main pane shows:

```
┌────────────────────────────────────────────────────────────────┐
│ Main Pane (Agent Chat View)                                    │
├─────────────────┬──────────────────────────────────────────────┤
│ Chat Sidebar    │  Chat Area                                   │
│ (Collapsible)   │                                              │
│                 │  ┌──────────────────────────────────────┐    │
│ [Conv][Details] │  │ Agent: researcher        [Ready ●]  │    │
│ ────────────    │  │ workspace: product-agent            │    │
│                 │  ├──────────────────────────────────────┤    │
│ Conversations:  │  │                                      │    │
│ ┌─────────────┐ │  │  Messages appear here...             │    │
│ │ Today       │ │  │                                      │    │
│ │ ○ Refactor  │ │  │  User: Help me refactor the auth    │    │
│ │   auth...   │ │  │                                      │    │
│ │             │ │  │  Agent: I'll help you refactor...   │    │
│ │ Yesterday   │ │  │  [Reading src/auth.ts]              │    │
│ │ ○ Add tests │ │  │  ...                                │    │
│ └─────────────┘ │  │                                      │    │
│                 │  │                                      │    │
│ [+ New Conv]    │  ├──────────────────────────────────────┤    │
│                 │  │ [Message input...            ] [Send]│    │
│ [◀ Collapse]    │  └──────────────────────────────────────┘    │
└─────────────────┴──────────────────────────────────────────────┘
```

### Chat Sidebar Tabs

**Tab 1: Conversations**
- List of past conversations grouped by date (Today, Yesterday, This Week, Older)
- Each item shows: conversation title (first user message truncated), timestamp
- Click to load conversation
- Active conversation highlighted
- "New Conversation" button at bottom

**Tab 2: Details (Coming Soon)**
- Placeholder with "Coming Soon" message
- Future: conversation-specific tools, context, files mentioned, etc.

### Message Types Display

| Message Type | Display |
|--------------|---------|
| User message | Right-aligned bubble, accent color |
| Agent text | Left-aligned bubble, dark background |
| Tool use | Inline indicator: `[Using Read: src/main.ts]` |
| Tool result | Collapsible section (optional) |
| Error | Red-tinted bubble with error icon |
| Streaming | Animated typing indicator while text streams |

### Agent Communication Flow

1. User types message → Send to main process via IPC
2. Main process spawns `claude` CLI with `--output-format stream-json`
3. Main process parses streaming JSON, sends events to renderer
4. Renderer updates UI in real-time
5. On completion, conversation saved to JSONL

## Technical Requirements

### .chorus/ Directory Structure

```
~/.chorus/                           # Global Chorus data directory
├── config.json                      # Global settings (moved from chorus-data.json)
├── sessions/
│   └── {workspace-id}/
│       └── {agent-id}/
│           ├── conversations.json   # Index of conversations for this agent
│           └── {session-id}-messages.jsonl  # Full message log per conversation
```

**config.json** (moved from chorus-data.json):
```json
{
  "workspaces": [...],
  "settings": {
    "rootWorkspaceDir": "/path/to/workspaces",
    "theme": "dark",
    "chatSidebarCollapsed": false,
    "chatSidebarWidth": 240
  }
}
```

**conversations.json** (per agent):
```json
{
  "conversations": [
    {
      "id": "conv-uuid-1",
      "sessionId": "claude-session-abc123",
      "title": "Refactor authentication module",
      "createdAt": "2025-11-27T10:00:00Z",
      "updatedAt": "2025-11-27T11:30:00Z",
      "messageCount": 12
    }
  ]
}
```

**{session-id}-messages.jsonl**:
```jsonl
{"type":"user","content":"Help me refactor the auth module","timestamp":"2025-11-27T10:00:00Z","uuid":"msg-1"}
{"type":"assistant","content":[{"type":"text","text":"I'll help you..."}],"timestamp":"2025-11-27T10:00:05Z","uuid":"msg-2","sessionId":"claude-session-abc123"}
{"type":"tool_use","name":"Read","input":{"file_path":"src/auth.ts"},"timestamp":"2025-11-27T10:00:06Z","uuid":"msg-3"}
{"type":"assistant","content":[{"type":"text","text":"I can see the auth module..."}],"timestamp":"2025-11-27T10:00:10Z","uuid":"msg-4"}
```

### Data Models

```typescript
// Conversation metadata
interface Conversation {
  id: string                    // UUID for this conversation
  sessionId: string | null      // Claude session ID for resume (null if new)
  agentId: string               // Which agent this belongs to
  workspaceId: string           // Which workspace
  title: string                 // First user message, truncated
  createdAt: string             // ISO timestamp
  updatedAt: string             // ISO timestamp
  messageCount: number          // For display
}

// Message in conversation (stored in JSONL)
interface ConversationMessage {
  uuid: string                  // Unique message ID
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'error' | 'system'
  content: string | ContentBlock[]
  timestamp: string             // ISO timestamp
  sessionId?: string            // Claude session ID (from assistant messages)
  toolName?: string             // For tool_use type
  toolInput?: Record<string, any>  // For tool_use type
}

interface ContentBlock {
  type: 'text' | 'tool_use'
  text?: string
  name?: string                 // Tool name
  input?: Record<string, any>   // Tool input
}

// Chat UI state
interface ChatState {
  activeConversationId: string | null
  conversations: Conversation[]
  messages: ConversationMessage[]  // Current conversation's messages
  isLoading: boolean
  isStreaming: boolean
  streamingContent: string      // Accumulating text during stream
}
```

### IPC Channels

```typescript
// Conversation Management
'conversation:list' → agentId → Conversation[]
'conversation:create' → { agentId, workspaceId } → Conversation
'conversation:load' → conversationId → { conversation: Conversation, messages: ConversationMessage[] }
'conversation:delete' → conversationId → void

// Agent Communication
'agent:send' → { conversationId, message: string, repoPath: string } → void (starts streaming)
'agent:stop' → agentId → void
'agent:message' ← { conversationId, message: ConversationMessage }  // Event from main
'agent:status' ← { agentId, status: 'ready' | 'busy' | 'error' }   // Event from main
'agent:stream-delta' ← { conversationId, delta: string }           // Streaming text chunks

// Session Management
'session:get' → agentId → string | null  // Get current session ID
'session:clear' → agentId → void         // Clear session (start fresh)

// Settings (updated for .chorus/)
'settings:get-chorus-dir' → string       // Returns ~/.chorus path
'settings:migrate' → void                // Migrate from chorus-data.json to .chorus/
```

### Main Process Services

**conversation-service.ts**:
```typescript
interface ConversationService {
  // Get .chorus directory path
  getChorusDir(): string

  // List conversations for an agent
  listConversations(workspaceId: string, agentId: string): Promise<Conversation[]>

  // Create new conversation
  createConversation(workspaceId: string, agentId: string): Promise<Conversation>

  // Load conversation with messages
  loadConversation(conversationId: string): Promise<{ conversation: Conversation, messages: ConversationMessage[] }>

  // Append message to JSONL
  appendMessage(conversationId: string, message: ConversationMessage): Promise<void>

  // Update conversation metadata (title, updatedAt, messageCount)
  updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void>

  // Delete conversation and its JSONL file
  deleteConversation(conversationId: string): Promise<void>
}
```

**agent-service.ts** (enhanced from POC):
```typescript
interface AgentService {
  // Send message to agent, returns immediately, streams via events
  sendMessage(
    conversationId: string,
    agentId: string,
    repoPath: string,
    message: string,
    sessionId: string | null  // For resume
  ): Promise<void>

  // Stop current agent operation
  stopAgent(agentId: string): void

  // Get stored session ID for agent
  getSessionId(agentId: string): string | null

  // Clear session (for starting fresh)
  clearSession(agentId: string): void
}
```

### Zustand Stores

**chat-store.ts**:
```typescript
interface ChatStore {
  // State
  activeConversationId: string | null
  conversations: Conversation[]
  messages: ConversationMessage[]
  isLoading: boolean
  isStreaming: boolean
  streamingContent: string
  chatSidebarCollapsed: boolean
  chatSidebarTab: 'conversations' | 'details'

  // Actions
  loadConversations: (agentId: string) => Promise<void>
  selectConversation: (conversationId: string) => Promise<void>
  createConversation: (agentId: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  appendMessage: (message: ConversationMessage) => void
  appendStreamDelta: (delta: string) => void
  finalizeStream: () => void
  stopAgent: () => void
  setChatSidebarCollapsed: (collapsed: boolean) => void
  setChatSidebarTab: (tab: 'conversations' | 'details') => void
}
```

### React Components

**New Components:**
```
src/renderer/src/components/
├── Chat/
│   ├── ChatView.tsx           # Main chat view (replaces ChatPlaceholder when chatting)
│   ├── ChatSidebar.tsx        # Collapsible sidebar with tabs
│   ├── ConversationList.tsx   # Tab 1: list of conversations
│   ├── ConversationItem.tsx   # Single conversation in list
│   ├── ChatArea.tsx           # Message display + input area
│   ├── MessageList.tsx        # Scrollable message container
│   ├── MessageBubble.tsx      # Individual message display
│   ├── ToolUseIndicator.tsx   # Shows tool being used
│   ├── MessageInput.tsx       # Input field + send button
│   └── ChatHeader.tsx         # Agent info + status
```

### Claude CLI Integration

Use the POC pattern from `/electron/chorus/src/main/agent-service.ts`:

```typescript
// Spawn claude CLI
const args = ['-p', '--verbose', '--output-format', 'stream-json']

// Resume if we have a session
if (sessionId) {
  args.push('--resume', sessionId)
}

args.push(message)

const claudeProcess = spawn('claude', args, {
  cwd: repoPath,
  env: { ...process.env, TERM: 'xterm-256color' }
})

// Parse streaming JSON from stdout
claudeProcess.stdout.on('data', (data) => {
  // Parse JSONL lines
  // Extract session_id from 'system' init event
  // Stream 'assistant' content to renderer
  // Handle 'tool_use' events
  // Save to JSONL file
})
```

**Session ID Capture:**
```typescript
// From stream-json output:
// { "type": "system", "subtype": "init", "session_id": "abc123..." }
if (event.type === 'system' && event.subtype === 'init') {
  sessionId = event.session_id
  // Save to conversation record
}
```

## Design Considerations

### Chat Sidebar Layout

- **Width:** 240px default, min 180px, max 320px
- **Collapse:** Animates to 0px, toggle button remains visible
- **State:** Collapsed state persisted in settings

### Message Styling

```css
/* User message */
.message-user {
  background: var(--accent);
  color: white;
  border-radius: 16px 16px 4px 16px;
  max-width: 80%;
  align-self: flex-end;
}

/* Agent message */
.message-agent {
  background: var(--input-bg);
  color: var(--text-primary);
  border-radius: 16px 16px 16px 4px;
  max-width: 80%;
  align-self: flex-start;
}

/* Tool use indicator */
.tool-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--hover);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}
```

### Streaming UX

- Show typing indicator while waiting for first token
- Text appears character-by-character (or chunk-by-chunk)
- Auto-scroll to bottom as text streams
- "Stop" button visible during streaming
- Final message replaces streaming content

### Conversation List UX

- Group by date: Today, Yesterday, This Week, Older
- Show conversation title (first user message, max 50 chars)
- Show relative time (e.g., "2h ago", "Yesterday")
- Hover shows full title in tooltip
- Right-click context menu: Delete conversation

## Implementation Considerations

### Migration Path

1. On first launch after update:
   - Check if `chorus-data.json` exists at repo root
   - Create `~/.chorus/` directory
   - Move data to `~/.chorus/config.json`
   - Remove old file (or rename to `.bak`)

2. Migration should be seamless - user shouldn't notice

### Error Handling

- **Claude not installed:** Show helpful error with install instructions
- **Session expired:** Automatically start new conversation, preserve messages
- **Network errors:** Show retry button, preserve user input
- **Process crash:** Save partial response, show error state

### Performance

- **Lazy load messages:** Only load when conversation selected
- **Virtual scroll:** For conversations with 100+ messages
- **Debounce saves:** Don't write JSONL on every character
- **Stream batching:** Batch stream events to reduce re-renders

## Success Criteria

### Core Functionality
- [ ] Chat with agent works - messages sent and responses received
- [ ] Streaming responses display in real-time
- [ ] Tool use indicators show during agent work
- [ ] Conversations persist across app restarts
- [ ] Session resume works - can continue previous conversation
- [ ] New conversation button creates fresh chat
- [ ] `.chorus/` directory structure is correct
- [ ] JSONL files contain all messages
- [ ] Migration from `chorus-data.json` works

### User Experience
- [ ] Chat sidebar collapses/expands smoothly
- [ ] Conversation list shows correct grouping by date
- [ ] Loading conversation shows messages instantly
- [ ] Stop button halts agent operation
- [ ] Error states are clear and recoverable
- [ ] Auto-scroll during streaming feels natural

### Technical Quality
- [ ] All IPC channels properly typed
- [ ] JSONL format matches specification
- [ ] No memory leaks from streaming
- [ ] Proper cleanup on conversation switch

## Scope Boundaries

### Definitely In Scope
- Chat with Claude Code agents via CLI
- Conversation persistence in `.chorus/`
- JSONL message logging
- Chat sidebar with conversation list
- Session resume functionality
- New conversation creation
- Streaming message display
- Tool use indicators
- Stop agent functionality
- Migration from `chorus-data.json`

### Definitely Out of Scope
- Agent-to-agent communication (Phase 3)
- MCP server integration (Phase 3)
- File editing from chat
- Code diff viewer in chat
- Voice input/output
- Multiple models (only Claude Code for now)
- Conversation search
- Conversation export (beyond JSONL)
- Conversation sharing

### Future Considerations (Tab 2 "Details")
- Files mentioned in conversation
- Tools used summary
- Token/cost tracking per conversation
- Conversation metadata editing (rename, tags)
- Pin important conversations

## Open Questions & Risks

### Questions Needing Resolution
1. **Claude CLI path:** Should we auto-detect or require configuration? → *Use PATH, show error if not found with install link*
2. **Session expiry:** How long do Claude sessions last? → *They persist, but we should handle "session not found" gracefully*
3. **Max conversations:** Should we limit per agent? → *No limit for now, can add cleanup later*

### Identified Risks
1. **Claude CLI not installed:** Need clear onboarding/error message
2. **Large JSONL files:** Long conversations could grow large - consider rotation
3. **Race conditions:** Multiple messages sent quickly could interleave
4. **Session conflicts:** Same session resumed from multiple places

## Next Steps

After this feature is approved:
1. Create `.chorus/` directory structure and migration logic
2. Implement conversation-service for persistence
3. Enhance agent-service with JSONL logging
4. Build ChatView component with sidebar
5. Build ChatSidebar with conversation list
6. Build ChatArea with message display and input
7. Wire up IPC channels
8. Test end-to-end chat flow
9. Test session resume
10. Polish UX and error handling

---

## Visual Reference: Full Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  Chorus                                       │
├────────────────────┬─────────────────────────────────────────────────────────┤
│ Main Sidebar       │  Main Pane                                              │
│                    │                                                         │
│ [Workspaces][Files]│  ┌─────────────┬───────────────────────────────────┐   │
│ ─────────────────  │  │ Chat        │  Chat Area                        │   │
│                    │  │ Sidebar     │                                   │   │
│ ▼ product-agent    │  │             │  ┌───────────────────────────┐   │   │
│   [main][*][📄]    │  │ [C][D]      │  │ researcher        [Ready] │   │   │
│   ├ researcher ◄───┼──┤             │  │ product-agent              │   │   │
│   ├ writer         │  │ Conversations│  ├───────────────────────────┤   │   │
│   └ analyst        │  │             │  │                           │   │   │
│ ▼ legal-agent      │  │ Today       │  │ You: Help me refactor...  │   │   │
│                    │  │ ○ Refactor  │  │                           │   │   │
│                    │  │   auth...   │  │ Agent: I'll analyze the   │   │   │
│                    │  │             │  │ auth module...            │   │   │
│                    │  │ Yesterday   │  │ [Reading src/auth.ts]     │   │   │
│                    │  │ ○ Add tests │  │                           │   │   │
│                    │  │             │  │ Agent: Based on my        │   │   │
│                    │  │             │  │ analysis...               │   │   │
│                    │  │             │  │                           │   │   │
│                    │  │ [+ New]     │  ├───────────────────────────┤   │   │
│                    │  │             │  │ [Type a message...] [Send]│   │   │
│                    │  │ [◀]        │  └───────────────────────────┘   │   │
│                    │  └─────────────┴───────────────────────────────────┘   │
│                    │                                                         │
│ + Add Workspace    │  Legend:                                                │
│                    │  [C] = Conversations tab  [D] = Details tab (coming)   │
│                    │  [◀] = Collapse sidebar                                 │
└────────────────────┴─────────────────────────────────────────────────────────┘
```

---

## Appendix: POC Reference

The POC at `/electron/chorus/` contains working patterns:

- **agent-service.ts**: Claude CLI spawning, stream-json parsing, session management
- **ChatPanel.tsx**: Message display, tabs structure, streaming indicator
- **MessageInput.tsx**: Input handling, send on Enter

Key patterns to reuse:
1. `spawn('claude', ['-p', '--verbose', '--output-format', 'stream-json', ...])` for non-interactive mode
2. Parse JSONL from stdout line-by-line
3. Capture `session_id` from `{ type: 'system', subtype: 'init' }` event
4. Use `--resume {sessionId}` flag for session continuity
5. Send `agent-message` and `agent-status` events to renderer via IPC
