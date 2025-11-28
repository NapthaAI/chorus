---
date: 2025-11-28
author: Claude
status: draft
type: feature
---

# @ Symbol File/Folder Mentions Feature

## Overview

Add an autocomplete dropdown that appears when users type `@` in the chat input, allowing them to quickly discover and select files or folders from the workspace. The selected path is inserted as plain text (`@path/to/file`) which Claude Code CLI processes natively.

## Business Value

### For Power Users
- **Faster file references**: No need to type or remember full file paths
- **Discoverability**: Browse workspace structure without leaving the chat
- **Reduced errors**: Autocomplete prevents typos in file paths
- **Muscle memory**: Same `@` pattern as Cursor, VS Code, and other tools

### For New Users
- **Lower barrier**: Don't need to know CLI @ syntax exists
- **Visual guidance**: See available files without reading documentation
- **Familiar pattern**: Common UX pattern from Slack, GitHub, etc.

## Current State

The `MessageInput` component (`chorus/src/renderer/src/components/Chat/MessageInput.tsx`) is a simple textarea that sends messages to Claude Code CLI. Users can manually type `@path/to/file` but:
- No autocomplete or path discovery
- No visual feedback that @ mentions are supported
- Easy to make typos in paths
- Must know exact file locations

## User Stories

### Core Workflow

1. **Given** I'm typing a message in chat, **when** I type `@`, **then** a dropdown appears showing files and folders from the workspace - *Dropdown appears within 100ms of typing @*

2. **Given** the dropdown is visible, **when** I continue typing after `@`, **then** the list filters to show only matching files/folders - *Fuzzy matching on filename and path*

3. **Given** the dropdown is showing results, **when** I press Up/Down arrows, **then** the selection moves through the list with visual highlighting - *Wrap at list boundaries*

4. **Given** an item is highlighted in the dropdown, **when** I press Enter, **then** the file path is inserted at cursor position and dropdown closes - *Format: `@relative/path/to/file`*

5. **Given** the dropdown is visible, **when** I press Escape, **then** the dropdown closes without inserting anything - *@ character remains in text*

6. **Given** the dropdown is visible, **when** I click outside of it, **then** the dropdown closes - *Standard blur behavior*

### File Selection

7. **Given** I select a file from the dropdown, **when** the path is inserted, **then** I can continue typing my message - *Cursor positioned after the path*

8. **Given** I select a folder from the dropdown, **when** the path is inserted, **then** the path ends with `/` to indicate it's a directory - *Format: `@src/components/`*

9. **Given** I've inserted a file path, **when** I send the message, **then** Claude Code CLI receives the raw text with `@path` intact - *Pass-through, no preprocessing*

### Edge Cases

10. **Given** I type `@` at the start of a message, **when** the dropdown appears, **then** it positions correctly below the cursor - *No overflow outside viewport*

11. **Given** the workspace has many files, **when** I type `@`, **then** the dropdown shows maximum 10 results with scroll - *Performance: initial load < 200ms*

12. **Given** I type `@` mid-sentence, **when** I select a file, **then** the surrounding text is preserved - *Only the `@` is replaced with `@path`*

13. **Given** I type `@@` (double @), **when** processing, **then** only one dropdown triggers (on second @) - *Prevent double-trigger*

## Core Functionality

### @ Detection & Dropdown Trigger

- Detect `@` character typed in textarea
- Check if @ is at word boundary (not part of email like `user@example.com`)
- Calculate caret position for dropdown placement
- Fetch file list from workspace on first trigger, cache for session
- Show dropdown positioned below caret

### File Listing & Search

- Use existing `window.api.fs.readDir()` for recursive file listing
- Build in-memory index of all files/folders on workspace load
- Fuzzy search using `fuse.js` or similar library
- Show file icon based on extension (optional, phase 2)
- Display relative path from workspace root

### Keyboard Navigation

- **Up/Down**: Move selection through list
- **Enter**: Insert selected path
- **Escape**: Close dropdown
- **Tab**: Insert selected and close (optional)
- **Continue typing**: Filter results

### Path Insertion

- Insert plain text: `@relative/path/to/file.ts`
- No special formatting or encoding
- Claude Code CLI handles the @ reference natively
- Preserve cursor position after insertion

## Technical Requirements

### Renderer Process (React)

**New Components**:

1. **MentionDropdown** (`Chat/MentionDropdown.tsx`)
   - Positioned absolutely relative to textarea
   - Uses portal to render at document root (avoid overflow clipping)
   - Accepts: items, selectedIndex, onSelect, position coordinates
   - Renders: scrollable list with highlighted selection

2. **useFileSearch hook** (`hooks/useFileSearch.ts`)
   - Caches workspace file index
   - Provides fuzzy search function
   - Debounced search (50ms)
   - Returns: { search, results, isLoading }

3. **useMentionTrigger hook** (`hooks/useMentionTrigger.ts`)
   - Detects @ in textarea
   - Calculates caret position
   - Manages dropdown open/close state
   - Returns: { isOpen, query, position, close }

