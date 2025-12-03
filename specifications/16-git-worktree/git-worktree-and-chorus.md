# Git Worktrees and Chorus: Technical Integration Guide

## What Are Git Worktrees?

Git worktrees allow a single repository to have **multiple working directories**, each with its own checked-out branch. This is a native Git feature (since Git 2.5) that solves the fundamental limitation of having only one branch checked out at a time.

### Standard Git vs Git Worktrees

**Standard Git (One Working Directory):**
```
/myproject/           # Only ONE branch checked out
├── .git/
├── src/
└── package.json
```

**With Git Worktrees (Multiple Working Directories):**
```
/myproject/                    # Main worktree (e.g., main branch)
├── .git/
│   └── worktrees/             # Metadata for linked worktrees
│       ├── feature-auth/
│       └── bugfix-api/
├── src/
└── package.json

/myproject-worktrees/          # Linked worktrees
├── feature-auth/              # feature/auth branch
│   ├── .git                   # File (not dir) pointing to main .git
│   ├── src/
│   └── package.json
└── bugfix-api/                # bugfix/api branch
    ├── .git
    ├── src/
    └── package.json
```

### Key Git Worktree Commands

```bash
# Create worktree with new branch
git worktree add ../feature-auth -b feature/auth main

# Create worktree for existing branch
git worktree add ../bugfix-api bugfix/api

# List all worktrees
git worktree list
# Output:
# /myproject           abc1234 [main]
# /myproject-feature   def5678 [feature/auth]

# Remove worktree
git worktree remove ../feature-auth

# Prune stale worktree metadata
git worktree prune
```

## The Concurrency Problem in Chorus

### Current Architecture (Without Worktrees)

```
Workspace: /repos/mcplatform
├── .git/
└── ... (working files)

┌─────────────────────────────────────────────────────────────┐
│                    Chorus Application                        │
├─────────────────────────────────────────────────────────────┤
│  Agent A (Conversation 1)     │  Agent B (Conversation 2)   │
│  Branch: agent/feature/abc    │  Branch: agent/bugfix/def   │
│  cwd: /repos/mcplatform       │  cwd: /repos/mcplatform     │
│           ↓                   │           ↓                  │
│     SAME DIRECTORY!           │     SAME DIRECTORY!          │
└─────────────────────────────────────────────────────────────┘
```

