---
date: 2025-12-02
author: Claude
status: draft
type: implementation_plan
feature: @ Symbol File Mentions v2
---

# @ Symbol File Mentions v2 - Implementation Plan

## Overview

Enhance the existing @ file mention system with multi-file selection, smart suggestions, filter prefixes, and directory navigation. This builds on the v1 foundation without breaking existing functionality.

## Current State Analysis

### Existing Infrastructure

- **MentionDropdown** (`chorus/src/renderer/src/components/Chat/MentionDropdown.tsx:1-183`): Renders file list with icons, keyboard navigation, click selection
- **MessageInput** (`chorus/src/renderer/src/components/Chat/MessageInput.tsx:1-293`): Textarea with @ detection, single file insertion
- **useMentionTrigger** (`chorus/src/renderer/src/hooks/useMentionTrigger.ts:1-157`): Detects @, calculates position, tracks query
- **useFileSearch** (`chorus/src/renderer/src/hooks/useFileSearch.ts:1-113`): Fuse.js search, file caching, max 10 results
- **git-service** (`chorus/src/main/services/git-service.ts`): Has `getStatus()` returning changed files

### Key Integration Points

1. `MentionDropdown` receives flat `items` array - needs sectioning
2. `MessageInput` calls `insertMention()` for single file - needs multi-file support
3. `useFileSearch.search()` returns flat results - needs sectioned output
4. `git-service.getStatus()` returns full status - can extract changed files

## What We're Building

| Phase | Feature | Complexity |
|-------|---------|------------|
| 1 | Multi-File Selection | Medium |
| 2 | Smart Suggestions | Medium |
| 3 | Filter Prefixes | Low |
| 4 | Directory Navigation | High |

---

## Phase 1: Multi-File Selection

### Overview

Allow users to select multiple files before inserting, displayed as removable chips above the textarea.

### Changes Required

#### 1. Create SelectionChips Component

**File**: `chorus/src/renderer/src/components/Chat/SelectionChips.tsx` (new)

**Implementation Requirements:**
- Accept props: `files: WalkEntry[]`, `onRemove: (path: string) => void`
- Render horizontal list of removable chips
- Each chip shows: file icon (based on extension), truncated name, X button
- Tooltip shows full path on hover
- Style: `bg-surface border-default rounded-full px-2 py-1`
- Horizontal scroll if overflow, or wrap to 2 lines max
- Empty state: render nothing (not placeholder)

**Visual Structure:**
```tsx
<div className="flex flex-wrap gap-1 p-2 border-b border-default">
  {files.map(file => (
    <div key={file.path} className="flex items-center gap-1 bg-surface ...">
      <FileIcon extension={getExtension(file.name)} />
      <span className="truncate max-w-[120px]">{file.name}</span>
      <button onClick={() => onRemove(file.path)}>×</button>
    </div>
  ))}
</div>
```

#### 2. Add Multi-Select State to MessageInput

**File**: `chorus/src/renderer/src/components/Chat/MessageInput.tsx`

**Implementation Requirements:**

**New State:**
```typescript
const [selectedFiles, setSelectedFiles] = useState<WalkEntry[]>([])
```

**Modified Keyboard Handling (handleKeyDown):**
- Check for Shift key when Enter pressed
- If `Shift+Enter` and dropdown open:
  - Add highlighted file to `selectedFiles` (if not already)
  - Keep dropdown open
  - Move highlight to next item
- If `Enter` (no Shift) and dropdown open:
  - If `selectedFiles.length > 0`: insert all selected + highlighted
  - Else: insert highlighted only (existing behavior)
  - Close dropdown, clear selection

**Insert Logic:**
```typescript
const insertAllMentions = () => {
  const allFiles = [...selectedFiles]
  if (filteredFiles[selectedIndex] && !selectedFiles.find(f => f.path === filteredFiles[selectedIndex].path)) {
    allFiles.push(filteredFiles[selectedIndex])
  }
  const paths = allFiles.map(f => `@${f.relativePath}${f.isDirectory ? '/' : ''}`).join(' ')
  // Insert paths at triggerIndex, replacing @query
  const before = message.slice(0, triggerIndex)
  const after = message.slice(triggerIndex + query.length + 1) // +1 for @
  setMessage(`${before}${paths}${after}`)
  setSelectedFiles([])
  close()
}
```

