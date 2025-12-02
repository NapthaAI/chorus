---
date: 2025-12-02
author: Claude
status: draft
type: feature
---

# Universal File Editor Feature

## Overview

Transform Chorus's file viewer from a basic markdown preview/textarea combo with read-only syntax highlighting into a full-featured code editor supporting editing for all file types. This enables users to review agent changes, make quick edits, and work with any file in their workspace—all without leaving Chorus.

## Business Value

### For Power Users (like Richard)
- Edit any file type directly when reviewing agent work (not just markdown)
- Quick fixes without context-switching to VS Code
- Seamless workflow: review agent changes → make tweaks → continue conversation
- Multiple files open in tabs for cross-referencing during reviews

### For New Users
- Familiar VS Code-like editing experience reduces learning curve
- Syntax highlighting makes code readable and professional
- Line numbers and proper indentation out of the box
- No need to learn a different tool for file editing

## Current State

The current `FileViewer` component (`chorus/src/renderer/src/components/MainPane/FileViewer.tsx`) has:

| File Type | View | Edit |
|-----------|------|------|
| Markdown (`.md`) | Preview (rendered) or Raw | Yes (plain `<textarea>`) |
| All other files | Syntax highlighted (prism-react-renderer) | **No** (read-only) |

**Limitations:**
- Markdown editing uses plain `<textarea>` without syntax highlighting, line numbers, or indentation support
- Non-markdown files cannot be edited at all
- No keyboard shortcuts (indent, comment toggle, etc.)
- No search/replace within files
- No bracket matching, auto-closing pairs
- Large files are fully loaded (no virtualization)

## User Stories

### US-1: Edit Any File Type
**Given** I have a TypeScript file open from the Details panel,
**When** I click in the editor area,
**Then** I can edit the file with full syntax highlighting and save my changes.

**Acceptance Criteria:**
- All text files are editable (not just markdown)
- Syntax highlighting preserved while editing
- Save button appears when changes exist
- Cmd/Ctrl+S saves the file
- Changes indicator (dot/asterisk) shows unsaved state

### US-2: Comfortable Code Editing
**Given** I am editing a JavaScript file,
**When** I write code,
**Then** I get VS Code-like editing features: auto-indentation, bracket matching, line numbers.

**Acceptance Criteria:**
- Line numbers displayed in gutter
- Auto-indent on new lines
- Bracket matching (highlight matching bracket)
- Auto-closing pairs for `()`, `[]`, `{}`, `""`, `''`, ` `` `
- Tab key inserts proper indentation
- Shift+Tab dedents selection

### US-3: Search Within File
**Given** I have a large file open,
**When** I press Cmd/Ctrl+F,
**Then** a search bar appears allowing me to find text within the file.

**Acceptance Criteria:**
- Search bar opens with keyboard shortcut
- Real-time highlighting of matches
- Navigate between matches (Enter, Shift+Enter)
- Match count displayed
- Escape closes search bar
- Optional: Replace functionality (Cmd/Ctrl+H)

### US-4: Markdown Preview Toggle
**Given** I have a markdown file open,
**When** I toggle between "Raw" and "Preview" modes,
**Then** Raw mode shows the editor with markdown syntax highlighting, Preview shows rendered markdown.

**Acceptance Criteria:**
- Toggle preserved from current implementation
- Raw mode uses CodeMirror with markdown language support
- Preview mode uses existing `MarkdownContent` component
- Mode preference persisted per-file (optional: per-session)

### US-5: Language-Appropriate Features
**Given** I open a file with a specific extension (`.py`, `.ts`, `.go`),
**When** the editor loads,
**Then** the correct language mode is automatically applied.

**Acceptance Criteria:**
- Extension-to-language mapping covers common languages (see table below)
- Syntax highlighting matches language
- Unknown extensions default to plain text (editable, no highlighting)
- Language indicator shown in status area (optional)

### US-6: Keyboard Shortcuts
**Given** I am editing a file,
**When** I use standard editing shortcuts,
**Then** they work as expected.