**Modified Components**:

1. **MessageInput** (`Chat/MessageInput.tsx`)
   - Add mention trigger detection
   - Render MentionDropdown when active
   - Handle keyboard events for navigation
   - Insert path on selection

### State Management

- File index stored in React state (component or context level)
- No Zustand store needed - this is local UI state
- Cache invalidation on workspace change

### IPC Communication

- Use existing `window.api.fs.readDir()` for file listing
- May need new `window.api.fs.walkDir()` for recursive listing if not already available
- No new IPC handlers required if recursive read exists

### Dependencies

**New packages** (add to chorus/package.json):
- `fuse.js` (~6kb gzipped) - Fuzzy search library
- `textarea-caret-position` (~2kb) - Calculate caret coordinates

**No new packages needed for dropdown** - custom component with Tailwind.

## Design Considerations

### Dropdown Appearance

```
┌─────────────────────────────────┐
│ src/components/Chat/            │ ← folder (muted color)
│ src/components/Chat/ChatView.tsx│ ← file (normal color)
│ src/services/auth.ts            │
│ package.json                    │
│ README.md                       │
└─────────────────────────────────┘
```

- Dark background matching sidebar (`bg-sidebar`)
- Border and shadow for depth (`border-default`, `shadow-lg`)
- Highlighted item with accent background (`bg-hover`)
- File/folder differentiation with icons or text color
- Maximum height with scroll for long lists
- Match width to input or content, minimum 250px

### Keyboard Shortcuts Display

Update help text below input:
```
Press Enter to send | @ to mention files | Shift+Enter for new line
```

### Positioning

- Position dropdown above textarea if near bottom of viewport
- Align left edge with caret position
- Ensure dropdown stays within window bounds
- Handle window resize gracefully

## Implementation Phases

### Phase 1: MVP (This Sprint)

1. Basic @ detection in textarea
2. Simple file listing dropdown (non-recursive, current dir first)
3. Basic filtering (startsWith, not fuzzy)
4. Keyboard navigation (up/down/enter/escape)
5. Plain text insertion (`@path`)
6. Pass-through to CLI

**Acceptance**: User can type @, see files, select one, send message, Claude reads the file.

### Phase 2: Enhanced UX

1. Full recursive file listing with caching
2. Fuzzy search with fuse.js
3. File type icons
4. Folder navigation (select folder → show contents)
5. Recent files at top of list
6. Loading state for large workspaces

### Phase 3: Advanced Features (Future)

1. `@symbols` - Reference functions/classes (requires parsing)
2. `@git` - Reference commits/branches
3. Visual pills in input (react-mentions)
4. Multiple @ mentions with token count
5. Drag-and-drop from file browser to insert @

## Success Criteria

### Functional
- [ ] @ triggers dropdown within 100ms
- [ ] Search filters results as user types
- [ ] Keyboard navigation works correctly
- [ ] Selected path inserts correctly
- [ ] Claude Code CLI processes the @ reference
- [ ] Works with all file types and nested paths

### Performance
- [ ] Initial file index builds in < 500ms for 1000 files
- [ ] Search results update in < 50ms
- [ ] Dropdown renders without layout shift
- [ ] No memory leaks on workspace switch

### UX
- [ ] Dropdown doesn't obscure important content
- [ ] Clear visual feedback for selection
- [ ] Graceful handling of empty results
- [ ] Works with existing keyboard shortcuts

## Scope Boundaries

### Definitely In Scope
- @ detection and dropdown trigger
- File/folder listing from workspace
- Basic search/filter
- Keyboard navigation
- Plain text path insertion
- Pass-through to Claude Code CLI

### Definitely Out of Scope
- Inline pills/chips rendering (Phase 3)
- Symbol references like @function (Phase 3)
- Pre-processing file content before sending
- Token counting for mentioned files
- Multi-file selection UI
- Drag-and-drop from file browser

### Future Considerations
- Visual pills using react-mentions library
- @git for commit/branch references
- @docs for documentation lookups
- File preview on hover
- Integration with file browser (right-click → Add to chat)

## Open Questions

1. **Recursive depth**: Should we limit recursion depth for large repos? Suggest: 5 levels initially.

2. **Gitignore**: Should we respect .gitignore when listing files? Suggest: Yes, skip node_modules etc.

3. **File size display**: Show file size in dropdown? Suggest: No for MVP, maybe Phase 2.

4. **Recent files**: Track and prioritize recently mentioned files? Suggest: Phase 2.

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large repo slows down file listing | High | Limit depth, lazy load, cache aggressively |
| Dropdown positioning bugs | Medium | Use portal, test edge cases, fallback positioning |
| Conflict with email addresses | Low | Check word boundary before @ |
| CLI doesn't recognize @ format | High | Test with Claude Code early, verify syntax |

## Next Steps

1. Create implementation plan with component breakdown
2. Verify Claude Code CLI @ syntax with test workspace
3. Implement Phase 1 MVP
4. User testing and feedback
5. Iterate on Phase 2 enhancements
