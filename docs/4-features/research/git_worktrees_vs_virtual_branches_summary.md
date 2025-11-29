# Git Worktrees vs Virtual Branches for Multi-Agent Knowledge Work

## Overview
This document summarizes the advantages, trade-offs, and architectural implications of using **Git worktrees** versus **GitButler-style virtual branches** in multi-agent systems—specifically those built around **Claude Code agents performing knowledge work rather than coding**.

## 1. Conceptual Difference
### Git Worktrees
- Create **multiple physical directories**, each checked out to a different Git branch.
- Each agent effectively operates in its own isolated folder.
- True filesystem-level separation.

### Virtual Branches (GitButler-style)
- Use **one physical working directory**, but partition uncommitted changes into **parallel “lanes”**.
- Each lane corresponds to a virtual branch that can map to a real Git branch.
- Multiple agents share a common workspace while producing separate diffs.

## 2. Why Virtual Branches Fit Knowledge Work Better
Knowledge work typically involves:
- Markdown notes
- Research summaries
- Alternative drafts
- JSON/YAML structures
- Exploratory reasoning
- Parallel versions of ideas

These workloads benefit from a **shared workspace and lightweight branching**, which virtual branches provide.

### Key Benefits
#### 2.1 Unified Workspace
- The user sees a **single file tree**.
- Agents create parallel drafts without duplicating the entire directory.
- UX remains coherent and easy to navigate.

#### 2.2 Lightweight and Efficient
- Only diffs are stored, not entire file copies.
- No redundant build artifacts or duplicated folder structures.
- Ideal for dozens of small agents working in parallel.

#### 2.3 Natural Collaboration Across Agents
- Agents can see each other’s outputs without syncing directories.
- They can build on each other’s drafts incrementally.
- Easy to manage pipelines like: Research → Summarize → Edit → Fact-check.

#### 2.4 Better Diffing and Comparison
- All variations of a document coexist in a single tree.
- Simple lane-to-lane diffing.
- Easy to compare competing drafts.

#### 2.5 Familiar Mental Models
Virtual lanes map cleanly onto:
- Suggested edits (Google Docs)
- Draft versions
- Conversation threads
- Tabs or parallel perspectives

Users do not need to think about filesystem-level differences.

## 3. When Git Worktrees Still Make Sense
Worktrees are useful when agents require **full isolation**, such as:
- Making mutually incompatible changes to the same file or folder.
- Producing large binary artifacts.
- Reorganizing the entire workspace independently.
- Maintaining separate, conflicting universes of the project.

In these cases, separate directories avoid constant conflicts.

## 4. UI Implications
### Virtual Branches Enable a Coherent UI
- One workspace, many lanes.
- Lanes presented like draft threads.
- Easy browsing, comparison, and merging.
- No need to expose multiple folders or sync states.

### Worktrees Complicate UI
- Each agent corresponds to a separate folder.
- The UI must hide or manage many physical directories.
- Harder for users to understand or compare states.
- Diffing involves directory-level operations.

## 5. Collaboration Model
### Virtual Branches → Shared Reality
- All agents reference the same workspace state.
- Only modifications differ.
- Collaboration is incremental and conversational.

### Worktrees → Parallel Universes
- Agents do not automatically see each other’s work.
- Manual merging or copying required.
- Collaboration happens “after the fact,” not continuously.

## 6. System Lane Concept
A **system lane** is a virtual branch reserved for:
- System-generated metadata
- Workspace summaries
- Indexes or embeddings
- Auto-cleanup tasks
- Orchestrator-level notes

It organizes background or infrastructure tasks without mixing them with agent or human drafts.

## 7. Summary of Trade-offs
### Virtual Branches (Recommended for Knowledge Work)
- ✔ Lightweight and ergonomic
- ✔ Great for collaboration
- ✔ One workspace, many parallel drafts
- ✔ Clean UI mapping
- ✔ Easy diffing and merging
- ✘ Doesn’t handle conflicting edits to the same file simultaneously

### Git Worktrees
- ✔ Strong isolation
- ✔ Good for conflicting workspace states
- ✔ Useful for whole-universe divergence
- ✘ Heavyweight
- ✘ Creates many folders
- ✘ Harder collaboration
- ✘ Complicated UI

## Final Recommendation
For multi-agent **knowledge-work** workflows involving Claude Code, a **GitButler-style virtual branching system** provides:
- simpler UX
- more natural collaboration
- less filesystem overhead
- better draft and version management
- more coherent UI design

Use **worktrees** only when agents must operate in completely isolated or incompatible environments.

