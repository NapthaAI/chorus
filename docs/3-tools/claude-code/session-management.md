# Claude Code Session Management

Research findings on Claude Code CLI session handling for the Chorus app.

## Overview

Claude Code supports session continuity via the `--resume` flag, allowing conversations to continue across multiple interactions. This document covers best practices for session management in automated/programmatic contexts.

## Session Resumption

### CLI Flags

| Flag | Purpose |
|------|---------|
| `--resume <session-id>` | Resume a specific session by ID |
| `--continue` | Resume the most recent session in current directory |
| `--model <alias>` | Set model (default, opus, sonnet, haiku) |
| `--permission-mode <mode>` | Set permission mode (default, acceptEdits, plan, bypassPermissions) |
| `--allowedTools <tools>` | Comma-separated list of tools to auto-approve |

### Session ID Capture

The session ID is returned in the `system.init` message at the start of a Claude Code session:

```json
{
  "type": "system",
  "subtype": "init",
  "session_id": "abc-123-def-456",
  "model": "claude-sonnet-4-5-20250514",
  "tools": ["Read", "Write", "Bash", ...],
  "cwd": "/path/to/workspace"
}
```

It's also included in the `result` message at the end:

```json
{
  "type": "result",
  "session_id": "abc-123-def-456",
  "total_cost_usd": 0.0234,
  "duration_ms": 5432
}
```

### Session Storage

Claude Code stores session data in `~/.claude/projects/`. Sessions expire after approximately 30 days.

## Known Bugs & Workarounds

### Model Persistence Bug (GitHub #1523)

**Problem**: Model settings do NOT persist across sessions despite UI claiming "Applies to this session and future Claude Code sessions".

**Symptoms**: After restarting Claude Code or resuming a session, the model reverts to the default (usually Sonnet).

**Workaround**: Always pass `--model` flag on every CLI invocation, even when resuming.

```bash
# Wrong - model may revert
claude --resume abc-123 "Continue our work"

# Correct - explicitly set model
claude --resume abc-123 --model opus "Continue our work"
```

### Permission Mode Bug (GitHub #12070)

**Problem**: Permission mode doesn't persist within sessions. Selecting "Yes, and accept all for this session" is ignored - prompts continue to appear.

**Symptoms**: Despite approving permissions for a session, Claude Code continues asking for permission on subsequent operations.

**Workaround**: Always pass `--permission-mode` and `--allowedTools` flags explicitly.

```bash
# Wrong - permissions may not persist
claude --resume abc-123 "Edit the file"

# Correct - explicitly set permissions
claude --resume abc-123 --permission-mode acceptEdits --allowedTools Bash,Edit,Write "Edit the file"
```

## Best Practices for Automation

### 1. Always Pass Settings Explicitly

Don't rely on Claude Code's built-in settings persistence. Store desired settings in your application's database and pass them on every CLI invocation.

```typescript
// Example from Chorus
const args = ['-p', '--verbose', '--output-format', 'stream-json']

// Always pass when resuming due to persistence bugs
if (isResuming) {
  args.push('--model', settings.model)
  args.push('--permission-mode', settings.permissionMode)
  if (settings.allowedTools.length > 0) {
    args.push('--allowedTools', settings.allowedTools.join(','))
  }
}

if (sessionId) {
  args.push('--resume', sessionId)
}
```

### 2. Use `--resume <session-id>` Over `--continue`

For programmatic use, always use `--resume` with an explicit session ID rather than `--continue`. The `--continue` flag may have reliability issues in non-interactive mode.

### 3. Track Session Age

Claude sessions expire after ~30 days. Track the session creation time and start a fresh session if it's approaching expiration.

```typescript
const SESSION_MAX_AGE_DAYS = 25

if (sessionCreatedAt) {
  const ageMs = Date.now() - new Date(sessionCreatedAt).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  if (ageDays > SESSION_MAX_AGE_DAYS) {
    sessionId = null  // Start fresh
  }
}
```

### 4. Model Changes Are Expensive

Switching models mid-session causes the new model to reprocess the entire conversation history, which:
- Increases token consumption
- Adds latency
- May increase cost significantly for long conversations

Consider warning users or starting fresh sessions when they change models.

### 5. Only Update Session Metadata for NEW Sessions

When receiving a `system.init` message, only update `sessionCreatedAt` if it's a NEW session, not when resuming:

```typescript
// Check if resume worked by comparing session IDs
const isNewSession = !expectedSessionId || newSessionId !== expectedSessionId

// Only update sessionCreatedAt for new sessions
const updateData: { sessionId: string; sessionCreatedAt?: string } = { sessionId: newSessionId }
if (isNewSession) {
  updateData.sessionCreatedAt = new Date().toISOString()
}
updateConversation(conversationId, updateData)
```

This prevents overwriting the original creation timestamp, which would break session expiry tracking.

### 6. Verify Resumption Success

Compare the session ID returned by Claude with the one you passed to `--resume`. If they differ, the resume failed:

```typescript
if (expectedSessionId) {
  if (newSessionId === expectedSessionId) {
    console.log('Resume SUCCESS - session continued')
  } else {
    console.log(`Resume FAILED - expected ${expectedSessionId}, got ${newSessionId}`)
  }
}
```

### 7. Sync State Across Processes

In Electron apps, ensure session IDs captured in the main process are synced back to the renderer:

```typescript
// Main process
mainWindow.webContents.send('agent:session-update', {
  conversationId,
  sessionId,
  sessionCreatedAt: new Date().toISOString()
})

// Renderer
window.api.agent.onSessionUpdate((event) => {
  updateConversation(event.conversationId, {
    sessionId: event.sessionId,
    sessionCreatedAt: event.sessionCreatedAt
  })
})
```

## Settings Hierarchy

Claude Code settings can be configured at multiple levels (highest priority first):

1. **CLI flags** - Always take precedence
2. **Enterprise settings** - Organization-wide policies
3. **Local project settings** - `.claude/settings.local.json` (gitignored)
4. **Project settings** - `.claude/settings.json` (committed)
5. **User settings** - `~/.claude/settings.json`

For automation, always use CLI flags to ensure consistent behavior.

## Chorus Implementation

### Session State Management

Chorus stores session information in each conversation:

```typescript
interface Conversation {
  id: string
  sessionId: string | null        // Claude session ID
  sessionCreatedAt: string | null // ISO timestamp for expiry tracking
  // ...
}
```

### Flow

1. User sends message
2. Main process loads conversation from storage (including sessionId, sessionCreatedAt)
3. Check if session is expired (>25 days old) - if so, set sessionId to null
4. Build CLI args with all settings + `--resume` if valid session
5. Don't pass `--system-prompt-file` when resuming (session already has context)
6. Spawn Claude CLI process
7. Capture session ID from `system.init` message
8. Compare returned session ID with expected - log success/failure
9. Only update sessionCreatedAt for NEW sessions (not resumed ones)
10. Store session ID in conversation
11. Send `agent:session-update` event to renderer
12. Renderer updates local state

### Files

- `chorus/src/main/services/agent-service.ts` - CLI spawning, session capture
- `chorus/src/main/services/conversation-service.ts` - Conversation persistence
- `chorus/src/renderer/src/stores/chat-store.ts` - State management, session sync

## Sources

- [Claude Code Common Workflows](https://code.claude.com/docs/en/common-workflows)
- [Claude Code Best Practices (Anthropic)](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [GitHub Issue #1523: Model setting does not persist](https://github.com/anthropics/claude-code/issues/1523)
- [GitHub Issue #12070: Session permission mode not persisting](https://github.com/anthropics/claude-code/issues/12070)
