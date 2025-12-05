# Sprint 15: OpenAI Deep Research Agent

## Overview

Add a built-in "Deep Research" agent to each workspace, similar to the existing "Chorus" agent. This agent uses OpenAI's Deep Research models (`o4-mini-deep-research`, `o3-deep-research`) via the OpenAI Agents SDK for complex, multi-step research tasks.

The Deep Research agent appears in the agent list alongside custom `.claude/agents/*.md` agents. When selected, the model dropdown shows OpenAI models instead of Claude models. Research output is automatically saved to a configurable directory.

## User Stories

### US-1: Configure OpenAI API Key
**As a** user
**I want to** configure my OpenAI API key in a new Settings tab
**So that** I can use the Deep Research agent

**Acceptance Criteria:**
- New "Settings" tab in the main navigation (alongside workspaces)
- API Keys section with OpenAI API key input
- Key displayed masked (sk-••••••••1234)
- Validation on blur (calls OpenAI to verify)
- Status indicator: Valid ✓ / Invalid ✗ / Not set
- Key stored securely via electron-store
- Error message if trying to use Deep Research without key

### US-2: See Deep Research Agent in Workspace
**As a** user viewing a workspace
**I want to** see a "Deep Research" agent in the agent list
**So that** I can start research conversations

**Acceptance Criteria:**
- "Deep Research" agent appears in every workspace's agent list
- Visually distinct icon (🔬 or research icon)
- Listed after "Chorus" agent, before custom agents
- Shows "OpenAI Deep Research" as description
- Can create new conversations with this agent

### US-3: Select OpenAI Model for Research
**As a** user chatting with Deep Research agent
**I want to** select between OpenAI research models
**So that** I can choose speed vs. thoroughness

**Acceptance Criteria:**
- Model dropdown in conversation toolbar (same location as Claude model selector)
- Options:
  - `o4-mini-deep-research` - "O4 Mini (faster)"
  - `o3-deep-research` - "O3 (thorough)"
- Default: `o4-mini-deep-research`
- Selection persisted per-conversation
- Model selector only shows OpenAI models when Deep Research agent is active

### US-4: Configure Research Output Location
**As a** user
**I want to** configure where research reports are saved
**So that** I can organize output per-workspace

**Acceptance Criteria:**
- Per-workspace setting in Settings tab
- Default: `./research` (relative to workspace root)
- Browse button to select custom directory
- Directory auto-created on first research
- Setting persisted in workspace config

### US-5: Send Research Query
**As a** user in a Deep Research conversation
**I want to** send a research query like a normal message
**So that** the agent performs comprehensive research

**Acceptance Criteria:**
- Type query in chat input, press Enter/Send
- Query sent to OpenAI Deep Research agent
- Same chat UX as Claude conversations
- Message appears in chat history

### US-6: View Research Progress
**As a** user waiting for research
**I want to** see real-time progress
**So that** I know the research is running

**Acceptance Criteria:**
- Streaming text displayed as it generates
- Web search activity shown (tool calls)
- Elapsed time indicator
- Cancel/Stop button to abort
- Agent status shows "Busy" during research

### US-7: View Research Report
**As a** user after research completes
**I want to** see the full report in chat
**So that** I can review the findings

**Acceptance Criteria:**
- Full markdown report displayed in chat bubble
- Syntax highlighting for code blocks
- Links clickable
- "Saved to: ./research/filename.md" indicator below report
- Click to open file in FileViewer tab

### US-8: Ask Follow-up Questions
**As a** user reviewing a report
**I want to** ask follow-up questions in the same conversation
**So that** I can dive deeper into specific aspects

**Acceptance Criteria:**
- Send another message in same conversation
- Previous report automatically included as context
- Agent builds on previous research
- Context indicator shows "Using previous research"
- Each response also saved to output directory

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent type | Built-in per-workspace | Like Chorus agent, always available |
| Model selector | Reuse existing dropdown | Consistent UX, just different options |
| Chat format | Standard conversation | Natural follow-up flow |
| Output saving | Auto-save all responses | Research is valuable, should persist |
| Follow-up context | Inject previous response | OpenAI API is stateless |
| Settings location | New dedicated Settings tab | API keys deserve their own space |

## UI Layout

### Settings Tab

