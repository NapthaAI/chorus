# Deep Research

OpenAI's Deep Research models are specialized for complex, multi-step research tasks that require planning, web search, synthesis, and multi-step reasoning.

## When to Use Deep Research

**Good use cases:**
- Architectural research and technology analysis
- Best practices investigation
- Market research and competitive analysis
- Technical documentation synthesis
- Bug analysis requiring external context
- Multi-source fact verification

**Not recommended for:**
- Simple fact lookups (use standard GPT models)
- Short-form chat or Q&A
- Tasks not requiring web search
- Real-time interactive conversations

## Available Models

| Model | ID | Characteristics |
|-------|-----|-----------------|
| **o4-mini** | `o4-mini-deep-research-2025-06-26` | Faster, more affordable, good intelligence |
| **o3** | `o3-deep-research-2025-06-26` | Full capabilities, slower, more expensive |

Both models include native `web_search` tool access (adds additional API cost).

## Basic Usage

```typescript
import { Agent, run, WebSearchTool } from '@openai/agents';

const researchAgent = new Agent({
  name: 'Research Agent',
  model: 'o4-mini-deep-research-2025-06-26',
  tools: [new WebSearchTool()],
  instructions: `You perform deep empirical research based on the user's question.

    Guidelines:
    - Search multiple authoritative sources
    - Cross-reference information for accuracy
    - Provide citations for all claims
    - Synthesize findings into actionable insights
    - Acknowledge limitations and gaps in available information`
});

const result = await run(researchAgent,
  'What are the best practices for implementing AI agents in production systems?'
);

console.log(result.finalOutput);
```

## Streaming Research Progress

Deep research can take several minutes. Stream progress to show activity:

```typescript
import { Agent, run, WebSearchTool } from '@openai/agents';

const researchAgent = new Agent({
  name: 'Research Agent',
  model: 'o4-mini-deep-research-2025-06-26',
  tools: [new WebSearchTool()],
  instructions: 'You perform deep empirical research.'
});

const stream = await run(researchAgent, 'Research query here', { stream: true });

for await (const event of stream) {
  if (event.type === 'raw_model_stream_event') {
    // Text being generated
    const delta = event.data?.delta;
    if (delta?.type === 'text_delta' && delta.text) {
      process.stdout.write(delta.text);
    }
  }

  if (event.type === 'run_item_stream_event') {
    switch (event.name) {
      case 'tool_called':
        console.log(`\n[Searching: ${event.item.input?.query || 'web'}]`);
        break;
      case 'tool_output':
        console.log(`[Found ${event.item.output?.results?.length || 0} results]`);
        break;
    }
  }

  if (event.type === 'agent_updated_stream_event') {
    console.log(`\n[Agent: ${event.agent.name}]`);
  }
}

await stream.completed;
console.log('\n\nResearch complete!');
```

## Multi-Agent Research Pipeline

For complex research, use multiple specialized agents:

```typescript
import { Agent, run, handoff, WebSearchTool } from '@openai/agents';

// Triage agent decides approach
const triageAgent = new Agent({
  name: 'Triage',
  model: 'gpt-4o',
  instructions: `Analyze the research request and determine:
    1. What specific questions need answering
    2. Which domains to search
    3. What format the output should take`,
  handoffs: [handoff(researchAgent), handoff(synthesisAgent)]
});

// Research agent performs deep search
const researchAgent = new Agent({
  name: 'Researcher',
  model: 'o4-mini-deep-research-2025-06-26',
  tools: [new WebSearchTool()],
  instructions: 'Perform thorough research on assigned topics.'
});

// Synthesis agent compiles findings
const synthesisAgent = new Agent({
  name: 'Synthesizer',
  model: 'gpt-4o',
  instructions: `Compile research findings into a structured report:
    - Executive summary
    - Key findings
    - Supporting evidence
    - Recommendations
    - Sources`
});

const result = await run(triageAgent, 'Research AI agent architectures for enterprise');
```

## Configuration Options

### Timeout Settings

Deep research can take several minutes. Configure appropriate timeouts:

```typescript
import OpenAI from 'openai';
import { Agent, run, setDefaultOpenAIClient } from '@openai/agents';

// Configure client with extended timeout
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 600000  // 10 minutes
});

setDefaultOpenAIClient(client);

const agent = new Agent({
  name: 'Research Agent',
  model: 'o4-mini-deep-research-2025-06-26',
  // ...
});
```

### Custom Instructions

Tailor research behavior with detailed instructions:

