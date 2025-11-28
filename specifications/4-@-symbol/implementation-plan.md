---
date: 2025-11-28
author: Claude
status: draft
type: implementation_plan
feature: @ Symbol File/Folder Mentions
---

# @ Symbol File/Folder Mentions - Implementation Plan

## Overview

Implement an autocomplete dropdown that appears when users type `@` in the chat input, allowing them to select files/folders from the workspace. The selected path is inserted as plain text (`@path/to/file`) which Claude Code CLI processes natively.

## Current State Analysis

### Existing Infrastructure

- **MessageInput** (`chorus/src/renderer/src/components/Chat/MessageInput.tsx:18-100`): Simple textarea with keyboard handling (Enter/Escape)
- **File System API** (`chorus/src/preload/index.ts:52-57`): `listDirectory()` returns immediate children only (non-recursive)
- **Hidden Patterns** (`chorus/src/main/services/fs-service.ts:14-38`): Already excludes node_modules, .git, build dirs, etc.
- **Dropdown Patterns**: BranchSelector uses fixed positioning with `getBoundingClientRect()` - ideal for caret positioning

### Key Discoveries

1. No recursive file listing exists - need new `walkDirectory()` IPC handler
2. Dropdown positioning pattern established in `BranchSelector.tsx:95-111`
3. Click-outside handling pattern in `ConversationToolbar.tsx:57-70`
4. Messages pass through to CLI unchanged - no preprocessing needed

## What We're NOT Doing

- Visual pills/chips in the input (Phase 3)
- @symbols for functions/classes (Phase 3)
- @git for commits/branches (Phase 3)
- Pre-processing file content before sending
- Token counting for mentioned files
- Multi-file selection UI
- Drag-and-drop from file browser

## Implementation Approach

**Phase 1** establishes the foundation: recursive file listing, fuzzy search infrastructure, and basic dropdown UI.

**Phase 2** enhances the input with @ detection, caret positioning, and keyboard navigation.

**Phase 3** integrates everything and adds polish.

---

## Phase 1: File Listing Infrastructure

### Overview

Add recursive directory walking to the backend and create the fuzzy search hook for filtering files.

### Changes Required

#### 1. Add walkDirectory to fs-service

**File**: `chorus/src/main/services/fs-service.ts`

**Implementation Requirements:**
- Add new `walkDirectory(dirPath: string, maxDepth?: number)` function
- Recursively traverse directories up to `maxDepth` (default: 5)
- Reuse existing `shouldHide()` function to filter hidden patterns
- Return flat array of `DirectoryEntry[]` with relative paths from root
- Handle permission errors gracefully (skip inaccessible directories)
- Add path relative to the walk root for display purposes

**Interface:**
```typescript
interface WalkEntry extends DirectoryEntry {
  relativePath: string  // Path relative to walk root for display
}
```

**Error Handling:**
- Skip directories that throw on access
- Continue walking even if some subdirectories fail
- Log errors but don't propagate to caller

#### 2. Add IPC Handler for walkDirectory

**File**: `chorus/src/main/index.ts`

**Implementation Requirements:**
- Add `fs:walk-directory` IPC handler after existing fs handlers (around line 229)
- Accept parameters: `path: string`, `maxDepth?: number`
- Return `ApiResult<WalkEntry[]>` matching existing pattern
- Wrap in try-catch, return error string on failure

#### 3. Expose walkDirectory in Preload

**File**: `chorus/src/preload/index.ts`

**Implementation Requirements:**
- Add `walkDirectory` method to `fs` object (around line 55)
- Signature: `walkDirectory: (path: string, maxDepth?: number) => Promise<ApiResult<WalkEntry[]>>`

**File**: `chorus/src/preload/index.d.ts`

**Implementation Requirements:**
- Add `WalkEntry` interface extending `DirectoryEntry` with `relativePath`
- Add `walkDirectory` to `FileSystemAPI` interface

#### 4. Create useFileSearch Hook

**File**: `chorus/src/renderer/src/hooks/useFileSearch.ts` (new file)