**Chip Removal Handler:**
```typescript
const handleRemoveSelection = (path: string) => {
  setSelectedFiles(prev => prev.filter(f => f.path !== path))
}
```

**Render SelectionChips:**
- Render above textarea when `selectedFiles.length > 0`
- Pass `files` and `onRemove` props

#### 3. Add Selection Indicators to MentionDropdown

**File**: `chorus/src/renderer/src/components/Chat/MentionDropdown.tsx`

**Implementation Requirements:**

**New Props:**
```typescript
interface MentionDropdownProps {
  // ... existing
  selectedPaths?: Set<string>  // Paths of selected files
}
```

**Render Checkmark:**
- For each item, check if `selectedPaths.has(item.path)`
- If selected, show checkmark icon before file icon
- Checkmark style: `text-accent` (green/blue checkmark)

**Visual:**
```
│ ✓ 📄 src/auth.ts          │  ← selected
│   📄 src/user.ts          │  ← not selected
```

#### 4. Update Help Text

**File**: `chorus/src/renderer/src/components/Chat/MessageInput.tsx`

**Implementation Requirements:**
- Update footer hint when dropdown is open and files selected:
  - Default: `@ mention files`
  - With selection: `Shift+Enter to add more | Enter to insert {n} files`

### Success Criteria

**Manual verification:**
- [ ] Type `@`, press `Shift+Enter` on file → chip appears, dropdown stays open
- [ ] Select 3 files with Shift+Enter → 3 chips visible
- [ ] Press Enter → all 3 paths inserted: `@file1 @file2 @file3`
- [ ] Click X on chip → chip removed, dropdown stays open
- [ ] Press Escape → all chips cleared, dropdown closes
- [ ] Selected files show checkmark in dropdown

---

## Phase 2: Smart Suggestions

### Overview

Show git-changed files, recently mentioned files, and recently viewed files in prioritized sections.

### Changes Required

#### 1. Add Git Changed Files IPC Handler

**File**: `chorus/src/main/index.ts`

**Implementation Requirements:**
- Add handler `git:get-changed-files` (around line 670, after other git handlers)
- Accept: `repoPath: string`
- Call `gitService.getStatus(repoPath)`
- Extract files with modified/added/deleted status
- Return: `ApiResult<{ path: string, status: 'M' | 'A' | 'D' }[]>`

```typescript
ipcMain.handle('git:get-changed-files', async (_, repoPath: string) => {
  try {
    const status = await gitService.getStatus(repoPath)
    const changedFiles = [
      ...status.modified.map(p => ({ path: p, status: 'M' as const })),
      ...status.added.map(p => ({ path: p, status: 'A' as const })),
      ...status.deleted.map(p => ({ path: p, status: 'D' as const })),
    ]
    return { success: true, data: changedFiles }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})
```

#### 2. Expose in Preload

**File**: `chorus/src/preload/index.ts`

**Implementation Requirements:**
- Add `getChangedFiles` to `git` object:
```typescript
getChangedFiles: (repoPath: string) => ipcRenderer.invoke('git:get-changed-files', repoPath)
```

**File**: `chorus/src/preload/index.d.ts`

**Implementation Requirements:**
- Add interface:
```typescript
interface ChangedFile {
  path: string
  status: 'M' | 'A' | 'D'
}
```
- Add to `GitAPI`:
```typescript
getChangedFiles: (repoPath: string) => Promise<ApiResult<ChangedFile[]>>
```

#### 3. Track Recently Viewed Files

**File**: `chorus/src/renderer/src/stores/workspace-store.ts`

**Implementation Requirements:**

**New State:**
```typescript
interface WorkspaceState {
  // ... existing
  recentlyViewedFiles: string[]  // Max 10 paths, most recent first
}
```

**New Action:**
```typescript
trackFileView: (path: string) => void
```

**Implementation:**
```typescript
trackFileView: (path: string) => {
  set(state => ({
    recentlyViewedFiles: [
      path,
      ...state.recentlyViewedFiles.filter(p => p !== path)
    ].slice(0, 10)
  }))
}
```

**Integration Point:**
- Call `trackFileView` when file opened in FileViewer
- In `MainPane.tsx` or wherever file selection happens

#### 4. Track Recently Mentioned Files

**File**: `chorus/src/renderer/src/stores/chat-store.ts`

**Implementation Requirements:**

