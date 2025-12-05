---
date: 2025-12-02
author: Claude
status: draft
type: testing_plan
feature: @ Symbol File Mentions v2
---

# @ Symbol File Mentions v2 - Testing Plan

## Overview

This document outlines the testing strategy for the enhanced @ file mention system. Testing covers multi-file selection, smart suggestions, filter prefixes, and directory navigation.

---

## Phase 1: Multi-File Selection

### Unit Tests

#### SelectionChips Component
| Test Case | Expected Behavior |
|-----------|-------------------|
| Renders nothing when files array is empty | No DOM elements rendered |
| Renders correct number of chips | N chips for N files |
| Displays file name correctly | Shows `filename.ext` truncated at 140px |
| Shows folder indicator | Appends `/` for directories |
| Remove button works | Calls `onRemove(path)` when X clicked |
| Shows selection count | Displays "N selected" text |
| Tooltip shows full path | Hover reveals `relativePath` |

#### MentionDropdown Selection Indicators
| Test Case | Expected Behavior |
|-----------|-------------------|
| Checkmark shows for selected items | `selectedPaths.has(path)` renders checkmark |
| Selected items have highlight background | `bg-accent/10` class applied |
| Non-selected items have no checkmark | No checkmark icon rendered |

### Integration Tests

#### MessageInput Multi-Select Flow
| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Shift+Enter adds to selection | Type `@`, press Shift+Enter | File added to chips, dropdown stays open |
| Multiple selections | Shift+Enter 3 times | 3 chips displayed |
| Enter inserts all selected | With 2 chips, press Enter | `@file1 @file2 @current` inserted |
| Click inserts all | With chips, click item | All paths inserted, dropdown closes |
| Escape clears selection | With chips, press Escape | Chips cleared, dropdown closes |
| Chip removal | Click X on chip | Chip removed, dropdown stays open |
| Duplicate prevention | Shift+Enter same file twice | Only one chip (no duplicates) |

### Manual Testing Checklist

- [ ] Type `@` → dropdown opens
- [ ] Press `Shift+Enter` → file added as chip above textarea
- [ ] Press `Shift+Enter` on 3 different files → 3 chips visible
- [ ] Selected files show checkmark in dropdown
- [ ] Help text changes to "Enter insert N files | Shift+Enter add more"
- [ ] Press `Enter` → all files inserted as `@path1 @path2 @path3`
- [ ] Click X on chip → chip removed, count updates
- [ ] Press `Escape` → all chips cleared, dropdown closes
- [ ] Cursor positioned correctly after insertion
- [ ] Works with folders (trailing `/` added)

---

## Phase 2: Smart Suggestions

### Unit Tests

#### git:get-changed-files IPC Handler
| Test Case | Expected Behavior |
|-----------|-------------------|
| Returns modified files with M status | `{ path: 'file.ts', status: 'M' }` |
| Returns added files with A status | `{ path: 'new.ts', status: 'A' }` |
| Returns deleted files with D status | `{ path: 'removed.ts', status: 'D' }` |
| Returns untracked files with ? status | `{ path: 'untracked.ts', status: '?' }` |
| Handles empty repo | Returns empty array |
| Handles git errors gracefully | Returns `{ success: false, error }` |

#### workspace-store recentlyViewedFiles
| Test Case | Expected Behavior |
|-----------|-------------------|
| trackFileView adds file to front | New file at index 0 |
| Duplicate moves to front | Existing file moved, not duplicated |
| Max 10 files kept | 11th file pushes out oldest |
| Order preserved | Most recent first |

#### useSmartSuggestions Hook
| Test Case | Expected Behavior |
|-----------|-------------------|
| Returns changed files from git | Calls `getChangedFiles`, returns results |
| Returns recent files from store | Gets `recentlyViewedFiles` from workspace-store |
| Dedupes changed from recent | File in "changed" not in "recent" |
| Loading state during fetch | `isLoading: true` while fetching |
| Caches results | Same workspace returns cached data |

### Integration Tests

#### Smart Suggestions in Dropdown
| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Changed section appears | Make changes, type `@` | "Changed" section with M/A/D files |
| Recent section appears | View file, type `@` | "Recent" section with viewed file |
| Status badges correct | Modify file, type `@` | "M" badge next to file |
| Sections filter with query | Type `@auth` | All sections filter to matching |
| Empty sections hidden | No changes, type `@` | No "Changed" section visible |

### Manual Testing Checklist

