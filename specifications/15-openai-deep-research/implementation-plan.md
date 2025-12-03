# Sprint 15: Implementation Plan - OpenAI Deep Research Agent

## Overview

This document describes the implementation plan for adding the built-in Deep Research agent to Chorus. The agent uses OpenAI's Deep Research models and appears alongside the Chorus agent in every workspace.

## Phase 1: Dependencies & Configuration

### Install OpenAI Agents SDK

```bash
cd chorus && bun add @openai/agents openai zod@3
```

### File: `chorus/src/main/store/index.ts`

Add settings fields:

```typescript
interface ChorusSettings {
  // Existing fields...

  // NEW: OpenAI configuration
  openaiApiKey?: string;
  researchOutputDirectory: string;  // Default: './research'
}

// Update defaults
const defaults: ChorusSettings = {
  // ...existing...
  researchOutputDirectory: './research',
};
```

## Phase 2: Settings Tab UI

### File: `chorus/src/renderer/src/components/Settings/SettingsPage.tsx` (new)

Create the Settings page component:

```typescript
import React, { useState, useEffect } from 'react';

export function SettingsPage() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<'valid' | 'invalid' | 'checking' | 'not-set'>('not-set');
  const [outputDir, setOutputDir] = useState('./research');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const key = await window.api.settings.getOpenaiKey();
    const settings = await window.api.settings.get();

    if (key) {
      setOpenaiKey(maskKey(key));
      setKeyStatus('valid');
    }
    setOutputDir(settings.researchOutputDirectory || './research');
  };

  const handleKeyChange = async (value: string) => {
    // Only process if it's a real key (not masked)
    if (value.startsWith('sk-') && !value.includes('•')) {
      setKeyStatus('checking');
      const result = await window.api.settings.setOpenaiKey(value);
      setKeyStatus(result.valid ? 'valid' : 'invalid');
      if (result.valid) {
        setOpenaiKey(maskKey(value));
      }
    }
  };

  const maskKey = (key: string) => {
    if (key.length < 8) return key;
    return `${key.slice(0, 7)}${'•'.repeat(20)}${key.slice(-4)}`;
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-zinc-100 mb-6">Settings</h1>

      {/* API Keys Section */}
      <section className="bg-zinc-800 rounded-lg p-4 mb-4">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">API Keys</h2>

        <div className="mb-4">
          <label className="block text-sm text-zinc-400 mb-1">
            OpenAI API Key
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              onBlur={() => handleKeyChange(openaiKey)}
              placeholder="sk-..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 font-mono"
            />
            {keyStatus === 'valid' && <span className="text-green-400">✓ Valid</span>}
            {keyStatus === 'invalid' && <span className="text-red-400">✗ Invalid</span>}
            {keyStatus === 'checking' && <span className="text-zinc-400">Checking...</span>}
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Required for Deep Research agent. Get key at{' '}
            <a href="https://platform.openai.com" className="text-blue-400 hover:underline">
              platform.openai.com
            </a>
          </p>
        </div>
      </section>

      {/* Deep Research Section */}
      <section className="bg-zinc-800 rounded-lg p-4">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Deep Research</h2>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Default Output Directory
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
            />
            <button
              onClick={() => handleBrowse()}
              className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
            >
              Browse
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Relative to workspace root. Research reports auto-saved here.
          </p>
        </div>
      </section>
    </div>
  );
}
```

### File: `chorus/src/renderer/src/components/Sidebar/Sidebar.tsx`

Add Settings tab to navigation:

```typescript
// Add to tab list
<button
  onClick={() => setActiveTab('settings')}
  className={`px-3 py-1.5 text-sm ${
    activeTab === 'settings' ? 'bg-zinc-700' : 'hover:bg-zinc-800'
  }`}
>
  Settings
</button>

// In content area, add:
{activeTab === 'settings' && <SettingsPage />}
```

## Phase 3: Agent Type System

### File: `chorus/src/preload/index.d.ts`

Add agent type:

```typescript
type AgentType = 'claude' | 'openai-research';

interface Agent {
  id: string;
  name: string;
  type: AgentType;
  description?: string;
  filePath?: string;
  systemPrompt?: string;
}

// Add to API types
interface SettingsAPI {
  get: () => Promise<ChorusSettings>;
  getOpenaiKey: () => Promise<string | null>;
  setOpenaiKey: (key: string) => Promise<{ valid: boolean }>;
  setResearchOutputDir: (dir: string) => Promise<void>;
}
```

