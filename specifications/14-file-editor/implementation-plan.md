---
date: 2025-12-02
author: Claude
status: draft
type: implementation_plan
feature: Universal File Editor
---

# Universal File Editor Implementation Plan

## Overview

Replace the current read-only `prism-react-renderer` viewer and plain `<textarea>` markdown editor with CodeMirror 6, enabling editing for all text file types with syntax highlighting, line numbers, and VS Code-like features.

## Current State Analysis

**Existing Implementation** (`chorus/src/renderer/src/components/MainPane/FileViewer.tsx`):
- Uses `prism-react-renderer` with `vsDark` theme for read-only syntax highlighting
- Plain `<textarea>` for markdown raw editing only
- State pattern: `content` (original), `editedContent` (modified), `hasChanges` (computed)
- Save flow via `window.api.fs.writeFile()` already works
- `getLanguage()` maps 30+ extensions to Prism language names

**Key Discoveries**:
- Save infrastructure already exists (`FileViewer.tsx:82-98`)
- Tab system supports file tabs with workspaceId context (`workspace-store.ts:338-389`)
- Theme CSS variables available in `main.css` for CodeMirror theming
- Binary file detection and 1MB size limit already in `fs-service.ts`

## What We're NOT Doing

- IntelliSense / autocomplete (requires LSP)
- Go to definition / Find references
- Multi-file search/replace
- Git diff view in editor
- Split editor panes
- Language Server Protocol integration
- Custom theme UI
- Code folding (Phase 2+)
- Multiple cursors (Phase 2+)

## Implementation Approach

Incremental migration in 3 phases:
1. **Phase 1**: Replace markdown editing with CodeMirror (lowest risk)
2. **Phase 2**: Enable editing for all file types (major feature unlock)
3. **Phase 3**: Add enhanced features (search, comment toggle)

Each phase is independently testable and shippable.

---

## Phase 1: CodeMirror Integration for Markdown

### Overview
Install CodeMirror 6 and replace the `<textarea>` in markdown raw mode with a proper code editor. This validates the integration approach with minimal risk.

### Changes Required:

#### 1. Install Dependencies
**File**: `chorus/package.json`

**Dependencies to add**:
- `@uiw/react-codemirror` - React wrapper for CodeMirror 6
- `@codemirror/lang-javascript` - JS/TS/JSX/TSX support
- `@codemirror/lang-json` - JSON support
- `@codemirror/lang-markdown` - Markdown support
- `@codemirror/lang-html` - HTML support
- `@codemirror/lang-css` - CSS support
- `@codemirror/lang-python` - Python support

**Installation command**: `cd chorus && bun add @uiw/react-codemirror @codemirror/lang-javascript @codemirror/lang-json @codemirror/lang-markdown @codemirror/lang-html @codemirror/lang-css @codemirror/lang-python`

#### 2. Create CodeEditor Component
**File**: `chorus/src/renderer/src/components/Editor/CodeEditor.tsx` (new file)

**Implementation Requirements**:
- Wrapper component around `@uiw/react-codemirror`
- Props: `content`, `language`, `onChange`, `readOnly`, `onSave`
- Create Chorus-themed dark theme using CSS variables from `main.css`
- Memoize extensions array based on language prop to prevent re-renders
- Include basic extensions: line numbers, bracket matching, auto-close brackets
- Handle Cmd/Ctrl+S keymap to trigger `onSave` callback
- Height should fill container (`height: 100%`)

