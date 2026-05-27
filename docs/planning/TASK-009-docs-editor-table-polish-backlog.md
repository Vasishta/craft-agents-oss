# TASK-009: Docs, Editor, and Table Polish Backlog

Status: Proposed
Base branch: `feature/dev`
Expected branch: `codex/docs-editor-table-polish`
Related epic: `docs/planning/EPIC-001-durable-knowledge-workspace.md`

This backlog stays intentionally markdown-first. It assumes the current product shape already treats docs as durable workspace artifacts and focuses on making the docs/editor/table surfaces feel clearer, calmer, and more consistent without changing the underlying product model.

For the doc format this backlog expects, see `docs/planning/DOCS-STYLE-GUIDE.md` and `docs/planning/PLANNING-TEMPLATE.md`.

## Goal

Create a staged polish backlog for docs, editor, and table surfaces so the next implementation pass can improve readability, editing comfort, and tabular data handling in small safe slices.

## Why now

The repo already has durable docs and object-centric workspace surfaces. The remaining rough edges are mostly presentation and editing ergonomics, which makes this a good time for a sequenced polish backlog rather than a large rework.

## Scope

In scope:

- Markdown docs used for product/planning communication.
- Editor affordances that support writing, reading, and reviewing markdown-first content.
- Table presentation and table editing behaviors where they touch docs or markdown content.
- Copy, empty states, and layout polish that improves the reading and authoring flow.

Out of scope:

- Core object model changes.
- Large navigation or routing changes.
- New workspace entities.
- Non-markdown content systems.

## Staged backlog

### Stage 1: Document system clarity

1. Define a single docs style guide that covers headings, callouts, task blocks, status labels, and review sections.
2. Normalize the phrasing used across planning docs so repeated concepts use the same vocabulary.
3. Audit docs index pages for inconsistent metadata presentation and align the pattern.
4. Make the relationship between `README.md`, planning docs, and architecture docs explicit in the docs landing content.
5. Standardize document titles so task, epic, and roadmap names read consistently in lists and file names.
6. Add a lightweight template for new planning docs that mirrors the repo's current markdown-first structure.
7. Clarify which docs are canonical versus archival so readers know what to trust at a glance.
8. Improve cross-link language so references between docs feel intentional instead of incidental.

### Stage 2: Reading experience polish

9. Tighten heading hierarchy across long docs so sections are scannable in outline mode.
10. Reduce dense paragraph blocks by introducing more purposeful lists and short explanatory lead-ins.
11. Add consistent callout formatting for status, risk, and next-step notes.
12. Improve code block labeling so examples read as examples and not implementation noise.
13. Normalize table-of-contents placement for long documents where it adds real navigation value.
14. Review long-form docs for duplicated context and trim repeated intro language.
15. Make references to related epics, tasks, and PRDs more prominent in the places readers expect them.
16. Improve readability of dense planning sections on narrower viewport widths.

### Stage 3: Editor comfort

17. Review editor empty states and onboarding hints so a blank document feels guided rather than empty.
18. Improve focus treatment for the active editing surface so the current document is always obvious.
19. Tune spacing and typography in markdown preview or rendered doc views for better long-form reading.
20. Make link styling in docs/editor surfaces easier to distinguish from body text without being loud.
21. Add clearer affordances for copy, duplicate, and open-in-editor style actions where they already exist.
22. Ensure keyboard-driven editing paths remain predictable for markdown entry and navigation.
23. Reduce accidental visual jumps when switching between edit and read modes.
24. Review error and loading copy in editor-related surfaces so failures sound actionable.

### Stage 4: Table usability

25. Align table headers, row density, and padding so tables read consistently across docs.
26. Make wrapped table content easier to scan by reviewing line height, column width, and truncation behavior.
27. Improve empty table messaging so it explains whether the issue is no data or no configured columns.
28. Add clearer row hover and selection states for table-heavy surfaces.
29. Review table action placement so primary actions are visible without crowding the data.
30. Keep table sorting cues visually consistent wherever tables appear in docs-oriented flows.
31. Make inline table copy, paste, and edit behavior feel less fragile for markdown-first data entry.
32. Check whether wide tables need a responsive fallback before they become unreadable on smaller windows.

### Stage 5: Cross-surface consistency

33. Harmonize document, editor, and table typography tokens so the same content feels like the same product everywhere.
34. Review iconography and microcopy for docs/editor/table actions so labels are descriptive and stable.
35. Make section-level metadata, such as status and provenance, share a common visual treatment across docs.
36. Ensure markdown examples, rendered docs, and table views all respect the same spacing rhythm.
37. Revisit light empty-state illustration or placeholder treatment if the current surfaces feel too sterile.
38. Check that responsive behavior degrades gracefully when panes or sidebars are narrow.

### Stage 6: Quality and cleanup

39. Add focused documentation tests or snapshot checks where they would prevent visual regressions in markdown-heavy surfaces.
40. Trim obsolete docs guidance once the new style and layout patterns are adopted.
41. Add a short verification checklist for future docs/editor/table polish work so follow-on tasks stay consistent.

## Suggested execution order

Start with Stage 1 and Stage 2 before touching surface behavior. Then tackle editor comfort, table usability, and cross-surface consistency in small slices. Finish with the quality pass so the cleaned-up patterns are easier to keep stable.

## Definition of done

- The backlog is specific enough that each stage can become one or more implementation tasks.
- The sequence respects the repo's markdown-first architecture.
- The work stays scoped to docs/editor/table polish rather than broader product changes.
- Future agents can pick tasks from this document without needing extra context from chat history.
