# TASK-000: Title

Status: Proposed
Base branch: `feature/dev`
Expected branch: `codex/short-name`
Related epic/story: `EPIC-000` / `STORY-000`

## Goal

One short paragraph describing the user-visible outcome or planning objective.

## Why now

Explain why this is the right next step and what it unblocks.

## Scope

In scope:

- ...

Out of scope:

- ...

## Plan

1. Inspect the current docs, UI, or data model relevant to the task.
2. Make the smallest change that moves the surface forward.
3. Update any copy, links, or metadata that must stay in sync.
4. Add or adjust validation where the change is easy to regress.

## Definition of done

- The intended outcome is implemented or captured clearly.
- The doc stays aligned with the repo's markdown-first structure.
- Any follow-on work is obvious enough to become its own task if needed.

## Validation

```text
bun run typecheck
bun test
git diff --check
```

## Review notes

- Call out any assumptions that future work should revisit.
- Note any cross-links that should be added to adjacent planning docs.
