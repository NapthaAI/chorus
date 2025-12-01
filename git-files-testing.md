# Git & File Operations Testing Guide

This document provides comprehensive testing steps for all git and file operations implemented in Chorus.

## Prerequisites

1. Have a workspace added to Chorus (e.g., `mcplatform`)
2. Ensure the workspace has git initialized
3. Enable git auto-branch and auto-commit in workspace settings

---

## 1. Workspace Git Settings

### Test: Enable Auto-Branch and Auto-Commit
1. Click on a workspace in the sidebar to open Workspace Overview
2. Find the "Git Automation" section in Workspace Settings
3. Toggle "Auto-branch" ON
4. Toggle "Auto-commit" ON
5. **Expected**: Settings should persist when you navigate away and back

---

## 2. Agent Auto-Branch Creation

### Test: New Branch Created on First Agent Message
1. Start a new conversation with an agent
2. Send a message that will trigger the agent to work (e.g., "Create a test file called test-branch.txt")
3. **Expected**:
   - A new branch should be created with naming pattern: `agent/{agent-name}/{session-id}`
   - You should see the new branch appear in the Branch Selector dropdown
   - You should see it in "Agent Sessions" panel in Workspace Overview

### Test: Branch Persists Across Messages
1. Send another message in the same conversation
2. **Expected**: The agent should continue working on the same branch (no new branch created)

---

## 3. Agent Auto-Commit

### Test: Commits After Each Turn
1. With an active agent conversation (on agent branch)
2. Have the agent create/modify files
3. **Expected**:
   - After each agent turn, changes should be auto-committed
   - Commit message format: `[Chorus] Auto-commit: {summary}`
   - You can verify by clicking "View Changes" in Agent Sessions

---

## 4. Agent Sessions Panel

Location: Workspace Overview > Agent Sessions section

### Test: View Agent Sessions
1. Open Workspace Overview (click workspace in sidebar)
2. Scroll to "Agent Sessions (X)" section
3. **Expected**: See list of agent branches with:
   - Agent name
   - Session ID
   - Commit count
   - Last commit time
   - "current" badge if checked out

### Test: Expand Session
1. Click on a session row (anywhere on the row)
2. **Expected**:
   - Row expands with chevron rotation
   - Shows action buttons: View Changes, Push, Merge to main, (Delete if not current)

### Test: View Changes Button
1. Expand a session
2. Click "View Changes" button
3. **Expected**:
   - Shows "Loading changes..." briefly
   - Lists all files changed compared to main/master
   - Each file shows: status indicator (A/M/D/R), file path, +additions, -deletions
   - Click "View Changes" again to hide