**Theme Integration**:
- Background: `var(--main-bg)` (#222529)
- Text: `var(--text-primary)` (#e5e7eb)
- Gutter background: `var(--sidebar-bg)` (#1a1d21)
- Gutter border: `var(--border-color)` (#383a3e)
- Selection: `var(--accent)` with 30% opacity
- Active line: `var(--hover-bg)` (#27292d)
- Cursor: `var(--text-primary)`

**Language Extension Mapping**:
- `markdown` → `@codemirror/lang-markdown`
- `javascript`, `jsx` → `@codemirror/lang-javascript` with `jsx: true`
- `typescript`, `tsx` → `@codemirror/lang-javascript` with `typescript: true` (and `jsx: true` for tsx)
- `json` → `@codemirror/lang-json`
- `html` → `@codemirror/lang-html`
- `css`, `scss` → `@codemirror/lang-css`
- `python` → `@codemirror/lang-python`
- All others → no language extension (plain text, still editable)

#### 3. Create Language Mapping Utility
**File**: `chorus/src/renderer/src/components/Editor/languageSupport.ts` (new file)

**Implementation Requirements**:
- Export `getLanguageExtension(language: string)` function
- Returns appropriate CodeMirror language extension or `null` for plain text
- Memoization-friendly (returns same reference for same language)
- Export `getLanguageFromExtension(ext: string)` to replace existing `getLanguage()` in FileViewer

#### 4. Update FileViewer for Markdown
**File**: `chorus/src/renderer/src/components/MainPane/FileViewer.tsx`

**Changes**:
- Import new `CodeEditor` component
- Replace `<textarea>` block (lines 193-200) with `<CodeEditor>` in raw mode
- Pass `content={editedContent ?? content}`, `language="markdown"`, `onChange={setEditedContent}`, `onSave={handleSave}`
- Keep preview mode unchanged (still uses `MarkdownContent`)
- Remove `prism-react-renderer` import (will be removed in Phase 2)

### Success Criteria:

**Automated verification**:
- [ ] `bun run typecheck` passes
- [ ] `bun run build` succeeds
- [ ] No console errors in dev mode

**Manual Verification**:
- [ ] Open a `.md` file from Details panel
- [ ] Preview mode shows rendered markdown (unchanged)
- [ ] Raw mode shows CodeMirror editor with markdown syntax highlighting
- [ ] Line numbers visible in gutter
- [ ] Typing updates content (onChange fires)
- [ ] Save button appears when content modified
- [ ] Click Save or Cmd/Ctrl+S saves file
- [ ] Theme matches Chorus dark theme (no jarring color differences)
- [ ] Toggle between Raw/Preview preserves content

---

## Phase 2: Universal File Editing

### Overview
Enable editing for all text file types, not just markdown. This is the main feature unlock.

### Changes Required:

#### 1. Update FileViewer to Enable All-File Editing
**File**: `chorus/src/renderer/src/components/MainPane/FileViewer.tsx`

**Changes**:
- Remove the `prism-react-renderer` import and related code (lines 207-229)
- For non-markdown files, render `<CodeEditor>` instead of the read-only Highlight component
- All files now editable by default
- Update `getLanguage()` to use the new `getLanguageFromExtension()` from Phase 1
- Show Save button for all file types (not just markdown), move it outside the markdown-only conditional

**Rendering Logic Update**:
```
if (isMarkdown && mode === 'preview') {
  return <MarkdownContent content={content} />
}
// All other cases: editable CodeEditor
return <CodeEditor ... />
```

**Header Changes**:
- Save button should appear for ANY file type when `hasChanges` is true
- Mode toggle (Raw/Preview) only appears for markdown files

#### 2. Add Unsaved Indicator to Tabs
**File**: `chorus/src/renderer/src/stores/workspace-store.ts`

**Changes**:
- Add `unsavedFiles: Set<string>` to store state (keyed by filePath)
- Add `markFileUnsaved(filePath: string)` action
- Add `markFileSaved(filePath: string)` action
- Add `isFileUnsaved(filePath: string): boolean` selector

**File**: `chorus/src/renderer/src/components/MainPane/TabBar.tsx`

**Changes**:
- Import `useWorkspaceStore` to access `unsavedFiles`
- For file tabs, check if `tab.filePath` is in `unsavedFiles`
- Show unsaved indicator (dot before filename) when file has unsaved changes
- Styling: Small dot (4-6px circle) in accent color before title

**File**: `chorus/src/renderer/src/components/MainPane/FileViewer.tsx`

**Changes**:
- Call `markFileUnsaved(filePath)` when `editedContent` changes from null
- Call `markFileSaved(filePath)` after successful save
- Call `markFileSaved(filePath)` on cleanup (when switching files)

#### 3. Handle Unsaved Changes on Tab Close
**File**: `chorus/src/renderer/src/stores/workspace-store.ts`

**Changes**:
- Modify `closeTab` action to check if file tab has unsaved changes
- If unsaved, set a flag/state that FileViewer can react to
- For now: Allow close without prompt (user can always undo in file system)
- Clean up unsavedFiles entry when tab closes

#### 4. Remove prism-react-renderer Dependency
**File**: `chorus/package.json`

**Changes**:
- Remove `prism-react-renderer` from dependencies (no longer needed)

**Command**: `cd chorus && bun remove prism-react-renderer`

### Success Criteria:

**Automated verification**:
- [ ] `bun run typecheck` passes
- [ ] `bun run build` succeeds
- [ ] `prism-react-renderer` no longer in package.json

**Manual Verification**:
- [ ] Open a `.ts` file → editable with TypeScript highlighting
- [ ] Open a `.py` file → editable with Python highlighting
- [ ] Open a `.json` file → editable with JSON highlighting
- [ ] Open unknown extension (e.g., `.txt`, `.log`) → editable as plain text
- [ ] Edit any file → Save button appears
- [ ] Cmd/Ctrl+S saves the file
- [ ] Tab shows unsaved indicator (dot) when modified
- [ ] Save clears the unsaved indicator
- [ ] Binary files still show error message (not editor)
- [ ] Large files (>1MB) still show error message

---

## Phase 3: Enhanced Editor Features

### Overview
Add VS Code-like editing features: in-file search, comment toggle.

### Changes Required:

#### 1. Add Search Extension
**File**: `chorus/src/renderer/src/components/Editor/CodeEditor.tsx`

**Changes**:
- Import `@codemirror/search` package
- Add `search()` and `searchKeymap` to extensions
- Search opens with Cmd/Ctrl+F
- Search panel styled to match Chorus theme
- Close search with Escape

**Dependency**: Add `@codemirror/search` to package.json

#### 2. Add Comment Toggle Extension
**File**: `chorus/src/renderer/src/components/Editor/CodeEditor.tsx`

**Changes**:
- Import `@codemirror/commands` (already included with CodeMirror)
- Add `commentKeymap` to keymaps
- Cmd/Ctrl+/ toggles line comment for current selection

**Language-Specific Comments**:
- CodeMirror language extensions handle comment syntax automatically
- JavaScript/TypeScript: `//`
- Python: `#`
- HTML: `<!-- -->`
- CSS: `/* */`

#### 3. Add Additional Editing Features
**File**: `chorus/src/renderer/src/components/Editor/CodeEditor.tsx`

**Changes**:
- Ensure `closeBrackets()` extension is included (auto-close `()`, `[]`, `{}`, `""`, `''`)
- Ensure `bracketMatching()` extension is included (highlight matching brackets)
- Ensure `indentOnInput()` extension is included (auto-indent)
- Add `highlightActiveLine()` for visual feedback

### Success Criteria:

**Automated verification**:
- [ ] `bun run typecheck` passes
- [ ] `bun run build` succeeds

**Manual Verification**:
- [ ] Cmd/Ctrl+F opens search panel
- [ ] Search highlights matches in real-time
- [ ] Enter navigates to next match
- [ ] Escape closes search panel
- [ ] Cmd/Ctrl+/ toggles line comment (test in .js, .py, .html)
- [ ] Typing `(` auto-inserts `)`
- [ ] Typing `{` auto-inserts `}`
- [ ] Matching brackets highlight when cursor adjacent
- [ ] New line after `{` auto-indents

---

## Electron-Specific Considerations

### Main Process Changes
None required. Existing `fs:read-file` and `fs:write-file` IPC handlers are sufficient.

### Renderer Process Changes
- New `CodeEditor` component with CodeMirror 6
- Modified `FileViewer` to use `CodeEditor`
- Modified `workspace-store` for unsaved file tracking
- Modified `TabBar` for unsaved indicator

### Preload Script Changes
None required. Existing `window.api.fs` interface is sufficient.

### Keyboard Shortcuts
- Cmd/Ctrl+S: Save file (handled in CodeEditor, calls onSave prop)
- Cmd/Ctrl+F: Open search (Phase 3, handled by CodeMirror)
- Cmd/Ctrl+/: Toggle comment (Phase 3, handled by CodeMirror)
- Cmd/Ctrl+Z: Undo (built-in CodeMirror)
- Cmd/Ctrl+Shift+Z: Redo (built-in CodeMirror)

Ensure these don't conflict with Electron app-level shortcuts.

---

## Performance Considerations

### Bundle Size
- CodeMirror 6 + React wrapper: ~1-1.5MB
- Removing prism-react-renderer: ~-200KB
- Net increase: ~1-1.3MB (acceptable for significant feature gain)

### Runtime Performance
- Memoize language extensions to prevent re-creation on every render
- CodeMirror handles large files well (viewport-based rendering)
- Current 1MB file size limit in fs-service.ts provides protection

### Memory
- Each open file tab holds content in memory (unchanged from current)
- CodeMirror's document model is efficient (rope-like structure)

---

## Testing Strategy

### Unit Tests
- `languageSupport.ts`: Test extension-to-language mapping
- Test that all Tier 1 extensions return correct language

### Integration Tests
- File save flow with CodeMirror (mocked IPC)
- Unsaved state tracking

### Manual Testing
Priority test files:
1. `.md` - Markdown (Phase 1 validation)
2. `.ts`, `.tsx` - TypeScript (most common in Chorus)
3. `.py` - Python
4. `.json` - JSON (config files)
5. `.html`, `.css` - Web files
6. `.txt` - Plain text fallback
7. Large file (~500KB) - Performance check
8. Binary file (image) - Should show error

Edge cases:
- File with no extension
- File with unknown extension
- Empty file
- File that becomes empty after editing
- Rapid switching between tabs

---

## File Changes Summary

### New Files
| File | Phase |
|------|-------|
| `chorus/src/renderer/src/components/Editor/CodeEditor.tsx` | 1 |
| `chorus/src/renderer/src/components/Editor/languageSupport.ts` | 1 |
| `chorus/src/renderer/src/components/Editor/index.ts` | 1 |

### Modified Files
| File | Phase | Changes |
|------|-------|---------|
| `chorus/package.json` | 1, 2, 3 | Add CodeMirror deps, remove prism-react-renderer |
| `chorus/src/renderer/src/components/MainPane/FileViewer.tsx` | 1, 2 | Replace textarea/Highlight with CodeEditor |
| `chorus/src/renderer/src/stores/workspace-store.ts` | 2 | Add unsavedFiles tracking |
| `chorus/src/renderer/src/components/MainPane/TabBar.tsx` | 2 | Add unsaved indicator |

### Removed Dependencies
| Package | Phase |
|---------|-------|
| `prism-react-renderer` | 2 |

---

## References

* Feature spec: `specifications/14-file-editor/feature.md`
* Current FileViewer: `chorus/src/renderer/src/components/MainPane/FileViewer.tsx`
* Tab system: `chorus/src/renderer/src/stores/workspace-store.ts:338-389`
* Theme CSS: `chorus/src/renderer/src/assets/main.css:7-22`
* CodeMirror React: https://github.com/uiwjs/react-codemirror
* CodeMirror theming: https://codemirror.net/examples/styling/