**Acceptance Criteria:**
- Cmd/Ctrl+S: Save file
- Cmd/Ctrl+Z: Undo
- Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y: Redo
- Cmd/Ctrl+F: Find
- Cmd/Ctrl+D: Select next occurrence (optional)
- Cmd/Ctrl+/: Toggle line comment

### US-7: Handle Read-Only Files
**Given** I open a file that cannot be written (permissions, locked),
**When** the editor loads,
**Then** it shows in read-only mode with a clear indicator.

**Acceptance Criteria:**
- Read-only files display visual indicator
- Editing disabled (cursor visible but typing blocked)
- Clear message explaining why file is read-only
- No save button shown for read-only files

## Core Functionality

### Editor Component

Replace the current `<textarea>` and prism-react-renderer viewer with CodeMirror 6:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📄 src/components/Button.tsx              [Raw] [Preview]    [Save]    │ ← Header (file path + mode toggle + save)
├─────────────────────────────────────────────────────────────────────────┤
│ 1  │ import React from 'react'                                         │
│ 2  │                                                                    │
│ 3  │ interface ButtonProps {                                            │
│ 4  │   label: string                                                    │
│ 5  │   onClick: () => void                                              │
│ 6  │ }                                                                  │
│ 7  │                                                                    │
│ 8  │ export function Button({ label, onClick }: ButtonProps) {         │
│ 9  │   return (                                                         │
│10  │     <button onClick={onClick}>                                     │
│11  │       {label}                                                      │
│12  │     </button>                                                      │
│13  │   )                                                                │
│14  │ }                                                                  │
│    │                                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ TypeScript │ UTF-8 │ LF │ Line 8, Col 42                               │ ← Status bar (optional)
└─────────────────────────────────────────────────────────────────────────┘
```

### Language Support

**Tier 1 - Essential (Official CodeMirror packages):**

| Extension(s) | Language | Package |
|--------------|----------|---------|
| `.js`, `.mjs`, `.cjs` | JavaScript | `@codemirror/lang-javascript` |
| `.jsx` | JavaScript + JSX | `@codemirror/lang-javascript` (with `jsx: true`) |
| `.ts`, `.mts`, `.cts` | TypeScript | `@codemirror/lang-javascript` (with `typescript: true`) |
| `.tsx` | TypeScript + JSX | `@codemirror/lang-javascript` (with `jsx: true, typescript: true`) |
| `.json`, `.jsonc` | JSON | `@codemirror/lang-json` |
| `.md`, `.mdx` | Markdown | `@codemirror/lang-markdown` |
| `.html`, `.htm` | HTML | `@codemirror/lang-html` |
| `.css` | CSS | `@codemirror/lang-css` |
| `.py`, `.pyw` | Python | `@codemirror/lang-python` |

**Tier 2 - Common (Official packages, add as needed):**

| Extension(s) | Language | Package |
|--------------|----------|---------|
| `.java` | Java | `@codemirror/lang-java` |
| `.cpp`, `.c`, `.h`, `.hpp` | C/C++ | `@codemirror/lang-cpp` |
| `.rs` | Rust | `@codemirror/lang-rust` |
| `.xml`, `.svg`, `.plist` | XML | `@codemirror/lang-xml` |
| `.php` | PHP | `@codemirror/lang-php` |
| `.sql` | SQL | `@codemirror/lang-sql` |

**Tier 3 - Extended (Community packages or StreamLanguage):**

| Extension(s) | Language | Approach |
|--------------|----------|----------|
| `.go` | Go | `@codemirror/legacy-modes` or community |
| `.rb` | Ruby | `@codemirror/legacy-modes` |
| `.sh`, `.bash`, `.zsh` | Shell | `@codemirror/legacy-modes` |
| `.yaml`, `.yml` | YAML | `@codemirror/legacy-modes` |
| `.toml` | TOML | Community package |
| `.dockerfile`, `Dockerfile` | Dockerfile | Community package |

**Fallback:** Unknown extensions open in plain text mode (editable, no syntax highlighting).

### Editor Features Matrix

| Feature | Priority | Included |
|---------|----------|----------|
| Syntax highlighting | Must have | Yes |
| Line numbers | Must have | Yes |
| Auto-indentation | Must have | Yes |
| Bracket matching | Must have | Yes |
| Auto-close brackets | Should have | Yes |
| Search (Ctrl+F) | Should have | Yes |
| Undo/Redo | Must have | Yes (built-in) |
| Comment toggle (Ctrl+/) | Should have | Yes |
| Replace (Ctrl+H) | Nice to have | Phase 2 |
| Multiple cursors | Nice to have | Phase 2 |
| Minimap | Nice to have | No (CodeMirror doesn't have native minimap) |
| Code folding | Nice to have | Phase 2 |

### File Operations

**Save Flow:**
1. User edits content → `editedContent` state updated
2. `hasChanges` computed: `editedContent !== null && editedContent !== content`
3. Save button appears / Tab shows unsaved indicator
4. User clicks Save or Cmd/Ctrl+S
5. `window.api.fs.writeFile(filePath, editedContent)` called
6. On success: `content = editedContent`, `editedContent = null`
7. On failure: Error displayed, content preserved

**Binary/Large File Handling:**
- Binary files (current detection via null bytes in first 8KB): Show "Binary file cannot be displayed" (existing behavior)
- Large files (>1MB): Consider showing warning before loading, or implement virtual scrolling in Phase 2

## Technical Requirements

### Dependencies

```json
{
  "dependencies": {
    "@uiw/react-codemirror": "^4.x",
    "@codemirror/lang-javascript": "^6.x",
    "@codemirror/lang-json": "^6.x",
    "@codemirror/lang-markdown": "^6.x",
    "@codemirror/lang-html": "^6.x",
    "@codemirror/lang-css": "^6.x",
    "@codemirror/lang-python": "^6.x"
  }
}
```

Estimated bundle impact: ~1-1.5MB (vs 5-10MB for Monaco)

### Electron Architecture

**Renderer Process (FileViewer.tsx):**
- Replace `<textarea>` and prism-react-renderer with CodeMirror
- Manage editor state (content, language, dirty flag)
- Handle keyboard shortcuts (delegate save to existing IPC)

**Main Process:**
- No changes needed to `fs-service.ts` (existing `readFile`/`writeFile` sufficient)
- File size limit (1MB) and binary detection already implemented

**IPC:**
- Existing `fs:read-file` and `fs:write-file` handlers are sufficient
- No new IPC channels required

### React Component Architecture

```typescript
// New component: CodeEditor.tsx
interface CodeEditorProps {
  content: string
  language: string
  onChange?: (value: string) => void
  readOnly?: boolean
  onSave?: () => void
}