```
┌──────────────────────────────────────────────────────────────┐
│ [Workspaces]  [Settings]                                     │  ← New tab
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ API Keys                                                │   │
│ │ ──────────────────────────────────────────────────────│   │
│ │                                                        │   │
│ │ OpenAI API Key                                         │   │
│ │ ┌────────────────────────────────────────┐             │   │
│ │ │ sk-••••••••••••••••••••••••••••1234    │  ✓ Valid   │   │
│ │ └────────────────────────────────────────┘             │   │
│ │ Required for Deep Research agent.                      │   │
│ │ Get your key at platform.openai.com                    │   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Deep Research                                          │   │
│ │ ──────────────────────────────────────────────────────│   │
│ │                                                        │   │
│ │ Default Output Directory                               │   │
│ │ ┌──────────────────────────────────┐ ┌──────────┐     │   │
│ │ │ ./research                        │ │  Browse  │     │   │
│ │ └──────────────────────────────────┘ └──────────┘     │   │
│ │ Relative to workspace root. Reports auto-saved here.  │   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Agent List (Sidebar)

```
┌─────────────────────────────────┐
│ my-project                       │
│ main ▼                           │
├─────────────────────────────────┤
│ Agents                           │
│                                  │
│ 🎵 Chorus                        │  ← Built-in Claude agent
│ 🔬 Deep Research                 │  ← Built-in OpenAI agent (NEW)
│ ─────────────────────────────── │
│ 📄 backend-expert                │  ← Custom .claude/agents/
│ 📄 code-reviewer                 │
│                                  │
└─────────────────────────────────┘
```

### Model Selector (When Deep Research Active)

```
┌──────────────────────────────────────────────────────────────┐
│ Deep Research                                     🔧 ⚙️      │
├──────────────────────────────────────────────────────────────┤
│ Model: ┌────────────────────────────┐                        │
│        │ O4 Mini (faster)        ▼  │                        │
│        ├────────────────────────────┤                        │
│        │ ○ O4 Mini (faster)         │                        │
│        │ ○ O3 (thorough)            │                        │
│        └────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

### Research in Progress

```
┌──────────────────────────────────────────────────────────────┐
│ You                                                          │
│ What are the best practices for implementing AI agents in    │
│ production systems?                                          │
├──────────────────────────────────────────────────────────────┤
│ Deep Research                                    ⏱️ 45s      │
│                                                              │
│ 🔍 Searching: "AI agents production best practices 2025"     │
│ 🔍 Searching: "LLM agent reliability patterns"               │
│                                                              │
│ # Best Practices for AI Agents in Production                 │
│                                                              │
│ ## Executive Summary                                         │
│ Production AI agent systems require careful attention to...  │
│ █                                                            │
│                                                              │
│                                              [Stop]          │
└──────────────────────────────────────────────────────────────┘
```

### Research Complete

```
┌──────────────────────────────────────────────────────────────┐
│ Deep Research                                                │
│                                                              │
│ # Best Practices for AI Agents in Production                 │
│                                                              │
│ ## Executive Summary                                         │
│ Production AI agent systems require careful attention to     │
│ reliability, observability, and graceful degradation...      │
│                                                              │
│ ## Key Findings                                              │
│ 1. **Structured Output**: Use schema validation...           │
│ 2. **Retry Logic**: Implement exponential backoff...         │
│ ...                                                          │
│                                                              │
│ ## References                                                │
│ - [OpenAI Best Practices](https://...)                       │
│ - [Anthropic Claude Guide](https://...)                      │
│                                                              │
│ ────────────────────────────────────────────────────────────│
│ 📄 Saved to: research/2025-12-03-ai-agents-production.md     │
│                                              [Open File]     │
└──────────────────────────────────────────────────────────────┘
```

## Technical Requirements

### Agent Type System

Introduce an `agentType` field to distinguish agent backends:

```typescript
type AgentType = 'claude' | 'openai-research';

interface Agent {
  id: string;
  name: string;
  type: AgentType;           // NEW
  description?: string;
  filePath?: string;         // Only for custom agents
  // ...
}
```

Built-in agents:
- `Chorus` - type: `'claude'`
- `Deep Research` - type: `'openai-research'`

### Model Configuration

```typescript
// Claude models (existing)
const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-5-20250929', name: 'Sonnet 4.5' },
  { id: 'claude-opus-4-0-20250514', name: 'Opus 4' },
  // ...
];

// OpenAI Research models (new)
const OPENAI_RESEARCH_MODELS = [
  { id: 'o4-mini-deep-research-2025-06-26', name: 'O4 Mini (faster)' },
  { id: 'o3-deep-research-2025-06-26', name: 'O3 (thorough)' },
];
```

### Settings Storage