### File: `chorus/src/main/services/workspace-service.ts`

Add built-in agents:

```typescript
const BUILT_IN_AGENTS: Agent[] = [
  {
    id: 'chorus',
    name: 'Chorus',
    type: 'claude',
    description: 'General-purpose coding assistant'
  },
  {
    id: 'deep-research',
    name: 'Deep Research',
    type: 'openai-research',
    description: 'OpenAI Deep Research for comprehensive analysis'
  }
];

export async function getAgents(workspaceId: string): Promise<Agent[]> {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return [];

  // Get custom agents from .claude/agents/
  const customAgents = await discoverCustomAgents(workspace.path);

  // Return built-in + custom
  return [...BUILT_IN_AGENTS, ...customAgents];
}
```

### File: `chorus/src/renderer/src/components/Sidebar/AgentItem.tsx`

Update to show different icons:

```typescript
function getAgentIcon(agent: Agent) {
  switch (agent.type) {
    case 'openai-research':
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case 'claude':
    default:
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
  }
}
```

## Phase 4: Model Selection

### File: `chorus/src/renderer/src/constants/models.ts` (new)

```typescript
export const CLAUDE_MODELS = [
  { id: 'claude-sonnet-4-5-20250929', name: 'Sonnet 4.5', default: true },
  { id: 'claude-opus-4-0-20250514', name: 'Opus 4' },
  { id: 'claude-sonnet-4-20250514', name: 'Sonnet 4' },
];

export const OPENAI_RESEARCH_MODELS = [
  { id: 'o4-mini-deep-research-2025-06-26', name: 'O4 Mini (faster)', default: true },
  { id: 'o3-deep-research-2025-06-26', name: 'O3 (thorough)' },
];

export function getModelsForAgentType(type: AgentType) {
  switch (type) {
    case 'openai-research':
      return OPENAI_RESEARCH_MODELS;
    case 'claude':
    default:
      return CLAUDE_MODELS;
  }
}
```

### File: `chorus/src/renderer/src/components/Chat/ConversationToolbar.tsx`

Update model selector to use agent type:

```typescript
import { getModelsForAgentType } from '../../constants/models';

function ModelSelector({ conversation, agent }) {
  const models = getModelsForAgentType(agent.type);

  return (
    <select
      value={conversation.settings?.model || models.find(m => m.default)?.id}
      onChange={(e) => updateConversationModel(e.target.value)}
      className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
    >
      {models.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </select>
  );
}
```

## Phase 5: OpenAI Research Service

### File: `chorus/src/main/services/openai-research-service.ts` (new)

```typescript
import { Agent, run, WebSearchTool } from '@openai/agents';
import OpenAI from 'openai';
import { setDefaultOpenAIClient } from '@openai/agents';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BrowserWindow } from 'electron';

interface ResearchOptions {
  model: string;
  apiKey: string;
  outputDir: string;
  previousContext?: string;
}

// Active research sessions for cancellation
const activeSessions = new Map<string, AbortController>();

export async function sendMessage(
  conversationId: string,
  workspaceId: string,
  message: string,
  options: ResearchOptions,
  mainWindow: BrowserWindow
): Promise<void> {
  const controller = new AbortController();
  activeSessions.set(conversationId, controller);

  try {
    // Configure OpenAI client
    const client = new OpenAI({
      apiKey: options.apiKey,
      timeout: 600000,  // 10 minutes for deep research
    });
    setDefaultOpenAIClient(client);

    // Build prompt with context for follow-ups
    const prompt = options.previousContext
      ? `Previous research:\n\n${options.previousContext}\n\n---\n\nFollow-up question: ${message}`
      : message;

    // Create agent
    const agent = new Agent({
      name: 'Deep Researcher',
      model: options.model,
      tools: [new WebSearchTool()],
      instructions: `You perform deep empirical research based on the user's question.