- [ ] Modify a file in the workspace
- [ ] Type `@` → "Changed" section appears with modified file
- [ ] Modified file shows "M" badge
- [ ] Add a new file → appears with "A" badge
- [ ] Delete a file → appears with "D" badge
- [ ] Open a file in FileViewer
- [ ] Type `@` → "Recent" section shows the opened file
- [ ] Changed files appear before recent files
- [ ] Typing filters all sections
- [ ] Keyboard navigation works across sections
- [ ] Git fetch doesn't block UI (async)

---

## Phase 3: Filter Prefixes

### Unit Tests

#### Filter Parsing in useMentionTrigger
| Test Case | Input | Expected Filter |
|-----------|-------|-----------------|
| TypeScript filter | `@ts:auth` | `{ type: 'extension', value: 'ts' }`, rest: `auth` |
| JavaScript filter | `@js:config` | `{ type: 'extension', value: 'js' }`, rest: `config` |
| Test filter | `@test:user` | `{ type: 'semantic', value: 'test' }`, rest: `user` |
| Config filter | `@config:` | `{ type: 'semantic', value: 'config' }`, rest: `` |
| Path filter | `@src/utils` | `{ type: 'path', value: 'src/' }`, rest: `utils` |
| Nested path | `@src/components/Chat/` | `{ type: 'path', value: 'src/components/Chat/' }`, rest: `` |
| No filter | `@auth` | `null`, rest: `auth` |
| Invalid prefix | `@xyz:test` | `null`, rest: `xyz:test` |

#### Filter Application in useFileSearch
| Test Case | Filter | Input Files | Expected Output |
|-----------|--------|-------------|-----------------|
| ts extension | `ts` | `[a.ts, b.js, c.tsx]` | `[a.ts, c.tsx]` |
| js extension | `js` | `[a.ts, b.js, c.jsx]` | `[b.js, c.jsx]` |
| test semantic | `test` | `[a.ts, a.test.ts, b.spec.js]` | `[a.test.ts, b.spec.js]` |
| config semantic | `config` | `[a.ts, tsconfig.json, .eslintrc]` | `[tsconfig.json, .eslintrc]` |
| path prefix | `src/` | `[src/a.ts, lib/b.ts]` | `[src/a.ts]` |

### Integration Tests

#### Filter in Dropdown
| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| ts filter works | Type `@ts:` | Only .ts and .tsx files shown |
| Filter badge appears | Type `@test:` | Badge shows "[test]" at top |
| Clear filter | Click X on badge | Filter removed, all files shown |
| Filter + search | Type `@ts:auth` | TypeScript files matching "auth" |
| Filter hint shows | Type `@` (no query) | Filter hints shown at bottom |
| Click hint | Click `@ts:` hint | Filter inserted into input |

### Manual Testing Checklist