**New State:**
```typescript
interface ChatState {
  // ... existing
  conversationMentions: Map<string, string[]>  // conversationId → paths
}
```

**New Actions:**
```typescript
trackMention: (conversationId: string, paths: string[]) => void
getMentions: (conversationId: string) => string[]
```

**Integration Point:**
- Call `trackMention` when message with @ mentions is sent
- Parse message for `@path/to/file` patterns before sending

#### 5. Create useSmartSuggestions Hook

**File**: `chorus/src/renderer/src/hooks/useSmartSuggestions.ts` (new)

**Implementation Requirements:**

**Hook Signature:**
```typescript
interface SmartSuggestions {
  changed: Array<WalkEntry & { status: 'M' | 'A' | 'D' }>
  recent: WalkEntry[]
  isLoading: boolean
}

function useSmartSuggestions(
  workspacePath: string,
  conversationId: string,
  allFiles: WalkEntry[]
): SmartSuggestions
```

**Implementation:**
- Fetch changed files on mount and when workspacePath changes
- Get recentlyViewedFiles from workspace-store
- Get conversationMentions from chat-store
- Map paths to WalkEntry objects from allFiles
- Dedupe: file in "changed" shouldn't appear in "recent"

#### 6. Update useFileSearch to Return Sections

**File**: `chorus/src/renderer/src/hooks/useFileSearch.ts`

**Implementation Requirements:**

**Modified Return Type:**
```typescript
interface SectionedResults {
  changed: Array<WalkEntry & { status?: string }>
  recent: WalkEntry[]
  filtered: WalkEntry[]  // Fuzzy search results (existing behavior)
}

function useFileSearch(workspacePath: string): {
  files: WalkEntry[]
  search: (query: string) => WalkEntry[]  // Keep for backwards compat
  searchSectioned: (query: string, suggestions: SmartSuggestions) => SectionedResults
  // ... rest
}
```

**searchSectioned Logic:**
- If query empty: return suggestions.changed, suggestions.recent, first 5 of allFiles
- If query present: filter all sections by query, prioritize matches in changed/recent

#### 7. Update MentionDropdown for Sections

**File**: `chorus/src/renderer/src/components/Chat/MentionDropdown.tsx`

**Implementation Requirements:**

**New Props:**
```typescript
interface MentionDropdownProps {
  // Replace items with sectioned:
  sections: {
    changed?: Array<WalkEntry & { status?: string }>
    recent?: WalkEntry[]
    allFiles: WalkEntry[]
  }
  // ... rest
}
```

**Render Sections:**
```tsx
{sections.changed?.length > 0 && (
  <>
    <div className="px-3 py-1 text-xs text-muted">Changed</div>
    {sections.changed.map(item => (
      <DropdownItem key={item.path} item={item} statusBadge={item.status} />
    ))}
  </>
)}
{sections.recent?.length > 0 && (
  <>
    <div className="px-3 py-1 text-xs text-muted border-t border-default">Recent</div>
    {/* ... */}
  </>
)}
{/* All Files section */}
```

**Keyboard Navigation:**
- Flatten sections for index calculation
- Navigate through all items sequentially
- Visual separator between sections doesn't affect navigation

### Success Criteria

**Manual verification:**
- [ ] Make changes to a file, type `@` → "Changed" section shows modified file with M badge
- [ ] View a file, then type `@` → file appears in "Recent" section
- [ ] Send message with `@file`, then type `@` again → file in "Recent"
- [ ] Sections collapse when empty
- [ ] Keyboard navigation works across sections
- [ ] Changed files show M/A/D status indicator

---

## Phase 3: Filter Prefixes

### Overview

Support type prefixes like `@ts:` and path prefixes like `@src/` for quick filtering.

### Changes Required

#### 1. Add Filter Parsing to useMentionTrigger

**File**: `chorus/src/renderer/src/hooks/useMentionTrigger.ts`

**Implementation Requirements:**

**New Return Values:**
```typescript
interface MentionTriggerState {
  // ... existing
  filter: {
    type: 'extension' | 'path' | 'semantic' | null
    value: string  // 'ts', 'src/', 'test'
  } | null
  queryWithoutFilter: string  // Query after filter prefix removed
}
```

