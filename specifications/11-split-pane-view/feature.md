# Feature: Split-Pane View with Tab Groups

## Overview

Add a dual-pane interface with independent tab groups, allowing users to view any combination of tabs simultaneously. Each pane has its own mini tab bar, enabling multiple files/chats to be organized per pane. Supports both vertical (top/bottom) and horizontal (left/right) layouts with VS Code-style drag-and-drop tab management.

## Problem Statement

The current tab-based navigation forces users to toggle between chat and file viewing modes. When working with an AI agent on code changes, users constantly need to:
1. View the chat to see agent responses
2. Switch to file tab to see the code
3. Switch back to chat to continue conversation

This workflow interrupts focus and makes it harder to correlate agent suggestions with actual code.

## Solution

Implement a flexible split-pane view where:
- **Tab groups per pane**: Each pane has its own tab bar with multiple tabs
- **Any tab combination**: File+File, Chat+Chat, File+Chat - any combination works
- **Vertical split**: First pane on top, second on bottom
- **Horizontal split**: First pane on left, second on right
- **Draggable divider**: Allows resizing panes to user preference
- **Auto-assignment**: Tabs are automatically distributed when enabling split view
- **Drag-and-drop**: Move tabs between panes by dragging

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + \` | Toggle split pane (cycles: off → vertical → horizontal → off) |
| `Cmd/Ctrl + B` | Toggle left sidebar |
| `Cmd/Ctrl + Shift + B` | Toggle right sidebar |

## User Stories

### US-1: Enable Split View with Tab Groups
**As a** user working with multiple tabs
**I want to** see two tab groups simultaneously
**So that** I can work with multiple files/chats in each pane

**Acceptance Criteria:**
- [x] Toggle buttons for no split, vertical, and horizontal layouts
- [x] When enabled, main pane splits into two sections
- [x] Each pane has its own mini tab bar
- [x] Tabs are auto-distributed between panes when enabling split

### US-2: Auto-Assignment of Tabs
**As a** user enabling split view
**I want to** have my open tabs automatically distributed
**So that** I don't have to manually assign each tab

**Acceptance Criteria:**
- [ ] With 1 tab: assigned to first pane, second pane empty
- [ ] With 2 tabs: one tab per pane
- [ ] With 3+ tabs: distributed evenly (or first half / second half)
- [ ] Active tab stays in focus in its assigned pane

### US-3: Tab Management Within Panes
**As a** user with split view enabled
**I want to** manage tabs within each pane independently
**So that** I can organize my workspace efficiently

**Acceptance Criteria:**
- [ ] Each pane shows its own tab bar
- [ ] Can switch between tabs within a pane
- [ ] Can close tabs within a pane
- [ ] Opening new files/chats adds to the active pane

### US-4: Drag Tabs Between Panes
**As a** user with split view enabled
**I want to** drag tabs from one pane to another
**So that** I can reorganize my workspace

**Acceptance Criteria:**
- [ ] Tabs are draggable within their tab bar
- [ ] Dropping on another pane moves the tab
- [ ] Visual feedback during drag
- [ ] Tab order preserved after drop

### US-5: Resize Panes
**As a** user with split view enabled
**I want to** drag the divider to resize panes
**So that** I can allocate more space to whichever view I need

**Acceptance Criteria:**
- [x] Draggable divider between panes
- [x] Minimum size for each pane (150px)
- [x] Cursor changes to resize cursor on hover
- [x] Pane sizes persist across sessions
- [x] Double-click divider to reset to 50/50

### US-6: Choose Split Orientation
**As a** user with different screen sizes/preferences
**I want to** choose between vertical and horizontal split
**So that** I can optimize the layout for my workflow

**Acceptance Criteria:**
- [x] Vertical split (top/bottom) option
- [x] Horizontal split (left/right) option
- [x] Three-button toggle (no split / vertical / horizontal)
- [x] Orientation preference persists

### US-7: Disable Split View
**As a** user who wants full-screen view
**I want to** disable split view easily
**So that** I can maximize either file or chat view

**Acceptance Criteria:**
- [x] Toggle button returns to single-pane mode
- [x] Keyboard shortcut to toggle (Cmd/Ctrl + \)
- [x] State persists (remembers if user prefers split or tabs)
- [ ] Tabs from both groups merge back into single tab bar

### US-8: Swap Pane Positions
**As a** user who wants to rearrange content
**I want to** swap the pane contents
**So that** I can quickly reorganize my layout

**Acceptance Criteria:**
- [x] Swap button on divider
- [x] Swaps entire tab groups between panes
- [x] Position preference persists

### US-9: Collapsible Sidebars
**As a** user who wants more screen space
**I want to** collapse the left and right sidebars
**So that** I can focus on my code and chat

**Acceptance Criteria:**
- [x] Left sidebar collapse button (chevron)
- [x] Right sidebar collapse button (chevron)
- [x] Keyboard shortcuts (Cmd+B, Cmd+Shift+B)
- [x] Collapsed state shows icons only
- [x] Click to expand

## UI Design

### Vertical Split Layout with Tab Groups
```
┌─────────────────────────────────────────────────────────┐
│ [No Split] [Vertical] [Horizontal]                      │
├─────────────────────────────────────────────────────────┤
│ [Tab1] [Tab2] [Tab3]                         (Pane 1)   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                   PANE 1 CONTENT                         │
│                                                          │
├──────────────────[Swap][Rotate]─────────────────────────┤
│ [Tab4] [Tab5]                                (Pane 2)   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│                   PANE 2 CONTENT                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Horizontal Split Layout with Tab Groups
```
┌─────────────────────────────────────────────────────────┐
│ [No Split] [Vertical] [Horizontal]                      │
├───────────────────────┬─────────────────────────────────┤
│ [Tab1] [Tab2]         │ [Tab3] [Tab4]                   │
├───────────────────────┤─────────────────────────────────┤
│                       │                                 │
│   PANE 1 CONTENT     [S]    PANE 2 CONTENT             │
│                      [R]                                │
│                       │                                 │
└───────────────────────┴─────────────────────────────────┘
```

