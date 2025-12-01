# Slash Commands

How slash commands work with the Claude Agent SDK and Chorus.

---

## Overview

Slash commands are predefined prompts that users can invoke with `/command-name`. They provide shortcuts for common tasks like generating commit messages, explaining code, or running custom workflows.

**Types of Slash Commands:**
- **Built-in commands**: `/bug`, `/explain`, `/init`, `/compact`, etc.
- **Custom commands**: User-defined in `.claude/commands/` directory

---

## SDK Configuration

### Required Settings

For slash commands to work via the SDK, you must configure two critical options:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

const stream = query({
  prompt: "/my-command arg1 arg2",
  options: {
    // 1. Enable settings sources to load custom commands
    settingSources: ['project', 'user'],

    // 2. Use claude_code preset for command recognition
    systemPrompt: {
      type: 'preset',
      preset: 'claude_code'
    }
  }
});
```

### Why Both Are Required

| Option | Purpose |
|--------|---------|
| `settingSources: ['project', 'user']` | Loads `.claude/commands/` from project and user directories |
| `systemPrompt: { preset: 'claude_code' }` | Enables slash command recognition and execution |

**Without these settings**, the SDK treats `/command` as plain text, not a command invocation.

---

## Chorus Implementation

### SDK Service Configuration

In `agent-sdk-service.ts`, Chorus configures the SDK to support slash commands:

```typescript
const options: Parameters<typeof query>[0]['options'] = {
  cwd: repoPath,
  abortController,

  // Enable project and user settings for slash commands
  settingSources: ['project', 'user']
};

// Set system prompt with claude_code preset
if (!effectiveSessionId) {
  if (systemPromptContent) {
    // Append custom prompt to preset
    options.systemPrompt = {
      type: 'preset',
      preset: 'claude_code',
      append: systemPromptContent
    };
  } else {
    // Use preset alone
    options.systemPrompt = {
      type: 'preset',
      preset: 'claude_code'
    };
  }
}
```

### Message Input Flow

When a user types a slash command in Chorus:

1. **Autocomplete Dropdown**: `SlashCommandDropdown` shows matching commands
2. **Command Execution**: Sends `/command args` directly to SDK
3. **SDK Processing**: SDK recognizes and executes the command
4. **Response Streaming**: Results stream back to the chat

```typescript
// MessageInput.tsx - executeSlashCommand
const executeSlashCommand = async (command: SlashCommand) => {
  closeCommand();

  // Build full command message
  const commandWithSlash = `/${command.name}`;
  const fullMessage = message.trim();

  let commandMessage = commandWithSlash;
  if (fullMessage.startsWith(commandWithSlash)) {
    const args = fullMessage.slice(commandWithSlash.length).trim();
    if (args) {
      commandMessage = `${commandWithSlash} ${args}`;
    }
  }

  // Send to SDK - it handles command expansion
  setMessage('');
  await sendMessage(commandMessage, workspace.id, agent.id, workspace.path);
};
```

---

## Creating Custom Commands

### File Location

Custom commands live in `.claude/commands/`:

```
workspace/
├── .claude/
│   └── commands/
│       ├── review.md       # /review command
│       ├── test-plan.md    # /test-plan command
│       └── docs.md         # /docs command
└── src/
```

### Command File Format

Each `.md` file defines a command. The filename (without extension) becomes the command name.

**Simple Command (`review.md`):**
```markdown
Review the code changes in this conversation and provide feedback on:
- Code quality and best practices
- Potential bugs or edge cases
- Performance considerations
- Security concerns
```

**Command with Arguments (`explain.md`):**
```markdown
Explain the following code in detail, focusing on:
- What the code does
- How it works step by step
- Any patterns or techniques used

Code to explain:
$ARGUMENTS
```

### Argument Placeholder

Use `$ARGUMENTS` to inject user-provided arguments:

```bash
/explain src/utils/parser.ts
```

Becomes:
```markdown
Explain the following code...

Code to explain:
src/utils/parser.ts
```

---

## Built-in Commands

The Claude Code preset includes these built-in commands:

| Command | Description |
|---------|-------------|
| `/bug` | Analyze and fix a bug |
| `/explain` | Explain code or concepts |
| `/init` | Initialize a new project |
| `/compact` | Summarize conversation context |
| `/review` | Code review |
| `/test` | Generate tests |
| `/docs` | Generate documentation |
| `/help` | Show available commands |

---

## Loading Commands in Chorus

Chorus loads commands from the workspace for autocomplete:

```typescript
// workspace-store.ts
loadCommands: async (workspaceId: string) => {
  const workspace = get().workspaces.find(w => w.id === workspaceId);
  if (!workspace) return;

  const result = await window.api.workspace.getSlashCommands(workspace.path);
  if (result.success && result.data) {
    set((state) => {
      state.slashCommands.set(workspaceId, result.data);
    });
  }
}
```

### Command Discovery

Commands are discovered from:
1. `.claude/commands/` in the workspace
2. User-level commands in `~/.claude/commands/`

---

## Troubleshooting

### Commands Not Recognized

**Symptom**: `/command` is sent as plain text, not executed.

**Causes:**
1. Missing `settingSources` option
2. Missing `systemPrompt` preset
3. Command file not in correct location

**Fix:**
```typescript
options: {
  settingSources: ['project', 'user'],
  systemPrompt: { type: 'preset', preset: 'claude_code' }
}
```

### Commands Not Appearing in Autocomplete

**Symptom**: Custom commands don't show in the dropdown.

**Causes:**
1. Command file not in `.claude/commands/`
2. File extension not `.md`
3. Workspace not refreshed

**Fix:**
- Ensure file is at `.claude/commands/your-command.md`
- Reload the workspace or commands

### Session Resume Doesn't Include Commands

**Note**: `systemPrompt` is only set for new sessions. Resumed sessions inherit their original configuration.

---

## Best Practices

1. **Descriptive Names**: Use clear command names like `/review-security` not `/rs`

2. **Focused Prompts**: Each command should do one thing well

3. **Document Commands**: Add comments at the top of command files

4. **Use Arguments**: Make commands flexible with `$ARGUMENTS`

5. **Workspace-Specific**: Put project-specific commands in `.claude/commands/`, general commands in `~/.claude/commands/`

---

## Sources

- https://platform.claude.com/docs/en/agent-sdk/slash-commands
- https://code.claude.com/docs/en/custom-commands
- https://platform.claude.com/docs/en/agent-sdk/modifying-system-prompts