### Test: Click on Changed File
1. With changes visible, click on a file path
2. **Expected**: File opens in a new tab (unless it's deleted)
3. **Expected for deleted files**: Click is disabled, cursor shows not-allowed

### Test: Push Button
1. Click "Push" button for a session
2. **Expected**:
   - Button briefly shows loading state
   - On success, shows "Pushed!" for 3 seconds
   - Branch is pushed to remote with upstream tracking

### Test: Merge to Main Button
1. Click "Merge to main" button
2. **Expected**:
   - Checks out main/master (whichever exists)
   - Performs squash merge
   - Creates merge commit
   - Branch list refreshes

### Test: Delete Button
1. Click "Delete" button (only visible for non-current branches)
2. **Expected**:
   - Modal appears with warning
   - 3-second countdown before "Delete" button is enabled
   - After countdown, clicking "Delete" removes the branch
   - Branch disappears from list

### Test: Cancel Delete
1. Click "Delete" button
2. Wait for modal, then click "Cancel"
3. **Expected**: Modal closes, branch is NOT deleted

---

## 5. Branch Selector (Sidebar)

Location: Below workspace name in sidebar

### Test: View Branch Dropdown
1. Click on the branch name (e.g., "main")
2. **Expected**:
   - Dropdown appears with Local and Remote sections
   - Current branch has checkmark
   - Local branches show delete button on hover

### Test: Checkout Branch
1. Open branch dropdown
2. Click on a different branch
3. **Expected**:
   - "Switching..." text appears
   - Branch changes
   - File browser updates to show new branch contents

### Test: Delete Branch from Dropdown
1. Open branch dropdown
2. Hover over a non-current local branch
3. Click the trash icon
4. **Expected**:
   - Delete confirmation modal appears
   - 3-second countdown
   - After confirming, branch is deleted and list refreshes

---

## 6. File Browser Operations

Location: Right panel > Files tab (or sidebar Files section)

### Test: Create New File
1. Right-click on a folder in the file browser
2. Select "New File"
3. Enter filename (e.g., "test-new-file.txt")
4. Click "Create"
5. **Expected**:
   - File is created
   - File browser refreshes showing new file
   - File can be opened

### Test: Create New Folder
1. Right-click on a folder
2. Select "New Folder"
3. Enter folder name (e.g., "test-new-folder")
4. Click "Create"
5. **Expected**:
   - Folder is created
   - File browser refreshes showing new folder
   - Can expand folder

### Test: Rename File
1. Right-click on a file
2. Select "Rename"
3. Enter new name
4. Click "Rename"
5. **Expected**:
   - File is renamed
   - File browser refreshes
   - Old name is gone, new name appears

### Test: Rename Folder
1. Right-click on a folder
2. Select "Rename"
3. Enter new name
4. Click "Rename"
5. **Expected**: Folder is renamed

### Test: Delete File
1. Right-click on a file
2. Select "Delete"
3. **Expected**:
   - Delete confirmation modal appears
   - 3-second countdown
   - After confirming, file is deleted
   - File browser refreshes

### Test: Delete Folder
1. Right-click on a folder
2. Select "Delete"
3. **Expected**:
   - Delete confirmation shows warning about contents
   - After confirming, folder and all contents deleted

### Test: Cancel Delete
1. Right-click on file/folder, select Delete
2. Click "Cancel" in modal
3. **Expected**: File/folder is NOT deleted

### Test: Copy Path
1. Right-click on any file/folder
2. Select "Copy Path"
3. Paste somewhere (e.g., text editor)
4. **Expected**: Full absolute path is copied

### Test: Refresh Folder
1. Modify a file externally (outside Chorus)
2. Right-click on parent folder
3. Select "Refresh"
4. **Expected**: Folder contents refresh to show external changes

---

## 7. Edge Cases

### Test: Delete File That's Open in Tab
1. Open a file in a tab
2. Delete the file via context menu
3. **Expected**: File is deleted, tab behavior TBD (may show error when interacting)

### Test: Rename File That's Open in Tab
1. Open a file in a tab
2. Rename the file via context menu
3. **Expected**: File is renamed, tab may need manual refresh

### Test: Create File in Non-Existent Directory
1. Try to create a file with path that includes new directories
2. **Expected**: Should handle gracefully (either create dirs or show error)

### Test: Branch Operations After Deleting Current Branch
1. This shouldn't be possible (delete button hidden for current branch)
2. **Expected**: Can't delete current branch

---

## 8. Known Issues / Bugs to Check

- [ ] Duplicate entries showing in UI (chorus/{id} and {id})
- [ ] File browser not refreshing after branch switch
- [ ] Tab showing stale file content after branch operations

---

## Test Results Log

| Feature | Test | Status | Notes |
|---------|------|--------|-------|
| Git Settings | Enable auto-branch | | |
| Git Settings | Enable auto-commit | | |
| Auto-Branch | Branch created on first message | | |
| Auto-Commit | Commits after each turn | | |
| Agent Sessions | View sessions list | | |
| Agent Sessions | Expand session | | |
| Agent Sessions | View Changes | | |
| Agent Sessions | Click changed file | | |
| Agent Sessions | Push | | |
| Agent Sessions | Merge to main | | |
| Agent Sessions | Delete with countdown | | |
| Branch Selector | View dropdown | | |
| Branch Selector | Checkout branch | | |
| Branch Selector | Delete branch | | |
| File Browser | Create new file | | |
| File Browser | Create new folder | | |
| File Browser | Rename file | | |
| File Browser | Rename folder | | |
| File Browser | Delete file | | |
| File Browser | Delete folder | | |
| File Browser | Copy path | | |
| File Browser | Refresh folder | | |
