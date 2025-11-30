# Collaborative Editing: Design

## Overview

This document outlines the design principles and user experience for collaborative editing in an agentic editor.

## Core Design Principles

### 1. User Agency First
- Users maintain full control over what changes are accepted
- Agent edits are never forced into the main document
- Clear visual distinction between user content and agent proposals

### 2. Review-Oriented Workflow
- The primary interaction is reviewing and accepting/rejecting proposals
- Diffs should be semantic and prose-friendly, not just line-based
- Changes should be presented with context and rationale

### 3. Safe Experimentation
- Agents can work without fear of disrupting the user's document
- Multiple agents can explore different approaches in parallel
- Failed or unwanted attempts can be discarded atomically

## User Interface Considerations

### Diff Visualization Inspiration

The [Ink & Switch Patchwork Notebook](https://www.inkandswitch.com/patchwork/notebook/04/) explores several promising approaches for visualizing collaborative edits in prose documents. Their research identifies key patterns that align well with our virtual branching model:

**Inline Visualization**
- Use green highlights for additions and backspace glyphs for deletions
- Implement hover interactions to reveal deleted text, reducing visual noise while maintaining access to removed content
- This approach keeps the focus on the current state while making changes easily discoverable

**Margin Annotations**
- Leverage sidebar space (traditionally used for comments) to display change metadata
- Show replacements as "before → after" comparisons in the margin
- Avoids the cluttered strikethrough patterns common in traditional word processors

**Document-Level Summary Views**
Their experiments with summary views are particularly relevant for reviewing agent proposals:
- **Minibar visualization**: Shows change locations across the entire document with section headers for context
- **Section-based breakdown**: Organizes additions/deletions by document structure
- **Statistical metrics**: Displays word/sentence counts rather than character-level changes (more meaningful for prose)
- **Visual density maps**: Represents edit clustering to show where the agent focused their changes

**Design Philosophy Alignment**

The Patchwork research emphasizes "reducing noise while enabling quick assessment of what changed"—this directly supports our review-oriented workflow. When agents present proposals, we need users to quickly understand:
- What changed (inline highlights)
- Where changes are concentrated (minibar/density maps)
- The semantic nature of changes (before/after in margins)

This multi-layered approach allows users to scan at different levels of detail depending on their review needs, supporting both quick acceptance of obvious improvements and careful scrutiny of significant rewrites.

(To be expanded with specific design decisions, mockups, and interaction patterns)
