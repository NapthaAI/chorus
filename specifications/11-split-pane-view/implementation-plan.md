# Implementation Plan: Split-Pane View with Tab Groups

## Overview

This plan implements a flexible dual-pane interface with independent tab groups per pane, allowing any combination of tabs to be viewed simultaneously. Each pane has its own mini tab bar for managing multiple files/chats.

## Implementation Status: In Progress

Phases 1-5 complete. Phase 6 (Tab Groups) in progress.

## Keyboard Shortcuts

| Shortcut | Action | File |
|----------|--------|------|
| `Cmd/Ctrl + \` | Toggle split pane | `App.tsx` |
| `Cmd/Ctrl + B` | Toggle left sidebar | `App.tsx` |
| `Cmd/Ctrl + Shift + B` | Toggle right sidebar | `App.tsx` |

## Phase 1: State & Settings Foundation ✅

### 1.1 Type Definitions
**File:** `src/preload/index.d.ts`

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

### 1.2 Store State
**File:** `src/renderer/src/stores/workspace-store.ts`

State:
- `splitPaneEnabled: boolean`
- `splitPaneRatio: number`
- `splitPaneOrientation: 'vertical' | 'horizontal'`
- `firstPaneGroup: TabGroup`
- `secondPaneGroup: TabGroup`
- `activePaneId: 'first' | 'second'` - tracks which pane is focused

Actions:
- `toggleSplitPane()` - enables/disables with auto-assignment
- `setSplitPaneRatio(ratio)`
- `setSplitPaneOrientation(orientation)`
- `swapSplitPanes()` - swaps tab groups
- `setActivePaneTab(paneId, tabId)` - activates tab within pane
- `moveTabToPane(tabId, targetPaneId)` - moves tab between panes
- `closeTabInPane(paneId, tabId)` - closes tab within pane
- `saveSplitPaneSettings()`

## Phase 2: Split Divider Component ✅

**File:** `src/renderer/src/components/MainPane/SplitDivider.tsx`

Features:
- Supports both vertical and horizontal orientation
- 8px visible divider with sidebar background color
- Drag to resize with proper cursor feedback
- Double-click to reset to 50/50
- Swap button to swap tab groups
- Orientation toggle button

## Phase 3: Split Pane Container ✅

**File:** `src/renderer/src/components/MainPane/SplitPaneContainer.tsx`

Features:
- Supports vertical (flex-col) and horizontal (flex-row) layouts
- Dynamic sizing based on orientation
- Minimum pane size enforcement (150px)
- Border styling for visual pane distinction
- Renders PaneTabBar + content for each pane

## Phase 4: Split Toggle Buttons ✅

**File:** `src/renderer/src/components/MainPane/SplitPaneToggle.tsx`

Features:
- Three buttons: No split, Vertical, Horizontal
- Active state highlighting
- Tooltips with keyboard shortcuts

## Phase 5: Collapsible Sidebars ✅

**Files:**
- `src/renderer/src/stores/ui-store.ts` - Added `leftPanelCollapsed`, `toggleLeftPanel`, `toggleRightPanel`
- `src/renderer/src/components/Sidebar/Sidebar.tsx` - Added `CollapsedSidebar` component
- `src/renderer/src/components/RightPanel/RightPanel.tsx` - Already had collapse
- `src/renderer/src/App.tsx` - Added keyboard shortcuts

## Phase 6: Tab Groups 🚧

### 6.1 Update Type Definitions
**File:** `src/preload/index.d.ts`

Add TabGroup interface and update SplitPaneSettings.

### 6.2 Update Workspace Store
**File:** `src/renderer/src/stores/workspace-store.ts`

Replace single tab tracking with tab groups:
- `firstPaneGroup: TabGroup`
- `secondPaneGroup: TabGroup`
- `activePaneId: 'first' | 'second'`

Add auto-assignment logic in `toggleSplitPane()`:
```typescript
toggleSplitPane: () => {
  const { splitPaneEnabled, tabs } = get()

  if (!splitPaneEnabled) {
    // Enabling split - distribute tabs
    const midpoint = Math.ceil(tabs.length / 2)
    const firstTabIds = tabs.slice(0, midpoint).map(t => t.id)
    const secondTabIds = tabs.slice(midpoint).map(t => t.id)

    set({
      splitPaneEnabled: true,
      firstPaneGroup: {
        id: 'first',
        tabIds: firstTabIds,
        activeTabId: firstTabIds[0] || null
      },
      secondPaneGroup: {
        id: 'second',
        tabIds: secondTabIds,
        activeTabId: secondTabIds[0] || null
      }
    })
  } else {
    // Disabling split - merge tabs back
    set({ splitPaneEnabled: false })
  }
}
```

### 6.3 Create PaneTabBar Component
**File:** `src/renderer/src/components/MainPane/PaneTabBar.tsx`

A mini tab bar for each pane:
```typescript
interface PaneTabBarProps {
  paneId: 'first' | 'second'
  tabIds: string[]
  activeTabId: string | null
  onTabClick: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onTabDragStart: (tabId: string) => void
  onTabDragEnd: () => void
  onDrop: (tabId: string) => void
}
```

Features:
- Compact tab items
- Drag to reorder within pane
- Drop zone to receive tabs from other pane
- Close button on tabs

### 6.4 Create Pane Component
**File:** `src/renderer/src/components/MainPane/Pane.tsx`

Wrapper component for each pane:
```typescript
interface PaneProps {
  paneId: 'first' | 'second'
  group: TabGroup
  isActive: boolean
  onActivate: () => void
}
```

Features:
- PaneTabBar at top
- Renders active tab content below
- Click to set as active pane
- Drop zone for tab drag

### 6.5 Update SplitPaneContainer
**File:** `src/renderer/src/components/MainPane/SplitPaneContainer.tsx`

Update to use Pane components instead of raw content:
- Render `<Pane>` for each side
- Pass tab group data
- Handle pane activation

### 6.6 Update MainPane
**File:** `src/renderer/src/components/MainPane/MainPane.tsx`

- Remove single TabBar when in split mode
- Each pane has its own PaneTabBar
- Handle `openTab` to add to active pane
- Handle tab closing within panes

## Phase 7: Tab Drag Between Panes 🔲

### 7.1 Drag State
Track which tab is being dragged and from which pane.

### 7.2 Drop Handling
When dropping on a pane:
1. Remove tab from source pane's group
2. Add tab to target pane's group
3. Optionally set as active in target pane

### 7.3 Visual Feedback
- Highlight target pane during drag
- Show drop indicator

## File Summary

### New Files to Create
- `src/renderer/src/components/MainPane/PaneTabBar.tsx`
- `src/renderer/src/components/MainPane/Pane.tsx`

### Files to Modify
- `src/preload/index.d.ts` - Add TabGroup type
- `src/renderer/src/stores/workspace-store.ts` - Tab group state and actions
- `src/renderer/src/components/MainPane/SplitPaneContainer.tsx` - Use Pane components
- `src/renderer/src/components/MainPane/MainPane.tsx` - Integrate tab groups

### Existing Files (Already Complete)
- `src/renderer/src/components/MainPane/SplitDivider.tsx` ✅
- `src/renderer/src/components/MainPane/SplitPaneToggle.tsx` ✅
- `src/renderer/src/components/MainPane/DropZoneOverlay.tsx` ✅
- `src/renderer/src/App.tsx` - Keyboard shortcuts ✅

## Testing Checklist

### Split View Basics
- [x] Toggle split view on/off with buttons
- [x] Toggle split view with Cmd/Ctrl + \
- [x] Vertical split (top/bottom)
- [x] Horizontal split (left/right)
- [x] Drag divider to resize panes
- [x] Double-click divider resets to 50/50
- [x] Swap panes button works
- [x] Orientation toggle button works

### Tab Groups
- [ ] Tabs auto-distribute when enabling split
- [ ] With 1 tab: goes to first pane
- [ ] With 2 tabs: one per pane
- [ ] With 3+ tabs: distributed evenly
- [ ] Each pane has its own tab bar
- [ ] Can switch tabs within a pane
- [ ] Can close tabs within a pane
- [ ] Closing last tab shows placeholder

### Tab Drag Between Panes
- [ ] Can drag tab from pane 1 to pane 2
- [ ] Can drag tab from pane 2 to pane 1
- [ ] Visual feedback during drag
- [ ] Tab order preserved after drop

### Sidebar Collapse
- [x] Left sidebar collapse button works
- [x] Right sidebar collapse button works
- [x] Cmd+B toggles left sidebar
- [x] Cmd+Shift+B toggles right sidebar
- [x] Collapsed state shows icons
- [x] Click icons to expand

### Persistence
- [x] Split state persists across restart
- [x] Orientation persists
- [x] Ratio persists
- [ ] Tab groups persist

## Usage

### Keyboard Shortcuts
- `Cmd/Ctrl + \` - Toggle split pane
- `Cmd/Ctrl + B` - Toggle left sidebar
- `Cmd/Ctrl + Shift + B` - Toggle right sidebar

### Mouse Interactions
- **Click split toggle buttons** - Switch between no split, vertical, horizontal
- **Drag divider** - Resize panes
- **Double-click divider** - Reset to 50/50
- **Hover divider** - Reveals swap and orientation buttons
- **Click tab** - Activate tab in its pane
- **Drag tab to other pane** - Move tab between panes
- **Click pane** - Set as active pane (for new tabs)

### Tab Assignment
- When enabling split, tabs auto-distribute evenly
- New tabs open in the active (focused) pane
- Drag tabs between panes to reorganize
- Closing all tabs in a pane shows placeholder
