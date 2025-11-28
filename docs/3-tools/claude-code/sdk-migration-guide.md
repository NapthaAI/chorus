# Claude Agent SDK Migration Guide

A comprehensive guide for migrating Chorus from CLI-based Claude Code spawning to direct SDK integration.

## Overview

Chorus currently spawns Claude Code via CLI with `--output-format stream-json`. This document outlines the migration path to using the Claude Agent SDK directly, which provides better control, type safety, and programmatic features.

## Current vs SDK Approach

| Feature | CLI Spawning | SDK Direct |
|---------|-------------|------------|
| Process model | Subprocess (`spawn`) | In-process |
| Message parsing | Manual JSONL parsing | Typed objects |
| Permission control | `--allowedTools` flag only | `canUseTool` callback |
| Interruption | Kill process | `query.interrupt()` |
| Hooks | Shell commands (external) | In-process callbacks |
| Custom tools | MCP subprocess | `tool()` + `createSdkMcpServer()` |
| Type safety | Parse JSON manually | Full TypeScript types |
| Error handling | Parse stderr | Built-in exceptions |

## Installation

```bash
bun add @anthropic-ai/claude-agent-sdk
```

**Requirements:**
- Node.js 18 or later
- The SDK bundles Claude Code CLI internally

## Core APIs

### query() - Primary Entry Point

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

function query({
  prompt: string | AsyncIterable<SDKUserMessage>,
  options?: Options
}): Query

// Query extends AsyncGenerator with additional methods
interface Query extends AsyncGenerator<SDKMessage, void> {
  interrupt(): Promise<void>;
  setPermissionMode(mode: PermissionMode): Promise<void>;
}
```

### Basic Usage

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const message of query({ prompt: "Your task here" })) {
  switch (message.type) {
    case 'system':
      if (message.subtype === 'init') {
        console.log('Session ID:', message.session_id);
      }
      break;
    case 'assistant':
      console.log('Response:', message.message.content);
      break;
    case 'tool_use':
      console.log('Tool:', message.tool_name, message.input);
      break;
    case 'tool_result':
      console.log('Result:', message.result);
      break;
    case 'result':
      console.log('Cost: $', message.total_cost_usd);
      break;
  }
}
```

### Full Options

```typescript
const stream = query({
  prompt: "Your task",
  options: {
    // Working directory (equivalent to running claude in that dir)
    cwd: '/path/to/workspace',

    // Model selection
    model: 'sonnet',  // 'sonnet' | 'opus' | 'haiku'

    // Permission mode
    permissionMode: 'acceptEdits',  // 'default' | 'acceptEdits' | 'bypassPermissions'

    // Session management
    resume: sessionId,      // Resume specific session
    continue: true,         // Resume most recent
    forkSession: true,      // Branch from existing session

    // Tool control
    allowedTools: ['Read', 'Write', 'Bash'],
    disallowedTools: ['mcp__*'],

    // Execution limits
    maxTurns: 10,

    // Load project settings (.claude/settings.json, CLAUDE.md)
    settingSources: ['project'],

    // System prompt
    systemPrompt: {
      type: 'preset',
      preset: 'claude_code'
    },

    // Programmatic permission approval (SDK-only feature)
    canUseTool: async (toolName, toolInput) => {
      const approved = await showApprovalDialog(toolName, toolInput);
      return {
        behavior: approved ? 'allow' : 'deny',
        updatedInput: toolInput,
        message: approved ? undefined : 'User rejected'
      };
    },

    // In-process hooks
    hooks: {
      PreToolUse: [{
        matcher: 'Write',  // Optional: filter by tool name
        hook: async (input, toolUseId, context) => {
          // Log or modify before execution
          return { continue: true };
        }
      }],
      PostToolUse: [{
        hook: async (input, toolUseId, context) => {
          // React to tool completion
          return { continue: true };
        }
      }],
      SubagentStop: [{
        hook: async (result, agentName, context) => {
          // Notify when subagent finishes
          return { continue: true };
        }
      }]
    },

    // Subagent definitions
    agents: {
      'reviewer': {
        description: 'Code review specialist',
        prompt: 'You are a senior code reviewer...',
        tools: ['Read', 'Grep', 'Glob'],
        model: 'haiku'
      },
      'researcher': {
        description: 'Research and analysis',
        prompt: 'You are a researcher...',
        tools: ['Read', 'WebSearch', 'WebFetch'],
        model: 'sonnet'
      }
    },

    // MCP servers (in-process)
    mcpServers: {
      'custom': createSdkMcpServer({ ... })
    }
  }
});
```