Guidelines:
- Search multiple authoritative sources
- Cross-reference information for accuracy
- Provide citations with URLs for all claims
- Synthesize findings into actionable insights
- Structure output with clear headings
- Acknowledge limitations and gaps in information`
    });

    // Stream research
    const stream = await run(agent, prompt, {
      stream: true,
      signal: controller.signal
    });

    let fullText = '';

    for await (const event of stream) {
      // Handle text streaming
      if (event.type === 'raw_model_stream_event') {
        const delta = event.data?.delta;
        if (delta?.type === 'text_delta' && delta.text) {
          fullText += delta.text;
          mainWindow.webContents.send('research:delta', {
            conversationId,
            text: delta.text
          });
        }
      }

      // Handle tool calls (web searches)
      if (event.type === 'run_item_stream_event') {
        if (event.name === 'tool_called' && event.item?.name === 'web_search') {
          mainWindow.webContents.send('research:search', {
            conversationId,
            query: event.item.input?.query || 'web'
          });
        }
      }
    }

    await stream.completed;

    // Save output to file
    const outputPath = await saveResearchOutput(
      workspaceId,
      options.outputDir,
      message,
      fullText
    );

    mainWindow.webContents.send('research:complete', {
      conversationId,
      outputPath,
      text: fullText
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      mainWindow.webContents.send('research:cancelled', { conversationId });
    } else {
      mainWindow.webContents.send('research:error', {
        conversationId,
        error: error.message
      });
    }
  } finally {
    activeSessions.delete(conversationId);
  }
}

export function stopResearch(conversationId: string): void {
  const controller = activeSessions.get(conversationId);
  if (controller) {
    controller.abort();
  }
}

async function saveResearchOutput(
  workspaceId: string,
  outputDir: string,
  query: string,
  content: string
): Promise<string> {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) throw new Error('Workspace not found');

  // Resolve output directory
  const fullOutputDir = path.isAbsolute(outputDir)
    ? outputDir
    : path.join(workspace.path, outputDir);

  // Ensure directory exists
  await fs.mkdir(fullOutputDir, { recursive: true });

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 50)
    .replace(/-+$/, '');
  const filename = `${timestamp}-${slug}.md`;

  // Write file
  const filePath = path.join(fullOutputDir, filename);
  const fileContent = `# Research: ${query}

Generated: ${new Date().toISOString()}
Model: ${options.model}

---

${content}
`;

  await fs.writeFile(filePath, fileContent);

  // Return relative path for display
  return path.relative(workspace.path, filePath);
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new OpenAI({ apiKey });
    await client.models.list();
    return true;
  } catch {
    return false;
  }
}
```

## Phase 6: Agent Service Router

### File: `chorus/src/main/services/agent-service.ts`

Update to route based on agent type:

```typescript
import * as claudeService from './agent-sdk-service';
import * as openaiService from './openai-research-service';

export async function sendMessage(
  conversationId: string,
  workspaceId: string,
  agentId: string,
  message: string,
  mainWindow: BrowserWindow
): Promise<void> {
  const agent = await getAgent(workspaceId, agentId);

  if (agent.type === 'openai-research') {
    const apiKey = store.get('openaiApiKey');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Go to Settings to add your key.');
    }

    const outputDir = store.get('researchOutputDirectory', './research');
    const conversation = await getConversation(conversationId);

    // Get previous context for follow-ups
    const previousContext = await getPreviousResearchContext(conversationId);

    await openaiService.sendMessage(
      conversationId,
      workspaceId,
      message,
      {
        model: conversation.settings?.model || 'o4-mini-deep-research-2025-06-26',
        apiKey,
        outputDir,
        previousContext
      },
      mainWindow
    );
  } else {
    // Existing Claude agent flow
    await claudeService.sendMessage(conversationId, workspaceId, agentId, message, mainWindow);
  }
}

export async function stopAgent(conversationId: string, agentType: AgentType): Promise<void> {
  if (agentType === 'openai-research') {
    openaiService.stopResearch(conversationId);
  } else {
    claudeService.interruptAgent(conversationId);
  }
}

async function getPreviousResearchContext(conversationId: string): Promise<string | undefined> {
  const messages = await getConversationMessages(conversationId);

  // Get assistant messages (research outputs)
  const assistantMessages = messages
    .filter(m => m.role === 'assistant' && m.content)
    .map(m => m.content);

  if (assistantMessages.length === 0) return undefined;

  // Return last research output as context
  return assistantMessages[assistantMessages.length - 1];
}
```

## Phase 7: IPC Handlers

### File: `chorus/src/main/index.ts`

Add IPC handlers:

```typescript
import * as openaiResearchService from './services/openai-research-service';

// Settings handlers
ipcMain.handle('settings:get', () => {
  return {
    researchOutputDirectory: store.get('researchOutputDirectory', './research'),
    // ... other settings
  };
});

ipcMain.handle('settings:get-openai-key', () => {
  return store.get('openaiApiKey', null);
});

ipcMain.handle('settings:set-openai-key', async (_event, key: string) => {
  const valid = await openaiResearchService.validateApiKey(key);
  if (valid) {
    store.set('openaiApiKey', key);
  }
  return { valid };
});

ipcMain.handle('settings:set-research-output-dir', (_event, dir: string) => {
  store.set('researchOutputDirectory', dir);
});

// Research-specific handlers
ipcMain.handle('research:stop', (_event, conversationId: string) => {
  openaiResearchService.stopResearch(conversationId);
});
```

### File: `chorus/src/preload/index.ts`

Expose to renderer:

```typescript
settings: {
  get: () => ipcRenderer.invoke('settings:get'),
  getOpenaiKey: () => ipcRenderer.invoke('settings:get-openai-key'),
  setOpenaiKey: (key: string) => ipcRenderer.invoke('settings:set-openai-key', key),
  setResearchOutputDir: (dir: string) => ipcRenderer.invoke('settings:set-research-output-dir', dir),
},

research: {
  stop: (conversationId: string) => ipcRenderer.invoke('research:stop', conversationId),
  onDelta: (callback: (data: { conversationId: string; text: string }) => void) => {
    const handler = (_: unknown, data: unknown) => callback(data);
    ipcRenderer.on('research:delta', handler);
    return () => ipcRenderer.removeListener('research:delta', handler);
  },
  onSearch: (callback: (data: { conversationId: string; query: string }) => void) => {
    const handler = (_: unknown, data: unknown) => callback(data);
    ipcRenderer.on('research:search', handler);
    return () => ipcRenderer.removeListener('research:search', handler);
  },
  onComplete: (callback: (data: { conversationId: string; outputPath: string; text: string }) => void) => {
    const handler = (_: unknown, data: unknown) => callback(data);
    ipcRenderer.on('research:complete', handler);
    return () => ipcRenderer.removeListener('research:complete', handler);
  },
  onError: (callback: (data: { conversationId: string; error: string }) => void) => {
    const handler = (_: unknown, data: unknown) => callback(data);
    ipcRenderer.on('research:error', handler);
    return () => ipcRenderer.removeListener('research:error', handler);
  },
},
```

## Phase 8: Chat UI Updates

### File: `chorus/src/renderer/src/components/Chat/ResearchMessage.tsx` (new)

Component for displaying research messages:

```typescript
import React, { useState, useEffect } from 'react';
import { MarkdownContent } from './MarkdownContent';

interface Props {
  conversationId: string;
  isStreaming: boolean;
}

export function ResearchMessage({ conversationId, isStreaming }: Props) {
  const [text, setText] = useState('');
  const [searches, setSearches] = useState<string[]>([]);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isStreaming) return;

    // Update elapsed time
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Subscribe to events
    const unsubDelta = window.api.research.onDelta((data) => {
      if (data.conversationId === conversationId) {
        setText(prev => prev + data.text);
      }
    });

    const unsubSearch = window.api.research.onSearch((data) => {
      if (data.conversationId === conversationId) {
        setSearches(prev => [...prev, data.query]);
      }
    });

    const unsubComplete = window.api.research.onComplete((data) => {
      if (data.conversationId === conversationId) {
        setOutputPath(data.outputPath);
      }
    });

    return () => {
      clearInterval(timer);
      unsubDelta();
      unsubSearch();
      unsubComplete();
    };
  }, [conversationId, isStreaming]);

  const handleStop = () => {
    window.api.research.stop(conversationId);
  };

  const handleOpenFile = () => {
    if (outputPath) {
      // Open in FileViewer tab
      // ... dispatch to workspace store
    }
  };

  return (
    <div className="bg-zinc-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium">Deep Research</span>
        {isStreaming && (
          <span className="text-sm text-zinc-400">⏱️ {elapsed}s</span>
        )}
      </div>

      {/* Search activity */}
      {searches.length > 0 && (
        <div className="mb-3 text-sm text-zinc-400 space-y-1">
          {searches.slice(-3).map((query, i) => (
            <div key={i} className="flex items-center gap-2">
              <span>🔍</span>
              <span className="truncate">Searching: {query}</span>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="prose prose-invert max-w-none">
        <MarkdownContent content={text} />
        {isStreaming && <span className="animate-pulse">█</span>}
      </div>

      {/* Footer */}
      {isStreaming ? (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleStop}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm"
          >
            Stop
          </button>
        </div>
      ) : outputPath && (
        <div className="mt-4 pt-3 border-t border-zinc-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">
              📄 Saved to: {outputPath}
            </span>
            <button
              onClick={handleOpenFile}
              className="text-blue-400 hover:text-blue-300"
            >
              Open File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### File: `chorus/src/renderer/src/components/Chat/ChatMessages.tsx`

Integrate research message component:

```typescript
// When rendering messages, check agent type
{message.role === 'assistant' && agent.type === 'openai-research' ? (
  <ResearchMessage
    conversationId={conversationId}
    isStreaming={isLastMessage && isStreaming}
  />
) : (
  // Existing Claude message rendering
  <AssistantMessage message={message} />
)}
```

## Phase 9: State Management Updates

### File: `chorus/src/renderer/src/stores/chat-store.ts`

Add research state:

```typescript
interface ChatStore {
  // Existing...

