# Git Butler - Research Report

## Overview

**GitButler** is a next-generation Git client created by **Scott Chacon** (co-founder of GitHub, author of "Pro Git"). It introduces "virtual branches" allowing developers to work on multiple branches simultaneously without context switching.

**Official Website:** https://gitbutler.com
**GitHub:** https://github.com/gitbutlerapp/gitbutler (16.7k+ stars)
**Docs:** https://docs.gitbutler.com

---

## Key Details

| Attribute | Value |
|-----------|-------|
| Creator | Scott Chacon (GitHub co-founder) |
| Tech Stack | Tauri + Svelte + Rust |
| Platforms | macOS, Windows, Linux |
| License | Fair Source (FSL) - converts to MIT after 2 years |
| Pricing | **Free** ($5/mo optional supporter tier) |
| GitHub Stars | 16.7k+ |

---

## Core Innovation: Virtual Branches

Unlike traditional Git where you work on one branch at a time, virtual branches let you:

- **Work on multiple branches simultaneously** - no switching/stashing
- **Drag changes between branches** - visual organization
- **Apply/unapply branches** - add or remove changes without losing work
- **Auto-merge cleanly** - branches from same working directory merge without conflicts

**Example:** You're developing a feature and spot a bug. Instead of stashing and switching branches, you drag the bug fix to a separate virtual branch, push it for review, while keeping the fix in your working directory.

---

## Claude Code Integration (Key for CC-Slack)

GitButler has **best-in-class Claude Code integration** via three methods:

### 1. Agents Tab (Built-in GUI)
- Run multiple Claude Code agents simultaneously
- Each branch gets its own AI assistant
- View token usage and cost per branch
- Auto-commit messages use your prompts

### 2. Claude Code Hooks (Auto-commit)
Configure hooks in Claude Code settings:
```json
{
  "hooks": {
    "pre-tool": "but claude pre-tool",
    "post-tool": "but claude post-tool",
    "stop": "but claude stop"
  }
}
```

**What this enables:**
- One commit per chat round
- One branch per Claude Code session
- Automatic branch creation per session ID
- No manual git commands needed

**Alternative:** Install via plugin:
```bash
/plugin marketplace add gitbutlerapp/claude
/plugin install gitbutler
```

### 3. MCP Server Integration
Works with Claude Code, Cursor, VSCode for automatic commit management.

---

## Managing Parallel AI Sessions

**The Problem GitButler Solves:**

Running multiple Claude Code instances in same directory risks:
- Everything committed to single branch
- One giant commit at the end
- Merge conflicts with yourself
- Need for git worktrees (with npm install overhead)

**GitButler's Solution:**

With lifecycle hooks, GitButler auto-sorts simultaneous AI sessions into separate branches. Three features = three clean branches, no conflicts, no worktrees.

---

## GitButler vs Traditional Git

| Feature | Traditional Git | GitButler |
|---------|----------------|-----------|
| Branch Model | One at a time | Multiple simultaneously |
| Context Switching | Stash/commit required | Not needed |
| Interface | CLI | Visual drag-and-drop |
| AI Integration | None | Native Claude Code support |
| Commit Organization | `git add -p`, `git rebase -i` | Visual drag between lanes |

---

## Relevance for CC-Slack

From the meeting, Richard mentioned:

> "It changed my entire flow... I would have another CLI here where I'd be doing git branch or git checkout. Now I just don't need to worry about creating any branches or switching between branches."

**Integration Ideas for CC-Slack:**

1. **Git view per agent** - Show branches/commits like GitButler does
2. **Auto-commit pattern** - Use same hooks approach
3. **Visual branch management** - Drag commits between agents
4. **Push/merge from UI** - No terminal needed

Richard specifically said:
> "Whatever UI that we build, ideally I wouldn't have to switch between our Slack app and git butler."

**Consider:** Either integrate GitButler-like functionality OR build on top of GitButler's MCP server.

---

## Key Blog Posts

- [Managing Multiple Claude Code Sessions Without Worktrees](https://blog.gitbutler.com/parallel-claude-code) - Directly relevant
- [GitButler's Claude Code tab](https://blog.gitbutler.com/agents-tab)
- [Building Virtual Branches](https://blog.gitbutler.com/building-virtual-branches)

---

## Sources

- https://gitbutler.com
- https://github.com/gitbutlerapp/gitbutler
- https://docs.gitbutler.com
- https://blog.gitbutler.com/parallel-claude-code
- https://docs.gitbutler.com/features/ai-integration/claude-code-hooks