**Implementation Requirements:**
- Install `fuse.js` dependency: `bun add fuse.js`
- Create hook that manages file index and search
- Load files on workspace path change using `window.api.fs.walkDirectory()`
- Initialize Fuse.js instance with file list
- Configure Fuse options: search on `name` and `relativePath` fields
- Threshold: 0.4 (balanced fuzzy matching)
- Return: `{ files, search, isLoading, error, refresh }`
- `search(query: string)` returns filtered results (max 10)
- Cache file index per workspace path
- Memoize Fuse instance to avoid recreation

**Performance Considerations:**
- Debounce is NOT needed in hook (caller handles input debounce)
- Limit results to 10 items for dropdown
- Index building should happen once on workspace load

### Success Criteria

**Automated verification:**
- [ ] TypeScript compiles without errors
- [ ] `bun run typecheck` passes

**Manual verification:**
- [ ] Call `window.api.fs.walkDirectory('/path/to/repo', 5)` in DevTools console
- [ ] Returns flat list of files with relativePath
- [ ] Hidden directories (node_modules, .git) are excluded
- [ ] Deeply nested files (up to 5 levels) are included
- [ ] `useFileSearch` hook returns files when given workspace path
- [ ] Search filters results with fuzzy matching

---

## Phase 2: Dropdown Component & @ Detection

### Overview

Create the mention dropdown component and the hook that detects @ in textarea and calculates caret position.

### Changes Required

#### 1. Install textarea-caret-position

**Implementation Requirements:**
- Run: `bun add textarea-caret`
- This package calculates pixel coordinates of caret in textarea
- Used to position dropdown below the @ character

#### 2. Create MentionDropdown Component

**File**: `chorus/src/renderer/src/components/Chat/MentionDropdown.tsx` (new file)

**Implementation Requirements:**
- Accept props: `items: WalkEntry[]`, `selectedIndex: number`, `position: {top, left}`, `onSelect: (item) => void`, `onClose: () => void`
- Render fixed-position dropdown at given coordinates
- Style matching existing dropdowns: `bg-sidebar`, `border-default`, `shadow-lg`, `rounded-lg`
- Show file/folder icon based on `isDirectory`
- Display `relativePath` with filename highlighted
- Highlight selected item with `bg-hover`
- Support scrolling for lists > 10 items (max-height with overflow-y-auto)
- Handle click on item → call `onSelect`
- Render empty state: "No files found" when items is empty
- Width: fixed 320px

**Visual Structure:**
```
┌──────────────────────────────────┐
│ 📁 src/components/               │  ← folder, muted
│ 📄 src/components/Chat/index.tsx │  ← file, selected (bg-hover)
│ 📄 src/services/auth.ts          │
│ 📄 package.json                  │
└──────────────────────────────────┘
```

**Accessibility:**
- Add `role="listbox"` to container
- Add `role="option"` and `aria-selected` to items
- Add `id` to each option for `aria-activedescendant`

#### 3. Create useMentionTrigger Hook

**File**: `chorus/src/renderer/src/hooks/useMentionTrigger.ts` (new file)

**Implementation Requirements:**
- Accept: `textareaRef: RefObject<HTMLTextAreaElement>`, `value: string`
- Detect `@` character at word boundary (preceded by whitespace or start of input)
- Track: `isOpen`, `query` (text after @), `triggerIndex` (position of @)
- Calculate dropdown position using `textarea-caret` package
- Position dropdown below caret with small offset (4px)
- Handle viewport bounds: if dropdown would overflow bottom, position above caret
- Return: `{ isOpen, query, position: {top, left}, triggerIndex, close }`
- `close()` resets state

**@ Detection Logic:**
1. On value change, find last `@` in text
2. Check character before `@` is whitespace, start, or newline
3. Extract query = text from `@` to cursor position
4. If query contains space, close dropdown (user moved past mention)

**Edge Cases:**
- `@@` - only trigger on second @
- `user@example.com` - don't trigger (no word boundary)
- `@` at end of input - trigger with empty query
- `@src/` - query is "src/"

#### 4. Add Click-Outside Handler