```typescript
const agent = new Agent({
  name: 'Technical Research Agent',
  model: 'o4-mini-deep-research-2025-06-26',
  tools: [new WebSearchTool()],
  instructions: `You are a technical research assistant.

    Research methodology:
    1. Start with official documentation and specifications
    2. Check GitHub repositories for implementation examples
    3. Review academic papers for theoretical foundations
    4. Search developer forums for practical insights
    5. Look for recent blog posts for current best practices

    Output format:
    - Use markdown formatting
    - Include code examples where relevant
    - Cite all sources with URLs
    - Rate confidence level for each finding (high/medium/low)
    - Highlight areas needing further investigation

    Quality standards:
    - Prefer primary sources over secondary
    - Note publication dates for time-sensitive information
    - Flag conflicting information between sources
    - Distinguish between facts, opinions, and speculation`
});
```

## Saving Research Output

Automatically save research results to files:

```typescript
import { Agent, run, WebSearchTool } from '@openai/agents';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

async function performResearch(
  query: string,
  outputDir: string
): Promise<string> {
  const agent = new Agent({
    name: 'Research Agent',
    model: 'o4-mini-deep-research-2025-06-26',
    tools: [new WebSearchTool()],
    instructions: 'Perform thorough research and provide a comprehensive report.'
  });

  const result = await run(agent, query);

  // Generate filename from query
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 50);
  const filename = `${timestamp}-${slug}.md`;

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // Write research output
  const outputPath = path.join(outputDir, filename);
  const content = `# Research: ${query}

Generated: ${new Date().toISOString()}
Model: o4-mini-deep-research

---

${result.finalOutput}
`;

  await writeFile(outputPath, content);

  return outputPath;
}

// Usage
const outputFile = await performResearch(
  'Best practices for Electron app security',
  './research'
);
console.log(`Research saved to: ${outputFile}`);
```

## Cost Considerations

Deep research models have additional costs:

| Component | Cost Factor |
|-----------|-------------|
| **Base model** | Per input/output token |
| **Web search** | Per search query executed |
| **Extended context** | Higher token usage for synthesis |

**Cost optimization tips:**
- Use `o4-mini` for routine research (faster, cheaper)
- Reserve `o3` for complex multi-domain research
- Provide specific, focused queries to reduce search iterations
- Set reasonable output length limits in instructions

## Error Handling

```typescript
import { Agent, run, WebSearchTool } from '@openai/agents';

async function safeResearch(query: string) {
  const agent = new Agent({
    name: 'Research Agent',
    model: 'o4-mini-deep-research-2025-06-26',
    tools: [new WebSearchTool()],
    instructions: 'Perform research on the given topic.'
  });

  try {
    const stream = await run(agent, query, { stream: true });

    let output = '';
    for await (const event of stream) {
      if (event.type === 'raw_model_stream_event') {
        const delta = event.data?.delta?.text;
        if (delta) output += delta;
      }
    }

    await stream.completed;
    return { success: true, output };

  } catch (error) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Research was cancelled' };
    }
    if (error.status === 429) {
      return { success: false, error: 'Rate limit exceeded, try again later' };
    }
    if (error.status === 500) {
      return { success: false, error: 'OpenAI service error, try again' };
    }
    return { success: false, error: error.message };
  }
}
```

## Best Practices

### 1. Provide Context

```typescript
// Good: Specific context
const query = `Research best practices for implementing OAuth 2.0
  in Electron desktop applications. Focus on:
  - Secure token storage
  - PKCE flow implementation
  - Handling refresh tokens`;

// Avoid: Vague queries
const vague = 'Tell me about authentication';
```

### 2. Set Output Expectations

```typescript
const agent = new Agent({
  name: 'Research Agent',
  model: 'o4-mini-deep-research-2025-06-26',
  tools: [new WebSearchTool()],
  instructions: `Research the topic and provide:
    - Executive summary (2-3 sentences)
    - 5-7 key findings with sources
    - Practical recommendations
    - Further reading suggestions

    Keep total output under 2000 words.`
});
```

### 3. Handle Long-Running Research

```typescript
// Show progress indicators
const stream = await run(agent, query, { stream: true });

let searchCount = 0;
let startTime = Date.now();

for await (const event of stream) {
  if (event.type === 'run_item_stream_event' && event.name === 'tool_called') {
    searchCount++;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[${elapsed}s] Search #${searchCount}...`);
  }
}
```

## References

- [Deep Research API Cookbook](https://cookbook.openai.com/examples/deep_research_api/introduction_to_deep_research_api_agents)
- [o4-mini-deep-research Model](https://platform.openai.com/docs/models/o4-mini-deep-research)
- [Introducing Deep Research](https://openai.com/index/introducing-deep-research/)
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-js/)