## Session Management

### Creating Sessions

Sessions are created automatically. Capture the ID from the init message:

```typescript
let sessionId: string | undefined;

for await (const message of query({ prompt: "Start task" })) {
  if (message.type === 'system' && message.subtype === 'init') {
    sessionId = message.session_id;
  }
}

// Store sessionId for later resumption
```

### Resuming Sessions

```typescript
const stream = query({
  prompt: "Continue where we left off",
  options: {
    resume: sessionId
  }
});
```

### Forking Sessions (Parallel Exploration)

Create a branch from an existing session state:

```typescript
const forked = query({
  prompt: "Try an alternative approach",
  options: {
    resume: sessionId,
    forkSession: true  // Creates new session ID from resumed state
  }
});
```

### Session Expiration

Sessions expire after approximately 25-30 days. Track creation time:

```typescript
const SESSION_MAX_AGE_DAYS = 25;

if (sessionCreatedAt) {
  const ageDays = (Date.now() - new Date(sessionCreatedAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays > SESSION_MAX_AGE_DAYS) {
    sessionId = undefined;  // Start fresh
  }
}
```

## Permission Handling

### canUseTool Callback (SDK-Only)

This is the key feature unavailable when spawning CLI. It fires whenever Claude would show a permission prompt:

```typescript
const options = {
  canUseTool: async (toolName: string, toolInput: ToolInput) => {
    // Show approval dialog in Electron UI
    const result = await showPermissionDialog({
      tool: toolName,
      input: toolInput
    });

    if (result.approved) {
      return {
        behavior: 'allow',
        updatedInput: result.modifiedInput || toolInput
      };
    } else {
      return {
        behavior: 'deny',
        message: result.reason || 'User rejected',
        interrupt: result.stopCompletely  // Stop entire execution
      };
    }
  }
};
```

### Permission Processing Order

1. PreToolUse Hook (can block)
2. Deny Rules
3. Allow Rules
4. Ask Rules
5. Permission Mode
6. canUseTool Callback
7. PostToolUse Hook

Hooks take precedence and can override even `bypassPermissions` mode.

## Hooks System

### Available Hook Events

| Event | When | SDK Support |
|-------|------|-------------|
| `PreToolUse` | Before tool execution | ✅ |
| `PostToolUse` | After tool completion | ✅ |
| `SubagentStop` | When subagent completes | ✅ |
| `UserPromptSubmit` | User submits prompt | ✅ |
| `Stop` | Agent finishes responding | ✅ |
| `PreCompact` | Before context compaction | ✅ |
| `SessionStart` | Session begins | ❌ CLI only |
| `SessionEnd` | Session ends | ❌ CLI only |

### Hook Implementation

```typescript
const options = {
  hooks: {
    PreToolUse: [{
      matcher: 'Write',  // Optional filter
      timeout: 60000,    // Default 60s
      hook: async (input, toolUseId, context) => {
        // input: Tool-specific input object
        // toolUseId: UUID for this invocation
        // context: { session_id, abort_signal }

        console.log(`Writing to: ${input.file_path}`);

        return {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',  // 'allow' | 'deny' | 'ask'
          permissionDecisionReason: 'Approved file write'
        };
      }
    }],

    PostToolUse: [{
      hook: async (input, toolUseId, context) => {
        // input includes: tool_input, tool_response

        // Notify UI that file was written
        notifyFileChange(input.tool_input.file_path);

        return {
          hookEventName: 'PostToolUse',
          additionalContext: 'File write completed'
        };
      }
    }],

    SubagentStop: [{
      hook: async (result, agentName, context) => {
        // Notify UI that agent finished
        updateAgentStatus(agentName, 'completed');

        return { continue: true };
      }
    }]
  }
};
```