  // Research state
  researchSessions: Map<string, {
    text: string;
    searches: string[];
    outputPath?: string;
    status: 'running' | 'complete' | 'error' | 'cancelled';
  }>;

  // Actions
  updateResearchSession: (conversationId: string, update: Partial<ResearchSession>) => void;
}
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Renderer Process                            │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐ │
│  │ SettingsPage   │  │ AgentList      │  │ ChatMessages       │ │
│  │ (API key)      │  │ (Deep Research)│  │ (ResearchMessage)  │ │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────────┘ │
│          │                   │                   │              │
│  ┌───────▼───────────────────▼───────────────────▼────────────┐ │
│  │              workspace-store / chat-store                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────┘
                                 │ IPC
┌────────────────────────────────▼────────────────────────────────┐
│                      Main Process                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    agent-service.ts                          │ │
│  │                    (route by agent type)                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│          │                                    │                  │
│          ▼                                    ▼                  │
│  ┌────────────────────┐            ┌────────────────────┐       │
│  │ agent-sdk-service  │            │ openai-research-   │       │
│  │ (Claude)           │            │ service (OpenAI)   │       │
│  └─────────┬──────────┘            └─────────┬──────────┘       │
│            │                                 │                   │
└────────────┼─────────────────────────────────┼───────────────────┘
             │                                 │
             ▼                                 ▼
    ┌────────────────┐              ┌────────────────────┐
    │ Claude Agent   │              │ OpenAI Agents SDK  │
    │ SDK            │              │ + Deep Research    │
    └────────────────┘              └────────────────────┘
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `chorus/src/main/services/openai-research-service.ts` | Create | OpenAI research logic |
| `chorus/src/main/services/agent-service.ts` | Modify | Add routing by agent type |
| `chorus/src/main/services/workspace-service.ts` | Modify | Add built-in agents |
| `chorus/src/main/index.ts` | Modify | Add IPC handlers |
| `chorus/src/main/store/index.ts` | Modify | Add settings fields |
| `chorus/src/preload/index.ts` | Modify | Expose APIs |
| `chorus/src/preload/index.d.ts` | Modify | Add types |
| `chorus/src/renderer/src/components/Settings/SettingsPage.tsx` | Create | Settings UI |
| `chorus/src/renderer/src/components/Chat/ResearchMessage.tsx` | Create | Research display |
| `chorus/src/renderer/src/components/Chat/ConversationToolbar.tsx` | Modify | Model selector |
| `chorus/src/renderer/src/components/Sidebar/AgentItem.tsx` | Modify | Agent icons |
| `chorus/src/renderer/src/constants/models.ts` | Create | Model definitions |

## Testing Checklist

- [ ] Settings tab visible and functional
- [ ] OpenAI API key validation works
- [ ] Deep Research agent appears in all workspaces
- [ ] Model selector shows OpenAI models when Deep Research selected
- [ ] Research streams text in real-time
- [ ] Web searches displayed during research
- [ ] Output saved to configured directory
- [ ] File path shown after completion
- [ ] Open File button works
- [ ] Stop button cancels research
- [ ] Follow-up questions include previous context
- [ ] Error handling for missing API key
- [ ] Error handling for network issues

## Known Limitations

1. **One session at a time**: Only one research session per workspace
2. **No session persistence**: Research state not persisted across app restarts
3. **Context window**: Follow-ups may truncate if previous research is very long
4. **No cost tracking**: OpenAI usage costs not displayed
