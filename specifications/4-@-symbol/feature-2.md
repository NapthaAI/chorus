---
date: 2025-12-02
author: Claude
status: draft
type: feature
version: 2
---

# @ Symbol File Mentions v2 - Enhanced Selection

## Overview

Enhance the existing @ file mention system with multi-file selection, smart suggestions, advanced filtering, and directory support. Building on the foundation from v1, this update transforms the dropdown from a simple file picker into a powerful workspace navigator.

## Business Value

### For Power Users
- **Batch operations**: Select multiple files at once for refactoring, analysis, or bulk changes
- **Faster navigation**: Smart suggestions surface relevant files without typing
- **Precise filtering**: Type prefixes narrow results instantly (`@ts:`, `@test:`)
- **Directory operations**: Reference entire folders for broad context

### For New Users
- **Intelligent defaults**: Recent and git-changed files appear first
- **Visual hierarchy**: Expandable folders make structure discoverable
- **Guided experience**: Filter hints show available options

## Current State

The v1 implementation (`MentionDropdown.tsx`, `useMentionTrigger.ts`, `useFileSearch.ts`) provides:
- Single file selection via @ trigger
- Fuzzy search with Fuse.js
- Keyboard navigation (up/down/enter/escape)
- File type icons
- Max 10 results, 5-level depth

**Limitations addressed by v2:**
- Can only select one file at a time
- No prioritization of relevant files
- No way to filter by file type quickly
- Selecting a folder just inserts path, can't browse into it

## User Stories

### Multi-File Selection

1. **Given** the dropdown is visible, **when** I press `Shift+Enter` on a file, **then** the file is added to selection and dropdown stays open - *Chip appears in input showing selected file*

2. **Given** I have selected multiple files, **when** I press `Enter` without Shift, **then** all selected files are inserted and dropdown closes - *Format: `@file1 @file2 @file3`*

3. **Given** I have selected multiple files, **when** I click the X on a chip, **then** that file is removed from selection - *Dropdown remains open*

4. **Given** I have files selected, **when** I press `Escape`, **then** selection is cleared and dropdown closes - *Clean slate*

5. **Given** multiple files are selected, **when** viewing the dropdown, **then** selected files show a checkmark indicator - *Visual feedback for what's already selected*

### Smart Suggestions

6. **Given** I type `@` with no query, **when** the dropdown opens, **then** recently mentioned files appear in a "Recent" section - *Up to 5 recent files*

7. **Given** the workspace has uncommitted changes, **when** I type `@`, **then** git-modified files appear in a "Changed" section - *Files with M/A/D status from git*

8. **Given** I'm in a conversation about React components, **when** I type `@`, **then** files related to current context appear higher - *Based on conversation file references*

9. **Given** I open a file in FileViewer, **when** I type `@` in chat, **then** that file appears in suggestions - *Recently viewed files*

### Better Filtering

10. **Given** the dropdown is visible, **when** I type `@ts:`, **then** only TypeScript files (.ts, .tsx) are shown - *Type prefix filtering*

