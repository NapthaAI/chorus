# Streaming

The OpenAI Agents SDK supports real-time event streaming for responsive UIs. This document covers streaming configuration, event types, and integration patterns.

## Default Behavior

By default, `run()` returns a completed result:

```typescript
import { Agent, run } from '@openai/agents';

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are helpful'
});

// Waits for full completion
const result = await run(agent, 'Hello');
console.log(result.finalOutput);  // Complete text
```

---

## Enabling Streaming

Pass `{ stream: true }` to receive events as they occur:

```typescript
import { Agent, run } from '@openai/agents';

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are helpful'
});

const stream = await run(agent, 'Tell me a story', { stream: true });

for await (const event of stream) {
  console.log(event.type, event);
}

await stream.completed;  // Ensure all events processed
```

---

## Event Types

The SDK emits three categories of events:

### 1. Raw Model Stream Events

Direct LLM token events for real-time text display:

```typescript
interface RawModelStreamEvent {
  type: 'raw_model_stream_event';
  data: {
    type: string;
    delta?: {
      type: 'text_delta';
      text: string;
    };
    // ... other delta types
  };
}
```

**Usage:**

```typescript
for await (const event of stream) {
  if (event.type === 'raw_model_stream_event') {
    const delta = event.data?.delta;
    if (delta?.type === 'text_delta' && delta.text) {
      process.stdout.write(delta.text);  // Real-time text
    }
  }
}
```

### 2. Run Item Stream Events

SDK-level events for tool calls, outputs, and messages:

```typescript
interface RunItemStreamEvent {
  type: 'run_item_stream_event';
  name: string;  // Event name
  item: unknown;  // Event payload
}
```

**Event Names:**

| Name | Description |
|------|-------------|
| `message_output_created` | New message generated |
| `tool_called` | Tool invocation started |
| `tool_output` | Tool returned result |
| `handoff_requested` | Agent requesting handoff |
| `handoff_occurred` | Handoff completed |
| `reasoning_item_created` | Reasoning step added |

**Usage:**

```typescript
for await (const event of stream) {
  if (event.type === 'run_item_stream_event') {
    switch (event.name) {
      case 'tool_called':
        console.log('Tool:', event.item.name);
        console.log('Input:', event.item.input);
        break;

      case 'tool_output':
        console.log('Output:', event.item.output);
        break;

      case 'message_output_created':
        console.log('Message:', event.item.content);
        break;

      case 'handoff_occurred':
        console.log('Handed off to:', event.item.targetAgent);
        break;
    }
  }
}
```

### 3. Agent Updated Stream Events

Notifications when the active agent changes (multi-agent workflows):

```typescript
interface AgentUpdatedStreamEvent {
  type: 'agent_updated_stream_event';
  agent: Agent;  // New active agent
}
```

**Usage:**

```typescript
for await (const event of stream) {
  if (event.type === 'agent_updated_stream_event') {
    console.log(`Now running: ${event.agent.name}`);
  }
}
```

---

## Complete Streaming Example

```typescript
import { Agent, run, WebSearchTool } from '@openai/agents';

async function streamResearch(query: string) {
  const agent = new Agent({
    name: 'Researcher',
    model: 'o4-mini-deep-research-2025-06-26',
    tools: [new WebSearchTool()],
    instructions: 'Perform thorough research.'
  });

  const stream = await run(agent, query, { stream: true });

  let currentText = '';
  let toolCalls: { name: string; input: unknown; output?: unknown }[] = [];

  for await (const event of stream) {
    switch (event.type) {
      case 'raw_model_stream_event':
        handleTextDelta(event.data);
        break;

      case 'run_item_stream_event':
        handleRunItem(event);
        break;

      case 'agent_updated_stream_event':
        console.log(`\n[Agent: ${event.agent.name}]\n`);
        break;
    }
  }

  await stream.completed;

  return {
    text: currentText,
    toolCalls
  };

  function handleTextDelta(data: unknown) {
    const delta = data?.delta;
    if (delta?.type === 'text_delta' && delta.text) {
      currentText += delta.text;
      process.stdout.write(delta.text);
    }
  }

  function handleRunItem(event: { name: string; item: unknown }) {
    switch (event.name) {
      case 'tool_called':
        const call = { name: event.item.name, input: event.item.input };
        toolCalls.push(call);
        console.log(`\n[Calling: ${call.name}]\n`);
        break;

      case 'tool_output':
        const lastCall = toolCalls[toolCalls.length - 1];
        if (lastCall) lastCall.output = event.item.output;
        break;
    }
  }
}
```

---

## Text Stream Helper

Convert event stream to a simple text stream:

```typescript
import { Agent, run } from '@openai/agents';

const agent = new Agent({
  name: 'Storyteller',
  instructions: 'Tell engaging stories.'
});

const stream = await run(agent, 'Tell me a story about a robot', {
  stream: true
});

// Convert to Node.js readable stream
const textStream = stream.toTextStream({
  compatibleWithNodeStreams: true
});

// Pipe to stdout
textStream.pipe(process.stdout);

await stream.completed;
```

---

## Human-in-the-Loop with Streaming

Handle tool approval interruptions:

```typescript
import { Agent, run, WebSearchTool } from '@openai/agents';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const agent = new Agent({
  name: 'Assistant',
  tools: [new WebSearchTool()],
  instructions: 'Help the user with research.'
});

let stream = await run(agent, 'Search for AI news', { stream: true });

// Process events
stream.toTextStream({ compatibleWithNodeStreams: true }).pipe(process.stdout);
await stream.completed;

// Handle interruptions (pending tool approvals)
while (stream.interruptions?.length) {
  const state = stream.state;

  for (const interruption of stream.interruptions) {
    const approved = await askUser(
      `Approve ${interruption.name}? (y/n): `
    );

    if (approved) {
      state.approve(interruption);
    } else {
      state.reject(interruption);
    }
  }

  // Resume with updated state
  stream = await run(agent, state, { stream: true });
  stream.toTextStream({ compatibleWithNodeStreams: true }).pipe(process.stdout);
  await stream.completed;
}

rl.close();

function askUser(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}
```

---

## Cancellation

### Using AbortController

```typescript
const controller = new AbortController();

const stream = await run(agent, 'Long task', {
  stream: true,
  signal: controller.signal
});

// Cancel after 30 seconds
setTimeout(() => {
  controller.abort();
}, 30000);

try {
  for await (const event of stream) {
    // Process events
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Cancelled by user');
  }
}
```

### Graceful Shutdown

```typescript
let shouldStop = false;

// UI button handler
cancelButton.onclick = () => {
  shouldStop = true;
};

for await (const event of stream) {
  if (shouldStop) {
    // Allow current event to complete, then exit
    break;
  }
  // Process event
}
```

---

## Comparison with Claude SDK Streaming

| Aspect | Claude SDK | OpenAI Agents SDK |
|--------|------------|-------------------|
| **Enable streaming** | `includePartialMessages: true` | `{ stream: true }` |
| **Text events** | `stream_event` with `content_block_delta` | `raw_model_stream_event` |
| **Tool events** | `assistant` message with `tool_use` | `run_item_stream_event` |
| **Agent switch** | N/A (single agent) | `agent_updated_stream_event` |
| **Interruption** | `stream.interrupt()` | `stream.interruptions` |
| **Text helper** | Manual parsing | `stream.toTextStream()` |

### Event Type Mapping

```typescript
// Claude SDK
if (msg.type === 'stream_event') {
  const event = msg.event;
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    process.stdout.write(event.delta.text);
  }
}

// OpenAI Agents SDK
if (event.type === 'raw_model_stream_event') {
  const delta = event.data?.delta;
  if (delta?.type === 'text_delta' && delta.text) {
    process.stdout.write(delta.text);
  }
}
```

---

## Electron IPC Integration

For Chorus-style Electron apps, forward events via IPC:

```typescript
// Main process
import { Agent, run } from '@openai/agents';
import { BrowserWindow } from 'electron';

export async function sendResearchMessage(
  conversationId: string,
  message: string,
  mainWindow: BrowserWindow
) {
  const agent = new Agent({
    name: 'Research Agent',
    model: 'o4-mini-deep-research-2025-06-26',
    tools: [new WebSearchTool()],
    instructions: 'Perform research.'
  });

  const stream = await run(agent, message, { stream: true });

  for await (const event of stream) {
    // Forward text deltas
    if (event.type === 'raw_model_stream_event') {
      const delta = event.data?.delta;
      if (delta?.type === 'text_delta' && delta.text) {
        mainWindow.webContents.send('agent:stream-delta', {
          conversationId,
          delta: delta.text
        });
      }
    }

    // Forward tool events
    if (event.type === 'run_item_stream_event') {
      if (event.name === 'tool_called') {
        mainWindow.webContents.send('agent:tool-use', {
          conversationId,
          tool: event.item.name,
          input: event.item.input
        });
      }
    }
  }

  await stream.completed;

  // Clear streaming state
  mainWindow.webContents.send('agent:stream-clear', { conversationId });

  return stream.finalOutput;
}
```

```typescript
// Renderer process
useEffect(() => {
  const unsubscribe = window.api.agent.onStreamDelta((event) => {
    if (event.conversationId === currentConversationId) {
      setStreamingText(prev => prev + event.delta);
    }
  });

  return unsubscribe;
}, [currentConversationId]);
```

---

## Best Practices

### 1. Always Await Completion

```typescript
const stream = await run(agent, prompt, { stream: true });

for await (const event of stream) {
  // Process events
}

// Critical: wait for final cleanup
await stream.completed;
```

### 2. Debounce UI Updates

```typescript
import { debounce } from 'lodash';

const updateUI = debounce((text: string) => {
  setDisplayText(text);
}, 16);  // ~60fps

for await (const event of stream) {
  if (event.type === 'raw_model_stream_event') {
    const delta = event.data?.delta?.text;
    if (delta) {
      accumulatedText += delta;
      updateUI(accumulatedText);
    }
  }
}
```

### 3. Track Tool Call Correlation

```typescript
const toolCallMap = new Map<string, { name: string; input: unknown }>();

for await (const event of stream) {
  if (event.type === 'run_item_stream_event') {
    if (event.name === 'tool_called') {
      toolCallMap.set(event.item.id, {
        name: event.item.name,
        input: event.item.input
      });
    }
    if (event.name === 'tool_output') {
      const call = toolCallMap.get(event.item.toolCallId);
      if (call) {
        console.log(`${call.name} completed:`, event.item.output);
      }
    }
  }
}
```

### 4. Handle Errors in Stream

```typescript
try {
  for await (const event of stream) {
    // Process events
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Stream cancelled');
  } else if (error.status === 429) {
    console.log('Rate limited, retrying...');
    await sleep(5000);
    // Retry logic
  } else {
    console.error('Stream error:', error);
  }
}
```

---

## References

- [OpenAI Agents SDK Streaming Guide](https://openai.github.io/openai-agents-js/guides/streaming/)
- [GitHub: openai-agents-js](https://github.com/openai/openai-agents-js)
- [Streaming Events Reference](https://openai.github.io/openai-agents-python/ref/stream_events/)
