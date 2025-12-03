# Chorus Integration

This document details how to integrate OpenAI Deep Research into the Chorus application alongside the existing Claude Code agent.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Chorus (Electron)                           │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      Renderer Process                           │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │ │
│  │  │ Agent Type   │  │ Model        │  │ ConversationToolbar  │  │ │
│  │  │ Selector     │  │ Dropdown     │  │ (dynamic models)     │  │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘  │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │ ChatPane - unified message display, streaming            │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────┬──────────────────────────────┘ │
│                                    │ IPC Bridge                     │
│  ┌─────────────────────────────────┼──────────────────────────────┐ │
│  │                    Main Process │                               │ │
│  │                                 ▼                               │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │               agent-service.ts (Router)                   │  │ │
│  │  │                                                           │  │ │
│  │  │   if (agentType === 'claude') → agent-sdk-service.ts     │  │ │
│  │  │   if (agentType === 'openai-research') → agent-openai.ts │  │ │
│  │  └───────────────────────┬───────────────────────────────────┘  │ │
│  │                          │                                      │ │
│  │     ┌────────────────────┴────────────────────┐                │ │
│  │     │                                          │                │ │
│  │     ▼                                          ▼                │ │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────┐  │ │
│  │  │ agent-sdk-service   │  │ agent-openai-research-service   │  │ │
│  │  │                     │  │                                 │  │ │
│  │  │ @anthropic-ai/      │  │ @openai/agents                  │  │ │
│  │  │ claude-agent-sdk    │  │ + openai                        │  │ │
│  │  └──────────┬──────────┘  └──────────┬──────────────────────┘  │ │
│  │             │                        │                          │ │
│  └─────────────┼────────────────────────┼──────────────────────────┘ │
│                │                        │                            │
└────────────────┼────────────────────────┼────────────────────────────┘
                 │                        │
                 ▼                        ▼
          ┌────────────┐           ┌────────────┐
          │ Anthropic  │           │  OpenAI    │
          │    API     │           │    API     │
          └────────────┘           └────────────┘
```

## Data Model Changes

### Agent Type Field

Add `agentType` to conversation model:

```typescript
// chorus/src/preload/index.d.ts

export type AgentType = 'claude' | 'openai-research'

export interface Conversation {
  id: string
  agentId: string
  workspaceId: string
  title: string
  createdAt: string
  updatedAt: string
  sessionId: string | null
  sessionCreatedAt: string | null
  agentType: AgentType  // NEW
  settings?: ConversationSettings
}

export interface ConversationSettings {
  permissionMode?: PermissionMode
  allowedTools?: string[]
  model?: string  // Extended to include OpenAI models
}
```

### Model Configuration

```typescript
// chorus/src/renderer/src/components/Chat/ConversationToolbar.tsx

export const CLAUDE_MODELS = [
  { id: 'default', name: 'Default', description: 'Sonnet 4.5 - Recommended' },
  { id: 'opus', name: 'Opus', description: 'Opus 4.5 - Most capable' },
  { id: 'sonnet', name: 'Sonnet (1M)', description: 'Sonnet 4.5 - Long context' },
  { id: 'haiku', name: 'Haiku', description: 'Haiku 4.5 - Fastest' }
] as const

export const OPENAI_RESEARCH_MODELS = [
  { id: 'o4-mini-research', name: 'o4-mini', description: 'Fast deep research' },
  { id: 'o3-research', name: 'o3', description: 'Full deep research' }
] as const

export type ClaudeModel = typeof CLAUDE_MODELS[number]['id']
export type OpenAIResearchModel = typeof OPENAI_RESEARCH_MODELS[number]['id']
```

## Implementation Plan

### Phase 1: Data Layer

**Files to modify:**

| File | Changes |
|------|---------|
| `chorus/src/preload/index.d.ts` | Add `AgentType`, update `Conversation` interface |
| `chorus/src/main/services/conversation-service.ts` | Store/load `agentType` |
| `chorus/src/renderer/src/stores/workspace-store.ts` | Track agent type per conversation |

**Example changes:**

```typescript
// conversation-service.ts