**Implementation Requirements:**
- In MentionDropdown or useMentionTrigger, add click-outside detection
- Use existing pattern from ConversationToolbar: `useRef` + `mousedown` listener
- Close dropdown when clicking outside
- Ensure click on dropdown item doesn't trigger close (check `contains`)

### Success Criteria

**Automated verification:**
- [ ] TypeScript compiles without errors
- [ ] No console errors in DevTools

**Manual verification:**
- [ ] MentionDropdown renders at specified position
- [ ] Items display with correct icons (file vs folder)
- [ ] Selected item has visual highlight
- [ ] Clicking item calls onSelect
- [ ] Clicking outside closes dropdown
- [ ] useMentionTrigger detects @ at word boundary
- [ ] Position calculated correctly (dropdown appears below @)
- [ ] Typing after @ updates query
- [ ] Space after query closes dropdown

---

## Phase 3: Integration & Keyboard Navigation

### Overview

Integrate all pieces into MessageInput with full keyboard navigation and path insertion.

### Changes Required

#### 1. Enhance MessageInput Component

**File**: `chorus/src/renderer/src/components/Chat/MessageInput.tsx`

**Implementation Requirements:**

**State & Hooks:**
- Import and use `useFileSearch` hook with `workspace.path`
- Import and use `useMentionTrigger` hook with textareaRef and message value
- Add local state: `selectedIndex: number` (default 0)
- Compute `filteredFiles` by calling `search(query)` when dropdown is open

**Keyboard Handling:**
- Extend existing `handleKeyDown` function
- When dropdown is open:
  - `ArrowDown`: increment selectedIndex (wrap to 0 at end)
  - `ArrowUp`: decrement selectedIndex (wrap to end at 0)
  - `Enter`: insert selected file path, prevent message send
  - `Escape`: close dropdown, prevent stop agent
  - `Tab`: insert selected file path (optional, same as Enter)
- When dropdown is closed: existing behavior (Enter sends, Escape stops)

**Path Insertion:**
- Create `insertMention(item: WalkEntry)` function
- Replace text from `triggerIndex` to cursor with `@{relativePath}`
- If item is directory, append `/` to path
- Set cursor position after inserted path
- Close dropdown after insertion

**Rendering:**
- Render `MentionDropdown` when `isOpen && filteredFiles.length > 0`
- Pass: items, selectedIndex, position, onSelect, onClose
- Position dropdown relative to textarea container (not document)

**Help Text Update:**
- Update footer text to include @ hint
- Change from current two-column layout to include: `@ to mention files`

#### 2. Handle Edge Cases

**Implementation Requirements:**
- Reset `selectedIndex` to 0 when query changes
- Reset `selectedIndex` to 0 when dropdown opens
- Prevent default on arrow keys when dropdown open (avoid cursor movement in textarea)
- Handle empty search results: show "No matching files" or hide dropdown
- Handle loading state: show spinner or "Loading files..." if index not ready

#### 3. Performance Optimization

**Implementation Requirements:**
- Debounce search by 50ms in MessageInput (not in hook)
- Memoize filtered results with useMemo
- Only re-run search when query changes
- Limit dropdown to 10 items maximum

### Success Criteria

**Automated verification:**
- [ ] TypeScript compiles without errors
- [ ] `bun run typecheck` passes
- [ ] `bun run build` succeeds

**Manual verification:**
- [ ] Type `@` in chat → dropdown appears with files
- [ ] Continue typing → results filter
- [ ] Arrow keys navigate selection
- [ ] Enter inserts `@path/to/file` and closes dropdown
- [ ] Escape closes dropdown without inserting
- [ ] Click on item inserts path
- [ ] Click outside closes dropdown
- [ ] Send message → Claude Code receives `@path` intact
- [ ] Claude Code reads the referenced file
- [ ] Folders insert with trailing `/`
- [ ] Works at start of message, middle, and end
- [ ] No interference with normal typing
- [ ] No interference with Shift+Enter (newline)
- [ ] Performance: dropdown appears < 100ms

---

## Electron-Specific Considerations

### Main Process Changes

**File**: `chorus/src/main/services/fs-service.ts`
- New `walkDirectory()` function using Node.js `readdirSync`/`statSync`
- Recursive traversal with depth limit
- Error handling for permission issues