### Split Toggle Buttons
Three buttons in tab bar:
- **Single pane** (rectangle icon) - no split, single tab bar
- **Vertical split** (horizontal line icon) - top/bottom with tab groups
- **Horizontal split** (vertical line icon) - left/right with tab groups

### Divider Behavior
- 8px visible width/height, larger hit area for easier grabbing
- Uses sidebar background color for visual distinction
- Cursor: `row-resize` (vertical) or `col-resize` (horizontal)
- Double-click: Reset to 50/50
- Hover reveals: Swap button + Orientation toggle button

### Pane Visual Distinction
- Each pane has its own tab bar at the top
- Clear border separation between panes
- Active pane indicator (subtle highlight)

## Technical Considerations

### State Management
Settings to persist:
```typescript
interface TabGroup {
  id: string
  tabIds: string[]           // Ordered list of tab IDs in this group
  activeTabId: string | null // Currently active tab in this group
}

interface SplitPaneSettings {
  enabled: boolean
  ratio: number                    // 0-100, percentage for first pane
  orientation: 'vertical' | 'horizontal'
  firstPaneGroup: TabGroup         // Tab group for first pane
  secondPaneGroup: TabGroup        // Tab group for second pane
}
```

### Component Structure
```
MainPane
├── SplitPaneToggle (three buttons)
├── Content Area
│   ├── SplitPaneContainer (when enabled)
│   │   ├── FirstPane
│   │   │   ├── PaneTabBar (mini tab bar)
│   │   │   └── PaneContent (renders active tab)
│   │   ├── SplitDivider
│   │   │   ├── SwapButton
│   │   │   └── OrientationToggle
│   │   └── SecondPane
│   │       ├── PaneTabBar (mini tab bar)
│   │       └── PaneContent (renders active tab)
│   └── SinglePaneContent (when disabled)
```

### Auto-Assignment Logic
When enabling split view:
1. Get all open tabs
2. If 0 tabs: both panes empty
3. If 1 tab: assign to first pane
4. If 2 tabs: one per pane
5. If 3+ tabs: split evenly (first half to pane 1, second half to pane 2)
6. Set active tab in each pane to first tab of that group

### Tab Operations in Split Mode
- **Open new tab**: Opens in currently focused pane
- **Close tab**: Removes from its group, activates next tab in same pane
- **Drag to other pane**: Moves tab between groups
- **Close last tab in pane**: Pane shows empty placeholder

### Edge Cases
1. **Empty pane**: Shows placeholder "Drag a tab here"
2. **All tabs closed**: Disable split view, return to welcome screen
3. **Disable split**: Merge all tabs into single tab bar
4. **Window too small**: Minimum sizes enforced (150px), scroll within panes

## Dependencies
- Existing TabBar component (for single-pane mode)
- New PaneTabBar component (for split pane mode)
- Existing FileViewer component
- Existing ChatTab component
- workspace-store for state management
- electron-store for persistence

## Success Metrics
- Users can view any two tab groups simultaneously
- Tabs auto-distribute when enabling split view
- Tab management within each pane works smoothly
- Dragging tabs between panes is intuitive
- File+File, Chat+Chat, File+Chat combinations all work
- Divider drag feels smooth (no lag/jank)
- Split state persists correctly across app restarts
- No regression in single-pane tab navigation