**Filter Detection Logic:**
```typescript
const parseFilter = (query: string): { filter: Filter | null, rest: string } => {
  // Extension filters: @ts:, @js:, @css:, @md:
  const extMatch = query.match(/^(ts|tsx|js|jsx|css|scss|md|json|yaml):(.*)/)
  if (extMatch) {
    return {
      filter: { type: 'extension', value: extMatch[1] },
      rest: extMatch[2]
    }
  }

  // Semantic filters: @test:, @config:
  const semanticMatch = query.match(/^(test|config):(.*)/)
  if (semanticMatch) {
    return {
      filter: { type: 'semantic', value: semanticMatch[1] },
      rest: semanticMatch[2]
    }
  }

  // Path filters: @src/, @components/
  const pathMatch = query.match(/^([a-zA-Z_][a-zA-Z0-9_-]*\/)+(.*)/)
  if (pathMatch) {
    const pathPrefix = query.slice(0, query.lastIndexOf('/') + 1)
    return {
      filter: { type: 'path', value: pathPrefix },
      rest: query.slice(pathPrefix.length)
    }
  }

  return { filter: null, rest: query }
}
```

#### 2. Apply Filters in useFileSearch

**File**: `chorus/src/renderer/src/hooks/useFileSearch.ts`

**Implementation Requirements:**

**New Function:**
```typescript
const applyFilter = (files: WalkEntry[], filter: Filter | null): WalkEntry[] => {
  if (!filter) return files

  switch (filter.type) {
    case 'extension':
      const exts = getExtensions(filter.value) // ts → ['.ts', '.tsx']
      return files.filter(f => exts.some(ext => f.name.endsWith(ext)))

    case 'semantic':
      if (filter.value === 'test') {
        return files.filter(f =>
          f.name.includes('.test.') ||
          f.name.includes('.spec.') ||
          f.relativePath.includes('__tests__/')
        )
      }
      if (filter.value === 'config') {
        return files.filter(f =>
          f.name.endsWith('.json') ||
          f.name.endsWith('.yaml') ||
          f.name.endsWith('.toml') ||
          f.name.match(/^\.[a-z]+rc$/)
        )
      }
      return files

    case 'path':
      return files.filter(f => f.relativePath.startsWith(filter.value))

    default:
      return files
  }
}
```

**Extension Mapping:**
```typescript
const extensionMap: Record<string, string[]> = {
  ts: ['.ts', '.tsx'],
  js: ['.js', '.jsx'],
  css: ['.css', '.scss', '.sass', '.less'],
  md: ['.md', '.mdx'],
  json: ['.json'],
  yaml: ['.yaml', '.yml'],
}
```

#### 3. Create FilterHint Component

**File**: `chorus/src/renderer/src/components/Chat/FilterHint.tsx` (new)

**Implementation Requirements:**
- Show available filters when query is empty or just `@`
- Render as row below dropdown items
- Clickable: clicking filter inserts it into query

```tsx
const filters = ['ts:', 'js:', 'test:', 'config:', 'md:']

<div className="flex gap-2 px-3 py-2 border-t border-default text-xs text-muted">
  <span>Filters:</span>
  {filters.map(f => (
    <button
      key={f}
      onClick={() => onInsertFilter(f)}
      className="hover:text-foreground"
    >
      @{f}
    </button>
  ))}
</div>
```

#### 4. Show Active Filter Badge

**File**: `chorus/src/renderer/src/components/Chat/MentionDropdown.tsx`

**Implementation Requirements:**
- When filter is active, show badge at top of dropdown
- Badge shows filter type and has X to clear

```tsx
{filter && (
  <div className="flex items-center gap-2 px-3 py-1 bg-surface border-b border-default">
    <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs">
      {filter.type === 'extension' && filter.value}
      {filter.type === 'path' && filter.value}
      {filter.type === 'semantic' && filter.value}
    </span>
    <button onClick={onClearFilter} className="text-muted hover:text-foreground">×</button>
  </div>
)}
```

### Success Criteria

**Manual verification:**
- [ ] Type `@ts:` → only .ts and .tsx files shown
- [ ] Type `@test:user` → shows user.test.ts, user.spec.ts
- [ ] Type `@src/` → only files under src/ directory
- [ ] Type `@config:` → shows package.json, tsconfig.json, .eslintrc
- [ ] Filter badge appears with active filter
- [ ] Clicking X clears filter
- [ ] FilterHint shows when no query
- [ ] Clicking filter hint inserts it

---

## Phase 4: Directory Navigation

