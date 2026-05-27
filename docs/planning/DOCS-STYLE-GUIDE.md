# Docs Style Guide

This guide keeps planning docs practical, scannable, and consistent with the repo's markdown-first architecture.

Use it for new `EPIC-*`, `STORY-*`, and `TASK-*` docs under `docs/planning`.

## Core principles

- Write for the next agent who has no chat history.
- Keep each document durable, specific, and easy to skim.
- Prefer plain markdown structure over custom formatting.
- Use stable names and links so docs remain useful after the related work moves on.
- Separate what is true now from what is planned next.

## Document shape

Use a short, predictable structure:

```text
# ID: Title

Status: Proposed | In Progress | Done
Base branch: `feature/dev`
Expected branch: `codex/short-name`
Related epic/story: `EPIC-000` / `STORY-000`

## Goal

## Why now

## Scope

## Plan

## Definition of done

## Validation

## Review notes
```

Not every doc needs every section, but the order should stay familiar.

## Writing rules

- Use one clear sentence in the title and keep it aligned with the file name.
- Put the outcome first, not the implementation detail.
- Keep paragraphs short and use bullets for boundaries, lists, and checks.
- Prefer concrete nouns and verbs over vague product language.
- Keep status language honest. If something is not done, say so directly.
- Use backticks for file names, issue numbers, branches, commands, and stable labels.
- Link to the canonical source instead of repeating the same context in multiple places.

## Scope rules

- Put in-scope and out-of-scope items in separate bullet lists when the boundary matters.
- Call out architecture changes, user-facing changes, and documentation changes explicitly.
- Name any assumptions that could change the plan.
- If the task depends on another doc or issue, link it near the top.

## Tone

- Practical, calm, and direct.
- No hype, no marketing language, no filler.
- Favor "what changes" and "what stays the same" over broad narrative.
- Keep review notes focused on risks, tradeoffs, and checks rather than repeating the whole plan.

## Cross-linking

- Link back to the epic or task that owns the broader context.
- Add one or two forward links only when they reduce hunting.
- Avoid turning docs into a wiki. Cross-links should help navigation, not duplicate the archive.

## Good defaults

- `Status: Proposed` for new planning docs.
- `Base branch: feature/dev` unless the work explicitly tracks another branch.
- `Expected branch: codex/<short-name>` for implementation work.
- A short validation block that names the commands or checks the next agent should run.

## Before merging a docs change

- The file is easy to read from top to bottom without extra context.
- The doc name, headings, and body all use the same terminology.
- Links resolve to the right canonical planning doc.
- Any scope boundary that matters is stated explicitly.