## Custom MCP Tools

### Creating In-Process Tools

```typescript
import { tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

// Define a tool with Zod schema
const getWeather = tool(
  'get_weather',
  'Get current weather for a location',
  {
    location: z.string().describe('City name'),
    units: z.enum(['celsius', 'fahrenheit']).default('celsius')
  },
  async (args) => {
    const data = await fetchWeatherAPI(args.location, args.units);
    return {
      content: [{ type: 'text', text: JSON.stringify(data) }]
    };
  }
);

// Create MCP server
const weatherServer = createSdkMcpServer({
  name: 'weather',
  version: '1.0.0',
  tools: [getWeather]
});

// Use in query
const options = {
  mcpServers: { weather: weatherServer },
  allowedTools: ['mcp__weather__get_weather']
};
```

### Tool Naming Convention

MCP tools follow the pattern: `mcp__{server_name}__{tool_name}`

Example: `mcp__weather__get_weather`

## Streaming and Interruption

### Real-Time Streaming

```typescript
const stream = query({ prompt: "Long task" });

for await (const message of stream) {
  if (message.type === 'assistant') {
    // Stream to UI in real-time
    updateUI(message.message.content);
  }
}
```

### Interruption

```typescript
const stream = query({ prompt: "Task" });

// Set up interrupt trigger
setTimeout(() => {
  stream.interrupt();
}, 30000);

// Or on user action
cancelButton.onclick = () => stream.interrupt();

try {
  for await (const message of stream) {
    // Process messages
  }
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('Interrupted by user');
  }
}
```

### Change Permission Mode Mid-Stream

```typescript
const stream = query({ prompt: "Task" });

// After some messages, escalate permissions
stream.setPermissionMode('acceptEdits');
```

## Cost Tracking

### Per-Message Usage

```typescript
for await (const message of stream) {
  if (message.type === 'assistant' && message.usage) {
    console.log({
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      cache_read_tokens: message.usage.cache_read_input_tokens
    });
  }
}
```

### Total Cost

```typescript
for await (const message of stream) {
  if (message.type === 'result') {
    console.log(`Total cost: $${message.total_cost_usd}`);
    console.log(`Duration: ${message.duration_ms}ms`);
    console.log(`Turns: ${message.num_turns}`);
  }
}
```

### Message ID Deduplication

Messages with the same `id` field report identical usage. Count once per ID:

```typescript
const processedIds = new Set<string>();

for await (const message of stream) {
  if (message.type === 'assistant' && message.message.id) {
    if (!processedIds.has(message.message.id)) {
      processedIds.add(message.message.id);
      // Count usage only once per ID
      trackUsage(message.usage);
    }
  }
}
```

## Migration: agent-service.ts

### Before (CLI Spawning)

```typescript
// Current implementation
import { spawn } from 'child_process';

export async function sendMessage(
  conversationId: string,
  message: string,
  settings: ConversationSettings
) {
  const args = ['-p', '--verbose', '--output-format', 'stream-json'];

  if (settings.model) {
    args.push('--model', settings.model);
  }
  if (settings.permissionMode) {
    args.push('--permission-mode', settings.permissionMode);
  }
  if (settings.allowedTools?.length) {
    args.push('--allowedTools', settings.allowedTools.join(','));
  }
  if (sessionId) {
    args.push('--resume', sessionId);
  }

  args.push(message);

  const proc = spawn('claude', args, { cwd: workspacePath });

  proc.stdout.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        const msg = JSON.parse(line);
        handleMessage(msg);
      }
    }
  });

  proc.stderr.on('data', (data) => {
    console.error('Claude error:', data.toString());
  });
}
```