### Overview

Allow expanding folders inline to browse into them, with breadcrumb navigation.

### Changes Required

#### 1. Add Expansion State to useMentionTrigger

**File**: `chorus/src/renderer/src/hooks/useMentionTrigger.ts`

**Implementation Requirements:**

**New State:**
```typescript
const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
const [currentBreadcrumb, setCurrentBreadcrumb] = useState<string[]>([])
```

**New Functions:**
```typescript
const toggleExpand = (path: string) => {
  setExpandedPaths(prev => {
    const next = new Set(prev)
    if (next.has(path)) {
      next.delete(path)
    } else {
      next.add(path)
    }
    return next
  })
}

const navigateInto = (folderPath: string) => {
  const parts = folderPath.split('/').filter(Boolean)
  setCurrentBreadcrumb(parts)
  setExpandedPaths(new Set()) // Reset expansion when navigating
}

const navigateUp = () => {
  setCurrentBreadcrumb(prev => prev.slice(0, -1))
}
```

**Return Values:**
```typescript
return {
  // ... existing
  expandedPaths,
  toggleExpand,
  currentBreadcrumb,
  navigateInto,
  navigateUp,
}
```

#### 2. Handle Arrow Keys for Folder Navigation

**File**: `chorus/src/renderer/src/components/Chat/MessageInput.tsx`

**Implementation Requirements:**

**Modified handleKeyDown:**
```typescript
// When dropdown open and item is a folder:
case 'ArrowRight':
  if (highlightedItem?.isDirectory) {
    e.preventDefault()
    toggleExpand(highlightedItem.path)
  }
  break

case 'ArrowLeft':
  if (expandedPaths.has(highlightedItem?.path)) {
    e.preventDefault()
    toggleExpand(highlightedItem.path) // collapse
  } else if (currentBreadcrumb.length > 0) {
    e.preventDefault()
    navigateUp()
  }
  break

case 'Enter':
  if (highlightedItem?.isDirectory && !expandedPaths.has(highlightedItem.path)) {
    e.preventDefault()
    toggleExpand(highlightedItem.path) // First Enter expands
  } else {
    // Insert path (existing behavior)
  }
  break
```

#### 3. Render Expanded Folder Children

**File**: `chorus/src/renderer/src/components/Chat/MentionDropdown.tsx`

**Implementation Requirements:**

**Props Addition:**
```typescript
interface MentionDropdownProps {
  // ... existing
  expandedPaths: Set<string>
  onToggleExpand: (path: string) => void
  getChildren: (folderPath: string) => WalkEntry[]
}
```

**Render Logic:**
```typescript
const renderItem = (item: WalkEntry, depth: number = 0) => {
  const isExpanded = expandedPaths.has(item.path)
  const children = isExpanded ? getChildren(item.path) : []

  return (
    <>
      <div
        className="flex items-center gap-2 px-3 py-1.5 hover:bg-hover"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {item.isDirectory && (
          <button onClick={() => onToggleExpand(item.path)}>
            {isExpanded ? '▾' : '▸'}
          </button>
        )}
        <FileIcon ... />
        <span>{item.name}</span>
      </div>
      {isExpanded && children.map(child => renderItem(child, depth + 1))}
    </>
  )
}
```

#### 4. Add Breadcrumb Navigation

**File**: `chorus/src/renderer/src/components/Chat/MentionDropdown.tsx`

**Implementation Requirements:**

**Breadcrumb Component:**
```tsx
{currentBreadcrumb.length > 0 && (
  <div className="flex items-center gap-1 px-3 py-1 border-b border-default text-sm">
    <button onClick={() => setCurrentBreadcrumb([])}>~</button>
    {currentBreadcrumb.map((part, i) => (
      <>
        <span className="text-muted">/</span>
        <button
          onClick={() => setCurrentBreadcrumb(prev => prev.slice(0, i + 1))}
          className="hover:text-accent"
        >
          {part}
        </button>
      </>
    ))}
  </div>
)}
```

#### 5. Support Bulk Folder Selection

**File**: `chorus/src/renderer/src/components/Chat/MessageInput.tsx`

**Implementation Requirements:**

**Shift+Enter on Folder:**
```typescript
if (e.shiftKey && highlightedItem?.isDirectory) {
  // Get immediate file children (not subfolders)
  const children = getChildren(highlightedItem.path).filter(c => !c.isDirectory)
  setSelectedFiles(prev => {
    const newFiles = children.filter(c => !prev.find(p => p.path === c.path))
    return [...prev, ...newFiles]
  })
}
```