**File**: `chorus/src/main/index.ts`
- New IPC handler `fs:walk-directory`
- Standard ApiResult pattern

### Renderer Process Changes

**Files**:
- `chorus/src/renderer/src/components/Chat/MessageInput.tsx` - Enhanced with mentions
- `chorus/src/renderer/src/components/Chat/MentionDropdown.tsx` - New component
- `chorus/src/renderer/src/hooks/useFileSearch.ts` - New hook
- `chorus/src/renderer/src/hooks/useMentionTrigger.ts` - New hook

### Preload Script Changes

**File**: `chorus/src/preload/index.ts`
- Add `walkDirectory` to fs API object

**File**: `chorus/src/preload/index.d.ts`
- Add `WalkEntry` interface
- Update `FileSystemAPI` interface

---

## Dependencies

**New npm packages:**
- `fuse.js` (~6kb gzipped) - Fuzzy search library
- `textarea-caret` (~2kb) - Calculate caret coordinates in textarea

**Install command:**
```bash
cd chorus && bun add fuse.js textarea-caret
```

---

## Performance Considerations

1. **File Index Caching**: Build index once per workspace, refresh on explicit action only
2. **Search Debouncing**: 50ms debounce prevents excessive filtering during fast typing
3. **Result Limiting**: Maximum 10 results in dropdown
4. **Depth Limiting**: Walk max 5 levels deep to avoid huge file trees
5. **Hidden Pattern Filtering**: Excludes node_modules, .git, etc. at walk time (not after)

---

## Testing Strategy

### Unit Tests (Future)

- `useFileSearch`: Mock IPC, verify search filtering
- `useMentionTrigger`: Test @ detection edge cases
- `MentionDropdown`: Snapshot tests for rendering states

### Integration Tests (Future)

- IPC round-trip for `fs:walk-directory`
- Full mention flow: type @ → select → send → verify CLI receives path

### Manual Testing Checklist

1. **Basic Flow**
   - [ ] Type `@` → dropdown appears
   - [ ] Type query → results filter
   - [ ] Select with arrow keys + Enter
   - [ ] Select with mouse click
   - [ ] Path inserted correctly

2. **Edge Cases**
   - [ ] `@` at message start
   - [ ] `@` in middle of sentence
   - [ ] `@@` double trigger
   - [ ] `user@example.com` no trigger
   - [ ] Empty query shows all files (limited)
   - [ ] No matches shows empty state

3. **Keyboard Navigation**
   - [ ] Down arrow wraps to top
   - [ ] Up arrow wraps to bottom
   - [ ] Escape closes without insert
   - [ ] Enter when closed sends message

4. **Integration**
   - [ ] Claude Code reads referenced file
   - [ ] Multiple @ mentions in one message
   - [ ] Works with existing shortcuts (Shift+Enter)

---

## File Structure After Implementation

```
chorus/src/
├── main/
│   ├── index.ts                    # + fs:walk-directory handler
│   └── services/
│       └── fs-service.ts           # + walkDirectory()
├── preload/
│   ├── index.ts                    # + walkDirectory in fs API
│   └── index.d.ts                  # + WalkEntry, FileSystemAPI update
└── renderer/src/
    ├── components/Chat/
    │   ├── MessageInput.tsx        # Enhanced with mention support
    │   └── MentionDropdown.tsx     # New component
    └── hooks/
        ├── useFileSearch.ts        # New hook
        └── useMentionTrigger.ts    # New hook
```

---

## References

- Feature spec: `specifications/4-@-symbol/feature.md`
- Research: `specifications/4-@-symbol/research.md`
- Dropdown pattern: `chorus/src/renderer/src/components/Sidebar/BranchSelector.tsx:95-172`
- Click-outside pattern: `chorus/src/renderer/src/components/Chat/ConversationToolbar.tsx:57-70`
- Hidden patterns: `chorus/src/main/services/fs-service.ts:14-38`
- Current MessageInput: `chorus/src/renderer/src/components/Chat/MessageInput.tsx`
