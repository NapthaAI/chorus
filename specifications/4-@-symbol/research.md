# @ Symbol File/Folder Mentions - Research

Research on implementing an @ symbol dropdown feature for mentioning files and folders in chat input.

## Table of Contents

1. [Cursor IDE Implementation](#cursor-ide-implementation)
2. [Claude CLI File Context](#claude-cli-file-context)
3. [UX Patterns & Technical Approaches](#ux-patterns--technical-approaches)
4. [Recommendations for Chorus](#recommendations-for-chorus)

---

## Cursor IDE Implementation

### How the @ Symbol Triggers Dropdown

- **Trigger**: Typing `@` in any AI input box (Chat, Composer, Cmd K) instantly displays a popup menu
- **Navigation**: Up/down arrow keys navigate suggestions, Enter to select
- **Auto-filtering**: Dropdown filters results in real-time as user continues typing after `@`
- **Category filtering**: Selecting a category like "Files" filters to show only items in that category
- **Fuzzy matching**: System uses fuzzy-matching against file/directory names

### Types of Items That Can Be Mentioned

**Core types (Cursor 2.0)**:
- **@Files** - Reference specific files in the project
- **@Folders** - Reference entire directories (use with caution due to context limits)
- **@Code / @Symbols** - Reference specific functions, classes, or variables
- **@Docs** - Pull in official documentation for libraries/frameworks
- **@Git** - Reference commit history and diffs
- **@Codebase** - Uses a smaller model to analyze and summarize files
- **@Notepad** - Reference saved notepad content

**Removed in 2.0** (now auto-gathered by Agent): @Definitions, @Web, @Link, @Recent Changes, @Linter Errors

### Visual Display: Inline Pills

Cursor 2.0 introduced "inline pills" for displaying mentions:

- **Visual representation**: Selected files/folders appear as **pill-shaped visual blocks** (rounded rectangles) inline with text
- **Atomic deletion**: Pressing Backspace once removes the entire pill, not character-by-character
- **Visual distinction**: Pills are visually distinct from plain text
- **Hover interactions**: Pills have hover states for interactivity cues
- **Collapse option**: Settings allow collapsing pills to save space

### Alternative Input Methods

- **Drag-and-drop**: Files from sidebar directly into chat input
- **# symbol**: Add files without referencing them in the prompt
- **CMD+P / CTRL+P**: Select multiple files at once
- **Paste file path**: Directly after `@` to find nested files quickly

### How Context is Passed to AI

**Context Assembly**:
- When `@file` is used, full content of attached files is passed to the LLM wrapped in an `<attached-files>` block
- Large files/folders are automatically condensed to fit context limits
- This is "syntactic sugar" for copy-pasting the entire file content

**Automatic Context** (in addition to @mentions):
- Open files in the editor
- Current cursor position
- Recently viewed files
- Edit history in the current session
- Linter errors
- File contents (capped at 250 lines per read unless explicitly edited/attached)

**Token Management**:
- Gemini and Claude have 120k tokens for context in Cursor
- ~6k tokens ≈ 850 lines of code (4 characters ≈ 1 token)
- Cursor uses **Priompt** engine to dynamically decide what to include based on token space and task relevance

---

## Claude CLI File Context

### @ Mentions in Claude CLI

Claude CLI already supports `@` mentions natively in interactive mode:

- **Syntax**: `@path/to/file.js` or `@directory/` in any interactive prompt
- **Tab completion**: Press Tab after `@` to autocomplete file paths
- **Multiple files**: `@file1.js and @file2.js` in single message
- **MCP resources**: `@github:issue://123`, `@postgres:schema://users`
- **Drag-and-drop**: Hold Shift while dragging files to insert `@` references

**Limitations**:
- Directory references (`@dir/`) show listings only, don't read all nested files
- Large files may be truncated
- All content counts toward context window limits

### Other Context Methods

**--add-dir Flag** (v1.0.18+):
```bash
claude --add-dir ../backend-api --add-dir ../shared-lib
```
- For monorepo and multi-project workflows
- Alternative: `/add-dir /path` slash command during session

**Piping and stdin**:
```bash
cat file.txt | claude -p "summarize this"
claude --json "explain code" < script.js
git diff | claude -p "summarize changes" --json
```

**CLAUDE.md Files**:
- `~/.claude/CLAUDE.md` - Global (all projects)
- `/project/CLAUDE.md` - Project-specific
- Automatically loaded across sessions

**Custom Slash Commands**:
- `~/.claude/commands/` - Personal commands
- `./.claude/commands/` - Project-specific (git-tracked)
- Markdown files with prompt templates

### Key Insight for Chorus

**Pass-through approach**: Chorus doesn't need to process `@` mentions - just pass user text directly to CLI. The `@` syntax works when users type it in interactive mode.

---

## UX Patterns & Technical Approaches

### Common UI/UX Patterns for Mention Dropdowns

**Positioning & Display**:
- Position dropdown below cursor/caret using calculated coordinates
- Maximum 10 items on desktop, 8 on mobile
- Use shadows/borders to distinguish popup from background
- Clear highlighting of active/focused option

**Keyboard Navigation**:
- **Up/Down arrows**: Navigate options (wrap at ends)
- **Enter**: Accept highlighted suggestion
- **Escape**: Close dropdown
- **Tab**: Accept and move to next field (optional)
- **Continue typing**: Filter results in real-time

### Technical Approaches: Textarea vs ContentEditable

#### Textarea with Overlay (Recommended for Simple Cases)

**How It Works**:
1. Real textarea handles input (maintains form integration, accessibility)
2. Styled div overlay provides visual enhancements
3. Parse text for mentions, render highlighted versions in overlay

**Pros**:
- Native form integration
- Consistent cross-browser behavior
- Simpler to implement and maintain
- Better accessibility out of the box
- Works naturally with mobile keyboards

**Cons**:
- Can't render complex inline elements naturally
- Requires careful CSS synchronization
- Limited visual styling options

**Best For**: Comment systems, simple chat, tagging systems

#### ContentEditable (For Rich Text)

**How It Works**:
1. `<div contenteditable="true">` acts as input
2. Insert HTML elements directly (chips, formatted mentions)
3. Manual cursor/selection management required

**Pros**:
- Rich formatting capabilities
- Can render "chips" as actual HTML elements
- Auto-adjusts height
- Supports complex visual treatments (avatars, colors)

**Cons**:
- Doesn't integrate with HTML forms (manual JS required)
- Inconsistent line breaks across browsers
- Complex caret position tracking
- XSS security concerns with pasted content

**Best For**: Slack-like chat, rich text editors, WYSIWYG interfaces

### React Libraries Comparison

| Library | Approach | Bundle Size | Complexity | Best For |
|---------|----------|-------------|------------|----------|
| **react-mentions** | Textarea overlay | ~30kb | Low | Simple mentions |
| **draft-js-mention-plugin** | ContentEditable | ~150kb | Medium | Rich text |
| **Lexical** | ContentEditable | ~80kb | Medium | Modern editors |

### Inline Chips/Tags Implementation

**In ContentEditable**:
```html
<span class="mention" contenteditable="false" data-id="user123">
  @john
</span>
```
- Set `contenteditable="false"` on chip for atomic deletion
- Style with background color, border-radius, padding

**In Textarea Overlay**:
- Textarea contains plain text: `@[John Doe](user123)`
- Overlay parses and renders as styled chips
- Clicks pass through to textarea

### Accessibility Requirements (ARIA Combobox Pattern)

**Essential Attributes**:
```html
<input
  role="combobox"
  aria-expanded="true"
  aria-controls="mentions-listbox"
  aria-activedescendant="option-3"
  aria-autocomplete="list"
/>
<ul id="mentions-listbox" role="listbox">
  <li id="option-1" role="option" aria-selected="false">File 1</li>
  <li id="option-2" role="option" aria-selected="true">File 2</li>
</ul>
```

**Screen Reader Announcements**:
- "5 suggestions available" (on open)
- "File 1, 1 of 5" (on navigation)
- "File 1 selected" (on selection)

### Caret Position Calculation

**Mirror Div Technique** (textarea-caret-position library):
1. Create off-screen div styled exactly like textarea
2. Copy text up to caret position into div
3. Insert `<span>` at caret position
4. Measure span's offset position
5. Return `{top, left, height}` coordinates

**Library**: [textarea-caret-position](https://github.com/component/textarea-caret-position)

---

## Recommendations for Chorus

### Recommended Approach: react-mentions

**Why**:
1. **Simplicity**: Chat is primarily plain text, don't need rich formatting
2. **Accessibility**: Built-in keyboard navigation and ARIA support
3. **Form integration**: Native textarea behavior
4. **Performance**: Lightweight bundle (~30kb)
5. **Mobile**: Works with native keyboards
6. **Maintenance**: Well-tested, production-ready

### Implementation Architecture

```
User types @ in textarea
  ↓
Detect trigger at cursor position
  ↓
Filter files/folders by typed query
  ↓
Show dropdown at caret coordinates
  ↓
User selects (keyboard/mouse)
  ↓
Insert: @[filename](file-path)
  ↓
Parse mentions before sending
  ↓
Store with file paths
  ↓
Render as styled chips in display
```

### Data Structures

```typescript
// Mention format in message content
"Check @[auth.ts](src/services/auth.ts) for the issue"

// Parsed mention
interface FileMention {
  displayName: string;  // "auth.ts"
  path: string;         // "src/services/auth.ts"
  position: number;     // Character position in message
}

// Dropdown item
interface FileOption {
  id: string;           // Full path as ID
  display: string;      // File name for display
  path: string;         // Full relative path
  type: 'file' | 'folder';
}
```

### Context Passing Strategy

**Option A: Pass-through to CLI** (Simplest)
- User types `@src/file.ts` naturally
- Chorus passes message directly to Claude CLI
- CLI handles file reading natively
- Pros: Zero processing needed, native behavior
- Cons: No visual pills, depends on CLI support

**Option B: Pre-process and inject context** (More control)
- Parse `@[file](path)` mentions before sending
- Read file contents and inject into prompt
- Format like Cursor: `<attached-files>...</attached-files>`
- Pros: Full control, visual pills, works with any backend
- Cons: More complex, token management needed

**Recommendation**: Start with Option A (pass-through), enhance with Option B later for better UX.

### UI Components Needed

1. **MentionInput** - Enhanced textarea with @ detection
2. **MentionDropdown** - Positioned autocomplete list
3. **MentionPill** - Styled chip for display (read-only messages)
4. **FileSearchProvider** - Fuzzy search over workspace files

### Integration Points

1. **File listing**: Use existing `window.api.fs.readDir()` to get files
2. **Fuzzy search**: Use `fuse.js` or similar for matching
3. **Message storage**: Store raw mention format in JSONL
4. **Rendering**: Parse mentions when displaying in chat
5. **CLI integration**: Pass raw text with `@path` to Claude CLI

### Phase 1 (MVP)

1. Detect `@` in textarea, show dropdown
2. List files from current workspace
3. Filter as user types
4. Insert plain `@path/to/file` on selection
5. Pass to CLI as-is (native @ support)

### Phase 2 (Enhanced)

1. Use react-mentions for proper mention handling
2. Render pills in input
3. Support folders with nested navigation
4. Show file icons and metadata
5. Token count indicator

### Phase 3 (Advanced)

1. `@symbols` - Reference specific functions/classes
2. `@git` - Reference commits/diffs
3. `@docs` - External documentation
4. Pre-process mentions for non-CLI backends

---

## Sources

### Cursor Documentation
- [Cursor Docs - @ Mentions](https://cursor.com/docs/context/mentions)
- [Cursor Docs - @Files & Folders](https://docs.cursor.com/context/@-symbols/@-files)
- [Cursor Changelog 2.0](https://cursor.com/changelog/2-0)
- [How Cursor (AI IDE) Works](https://blog.sshh.io/p/how-cursor-ai-ide-works)

### Claude CLI
- [CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Claude Code Best Practices - Anthropic](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Referencing Files in Claude Code](https://stevekinney.com/courses/ai-development/referencing-files-in-claude-code)

### UX Patterns
- [Baymard: Autocomplete UX Best Practices](https://baymard.com/blog/autocomplete-design)
- [W3C WAI-ARIA: Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
- [Material Design 3: Chips](https://m3.material.io/components/chips/guidelines)

### React Libraries
- [react-mentions](https://github.com/signavio/react-mentions)
- [Draft.js Mention Plugin](https://www.draft-js-plugins.com/plugin/mention)
- [Lexical Editor](https://lexical.dev/docs/getting-started/react)

### Technical Implementation
- [textarea-caret-position](https://github.com/component/textarea-caret-position)
- [ContentEditable vs Textarea](https://stackoverflow.com/questions/5284193/what-are-the-cons-of-using-a-contenteditable-div-rather-than-a-textarea)
