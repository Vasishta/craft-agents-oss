# Planning Docs Guide

This folder turns the product direction into executable work without losing the broader ambition.

Use it when a task is too important to live only in chat, but not yet formal enough to require a full external project-management system.

Current execution state lives in GitHub Issues on `Vasishta/craft-agents-oss`. Keep this folder focused on durable reasoning and handoffs; use `CURRENT-STATE.md` as the bridge when issue status has moved ahead of older markdown plans.

## Hierarchy

```text
Epic  = broad product outcome spanning multiple PRs
Story = user-observable capability within an epic
Task  = concrete implementation slice with a definition of done
```

Example:

```text
EPIC-001 Durable Knowledge Workspace
  STORY-001 Save assistant output as a reviewable object
    TASK-007 Outputs v0
    TASK-008 Output polish and provenance hardening
  STORY-002 Find saved work later
    TASK-004 Search v0
    TASK-009 Search result model cleanup
  STORY-003 Separate task/backlog semantics from sessions
    TASK-011 WorkItem v0
```

## When to create each type

Create an `EPIC-*` document when:

```text
- the work spans several PRs;
- it changes product vocabulary or navigation;
- it needs success criteria beyond a single implementation task;
- future windows/agents need to recover the reasoning quickly.
```

Create a `STORY-*` document when:

```text
- the user-visible value is clear but requires multiple implementation tasks;
- acceptance criteria matter more than file-level steps;
- the story may be discussed independently in design/product review.
```

Create a `TASK-*` document when:

```text
- the work can be implemented in one focused PR;
- the next agent needs exact definition of done;
- there are storage, route, IPC, UI, or test details worth preserving;
- the task is likely to be picked up in a fresh chat window.
```

## Naming

```text
EPIC-001-durable-knowledge-workspace.md
STORY-001-reviewable-outputs.md
TASK-008-output-polish-and-provenance-hardening.md
```

Keep numbers stable once linked from a PR or chat.

## Recommended task template

```text
# TASK-000: Title

Status: Proposed | In Progress | Done
Base branch: feature/dev
Expected branch: codex/short-name
Related epic/story: EPIC-000 / STORY-000

## Goal

One paragraph describing the user/product outcome.

## Why now

Why this is the next safe incremental step.

## Scope

In scope:
- ...

Out of scope:
- ...

## Implementation plan

1. Inspect current files/routes/storage.
2. Add or update model/API/UI behavior.
3. Add focused tests.
4. Update copy and empty/error states.

## Definition of done

- ...

## Validation

```text
bun run typecheck:electron
bun test ...
git diff --check
```

## Review checklist

- Product coherence
- Workspace scoping
- ID safety
- Provenance
- Empty/loading/error states
- Performance bounds
- Tests
```

## Keep docs useful

Prefer short, durable planning documents over long transcripts. If a task becomes too big, split it before implementation rather than after the PR becomes hard to review.

Do not create a repo-local `TASK-*` file for every GitHub issue. Add one only when the next implementation agent needs a durable, detailed handoff that should survive outside GitHub issue comments.

Use `CURRENT-STATE.md` for the live execution snapshot, and keep this index focused on the stable path from epic to story to task. When a task is really a backlog bucket rather than active execution, link it here so it stays discoverable without pretending it is the current source of truth.

Backlog references:

```text
TASK-009-docs-editor-table-polish-backlog.md
  Docs/editor/table polish backlog and follow-up items.

TASK-010-legacy-transition-cleanup-batch.md
  Legacy transition cleanup umbrella for session-first terminology, nav buckets, hooks, editor shims, and migration-only compatibility code, with explicit follow-on slices for the remaining cleanup work.
```