export function createConversation(
  agentId: string,
  workspaceId: string,
  agentType: AgentType = 'claude'  // Default to Claude
): Conversation {
  const conversation: Conversation = {
    id: uuidv4(),
    agentId,
    workspaceId,
    title: 'New Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sessionId: null,
    sessionCreatedAt: null,
    agentType,  // NEW
    settings: {}
  }
  // ...
}
```

### Phase 2: OpenAI Research Service

**New file:** `chorus/src/main/services/agent-openai-research-service.ts`

```typescript
import { Agent, run, WebSearchTool } from '@openai/agents'
import OpenAI from 'openai'
import { BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs/promises'
import { ConversationSettings, ConversationMessage } from './conversation-service'
import { appendMessage, updateConversation } from './conversation-service'

// Active streams for cancellation
const activeStreams = new Map<string, AbortController>()

// Model ID mapping
const MODEL_IDS: Record<string, string> = {
  'o4-mini-research': 'o4-mini-deep-research-2025-06-26',
  'o3-research': 'o3-deep-research-2025-06-26'
}

export async function sendResearchMessage(
  conversationId: string,
  repoPath: string,
  message: string,
  mainWindow: BrowserWindow,
  settings?: ConversationSettings
): Promise<void> {
  // Cancel any existing stream
  const existingController = activeStreams.get(conversationId)
  if (existingController) {
    existingController.abort()
  }

  const controller = new AbortController()
  activeStreams.set(conversationId, controller)

  // Send busy status
  mainWindow.webContents.send('agent:status', {
    conversationId,
    status: 'busy'
  })

  try {
    // Store user message
    const userMessage: ConversationMessage = {
      uuid: uuidv4(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }
    appendMessage(conversationId, userMessage)
    mainWindow.webContents.send('agent:message', {
      conversationId,
      message: userMessage
    })

    // Configure model
    const modelId = MODEL_IDS[settings?.model || 'o4-mini-research']
      || MODEL_IDS['o4-mini-research']

    // Create research agent
    const researchAgent = new Agent({
      name: 'Research Agent',
      model: modelId,
      tools: [new WebSearchTool()],
      instructions: `You perform deep empirical research.

        Research methodology:
        - Search multiple authoritative sources
        - Cross-reference information for accuracy
        - Provide citations for all claims
        - Synthesize findings into actionable insights

        Output format:
        - Use markdown formatting
        - Include sources with URLs
        - Highlight key findings`
    })

    // Run with streaming
    const stream = await run(researchAgent, message, {
      stream: true,
      signal: controller.signal
    })

    let streamingContent = ''
    let toolCalls: Array<{ name: string; input: unknown }> = []

    // Process stream events
    for await (const event of stream) {
      // Handle text deltas
      if (event.type === 'raw_model_stream_event') {
        const delta = event.data?.delta
        if (delta?.type === 'text_delta' && delta.text) {
          streamingContent += delta.text
          mainWindow.webContents.send('agent:stream-delta', {
            conversationId,
            delta: delta.text
          })
        }
      }

      // Handle tool events
      if (event.type === 'run_item_stream_event') {
        if (event.name === 'tool_called') {
          toolCalls.push({
            name: event.item.name,
            input: event.item.input
          })
          mainWindow.webContents.send('agent:tool-use', {
            conversationId,
            tool: event.item.name,
            input: event.item.input,
            status: 'running'
          })
        }

        if (event.name === 'tool_output') {
          mainWindow.webContents.send('agent:tool-result', {
            conversationId,
            output: event.item.output,
            status: 'complete'
          })
        }
      }
    }

    await stream.completed

    // Clear streaming state
    mainWindow.webContents.send('agent:stream-clear', { conversationId })

    // Store assistant message
    const assistantMessage: ConversationMessage = {
      uuid: uuidv4(),
      type: 'assistant',
      content: stream.finalOutput || streamingContent,
      timestamp: new Date().toISOString(),
      toolCalls
    }
    appendMessage(conversationId, assistantMessage)
    mainWindow.webContents.send('agent:message', {
      conversationId,
      message: assistantMessage
    })

    // Auto-save research output
    if (stream.finalOutput) {
      const savedPath = await saveResearchOutput(
        repoPath,
        message,
        stream.finalOutput
      )
      mainWindow.webContents.send('agent:file-changed', {
        conversationId,
        filePath: savedPath,
        toolName: 'ResearchSave'
      })
    }

    // Send ready status
    mainWindow.webContents.send('agent:status', {
      conversationId,
      status: 'ready'
    })

  } catch (error) {
    if (error.name === 'AbortError') {
      mainWindow.webContents.send('agent:status', {
        conversationId,
        status: 'ready'
      })
    } else {
      mainWindow.webContents.send('agent:status', {
        conversationId,
        status: 'error',
        error: error.message
      })
      mainWindow.webContents.send('agent:error', {
        conversationId,
        error: error.message
      })
    }
  } finally {
    activeStreams.delete(conversationId)
  }
}

export function stopResearchAgent(conversationId: string): void {
  const controller = activeStreams.get(conversationId)
  if (controller) {
    controller.abort()
    activeStreams.delete(conversationId)
  }
}

async function saveResearchOutput(
  repoPath: string,
  query: string,
  content: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)

  const filename = `${timestamp}-${slug}.md`
  const researchDir = path.join(repoPath, 'research')
  const fullPath = path.join(researchDir, filename)

  // Ensure research directory exists
  await fs.mkdir(researchDir, { recursive: true })

  // Write research output
  const fileContent = `# Research: ${query}

Generated: ${new Date().toISOString()}
Model: OpenAI Deep Research

---

${content}
`

  await fs.writeFile(fullPath, fileContent, 'utf-8')

  return `research/${filename}`
}
```

### Phase 3: Agent Service Router

**Modify:** `chorus/src/main/services/agent-service.ts`

```typescript
import { sendMessageSDK, stopAgentSDK } from './agent-sdk-service'
import { sendResearchMessage, stopResearchAgent } from './agent-openai-research-service'
import type { AgentType, ConversationSettings } from '../../preload/index.d'
import { BrowserWindow } from 'electron'

export async function sendMessage(
  conversationId: string,
  agentId: string,
  repoPath: string,
  message: string,
  sessionId: string | null,
  sessionCreatedAt: string | null,
  agentFilePath: string | null,
  mainWindow: BrowserWindow,
  settings?: ConversationSettings,
  gitSettings?: unknown,
  agentType: AgentType = 'claude'  // NEW parameter
): Promise<void> {

  if (agentType === 'openai-research') {
    return sendResearchMessage(
      conversationId,
      repoPath,
      message,
      mainWindow,
      settings
    )
  }

  // Default: Claude Code
  return sendMessageSDK(
    conversationId,
    agentId,
    repoPath,
    message,
    sessionId,
    sessionCreatedAt,
    agentFilePath,
    mainWindow,
    settings,
    gitSettings
  )
}

export async function stopAgent(
  conversationId: string,
  agentType: AgentType = 'claude'
): Promise<void> {
  if (agentType === 'openai-research') {
    return stopResearchAgent(conversationId)
  }
  return stopAgentSDK(conversationId)
}
```

### Phase 4: IPC Handler Updates

**Modify:** `chorus/src/main/index.ts`

```typescript
ipcMain.handle(
  'agent:send',
  async (
    _event,
    conversationId: string,
    message: string,
    repoPath: string,
    _sessionId?: string,
    agentFilePath?: string
  ) => {
    const { data } = await (async () => {
      const result = loadConversation(conversationId)
      return { data: result }
    })()

    const agentId = data?.conversation?.agentId || conversationId
    const sessionId = data?.conversation?.sessionId || null
    const sessionCreatedAt = data?.conversation?.sessionCreatedAt || null
    const settings = data?.conversation?.settings
    const workspaceId = data?.conversation?.workspaceId
    const agentType = data?.conversation?.agentType || 'claude'  // NEW

    const gitSettings = workspaceId
      ? getWorkspaceSettings(workspaceId).git
      : undefined

    sendMessage(
      conversationId,
      agentId,
      repoPath,
      message,
      sessionId,
      sessionCreatedAt,
      agentFilePath || null,
      mainWindow,
      settings,
      gitSettings,
      agentType  // NEW
    )

    return { success: true }
  }
)
```

### Phase 5: UI Changes

**Modify:** `chorus/src/renderer/src/components/Chat/ConversationToolbar.tsx`

```typescript
import { AgentType, CLAUDE_MODELS, OPENAI_RESEARCH_MODELS } from '../../types'

interface Props {
  conversationId: string
  agentType: AgentType
}

export function ConversationToolbar({ conversationId, agentType }: Props) {
  // Dynamic model list based on agent type
  const models = agentType === 'claude'
    ? CLAUDE_MODELS
    : OPENAI_RESEARCH_MODELS

  const currentModel = useConversationSetting(conversationId, 'model')

  return (
    <div className="conversation-toolbar">
      {/* Model dropdown */}
      <Dropdown
        value={currentModel || models[0].id}
        options={models}
        onChange={handleModelChange}
        label="Model"
      />

      {/* Permission dropdown - only for Claude */}
      {agentType === 'claude' && (
        <Dropdown
          value={permissionMode}
          options={PERMISSION_MODES}
          onChange={handlePermissionChange}
          label="Permissions"
        />
      )}

      {/* Research indicator */}
      {agentType === 'openai-research' && (
        <span className="research-badge">
          Deep Research
        </span>
      )}
    </div>
  )
}
```

**New component:** Agent type selector for new conversations

```typescript
// chorus/src/renderer/src/components/Chat/AgentTypeSelector.tsx

import { AgentType } from '../../types'

const AGENT_TYPES = [
  {
    id: 'claude' as AgentType,
    name: 'Claude Code',
    description: 'Coding tasks, file editing, terminal commands',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    )
  },
  {
    id: 'openai-research' as AgentType,
    name: 'Deep Research',
    description: 'Multi-step research, web search, synthesis',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
  }
]

