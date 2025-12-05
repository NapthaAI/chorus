# OpenAI Agents SDK Overview

The OpenAI Agents SDK is a TypeScript/JavaScript library for building agentic AI applications. It provides a lightweight framework for multi-agent workflows with built-in support for streaming, tools, and human-in-the-loop approvals.

## Installation

```bash
bun add @openai/agents openai zod@3
```

**Requirements:**
- Node.js 18+ (or Bun/Deno)
- Valid OpenAI API key (set `OPENAI_API_KEY` environment variable)

## Quick Start

```typescript
import { Agent, run } from '@openai/agents';

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are a helpful assistant',
});

const result = await run(agent, 'What is the capital of France?');
console.log(result.finalOutput);
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Agent Loop** | Built-in loop that handles tool calls, LLM responses, and iteration |
| **Streaming** | Real-time event streaming with `{ stream: true }` option |
| **Tools** | Built-in `WebSearchTool`, `ImageGenerationTool`, `CodeInterpreterTool` |
| **Handoffs** | Delegate between multiple specialized agents |
| **Guardrails** | Input validation running in parallel with agents |
| **Tracing** | Visualization, debugging, and monitoring of workflows |
| **Human-in-the-Loop** | Pause tool operations for user approval |

## Deep Research Models

OpenAI provides specialized models for multi-step research tasks:

| Model | ID | Description |
|-------|-----|-------------|
| **o4-mini** | `o4-mini-deep-research-2025-06-26` | Faster, cheaper research model |
| **o3** | `o3-deep-research-2025-06-26` | Full deep research capabilities |

Deep research models include native web search and are designed for complex, multi-step research requiring planning, synthesis, and tool use.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                          │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │
│  │ Agent config   │  │ Runner.run()   │  │ Stream events  │ │
│  │                │  │                │  │                │ │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘ │
│          │                   │                   │          │
├──────────┼───────────────────┼───────────────────┼──────────┤
│          │                   │                   │          │
│  ┌───────▼───────────────────▼───────────────────▼────────┐ │
│  │              @openai/agents SDK                         │ │
│  │  - Agent management                                     │ │
│  │  - Tool execution                                       │ │
│  │  - Streaming events                                     │ │
│  │  - Human-in-the-loop                                    │ │
│  └───────────────────────────┬────────────────────────────┘ │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     OpenAI API      │
                    │   (GPT, o-series)   │
                    └─────────────────────┘
```

## Comparison with Claude Agent SDK

| Aspect | Claude Agent SDK | OpenAI Agents SDK |
|--------|------------------|-------------------|
| **Package** | `@anthropic-ai/claude-agent-sdk` | `@openai/agents` |
| **Entry point** | `query()` async generator | `Agent` + `Runner.run()` |
| **Streaming** | `includePartialMessages: true` | `{ stream: true }` option |
| **Events** | `stream_event`, `assistant`, `result` | `raw_model_stream_event`, `run_item_stream_event`, `agent_updated_stream_event` |
| **Tools** | `canUseTool` callback | Built-in tools + custom functions |
| **Auth** | `ANTHROPIC_API_KEY` | `OPENAI_API_KEY` |
| **Sessions** | `options.resume` with session ID | Stateless (manage state externally) |
| **Best for** | Coding tasks, file editing | Research, multi-agent workflows |

## Basic Agent Configuration

```typescript
import { Agent, run, WebSearchTool } from '@openai/agents';

const researchAgent = new Agent({
  name: 'Research Agent',
  model: 'o4-mini-deep-research-2025-06-26',
  tools: [new WebSearchTool()],
  instructions: `You perform deep empirical research.
    Analyze multiple sources and synthesize findings.
    Provide citations for all claims.`
});

const result = await run(researchAgent, 'Research the latest trends in AI agents');
console.log(result.finalOutput);
```

## Streaming Configuration

```typescript
import { Agent, run } from '@openai/agents';

const agent = new Agent({
  name: 'Assistant',
  instructions: 'You are helpful',
});

const stream = await run(agent, 'Tell me a story', { stream: true });

// Process events as they arrive
for await (const event of stream) {
  if (event.type === 'raw_model_stream_event') {
    // Text delta from LLM
  }
  if (event.type === 'run_item_stream_event') {
    // Tool calls, outputs, messages
  }
  if (event.type === 'agent_updated_stream_event') {
    // Agent handoff occurred
  }
}

await stream.completed;
```

## Documentation Index

| Doc | Description |
|-----|-------------|
| [1-deep-research](./1-deep-research.md) | Deep Research models and configuration |
| [2-streaming](./2-streaming.md) | Streaming API and event handling |
| [3-chorus-integration](./3-chorus-integration.md) | Integration plan for Chorus |

## External References

- [OpenAI Agents SDK GitHub](https://github.com/openai/openai-agents-js)
- [Official Documentation](https://openai.github.io/openai-agents-js/)
- [NPM Package](https://www.npmjs.com/package/@openai/agents)
- [Deep Research Cookbook](https://cookbook.openai.com/examples/deep_research_api/introduction_to_deep_research_api_agents)
- [o4-mini-deep-research Model](https://platform.openai.com/docs/models/o4-mini-deep-research)
