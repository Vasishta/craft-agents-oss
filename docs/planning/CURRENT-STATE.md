# CURRENT STATE: Durable Knowledge Workspace

Status: Snapshot as of 2026-05-14
Live tracker: GitHub Issues on `Vasishta/craft-agents-oss`  
Related epic: `#9 EPIC-001: Durable Knowledge Workspace`

## Why This Exists

The durable markdown docs capture product direction and architecture reasoning. GitHub Issues are now the live task tracker. This file reconciles the two so future agents do not mistake older "recommended next" prose for the current queue.

## Product Posture

Craft Agents is still a local-first AI workspace evolving out of a session-first app. The product direction remains:

```text
Chat is the command surface.
Docs, Outputs, Decisions, Notebooks, WorkItems, Projects, Files & Context, and Search are the durable workspace model.
Workspace remains the local operating boundary.
Project remains an optional curated work container inside a workspace.
```

The UI has started exposing mid-term IA before all backing models are fully surfaced:

```text
Home
Search
Projects
Library
Work Queue
Files & Context
Automations
Skills
Settings
```

This is intentional as a migration shell. It should not be interpreted as a completed project-first rewrite.

## Completed Issue Milestones

```text
#8  TASK-008 Output polish and provenance hardening
#16 TASK-009 Search result model cleanup
#17 TASK-010 Files & Context v0 clarification
#18 TASK-011 WorkItem v0 model separate from session status
#19 TASK-012 Project v0 model with optional links
#20 TASK-013 Project Home and project-scoped filters
#26 TASK-014 Decision v0 model
#27 TASK-015 Notebook v0 model
#28 TASK-016 Serialized local index mutation helper
#35 TASK-023 Workspace navigation IA consolidation
#30 TASK-018 Library v0 durable-object surface
#31 TASK-019 Work Queue v0 backed by WorkItems
#29 TASK-017 Decision and Notebook UI surfaces
#38 TASK-024 Workspace shell polish for Library, Work Queue, and Home
```

Current implementation state:

```text
- #35 is complete: the shell now exposes stable Home, Search, Projects, Library, Work Queue, Files & Context, Automations, Skills, and Settings destinations.
- #30 is complete: Library is a normalized, metadata-driven durable-object surface over Docs, Outputs, Decisions, and Notebooks.
- #31 is complete: Work Queue is backed by durable WorkItems with compatibility session-status views preserved below it.
- #29 is complete: Decisions and Notebooks now support visible create/list/detail/update/delete flows from the polished shell surfaces.
```

## Next Queue

```text
#32 TASK-020 Project linked-object navigation polish
#33 TASK-021 Cross-object Search expansion
#34 TASK-022 Explicit cross-object linking actions
#39 TASK: Consolidate durable entity UI scaffolds and resource hooks
```

## Documentation Rules

Use `docs/PRD-001-craft-agents-local-first-ai-workspace.md` as the north star.

Use `docs/ARB-001-navigation-and-migration-roadmap.md` for migration rationale and guardrails.

Use GitHub Issues for live task state, comments, completion notes, and issue closure.

Only add a repo-local `TASK-*` markdown file when a task needs detailed implementation handoff beyond the issue body.