**What Happens:**
1. Agent A starts → checks out `agent/feature/abc`
2. Agent B starts → checks out `agent/bugfix/def` (overwrites A's checkout!)
3. Agent A writes file → goes to B's branch (WRONG!)
4. Commits get mixed up between branches

### With Worktrees

```
Workspace: /repos/mcplatform (main branch - untouched)
├── .git/
├── .chorus-worktrees/
│   ├── conv-abc1234/          # Agent A's isolated workspace
│   │   ├── .git               # Points to main .git
│   │   └── ... (files on agent/feature/abc)
│   └── conv-def5678/          # Agent B's isolated workspace
│       ├── .git
│       └── ... (files on agent/bugfix/def)
└── ... (main working files)

┌─────────────────────────────────────────────────────────────┐
│                    Chorus Application                        │
├─────────────────────────────────────────────────────────────┤
│  Agent A (Conversation 1)     │  Agent B (Conversation 2)   │
│  Branch: agent/feature/abc    │  Branch: agent/bugfix/def   │
│  cwd: .../conv-abc1234        │  cwd: .../conv-def5678      │
│           ↓                   │           ↓                  │
│   ISOLATED DIRECTORY!         │   ISOLATED DIRECTORY!        │
└─────────────────────────────────────────────────────────────┘
```

**What Happens:**
1. Agent A starts → worktree created at `.chorus-worktrees/conv-abc1234/`
2. Agent B starts → worktree created at `.chorus-worktrees/conv-def5678/`
3. Agent A writes file → goes to A's worktree (CORRECT!)
4. Agent B writes file → goes to B's worktree (CORRECT!)
5. Commits stay in correct branches

## How Chorus Integrates Worktrees

### Worktree Location Strategy

Chorus creates worktrees in a `.chorus-worktrees/` directory inside the repository:

```
/repos/mcplatform/
├── .chorus-worktrees/         # Gitignored
│   ├── conv-abc1234/          # Conversation worktree
│   ├── conv-def5678/          # Another conversation
│   └── conv-ghi9012/          # Yet another
├── .git/
├── .gitignore                 # Contains ".chorus-worktrees/"
└── src/
```

**Why Inside the Repo:**
- Easy to find and manage
- Moves with the repo if relocated
- Clear ownership (one repo = its worktrees)

**Alternative (Outside Repo):**
```
~/.chorus/worktrees/
├── {workspace-hash}/
│   ├── conv-abc1234/
│   └── conv-def5678/
```

### Conversation-Worktree Lifecycle

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ New Conversation │     │ Send Message     │     │ Agent Processes  │
│                  │ ──→ │                  │ ──→ │                  │
│ (no worktree yet)│     │ Create worktree  │     │ cwd = worktree   │
└──────────────────┘     │ if auto-branch   │     │ path             │
                         └──────────────────┘     └──────────────────┘
                                                          │
                                                          ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Merge Branch     │     │ Conversation     │     │ Files Written    │
│                  │ ←── │ Ends/Deleted     │ ←── │ to Worktree      │
│ Cleanup worktree │     │ Cleanup prompt   │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Data Flow

1. **Conversation Created**
   - No worktree yet (lazy creation)

2. **First Message Sent** (with auto-branch enabled)
   ```typescript
   // Generate branch name
   const branchName = `agent/${agentName}/${sessionId.slice(0,7)}`

   // Create worktree
   const worktreePath = `/repos/project/.chorus-worktrees/${conversationId}`
   await git.worktree.add(worktreePath, branchName, 'main')

   // Store mapping
   conversation.worktreePath = worktreePath
   conversation.branchName = branchName
   ```

3. **Agent SDK Initialized**
   ```typescript
   const sdkOptions = {
     cwd: conversation.worktreePath || repoPath,  // Use worktree!
     // ... other options
   }
   ```

4. **Agent Makes File Changes**
   - Write/Edit tools operate in worktree
   - Changes isolated to conversation's branch

5. **Auto-Commit (if enabled)**
   - Commit goes to worktree's branch
   - Main repo branch unchanged

6. **Conversation Resumed**
   - Existing worktree detected
   - Same `cwd` used

7. **Branch Merged**
   - Worktree cleaned up (if auto-cleanup enabled)

### State Tracking

**Per-Conversation:**
```typescript
interface Conversation {
  id: string
  branchName: string | null      // e.g., "agent/feature-dev/abc1234"
  worktreePath: string | null    // e.g., "/repos/project/.chorus-worktrees/abc1234"
  sessionId: string | null
  // ... other fields
}
```

**Per-Workspace:**
```typescript
interface GitSettings {
  autoBranch: boolean           // Create branch per session
  autoCommit: boolean           // Commit per turn
  useWorktrees: boolean         // Use worktrees for isolation
  worktreeLocation: 'inside' | 'outside'
  autoCleanupWorktrees: boolean
}
```

## File Browser Context

### The Challenge

When viewing a conversation in Chorus, the file browser needs to show the **correct files for that conversation's worktree**, not the main repository. This is critical for:

1. **Accurate File Display** - Show what the agent actually sees
2. **Branch Context** - Make it clear which branch is being viewed
3. **Edit Consistency** - Edits go to the right place

### Current vs Desired Behavior

**Current (Without Worktrees):**
```
┌────────────────────────────────────────────────────────────┐
│ File Browser                                               │
├────────────────────────────────────────────────────────────┤
│ 📁 src/                                     (main branch)  │
│   📄 app.ts                                               │
│   📄 index.ts                                             │
├────────────────────────────────────────────────────────────┤
│ ⚠️ Always shows main repo, regardless of conversation      │
└────────────────────────────────────────────────────────────┘
```

**Desired (With Worktrees):**
```
┌────────────────────────────────────────────────────────────┐
│ File Browser                    🌿 agent/feature-auth/abc │
├────────────────────────────────────────────────────────────┤
│ 📁 src/                                                    │
│   📄 app.ts              ← from worktree, not main repo    │
│   📄 index.ts                                             │
│   📄 auth.ts (new)       ← only exists in this worktree   │
├────────────────────────────────────────────────────────────┤
│ 📍 Viewing: .chorus-worktrees/conv-abc1234                │
└────────────────────────────────────────────────────────────┘
```

### Implementation: Context-Aware File Browser

**1. File Browser Header with Branch Indicator**

```tsx
function FileBrowser({ conversationId, workspacePath }: Props) {
  const conversation = useConversation(conversationId)

  // Determine which path to show
  const browsingPath = conversation?.worktreePath || workspacePath
  const branchName = conversation?.branchName

  return (
    <div className="file-browser">
      {/* Branch/Worktree Indicator */}
      <div className="browser-header">
        <div className="branch-indicator">
          <BranchIcon />
          <span className="branch-name">
            {branchName || 'main'}
          </span>
          {conversation?.worktreePath && (
            <span className="worktree-badge">worktree</span>
          )}
        </div>
      </div>

      {/* File Tree - uses worktree path */}
      <FileTree rootPath={browsingPath} />

      {/* Path Context */}
      {conversation?.worktreePath && (
        <div className="path-context">
          📍 {getRelativePath(conversation.worktreePath)}
        </div>
      )}
    </div>
  )
}
```

**2. Tab Title with Branch Context**

```tsx
// When opening a file from a worktree conversation
function FileTab({ filePath, conversation }: Props) {
  const fileName = path.basename(filePath)
  const branchShort = conversation?.branchName?.split('/').pop()

  return (
    <div className="tab">
      <span className="filename">{fileName}</span>
      {conversation?.worktreePath && (
        <span className="branch-context">
          [{branchShort}]
        </span>
      )}
    </div>
  )
}
```

**3. Details Panel File Links**

```tsx
function ConversationDetails({ conversationId }: Props) {
  const conversation = useConversation(conversationId)
  const files = useConversationFiles(conversationId)

  return (
    <div className="details-panel">
      <h3>
        Files Changed
        {conversation?.branchName && (
          <span className="branch-badge">
            {conversation.branchName}
          </span>
        )}
      </h3>

      {files.map(file => (
        <div
          key={file.path}
          onClick={() => openFile(file.path, conversation?.worktreePath)}
          className="file-item"
        >
          <FileIcon status={file.status} />
          <span className="filename">{file.name}</span>
          <span className="context">(in worktree)</span>
        </div>
      ))}
    </div>
  )
}
```

**4. Split Pane: Chat Left, Files Right**

```
┌─────────────────────────────────────────────────────────────────┐
│ [Chat: Feature Agent] [src/auth.ts]                      [main]│
├──────────────────────────┬──────────────────────────────────────┤
│                          │ 🌿 agent/feature-auth/abc1234        │
│  Chat with Agent A       │ ┌──────────────────────────────────┐ │
│                          │ │ 📁 src/                          │ │
│  User: Add auth          │ │   📄 app.ts                      │ │
│                          │ │   📄 auth.ts ★                   │ │
│  Agent: I'll create      │ │   📄 index.ts                    │ │
│  src/auth.ts...          │ └──────────────────────────────────┘ │
│                          │                                      │
│                          │ Worktree: .chorus-worktrees/abc...   │
└──────────────────────────┴──────────────────────────────────────┘
```

### Visual Indicators

| Element | No Worktree | With Worktree |
|---------|-------------|---------------|
| Branch badge | `main` | `agent/feature-auth/abc` |
| Path display | `/repos/project` | `.chorus-worktrees/conv-abc` |
| File browser | Main repo files | Worktree files |
| Tab title | `auth.ts` | `auth.ts [abc]` |
| Details files | Direct repo path | Worktree-relative path |

### Switching Between Contexts

When user switches between conversations:

```typescript
// In workspace-store.ts
selectConversation: (conversationId) => {
  const conversation = getConversation(conversationId)

  // Update file browser context
  set({
    currentBrowsingPath: conversation?.worktreePath || workspace.path,
    currentBranchContext: conversation?.branchName || null
  })
}
```

## GitButler Comparison

| Feature | GitButler | Chorus with Worktrees |
|---------|-----------|----------------------|
| **Approach** | Virtual branches (uncommitted changes) | Git worktrees (real directories) |
| **Concurrent branches** | Yes, via hunk tracking | Yes, via separate directories |
| **Commit model** | In-memory tree construction | Standard git commits |
| **Use case** | Human developer organizing changes | AI agents working in parallel |
| **UI** | Visual lanes for change assignment | Conversation-per-worktree |
| **Git compatibility** | Proprietary layer on top | Native git feature |

**Why Worktrees Over GitButler for Chorus:**
1. Agents need real filesystem paths (`cwd` for SDK)
2. Agents commit frequently (auto-commit per turn)
3. No UI for "dragging changes between lanes"
4. Standard git commands work normally
5. No proprietary tooling dependency

## Benefits Summary

### For Users

1. **True Parallel Agents** - Run multiple agents without conflicts
2. **Isolated Work** - Each conversation's changes stay separate
3. **Easy Review** - See exactly what each agent did
4. **Safe Experimentation** - Main repo stays clean
5. **Simple Merging** - Standard git merge workflow

### For Developers

1. **Standard Git** - No proprietary abstractions
2. **Simple Model** - One worktree per conversation
3. **Clear Paths** - `cwd` is unambiguous
4. **Easy Cleanup** - `git worktree remove`
5. **Debugging** - Can `cd` into worktree and inspect

### For the Codebase

1. **Minimal Changes** - Mostly path handling
2. **Backwards Compatible** - Falls back gracefully
3. **Testable** - Clear input/output for worktree functions
4. **Maintainable** - Uses git's own worktree management

## Limitations and Considerations

### Disk Space

Each worktree is a full working directory:
- ~50MB per worktree for a typical JS project
- 10 active conversations = ~500MB
- Mitigation: Auto-cleanup, prune stale worktrees

### Performance

Worktree creation involves:
- Checking out branch (~1-2 seconds)
- Creating directory structure
- No significant ongoing overhead

### Edge Cases

1. **Submodules** - Worktrees don't automatically init submodules
2. **Large Files (LFS)** - May need to fetch LFS objects per worktree
3. **Hooks** - Git hooks run in worktree context
4. **IDE Integration** - Some IDEs may need configuration

### When NOT to Use Worktrees

- Single-agent workflows (no benefit)
- Very large repos (disk space concern)
- Repos with complex submodule setups
- When main repo is on a branch you want to modify