```typescript
interface ChorusSettings {
  // Existing...

  // NEW: API Keys
  openaiApiKey?: string;

  // NEW: Research settings (global default)
  researchOutputDirectory: string;  // Default: './research'
}

interface WorkspaceSettings {
  // Existing...

  // NEW: Per-workspace research output override
  researchOutputDirectory?: string;
}
```

### OpenAI Research Service

New service: `openai-research-service.ts`

```typescript
import { Agent, run, WebSearchTool } from '@openai/agents';
import OpenAI from 'openai';

export async function* runResearch(
  query: string,
  options: {
    model: string;
    apiKey: string;
    previousContext?: string;
    signal?: AbortSignal;
  }
): AsyncGenerator<ResearchEvent> {
  // Configure client
  const client = new OpenAI({
    apiKey: options.apiKey,
    timeout: 600000  // 10 minutes for deep research
  });

  // Build prompt with context
  const prompt = options.previousContext
    ? `Previous research:\n${options.previousContext}\n\nFollow-up question: ${query}`
    : query;

  // Create agent
  const agent = new Agent({
    name: 'Deep Researcher',
    model: options.model,
    tools: [new WebSearchTool()],
    instructions: `You perform deep empirical research.
      - Search multiple authoritative sources
      - Cross-reference information for accuracy
      - Provide citations with URLs
      - Synthesize into actionable insights`
  });

  // Stream research
  const stream = await run(agent, prompt, {
    stream: true,
    signal: options.signal
  });

  for await (const event of stream) {
    if (event.type === 'raw_model_stream_event') {
      const delta = event.data?.delta;
      if (delta?.type === 'text_delta' && delta.text) {
        yield { type: 'delta', text: delta.text };
      }
    }

    if (event.type === 'run_item_stream_event') {
      if (event.name === 'tool_called') {
        yield { type: 'search', query: event.item.input?.query };
      }
    }
  }

  await stream.completed;
  yield { type: 'complete' };
}
```

### IPC API

| Handler | Signature |
|---------|-----------|
| `settings:get` | `() => ChorusSettings` |
| `settings:set-openai-key` | `(key: string) => { valid: boolean }` |
| `settings:get-openai-key` | `() => string \| null` |
| `research:send-message` | `(conversationId, workspaceId, message) => void` |
| `research:stop` | `(conversationId) => void` |

### IPC Events (Main → Renderer)

| Event | Payload |
|-------|---------|
| `research:delta` | `{ conversationId, text }` |
| `research:search` | `{ conversationId, query }` |
| `research:complete` | `{ conversationId, outputPath }` |
| `research:error` | `{ conversationId, error }` |

### Agent Service Router

Modify `agent-service.ts` to route based on agent type:

```typescript
export async function sendMessage(
  conversationId: string,
  workspaceId: string,
  agentId: string,
  message: string
) {
  const agent = await getAgent(workspaceId, agentId);

  if (agent.type === 'openai-research') {
    return openaiResearchService.sendMessage(conversationId, workspaceId, message);
  } else {
    return claudeAgentService.sendMessage(conversationId, workspaceId, agentId, message);
  }
}
```

### Output File Naming

```
{outputDirectory}/{timestamp}-{query-slug}.md

Example:
research/2025-12-03T14-30-00-ai-agents-production.md
```

### Follow-up Context

For follow-up messages in same conversation:
1. Load previous assistant messages from conversation
2. Concatenate as context
3. Pass to OpenAI with new query

```typescript
const previousContext = conversation.messages
  .filter(m => m.role === 'assistant')
  .map(m => m.content)
  .join('\n\n---\n\n');
```

## Edge Cases

| Case | Behavior |
|------|----------|
| No OpenAI API key | Show setup prompt, link to Settings |
| Invalid API key | Validation error in Settings |
| Research cancelled | Stop stream, save partial output with "[Cancelled]" note |
| Research timeout (>10min) | Show warning, option to continue or stop |
| Output directory doesn't exist | Auto-create |
| Rate limited | Show error with retry suggestion |
| Network error | Show error, allow retry |

## Out of Scope

- Custom system prompts for Deep Research agent
- Multiple Deep Research agents per workspace
- Research history browser
- Concurrent research sessions
- Export/share functionality
- Cost tracking

## Dependencies

```bash
bun add @openai/agents openai zod@3
```

## References

- [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)
- [Deep Research Models](https://platform.openai.com/docs/models/o4-mini-deep-research)
- [Chorus SDK Docs](../../docs/3-tools/openai-sdk/)
