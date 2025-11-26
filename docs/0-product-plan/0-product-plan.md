# Chorus

**A Slack-like interface for orchestrating multiple Claude Code agents across repos.**

> "A wrapper on top of Claude Code that allows me to run different Claude Code sessions across different repos. That's basically what I need."
> — Richard Blythman

---

## Richard's Current Setup

### His Workspaces (10+ and growing)

| Workspace | Purpose | Memory Structure |
|-------|---------|------------------|
| **Product Agent** | Product strategy, opportunity assessments | Opportunities, experiments, research, business docs |
| **Legal Agent** | Analyzing separation docs with Mark | Legal documents |
| **Research Agent** | Scanning Reddit/Twitter for user problems | Subreddit research |
| **Journal Agent** | Journaling thoughts → LinkedIn posts | Journal entries |
| **Pilot Planning Agent** | Planning how to close pilot programs | Pilot docs |
| **Data Analysis Agent** | Analyzing data | Datasets, reports |
| **Grocery Agent** | Meal planning, grocery shopping | Personal |
| *...more every day* | | |

### How Each Workspace is Built

Each workspace = **separate Git repo** containing:
- `CLAUDE.md` - Main agent's system prompt and persona
- `.claude/agents/` - Sub-agents for specialized tasks
- `.claude/commands/` - Custom slash commands (e.g., `/create-opportunity-assessment`)
- `.claude/skills/` - Reusable capabilities
- Custom memory structure (markdown files organized for that domain)

### Current Pain Points

1. **Window Juggling**
   > "I have 10 different agents that I use quite regularly and I have a different Cursor instance open for each one"

2. **No Status Visibility**
   > "Maybe Claude Code runs for a long time. So I need to go back to the window to see if it's finished."

3. **Manual Inter-Agent Communication**
   > "I have a command in the product agent... create a markdown file that I will manually copy and paste from the product repo to the pilot planning repo"

---

## Richard's Vision

### The Core Idea

> "A unified interface where I could interact with all of the agents and I could see if they were finished their current task"

### Repo = Workspace (Not Just One Agent)

Each repo is a **workspace/project** that can contain:
- **Main agent** - Defined by `CLAUDE.md` (system prompt, persona)
- **Sub-agents** - Specialized agents in `.claude/agents/`
- **Commands** - Custom slash commands in `.claude/commands/`
- **Skills** - Reusable capabilities in `.claude/skills/`
- **Memory** - Domain-specific markdown files and docs

**Example: "Product" repo might have:**
- Main product strategist agent (CLAUDE.md)
- Sub-agent for market research
- Sub-agent for writing PRDs
- Commands: `/create-opportunity-assessment`, `/analyze-competitor`
- Memory: `opportunities/`, `experiments/`, `research/`

### Why Slack UI

> "It should look like Slack basically because first of all it's for non-technical people"