### After (SDK Direct)

```typescript
// New implementation
import { query } from '@anthropic-ai/claude-agent-sdk';

export async function sendMessage(
  conversationId: string,
  message: string,
  settings: ConversationSettings,
  onPermissionRequest?: (tool: string, input: any) => Promise<boolean>
) {
  const stream = query({
    prompt: message,
    options: {
      cwd: workspacePath,
      model: settings.model,
      permissionMode: settings.permissionMode,
      allowedTools: settings.allowedTools,
      resume: sessionId,
      settingSources: ['project'],

      // Programmatic permission approval
      canUseTool: onPermissionRequest
        ? async (toolName, toolInput) => {
            const approved = await onPermissionRequest(toolName, toolInput);
            return { behavior: approved ? 'allow' : 'deny' };
          }
        : undefined,

      // In-process hooks for UI coordination
      hooks: {
        PostToolUse: [{
          hook: async (input, toolUseId, context) => {
            // Notify renderer of file changes
            mainWindow.webContents.send('agent:file-changed', {
              conversationId,
              file: input.tool_input?.file_path
            });
            return { continue: true };
          }
        }]
      }
    }
  });

  try {
    for await (const msg of stream) {
      // Messages are already typed - no JSON parsing needed

      if (msg.type === 'system' && msg.subtype === 'init') {
        // Capture session ID
        updateConversation(conversationId, { sessionId: msg.session_id });
      }

      // Forward to renderer
      mainWindow.webContents.send('agent:message', {
        conversationId,
        message: msg
      });

      if (msg.type === 'result') {
        // Session complete
        updateConversation(conversationId, {
          lastCost: msg.total_cost_usd,
          lastDuration: msg.duration_ms
        });
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // Interrupted
    } else {
      throw err;
    }
  }
}

// Expose interrupt method
export function interruptAgent(conversationId: string) {
  const stream = activeStreams.get(conversationId);
  if (stream) {
    stream.interrupt();
  }
}
```

## Breaking Changes (v0.1.0)

When migrating, be aware of these breaking changes:

1. **Package renamed**: `@anthropic-ai/claude-code` → `@anthropic-ai/claude-agent-sdk`

2. **No default settings loading**: Must explicitly set `settingSources: ['project']` to load `.claude/settings.json` and `CLAUDE.md`

3. **No default system prompt**: Must explicitly specify or use preset:
   ```typescript
   systemPrompt: { type: 'preset', preset: 'claude_code' }
   ```

4. **Python type renamed**: `ClaudeCodeOptions` → `ClaudeAgentOptions`

## Benefits Summary

1. **Programmatic permission approval** - Show approval dialogs in Electron UI
2. **Direct interruption** - `stream.interrupt()` instead of killing process
3. **In-process hooks** - TypeScript callbacks, not shell commands
4. **Type-safe messages** - No JSON parsing, full TypeScript types
5. **Simpler architecture** - No subprocess management
6. **Better error handling** - Built-in exceptions vs stderr parsing
7. **Custom tools** - Create MCP tools in-process with `tool()`
8. **Context management** - Automatic prompt caching optimization

## Sources

- [Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [TypeScript SDK Reference](https://platform.claude.com/docs/en/api/agent-sdk/typescript)
- [Session Management](https://platform.claude.com/docs/en/agent-sdk/sessions)
- [Permissions Guide](https://platform.claude.com/docs/en/agent-sdk/permissions)
- [Custom Tools](https://platform.claude.com/docs/en/api/agent-sdk/custom-tools)
- [Subagents](https://platform.claude.com/docs/en/agent-sdk/subagents)
- [Cost Tracking](https://platform.claude.com/docs/en/api/agent-sdk/cost-tracking)
- [Migration Guide](https://docs.claude.com/en/docs/claude-code/sdk/migration-guide)
- [GitHub: claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript)
- [NPM: @anthropic-ai/claude-agent-sdk](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk)
- [Building Agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)