- [ ] Type `@ts:` → only TypeScript files shown
- [ ] Type `@js:` → only JavaScript files shown
- [ ] Type `@test:` → only test files shown (*.test.*, *.spec.*, __tests__/*)
- [ ] Type `@config:` → only config files shown (.json, .yaml, .*rc)
- [ ] Type `@md:` → only markdown files shown
- [ ] Type `@src/` → only files under src/ shown
- [ ] Type `@components/` → only files under components/ shown
- [ ] Filter badge appears with active filter
- [ ] Clicking X clears filter
- [ ] Filter hints visible when no query
- [ ] Clicking hint inserts filter prefix
- [ ] Filter + fuzzy search works together

---

## Phase 4: Directory Navigation

### Unit Tests

#### Expansion State in useMentionTrigger
| Test Case | Expected Behavior |
|-----------|-------------------|
| Initial state empty | `expandedPaths: Set()` empty |
| toggleExpand adds path | Path added to set |
| toggleExpand removes path | Expanded path removed from set |
| navigateInto updates breadcrumb | Breadcrumb array updated |
| navigateUp removes last segment | Last breadcrumb item removed |

#### getChildren in useFileSearch
| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Root children | `''` | Files without `/` in path |
| Nested children | `src` | Files with `src/` prefix, one level deep |
| Deep children | `src/components` | Files with `src/components/` prefix |

### Integration Tests

#### Directory Navigation in Dropdown
| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Right arrow expands | Select folder, press Right | Children shown indented |
| Left arrow collapses | On expanded folder, press Left | Children hidden |
| First Enter expands | On collapsed folder, press Enter | Folder expands |
| Second Enter inserts | On expanded folder, press Enter | Path inserted |
| Breadcrumb updates | Navigate into folder | Breadcrumb shows path |
| Breadcrumb click | Click breadcrumb segment | Navigate to that level |
| Home navigation | Click `~` in breadcrumb | Return to root |
| Shift+Enter bulk select | On folder, Shift+Enter | All file children selected |

### Manual Testing Checklist

- [ ] Folder shows `▸` collapse indicator
- [ ] Press Right Arrow on folder → expands, shows `▾`
- [ ] Children appear indented below folder
- [ ] Press Left Arrow → folder collapses
- [ ] Press Enter on collapsed folder → folder expands
- [ ] Press Enter on expanded folder → path inserted
- [ ] Breadcrumb appears when navigated into folder
- [ ] Clicking breadcrumb segment navigates there
- [ ] Clicking `~` returns to root
- [ ] Press Shift+Enter on folder → all file children become chips
- [ ] Arrow key navigation includes expanded children
- [ ] Nested expansion works (folder inside folder)

---

## Cross-Phase Integration Tests

### End-to-End Workflows

| Workflow | Steps | Expected Result |
|----------|-------|-----------------|
| Multi-select with smart suggestions | Modify 2 files, type `@`, Shift+Enter both from "Changed" | Both files as chips |
| Filter then multi-select | Type `@ts:`, Shift+Enter 3 TS files | 3 chips, all TypeScript |
| Directory bulk + individual | Shift+Enter on folder, Shift+Enter on file | Folder children + file as chips |
| Filter + navigation | Type `@src/`, Right arrow on subfolder | Navigate within filtered results |
| Clear and restart | Build selection, Escape, type `@` again | Fresh start, no selection |

### Performance Tests

| Scenario | Metric | Target |
|----------|--------|--------|
| Git status fetch | Time to populate "Changed" | < 200ms |
| File index load (1000 files) | Time to show dropdown | < 500ms |
| Filter application | Time to filter results | < 50ms |
| Folder expansion | Time to show children | < 50ms |
| Multi-select (10 files) | Time to insert all | < 100ms |

### Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty workspace | "No files found" message |
| No git repo | "Changed" section hidden |
| No recent files | "Recent" section hidden |
| All files filtered out | "No matching files" message |
| Very long file path | Truncated with tooltip |
| Special characters in filename | Properly escaped/displayed |
| Binary files | Shown but clearly marked |
| Hidden files (.dotfiles) | Respects .gitignore |

---

## Regression Tests

### Existing Functionality Preservation

| Feature | Test |
|---------|------|
| Single file selection | Enter without Shift+Enter works |
| Basic fuzzy search | Query filters results |
| Keyboard navigation | Arrow keys work |
| Click selection | Mouse click inserts |
| Email address handling | `user@example.com` doesn't trigger |
| Escape closes dropdown | Without selection, just closes |
| Tab completion | Tab inserts like Enter |
| Multiple @ in message | Each @ triggers independently |

---

## Test Environment Setup

### Prerequisites

1. Test workspace with:
   - Git repository initialized
   - Mixed file types (ts, js, json, md, css)
   - Nested directories (3+ levels)
   - Some uncommitted changes
   - Some untracked files

2. Application state:
   - At least one workspace added
   - At least one agent available
   - Active conversation open

### Test Data

```
test-workspace/
├── src/
│   ├── components/
│   │   ├── Chat/
│   │   │   ├── MessageInput.tsx    (modified)
│   │   │   └── MentionDropdown.tsx
│   │   └── Sidebar/
│   │       └── AgentList.tsx
│   ├── hooks/
│   │   ├── useFileSearch.ts        (modified)
│   │   └── useMentionTrigger.ts
│   └── index.ts
├── tests/
│   ├── chat.test.ts
│   └── hooks.spec.ts
├── package.json
├── tsconfig.json
├── .eslintrc
├── README.md
└── new-file.ts                      (untracked)
```

---

## Automation Notes

### Recommended Test Framework

- **Unit tests**: Vitest with React Testing Library
- **Integration tests**: Playwright for Electron
- **E2E tests**: Playwright component testing

### CI/CD Considerations

1. Run unit tests on every PR
2. Run integration tests on merge to main
3. Run E2E tests nightly
4. Performance benchmarks weekly

---

## Sign-Off Criteria

### Phase Ready for Release

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual testing checklist complete
- [ ] No regressions in existing functionality
- [ ] Performance targets met
- [ ] Edge cases handled
- [ ] TypeScript compiles without errors
- [ ] No console errors in DevTools