11. **Given** I type `@test:`, **when** filtering, **then** only test files (*.test.*, *.spec.*, __tests__/*) are shown - *Semantic filtering*

12. **Given** I type `@src/`, **when** filtering, **then** only files under src/ directory are shown - *Path prefix filtering*

13. **Given** filter prefixes are supported, **when** dropdown opens, **then** available filters shown as hint below input - *Discoverability: "Filters: @ts: @test: @config:"*

### Directory Support

14. **Given** I see a folder in the dropdown, **when** I press `Right Arrow`, **then** the folder expands to show its contents - *Inline expansion*

15. **Given** a folder is expanded, **when** I press `Left Arrow`, **then** the folder collapses - *Toggle behavior*

16. **Given** I select a folder with `Enter`, **when** path is inserted, **then** I can choose to insert path or expand - *Double-enter: first expands, second inserts*

17. **Given** I'm browsing into nested folders, **when** viewing, **then** breadcrumb shows current path - *Navigation context: `src > components > Chat`*

18. **Given** I want all files in a folder, **when** I press `Shift+Enter` on folder, **then** all immediate children files are selected - *Bulk folder selection*

## Core Functionality

### Multi-File Selection System

**Selection State:**
- Track `selectedFiles: WalkEntry[]` array in component state
- Display as removable chips above the textarea
- Show checkmark overlay on selected items in dropdown
- Clear selection on dropdown close or message send

**Keyboard Modifiers:**
- `Enter`: Insert all selected (or single highlighted) and close
- `Shift+Enter`: Add highlighted to selection, stay open
- `Ctrl/Cmd+A`: Select all visible results
- `Escape`: Clear selection and close

**Visual Chips:**
```
┌─────────────────────────────────────────────────────┐
│ [📄 auth.ts ×] [📄 user.ts ×] [📁 components/ ×]   │
├─────────────────────────────────────────────────────┤
│ Type your message... @                              │
└─────────────────────────────────────────────────────┘
```

### Smart Suggestions Engine

**Suggestion Sources (Priority Order):**

1. **Changed Files** (highest priority)
   - Query git status for modified/added/deleted files
   - Show with status indicator (M/A/D)
   - Max 5 files

2. **Recent Mentions**
   - Track files mentioned in last 10 messages (this conversation)
   - Store in conversation metadata
   - Max 5 files

3. **Recent Views**
   - Files opened in FileViewer during this session
   - Store in workspace-store
   - Max 5 files

4. **Context-Relevant**
   - Files referenced in assistant responses
   - Parse message content for file paths
   - Max 5 files

**Dropdown Sections:**
```
┌───────────────────────────────────────┐
│ Changed                               │
│   📄 M  src/auth.ts                   │
│   📄 A  src/newFile.ts                │
├───────────────────────────────────────┤
│ Recent                                │
│   📄 src/components/Chat/index.tsx    │
│   📄 package.json                     │
├───────────────────────────────────────┤
│ All Files                             │
│   📁 src/                             │
│   📁 tests/                           │
│   📄 README.md                        │
└───────────────────────────────────────┘
```

### Filter Prefix System

**Supported Prefixes:**

| Prefix | Matches | Example |
|--------|---------|---------|
| `@ts:` | `.ts`, `.tsx` files | `@ts:auth` → `auth.ts` |
| `@js:` | `.js`, `.jsx` files | `@js:config` → `config.js` |
| `@test:` | `*.test.*`, `*.spec.*`, `__tests__/*` | `@test:user` → `user.test.ts` |
| `@config:` | Config files (`.json`, `.yaml`, `.toml`, `.*rc`) | `@config:prettier` |
| `@css:` | `.css`, `.scss`, `.less`, `.sass` | `@css:global` |
| `@md:` | `.md`, `.mdx` files | `@md:readme` |
| `@src/` | Files under `src/` directory | `@src/utils` |
| `@{path}/` | Files under any directory | `@components/` |

**Prefix Detection:**
- Parse query for `prefix:` or `path/` pattern
- Apply filter before fuzzy search
- Show active filter as badge: `[ts]` or `[src/]`
- Allow combining: `@ts:src/` for TypeScript in src/

### Directory Navigation

**Expansion State:**
- Track `expandedPaths: Set<string>` for open folders
- Persist during dropdown session
- Reset on dropdown close

**Navigation Keys:**
- `Right Arrow` or `Enter` (first press): Expand folder
- `Left Arrow`: Collapse folder or go to parent
- `Enter` (second press on expanded): Insert folder path
- `Shift+Enter` on folder: Select all immediate file children

**Breadcrumb Navigation:**
```
┌─────────────────────────────────────────────────────┐
│ src > components > Chat                         [×] │
├─────────────────────────────────────────────────────┤
│   📄 ChatView.tsx                                   │
│   📄 MessageInput.tsx                               │
│   📁 hooks/                                         │
└─────────────────────────────────────────────────────┘
```

## Technical Requirements

### Renderer Process (React)

**Modified Components:**

1. **MentionDropdown** (`Chat/MentionDropdown.tsx`)
   - Add section headers (Changed, Recent, All Files)
   - Support item checkmarks for multi-select
   - Add folder expand/collapse icons
   - Handle expanded folder children rendering
   - Show breadcrumb when browsing into folder
   - Support filter badge display

2. **MessageInput** (`Chat/MessageInput.tsx`)
   - Add `selectedFiles` state array
   - Render selection chips above textarea
   - Handle Shift+Enter for multi-select
   - Insert all selected files on submit
   - Clear selection on send/close

**New Components:**

1. **SelectionChips** (`Chat/SelectionChips.tsx`)
   - Display selected files as removable chips
   - Handle chip removal on X click
   - Truncate long paths with tooltip
   - Horizontal scroll for many selections

2. **FilterHint** (`Chat/FilterHint.tsx`)
   - Show available filter prefixes
   - Display below dropdown when no query
   - Clickable to insert filter prefix

**Modified Hooks:**

1. **useFileSearch** (`hooks/useFileSearch.ts`)
   - Add filter prefix parsing
   - Add `getChangedFiles()` using git status
   - Add `getRecentMentions()` from conversation
   - Return sectioned results: `{ changed, recent, allFiles }`

2. **useMentionTrigger** (`hooks/useMentionTrigger.ts`)
   - Track expanded paths for directory navigation
   - Handle arrow key folder navigation
   - Parse filter prefix from query

**New Hooks:**

1. **useRecentFiles** (`hooks/useRecentFiles.ts`)
   - Track files viewed in FileViewer
   - Track files mentioned in messages
   - Persist to workspace-store
   - Return `{ recentlyViewed, recentlyMentioned }`

### State Management

**workspace-store additions:**
```typescript
interface WorkspaceState {
  // ... existing
  recentlyViewedFiles: string[]  // File paths opened in FileViewer
}
```

**chat-store additions:**
```typescript
interface ChatState {
  // ... existing
  mentionedFiles: Map<string, string[]>  // conversationId → file paths mentioned
}
```

### IPC Communication

**New Handlers:**

1. `git:get-changed-files` - Return modified/added/deleted files with status
   - Uses existing git-service
   - Returns: `{ path: string, status: 'M' | 'A' | 'D' }[]`

### Dependencies

No new packages required - builds on existing:
- `fuse.js` - Fuzzy search
- `textarea-caret` - Caret positioning

## Design Considerations

### Selection Chips Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌──────────────┐ ┌────────────────┐       │
│ │ 📄 auth.ts × │ │ 📄 user.ts × │ │ 📁 utils/    × │       │
│ └──────────────┘ └──────────────┘ └────────────────┘       │
├─────────────────────────────────────────────────────────────┤
│ Fix the authentication bug in @                             │
│                                                             │
│ ↳ Press Enter to send | Shift+Enter to add more files       │
└─────────────────────────────────────────────────────────────┘
```

### Dropdown with Sections

```
┌─────────────────────────────────────────┐
│ Changed (2)                         ▾   │
│   ✓ 📄 M  src/auth.ts                   │  ← selected, git modified
│     📄 A  src/newFile.ts                │
├─────────────────────────────────────────┤
│ Recent (3)                          ▾   │
│     📄 src/components/Chat/index.tsx    │
│     📄 package.json                     │
│     📄 src/stores/workspace-store.ts    │
├─────────────────────────────────────────┤
│ All Files                           ▾   │
│   ▸ 📁 src/                             │  ← collapsed folder
│   ▾ 📁 tests/                           │  ← expanded folder
│       📄 auth.test.ts                   │  ← folder child, indented
│       📄 user.test.ts                   │
│     📄 README.md                        │
└─────────────────────────────────────────┘
│ Filters: @ts: @test: @config: @md:      │  ← hint row
└─────────────────────────────────────────┘
```

### Filter Active State

```
┌─────────────────────────────────────────┐
│ [ts] Showing TypeScript files       [×] │  ← active filter badge
├─────────────────────────────────────────┤
│   📄 src/auth.ts                        │
│   📄 src/user.ts                        │
│   📄 src/index.ts                       │
└─────────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Multi-File Selection

1. Add `selectedFiles` state to MessageInput
2. Create SelectionChips component
3. Handle Shift+Enter in keyboard navigation
4. Add checkmark indicators in dropdown
5. Insert multiple paths on submit
6. Clear selection on close/send

**Acceptance**: User can select 3+ files with Shift+Enter, see chips, send message with all paths.

### Phase 2: Smart Suggestions

1. Add `git:get-changed-files` IPC handler
2. Create useRecentFiles hook
3. Track file views in workspace-store
4. Track mentions in chat-store
5. Modify useFileSearch to return sections
6. Update MentionDropdown for sectioned display

**Acceptance**: Dropdown shows Changed, Recent, All Files sections with appropriate files.

### Phase 3: Filter Prefixes

1. Parse filter prefix in useMentionTrigger
2. Apply filter in useFileSearch before fuzzy search
3. Create FilterHint component
4. Show active filter badge
5. Support path prefixes (`@src/`)

**Acceptance**: Typing `@ts:auth` shows only TypeScript files matching "auth".

### Phase 4: Directory Navigation

1. Add expandedPaths state to useMentionTrigger
2. Handle Right/Left arrow for expand/collapse
3. Render folder children inline with indentation
4. Add breadcrumb for deep navigation
5. Support Shift+Enter on folder for bulk selection

**Acceptance**: User can expand folders inline, navigate with arrows, select all files in folder.

## Success Criteria

### Functional
- [ ] Multi-select works with Shift+Enter
- [ ] Selection chips display and are removable
- [ ] Changed files appear with git status
- [ ] Recent files section shows last 5 viewed/mentioned
- [ ] Filter prefixes narrow results correctly
- [ ] Folders expand/collapse with arrow keys
- [ ] Breadcrumb shows navigation path

### Performance
- [ ] Git status fetches in < 200ms
- [ ] Section rendering adds < 50ms overhead
- [ ] Folder expansion is instant (files already loaded)
- [ ] Selection chips don't cause layout shift

### UX
- [ ] Clear visual distinction between sections
- [ ] Obvious selected state (checkmarks)
- [ ] Filter hints aid discoverability
- [ ] Keyboard-first navigation preserved

## Scope Boundaries

### Definitely In Scope
- Multi-file selection with chips
- Git-aware changed files section
- Recent files tracking and display
- Type and path filter prefixes
- Inline folder expansion
- Breadcrumb navigation

### Definitely Out of Scope
- Drag-and-drop file selection
- File content preview on hover
- @symbols for functions/classes
- @git for commits/branches
- Full tree view mode
- Persisting selection across messages

### Future Considerations
- File size and token count display
- Preview pane for selected files
- Smart context: suggest based on error messages
- Workspace-wide search (beyond current depth limit)

## Open Questions

1. **Max selection limit**: Should we limit how many files can be selected? Suggest: 10 files max initially.

2. **Section collapse**: Should sections be collapsible? Suggest: Yes, with memory.

3. **Filter combination**: Allow multiple filters (`@ts:test:`)? Suggest: No for v2, single filter only.

4. **Folder selection behavior**: Insert path or expand first? Suggest: First Enter expands, second inserts.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Git status slow on large repos | Medium | Cache for 5 seconds, async fetch |
| Too many sections clutters UI | Medium | Collapse by default, expand on hover |
| Filter syntax not discoverable | Medium | Show hints, support @? for help |
| Keyboard navigation complex | High | Document shortcuts, keep simple defaults |
| Selection chips overflow | Low | Horizontal scroll, +N indicator |