// Updated FileViewer.tsx structure
function FileViewer({ filePath }: FileViewerProps) {
  // State
  const [content, setContent] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState<string | null>(null)
  const [mode, setMode] = useState<'raw' | 'preview'>('preview')

  // Computed
  const extension = getExtension(filePath)
  const language = getLanguage(extension)
  const isMarkdown = language === 'markdown'
  const hasChanges = editedContent !== null && editedContent !== content

  // Render
  if (isMarkdown && mode === 'preview') {
    return <MarkdownContent content={content} />
  }

  return (
    <CodeEditor
      content={editedContent ?? content}
      language={language}
      onChange={setEditedContent}
      onSave={handleSave}
    />
  )
}
```

### Theming

CodeMirror theming should match Chorus's dark theme:

```typescript
import { EditorView } from '@codemirror/view'

const chorusTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--color-main)',
    color: 'var(--color-primary)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-sidebar)',
    borderRight: '1px solid var(--color-border)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--color-hover)',
  },
  '.cm-selectionBackground': {
    backgroundColor: 'var(--color-accent) / 0.3',
  },
  // ... more theme customization
})
```

### State Management

**Workspace Store Changes:**
- Add `unsavedFiles: Set<string>` to track files with unsaved changes
- Tab UI can show unsaved indicator based on this

**File Viewer State:**
- Keep existing pattern: `content` (original), `editedContent` (modified)
- Add: `language: string` computed from extension

## Design Considerations

### Layout

- Header bar: Breadcrumb path + mode toggle (markdown only) + save button
- Editor area: Full remaining height, horizontal scroll as needed
- Optional status bar: Language, encoding, line endings, cursor position

### Visual Indicators

- **Unsaved changes**: Dot/asterisk next to filename in tab and header
- **Read-only mode**: Lock icon and subtle overlay message
- **Loading state**: Skeleton or spinner (existing)
- **Error state**: Centered error message (existing)

### Keyboard Accessibility

- Tab navigation to enter/exit editor
- All editing shortcuts should not conflict with Electron/app shortcuts
- Escape should be handled carefully (search bar vs leaving editor)

## Implementation Considerations

### Migration Path

1. **Phase 1**: Replace markdown raw editing with CodeMirror
   - Test with markdown files first
   - Ensure preview toggle still works

2. **Phase 2**: Enable editing for all file types
   - Add language packages incrementally
   - Update UI to reflect editable state

3. **Phase 3**: Enhanced features
   - Search/Replace
   - Code folding
   - Multiple cursors (if needed)

### Performance

- Memoize CodeMirror extensions array to prevent re-renders
- Lazy load language packages not in Tier 1
- Consider debouncing `onChange` for very large files

### Testing Approach

- Unit tests for extension-to-language mapping
- Integration tests for save flow
- Manual testing for keyboard shortcuts across platforms
- Test with large files (10K+ lines)

## Success Criteria

### Core Functionality
- [ ] All text files can be edited (not just markdown)
- [ ] Syntax highlighting works for Tier 1 languages
- [ ] Save functionality works with Cmd/Ctrl+S
- [ ] Unsaved changes indicator appears

### User Experience
- [ ] No visual regression for markdown preview
- [ ] Editor feels responsive (no lag when typing)
- [ ] Theme matches Chorus dark mode
- [ ] Line numbers and proper indentation

### Edge Cases
- [ ] Binary files show error message (not corrupt editor)
- [ ] Large files (>1MB) handled gracefully
- [ ] Read-only files show appropriate indicator
- [ ] Network/save errors display clearly

## Scope Boundaries

### Definitely In Scope
- CodeMirror 6 integration via `@uiw/react-codemirror`
- Syntax highlighting for Tier 1 languages
- Basic editing features (line numbers, auto-indent, bracket matching)
- Search within file (Ctrl+F)
- Keyboard shortcuts for save, undo, redo, comment toggle
- Markdown preview/raw toggle preservation
- Unsaved changes indicator

### Definitely Out of Scope
- IntelliSense / autocomplete (would require LSP)
- Go to definition / Find references
- Multi-file search/replace
- Git diff view in editor
- Split editor panes (different from tab split)
- Language Server Protocol integration
- Custom syntax highlighting themes UI

### Future Considerations (Phase 2+)
- Code folding
- Multiple cursors
- Replace functionality (Ctrl+H)
- Minimap alternative (scrollbar annotations)
- Large file virtualization (>5MB)
- Tier 2 and Tier 3 language support
- Editor settings persistence (font size, tab size)

## Open Questions

### Technical
1. **Tab size preference**: Should tab size be configurable? Default to 2 or 4 spaces?
2. **Word wrap**: Always on, always off, or toggleable?
3. **Font**: Use system monospace or bundle a specific font (Fira Code, JetBrains Mono)?

### UX
1. **Confirmation on close**: Prompt when closing tab with unsaved changes? Or auto-save?
2. **Mode default**: For markdown files, default to Preview (current) or Raw?
3. **Status bar**: Include language/cursor position footer? Or keep minimal?

## Next Steps

1. Review and approve this feature specification
2. Create implementation plan with phased approach
3. Begin Phase 1: CodeMirror integration for markdown editing