#### 6. Modify useFileSearch for Hierarchical Data

**File**: `chorus/src/renderer/src/hooks/useFileSearch.ts`

**Implementation Requirements:**

**Add getChildren Function:**
```typescript
const getChildren = useCallback((folderPath: string): WalkEntry[] => {
  return files.filter(f => {
    const parentPath = f.relativePath.substring(0, f.relativePath.lastIndexOf('/'))
    return parentPath === folderPath ||
           (folderPath === '' && !f.relativePath.includes('/'))
  })
}, [files])

return {
  // ... existing
  getChildren,
}
```

### Success Criteria

**Manual verification:**
- [ ] Press Right Arrow on folder → folder expands, children shown indented
- [ ] Press Left Arrow on expanded folder → folder collapses
- [ ] Press Left Arrow on child → parent folder collapses
- [ ] Press Enter on collapsed folder → expands (first press)
- [ ] Press Enter on expanded folder → inserts path (second press)
- [ ] Shift+Enter on folder → all file children selected as chips
- [ ] Breadcrumb shows when navigated into folder
- [ ] Clicking breadcrumb segment navigates to that level
- [ ] Clicking `~` returns to root

---

## Performance Considerations

1. **Git Status Caching**: Cache for 5 seconds, refresh on focus or explicit action
2. **Lazy Folder Children**: Only compute children when folder expanded
3. **Flat Index**: Keep flat file array, compute hierarchy on demand
4. **Debounced Filter**: 50ms debounce on filter prefix parsing
5. **Limited Depth**: Folder expansion limited to 3 additional levels

---

## File Structure After Implementation

```
chorus/src/renderer/src/
├── components/Chat/
│   ├── MentionDropdown.tsx    # Sections, expansion, breadcrumb
│   ├── MessageInput.tsx       # Multi-select, arrow keys, chips
│   ├── SelectionChips.tsx     # New: removable file chips
│   └── FilterHint.tsx         # New: filter prefix hints
├── hooks/
│   ├── useFileSearch.ts       # Sectioned results, filter application
│   ├── useMentionTrigger.ts   # Filter parsing, expansion state
│   └── useSmartSuggestions.ts # New: changed/recent files
└── stores/
    ├── workspace-store.ts     # + recentlyViewedFiles
    └── chat-store.ts          # + conversationMentions
```

---

## Migration Notes

- All changes are additive - existing @ behavior preserved
- Multi-select is opt-in (Shift+Enter)
- Sections appear automatically but don't change navigation
- Filters only activate with explicit prefix
- Folder expansion is optional (Enter still inserts)

---

## Testing Checklist

### Phase 1: Multi-File Selection
- [ ] Shift+Enter adds file to selection
- [ ] Chips display correctly
- [ ] Chip removal works
- [ ] Enter inserts all selected
- [ ] Checkmarks show in dropdown
- [ ] Escape clears selection

### Phase 2: Smart Suggestions
- [ ] Changed files section appears
- [ ] M/A/D badges correct
- [ ] Recent files tracked
- [ ] Sections navigate correctly
- [ ] Empty sections hidden

### Phase 3: Filter Prefixes
- [ ] @ts: filters TypeScript
- [ ] @test: filters test files
- [ ] @src/ filters by path
- [ ] Filter badge appears
- [ ] Clear filter works
- [ ] Hints clickable

### Phase 4: Directory Navigation
- [ ] Right arrow expands
- [ ] Left arrow collapses
- [ ] Children indented
- [ ] Breadcrumb navigates
- [ ] Bulk folder selection works

---

## References

- Feature spec: `specifications/4-@-symbol/feature-2.md`
- Original implementation: `specifications/4-@-symbol/implementation-plan.md`
- MentionDropdown: `chorus/src/renderer/src/components/Chat/MentionDropdown.tsx`
- MessageInput: `chorus/src/renderer/src/components/Chat/MessageInput.tsx`
- useMentionTrigger: `chorus/src/renderer/src/hooks/useMentionTrigger.ts`
- useFileSearch: `chorus/src/renderer/src/hooks/useFileSearch.ts`
- git-service: `chorus/src/main/services/git-service.ts`
