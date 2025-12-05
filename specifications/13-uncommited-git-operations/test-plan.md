# Test Plan: Enhanced Git Changes Panel

## Setup

```bash
cd /Users/arshath/play/naptha/cc-slack/chorus
bun run dev
```

---

## 1. View Git Tab Layout

- Open a workspace in Chorus
- Click the **"Git"** tab
- **Verify section order:**
  1. Local Branches (top)
  2. Uncommitted Changes (middle)
  3. Agent Sessions (bottom)

---

## 2. Test Staged/Unstaged Separation

Create test changes in your workspace:

```bash
# In a workspace repo (e.g., mcplatform/)
echo "test" >> testfile.txt        # Create new file
git add testfile.txt               # Stage it
echo "change" >> anotherfile.txt   # Modify without staging
```

- Refresh Git tab
- **Verify:**
  - "Staged" section shows `testfile.txt`
  - "Changes" section shows `anotherfile.txt`
  - File paths display correctly (not cut off)

---

## 3. Test Tooltips

- Hover over any action button (+, -, eye, discard)
- **Verify:**
  - Tooltip has solid dark background (not transparent)
  - Tooltip text is fully visible (not cut off)
  - Arrow points to the button

---

## 4. Test Stage File

- In "Changes" section, click **+** on a file
- **Verify:** File moves to "Staged" section

---

## 5. Test Unstage File

- In "Staged" section, click **-** on a file
- **Verify:** File moves back to "Changes" section

---

## 6. Test Batch Operations

- Click **"Stage All"** in Changes section header
- **Verify:** All files move to Staged section
- Click **"Unstage All"** in Staged section header
- **Verify:** All files move back to Changes section

---

## 7. Test View Diff

- Click the **eye icon** on any changed file
- **Verify:**
  - Diff viewer appears
  - Shows +/- lines with green/red highlighting
  - Line numbers are visible
  - Stats show additions/deletions count
- Click **X** to close diff
- **Verify:** Returns to normal view

---

## 8. Test Diff Actions

- Open diff for an unstaged file
- Click **"Stage"** button in diff footer
- **Verify:** Diff closes, file is now staged

- Open diff for a staged file
- Click **"Unstage"** button
- **Verify:** Diff closes, file is now unstaged

---

## 9. Test Discard File

- Click **discard icon** on a file
- **Verify:** Confirmation dialog appears with warning
- Click **"Discard"**
- **Verify:** File removed from changes list

---

## 10. Test Discard All

- Make multiple changes
- Click **"Discard All"** button
- **Verify:**
  - Strong warning dialog appears
  - Shows count of files affected
- Confirm discard
- **Verify:** All changes removed

---

## 11. Test Commit Workflow

- Stage one or more files
- **Verify:** Commit section appears with message input
- Type a commit message
- Click **"Commit"** button
- **Verify:**
  - Staged files are committed
  - Staged section clears
  - Message input clears

---

## 12. Test Empty States

- With no staged files:
  - **Verify:** Commit section shows "Stage files to commit them"
- With no changes at all:
  - **Verify:** Uncommitted Changes panel is hidden

---

## Quick Cleanup

```bash
# Reset test changes
git checkout -- .
git clean -fd
```

---

## Test Matrix

| Feature | Status |
|---------|--------|
| Section order (Branches → Changes → Sessions) | [ ] |
| Staged/Unstaged separation | [ ] |
| File paths display correctly | [ ] |
| Tooltips visible with solid background | [ ] |
| Stage single file (+) | [ ] |
| Unstage single file (-) | [ ] |
| Stage All | [ ] |
| Unstage All | [ ] |
| View Diff (eye icon) | [ ] |
| Diff syntax highlighting | [ ] |
| Stage from diff | [ ] |
| Unstage from diff | [ ] |
| Discard single file | [ ] |
| Discard All | [ ] |
| Commit with message | [ ] |
| Empty state messages | [ ] |