- **Repos = Workspaces** in sidebar (like Slack channels/DMs)
- **Click to open** a workspace and chat with its agent(s)
- **Unread indicator** = task finished
- **Tabs** for files, canvas, docs (like Slack's features)
- **View docs in UI** - see markdown files the agents create

### How It Works: Adding Repos to Chorus

1. **Add a repo** to Chorus → onboards the workspace with all its agents, commands, skills
2. **Interact** with any agent from any workspace in the unified UI
3. **Outputs stay in their repos** - files created by agents are saved to their respective repos
4. **Each turn is committed** - every user input + agent response = one commit
5. **Push when ready** - push at end of session or anytime during

```
┌─────────────────────────────────────────────────────────────┐
│                        Chorus UI                           │
│  [Product] [Legal] [Research] [Journal] ...                 │
└───────────────────────────┬─────────────────────────────────┘
                            │ interact
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent Execution                           │
│  - Runs in workspace's repo directory                        │
│  - Creates/edits files in that repo                          │
│  - Each turn → auto-commit                                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ outputs
                            ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ product-repo │  │  legal-repo  │  │ research-repo│
│  /docs/      │  │  /contracts/ │  │  /findings/  │
│  /briefs/    │  │  /analysis/  │  │  /reports/   │
│  .git/       │  │  .git/       │  │  .git/       │
└──────────────┘  └──────────────┘  └──────────────┘
     ↓ push           ↓ push            ↓ push
   GitHub           GitHub            GitHub
```

### Why Separate Repos (Decentralized Architecture)

> "The reason that I built them in separate repos is because it helps from a permissions point of view."

**Example:** Richard wanted to share an agent with Marcos (devrel consultant) but not share the entire Naptha organization. With separate repos, he just added Marcos to that specific GitHub repo.

**This is different from how Claude/Google would build it:**
> "I think that's the approach that Claude are going to use mostly. It's going to be like monolithic. It's going to be basically a single agent with a lot of sub agents."

**Our approach:**
> "We much prefer the decentralized approach... separate repos for each agent."

### Future Vision: MCP-Based Multi-Agent

> "I imagine in future we would deploy these Claude Code agents as MCP servers and then the communication would happen via MCP... those agents could run on different nodes on different servers"

> "It's basically the Napa node except now built on top of Claude Code."

---

## UI Design (From Richard's Description)

### Sidebar (Left)
- List of agents (like Slack teammates)
- Status indicator (busy/ready)
- Unread badge when agent finishes
- `+` to add new agent

### Main Panel (Center)
- Chat interface with selected agent
- See agent's thinking/responses
- Input box to send messages

### Tabs (Top of Main Panel)
Like Slack's tabs:
- **Messages** - Chat with agent
- **Files** - View files in agent's repo
- **Docs** - View markdown docs the agent creates (PRDs, briefs, etc.)
- **Canvas** - (Future) Collaborative docs

### Right Panel (Optional)
- MCP servers/tools
- Agent config preview
- Quick actions

---

## Competitive Strategy

### Speed Matters

> "I think we need to be fast. But I also don't think they're going to launch something like that in the next say two or three months and I'm hoping we can prototype something in two to three weeks"

> "It's basically like Cursor beat VS Code by shipping something and getting a lot of users very quickly. We'd be launching Cursor for agents."

### Our Differentiators vs Big Players

| Big Players (Claude/Google) | Chorus |
|----------------------------|----------|
| Monolithic (single repo, sub-agents) | Decentralized (separate repos) |
| All-in-one, no sharing granularity | Share specific agents via GitHub |
| Developer-focused | Non-technical friendly |
| Their infrastructure | Runs locally, your repos |

### Why Quack Isn't a Threat Yet

> "That's super early that project. I went into their Discord, there's only 20 people or something."

---

## Dogfooding

> "And we've never done that with a product before. We've never been really heavy users of our own products."

> "Once we have an MVP I'll just use that... then I'll be requesting features and maybe working on it myself. And we'll just try and use it internally ourselves until the product is good enough to launch."

**Richard will use Chorus daily to:**
- Coordinate all his agents from one interface
- See when agents finish tasks
- View docs without switching apps
- Eventually: coordinate within Naptha team

---

## Technical Architecture

### Stack (Richard's Choice)

> "I'm thinking of local app using Electron at the moment."

| Component | Technology |
|-----------|------------|
| Desktop App | Electron |
| Frontend | React + TypeScript |
| Agent Control | Claude Agent SDK |
| Styling | Tailwind (Slack-like dark theme) |

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      Chorus (Electron)                     │
│                                                              │
│  ┌──────────┐  ┌────────────────────────────────────────┐   │
│  │ Sidebar  │  │            Agent Chat                   │   │
│  │          │  │                                         │   │
│  │ Product  │◄─┤  [Messages] [Files] [Docs]              │   │
│  │ Legal    │  │                                         │   │
│  │ Research │  │  Agent response streaming here...       │   │
│  │ Journal  │  │                                         │   │
│  │ ...      │  │  ┌─────────────────────────────────┐    │   │
│  │          │  │  │ Input: Ask the agent...         │    │   │
│  │ [+ Add]  │  │  └─────────────────────────────────┘    │   │
│  └──────────┘  └────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Electron Main Process                     │
│                                                              │
│  Agent 1 SDK Client ──► /path/to/product-agent-repo         │
│  Agent 2 SDK Client ──► /path/to/legal-agent-repo           │
│  Agent 3 SDK Client ──► /path/to/research-agent-repo        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Points

1. **One SDK Client per Agent**
   - Each points to different repo (`cwd: /path/to/repo`)
   - Loads that repo's `.claude/settings.json`
   - Independent sessions

2. **Hooks for Status**
   - `Stop` hook → update status to "ready", show notification
   - `SubagentStop` → track subagent completion

3. **Session Persistence**
   - Store session IDs per agent
   - Resume conversations on app restart

---

## Git Workflow (Built-in)

### Auto-Commit Per Turn

Every conversation turn (user input + agent response) is automatically committed:

```
User: "Create a product brief for feature X"
Agent: [creates /docs/briefs/feature-x.md]
       [writes content]
→ Auto-commit: "Create product brief for feature X"

User: "Add competitive analysis section"
Agent: [edits /docs/briefs/feature-x.md]
→ Auto-commit: "Add competitive analysis to feature X brief"
```

### Push Controls

- **Push button** in UI per workspace
- **Push at session end** (optional auto-push setting)
- **Push anytime** during conversation
- **Visual indicator** showing unpushed commits

### Branch Strategy

Options to explore:
1. **Main branch only** - simple, all commits to main
2. **Branch per session** - like Git Butler, merge when done
3. **User choice** - let user decide per workspace

### Git Butler Inspiration

Richard uses Git Butler daily:
> "It changed my entire flow... I would have another CLI here where I'd be doing git branch or git checkout. Now I just don't need to worry about creating any branches"

**What we take from Git Butler:**
- Auto-commit after each interaction (via hooks)
- Visual branch/commit management
- Push/merge from UI

> "Whatever UI that we build, ideally I wouldn't have to switch between our Slack app and Git Butler"

---

## MVP Scope

### Timeline

> "Hoping we can prototype something in two to three weeks"
> "Maybe within two or three weeks maybe we have something"

### Week 1: Core Shell

- [ ] Electron + React scaffolding
- [ ] Slack-like UI (sidebar + chat)
- [ ] Add agent via repo path
- [ ] Single agent chat working
- [ ] Store agent list locally

### Week 2: Multi-Agent + Polish

- [ ] Multiple agents with separate SDK clients
- [ ] Status indicators (busy/ready)
- [ ] Desktop notifications on completion
- [ ] Files tab (view repo files)
- [ ] Dark theme styling

### Week 3: Refinement + Launch

- [ ] Docs tab (view markdown files agent creates)
- [ ] Session persistence (resume conversations)
- [ ] Error handling
- [ ] HackerNews post
- [ ] Demo video

---

## Success Criteria

### Internal (Richard Using It)

> "Once we have this I will use it every day"

- [ ] Richard uses Chorus instead of separate Cursor windows
- [ ] Can see all 10+ agents in one interface
- [ ] Knows when agents finish without switching windows
- [ ] Can view docs without leaving app

### External (Launch)

- [ ] HackerNews front page
- [ ] "This is what I needed" comments
- [ ] Users understand decentralized value prop
- [ ] GitHub stars

---

## Future Roadmap

### Phase 2: Enhanced Features
- Command palette for quick agent switching
- Agent config editor (CLAUDE.md, commands)
- Cost tracking per agent
- Git Butler-like branch view

### Phase 3: Inter-Agent Communication
> "Communication would happen via MCP"

- Deploy agents as MCP servers
- Agents can query each other
- Shared context without manual copy/paste

### Phase 4: Distributed Agents (Naptha Vision)
> "Those agents could run on different nodes on different servers"
> "It's basically the Napa node except now built on top of Claude Code"

- Remote agent hosting
- Team agent sharing
- Enterprise deployment

---

## Open Questions

1. **Git Butler:** Companion app or built-in?
2. **Agent Templates:** Provide starter repos?
3. **Pricing:** Free forever? Freemium for teams?
4. **Domain:** chorus.ai? getchorus.dev? usechorus.app?

---

## Next Steps

1. [ ] Review and approve this plan
2. [ ] Set up Electron project
3. [ ] Build basic UI shell
4. [ ] Get first agent working
5. [ ] Richard starts dogfooding

---

## References

- Meeting: `/docs/meeting-notes/arshy_richard...`
- Competitors: `/docs/competitors/cc-sessions.md`, `/docs/competitors/quack.md`
- Tools: `/docs/tools/claude-code.md`, `/docs/tools/claude-agent-sdk.md`, `/docs/tools/git-butler.md`