interface Props {
  selected: AgentType
  onSelect: (type: AgentType) => void
}

export function AgentTypeSelector({ selected, onSelect }: Props) {
  return (
    <div className="agent-type-selector">
      {AGENT_TYPES.map(type => (
        <button
          key={type.id}
          className={`agent-type-option ${selected === type.id ? 'selected' : ''}`}
          onClick={() => onSelect(type.id)}
        >
          {type.icon}
          <div>
            <div className="font-medium">{type.name}</div>
            <div className="text-xs text-gray-500">{type.description}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
```

## Environment Configuration

### Required Environment Variables

```bash
# Anthropic (existing)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (new)
OPENAI_API_KEY=sk-...
```

### Settings UI

Add OpenAI API key configuration to workspace settings:

```typescript
// chorus/src/renderer/src/components/MainPane/WorkspaceSettings.tsx

export function WorkspaceSettings() {
  const [openaiKey, setOpenaiKey] = useState('')

  return (
    <div className="workspace-settings">
      {/* Existing settings */}

      <section>
        <h3>OpenAI Configuration</h3>
        <label>
          API Key
          <input
            type="password"
            value={openaiKey}
            onChange={e => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
          />
        </label>
        <p className="text-sm text-gray-500">
          Required for Deep Research. Get a key from
          <a href="https://platform.openai.com/api-keys" target="_blank">
            OpenAI Dashboard
          </a>
        </p>
      </section>
    </div>
  )
}
```

## Testing Checklist

### Unit Tests

- [ ] `agent-openai-research-service.ts` - streaming, cancellation, error handling
- [ ] `agent-service.ts` - routing based on agent type
- [ ] `conversation-service.ts` - storing/loading agent type

### Integration Tests

- [ ] Create research conversation
- [ ] Stream research results to UI
- [ ] Cancel research mid-stream
- [ ] Save research output to file
- [ ] Switch between Claude and Research agents

### E2E Tests

- [ ] Full research flow: query → streaming → file save
- [ ] Model selection persists across sessions
- [ ] Error states display correctly

## Cost Tracking

Deep Research has different cost structure:

```typescript
// Add to conversation-service.ts

export interface ResearchCost {
  inputTokens: number
  outputTokens: number
  webSearches: number
  totalCost: number  // USD
}

// Estimate based on OpenAI pricing
function estimateResearchCost(result: StreamResult): ResearchCost {
  const inputTokens = result.usage?.input_tokens || 0
  const outputTokens = result.usage?.output_tokens || 0
  const webSearches = result.toolCalls?.filter(t => t.name === 'web_search').length || 0

  // Approximate pricing (check current rates)
  const inputCost = inputTokens * 0.00001  // $0.01/1K
  const outputCost = outputTokens * 0.00003  // $0.03/1K
  const searchCost = webSearches * 0.001  // $0.001/search

  return {
    inputTokens,
    outputTokens,
    webSearches,
    totalCost: inputCost + outputCost + searchCost
  }
}
```

## Future Enhancements

### Multi-Agent Pipelines

```typescript
// Future: Triage → Research → Synthesis pipeline
const pipeline = [
  { agent: triageAgent, condition: 'always' },
  { agent: researchAgent, condition: 'needsResearch' },
  { agent: synthesisAgent, condition: 'always' }
]
```

### MCP Integration

```typescript
// Future: Connect to internal file search via MCP
import { HostedMCPTool } from '@openai/agents'

const agent = new Agent({
  tools: [
    new WebSearchTool(),
    new HostedMCPTool({
      serverUrl: 'file://./mcp-server',
      serverLabel: 'Internal Docs'
    })
  ]
})
```

### Research Templates

```typescript
// Future: Pre-configured research templates
const RESEARCH_TEMPLATES = {
  'architecture-review': {
    instructions: 'Analyze architectural patterns...',
    outputFormat: 'ADR template'
  },
  'library-comparison': {
    instructions: 'Compare libraries based on...',
    outputFormat: 'Comparison matrix'
  }
}
```

## References

- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)
- [Deep Research Cookbook](https://cookbook.openai.com/examples/deep_research_api/introduction_to_deep_research_api_agents)
- [Chorus Architecture](../../../CLAUDE.md)
- [Claude Agent SDK Integration](../claude-agent-sdk/0-overview.md)
