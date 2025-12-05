# Sprint 8: Implementation Plan - Chat as Tabs in Main Pane

## Summary

This implementation plan details how to restructure the UI so that:
1. **Sidebar** shows agents and conversation lists (no chat UI)
2. **Main Pane** renders chat tabs alongside file tabs
3. **Right Panel** auto-switches to Details when a chat tab is active

## Implementation Overview

### Phase 1: Store Updates ✅

**Files Modified:**
- `chorus/src/preload/index.d.ts` - Add `conversationId` to Tab type
- `chorus/src/renderer/src/stores/workspace-store.ts` - Add conversation selection

**Changes:**

1. **Tab Type Update** (`index.d.ts`):
```typescript
interface Tab {
  id: string
  type: 'chat' | 'file'
  workspaceId?: string
  agentId?: string
  conversationId?: string  // NEW: For chat tabs
  filePath?: string
  title: string
}
```

2. **WorkspaceStore Updates** (`workspace-store.ts`):
- Add `selectedConversationId: string | null` to state
- Add `selectConversation(conversationId, agentId, workspaceId, title)` action
- Update `activateTab()` to handle chat tabs
- Update `loadTabs()` to restore chat tabs

### Phase 2: Sidebar Changes ✅

**Files Modified:**
- `chorus/src/renderer/src/components/Sidebar/Sidebar.tsx`

**Files Created:**
- `chorus/src/renderer/src/components/Sidebar/AgentConversationsPanel.tsx`

**Files to Remove (later):**
- `chorus/src/renderer/src/components/Sidebar/AgentChatPanel.tsx` (deprecated)

**Changes:**

1. **Sidebar.tsx** - Switch between WorkspacesPanel and AgentConversationsPanel:
```typescript
{selectedAgentId ? <AgentConversationsPanel /> : <WorkspacesPanel />}
```

2. **AgentConversationsPanel.tsx** - New component that:
   - Shows agent header with back button
   - Lists all conversations for the selected agent
   - Has "New conversation" button
   - Clicking a conversation calls `selectConversation()` to open as tab
   - Does NOT contain MessageList or MessageInput (no chat UI)

### Phase 3: MainPane Chat Support ✅

**Files Created:**
- `chorus/src/renderer/src/components/MainPane/ChatTab.tsx`

**Files Modified:**
- `chorus/src/renderer/src/components/MainPane/MainPane.tsx`

**Changes:**

1. **ChatTab.tsx** - New component containing:
   - ConversationToolbar (model/permission/tools dropdowns)
   - MessageList (chat messages)
   - MessageInput (message input)
   - Error/warning banners
   - Keyboard shortcuts (Escape to stop)

2. **MainPane.tsx** - Updated `renderContent()`:
```typescript
// If there's an active chat tab, show chat
if (activeTab?.type === 'chat' && activeTab.conversationId) {
  return <ChatTab ... />
}
// If there's an active file tab, show file viewer
if (activeTab?.type === 'file' && activeTab.filePath) {
  return <FileViewer ... />
}
// ... workspace overview or welcome
```

### Phase 4: TabBar Updates ✅

**Files Modified:**
- `chorus/src/renderer/src/components/MainPane/TabBar.tsx`

**Changes:**

1. Add ChatIcon SVG component
2. Update TabItem to show correct icon based on tab type:
```typescript
const Icon = tab.type === 'chat' ? ChatIcon : FileIcon
```
3. Chat icon has accent color for visual distinction

### Phase 5: RightPanel Context Switching ✅

**Files Modified:**
- `chorus/src/renderer/src/components/RightPanel/RightPanel.tsx`

**Changes:**

1. Import workspace store to get active tab
2. Add useEffect to auto-switch to Details tab when chat tab is active:
```typescript
useEffect(() => {
  if (activeTab?.type === 'chat') {
    setRightPanelTab('details')
  }
}, [activeTab?.type, activeTab?.id])
```

## File Summary

### New Files
| File | Purpose |
|------|---------|
| `AgentConversationsPanel.tsx` | Navigation panel showing agent's conversations |
| `ChatTab.tsx` | Chat UI component rendered in MainPane |

### Modified Files
| File | Changes |
|------|---------|
| `index.d.ts` | Added `conversationId` to Tab type |
| `workspace-store.ts` | Added `selectedConversationId`, `selectConversation()`, updated tab handling |
| `Sidebar.tsx` | Switch to AgentConversationsPanel |
| `MainPane.tsx` | Render ChatTab for chat tabs |
| `TabBar.tsx` | Added ChatIcon, icon selection based on tab type |
| `RightPanel.tsx` | Auto-switch to Details for chat tabs |

### Deprecated Files (can be removed)
| File | Reason |
|------|--------|
| `AgentChatPanel.tsx` | Replaced by AgentConversationsPanel + ChatTab |

## Data Flow

### Opening a Conversation

```
User clicks conversation in AgentConversationsPanel
    ↓
selectConversation(id, agentId, workspaceId, title)
    ↓
Check if chat tab exists for this conversationId
    ↓
If exists: activate existing tab
If not: create new tab with type='chat'
    ↓
Update state: selectedConversationId, activeTabId
    ↓
MainPane renders ChatTab
    ↓
ChatTab calls chat-store.selectConversation(id) to load messages
    ↓
RightPanel auto-switches to Details tab
```

### Tab Activation

```
User clicks tab in TabBar
    ↓
activateTab(tabId)
    ↓
If tab.type === 'chat':
  - Set selectedConversationId
  - Set selectedAgentId
  - Clear selectedFilePath
If tab.type === 'file':
  - Set selectedFilePath
  - Clear selectedConversationId
    ↓
MainPane re-renders appropriate content
```

## Testing Checklist

### Sidebar
- [x] Clicking agent shows conversations panel
- [x] Back button returns to workspaces
- [x] Conversations list shows titles and timestamps
- [x] Unread badges appear correctly
- [x] "New conversation" creates and opens chat tab

### MainPane
- [x] Chat tab renders MessageList and MessageInput
- [x] Can send messages from chat tab
- [x] Streaming works correctly
- [x] ConversationToolbar settings work
- [x] Error banners display correctly

### TabBar
- [x] Chat tabs have chat icon (accent colored)
- [x] File tabs have file icon
- [x] Can close chat tabs
- [x] Tab titles correct
- [x] Middle-click closes tab

### RightPanel
- [x] Auto-switches to Details when chat tab active
- [x] Details shows correct conversation data
- [x] Can manually switch to Files tab
- [x] Switching back to file tab doesn't force Details

### Persistence
- [x] Chat tabs restored on app restart
- [x] Active tab restored correctly
- [x] Conversation messages load when tab restored

## Known Limitations

1. **No permanent workspace tab** - User wanted workspace overview to be unclosable, but this wasn't implemented. Workspace overview shows when no tabs are open.

2. **Session state** - Chat tabs store conversationId but the actual session state (messages, streaming) is in chat-store. If you open the same conversation in two tabs (not currently possible due to deduplication), they would share state.

3. **Tab restoration** - Chat tabs are restored from settings, but the conversation must still exist in the backend. Deleted conversations will result in broken tabs.

## Future Improvements

1. Add pinned/permanent workspace overview tab
2. Show agent status (busy/error) on chat tabs
3. Add tab reordering via drag-and-drop
4. Consider showing mini conversation preview in tab tooltip
