# Craft Agents Documentation Map

This folder captures product direction, architecture decisions, wireframes, and work planning for the Craft Agents local-first AI workspace.

The intent is to preserve the reasoning that would otherwise be trapped in chat windows, while keeping implementation PRs small and incremental.

## Current direction

Craft Agents is evolving from a session-first local agent shell into a local-first AI workspace where conversations, docs, files, context, generated outputs, tasks, and eventually project memory can reinforce each other.

The important mental model is:

```text
Files       = concrete things that exist on disk or are imported into the workspace
Context     = selected things the agent is allowed to use for a task
Workbench   = the mode/surface where work happens: chat, docs, code, research, review
Library     = durable saved material: docs, outputs, decisions, notebooks later
Search      = retrieval layer across saved and available material
Workspace   = local operating boundary
Project     = optional curated work container inside a workspace, added later
```

## Document types

```text
PRD-*         Product requirements / product direction
ARB-*         Architecture reasoning / decision and migration rationale
WIREFRAMES-*  Markdown UI wireframes and navigation sketches
EPIC-*        Large product outcome spanning multiple stories/tasks
STORY-*       User-observable slice of value, usually inside an epic
TASK-*        Concrete implementation task with definition of done
```

## Existing documents

```text
docs/PRD-001-craft-agents-local-first-ai-workspace.md
  Product ambition, vocabulary, current reality, target shape, success criteria.

docs/ARB-001-navigation-and-migration-roadmap.md
  Navigation decisions, migration sequence, near/mid/long-term hierarchy.

docs/WIREFRAMES-001-craft-agents-workspace-surfaces.md
  Markdown wireframes for workspace home, docs, outputs, search, projects, library, work queue.

docs/planning/EPIC-001-durable-knowledge-workspace.md
  First major product epic that translates the PRD/ARB into stories and milestone tasks.

docs/planning/CURRENT-STATE.md
  Short execution snapshot that reconciles durable docs with the live GitHub issue queue.

docs/planning/TASK-008-output-polish-and-provenance-hardening.md
  Historical task handoff for Output polish/provenance; GitHub issue #8 is the execution source.
```

## Folder policy

Do not create deep per-epic folders yet. The docs volume is still small, and too much hierarchy will make the project harder to browse on mobile.

Use this shape for now:

```text
docs/
  PRD-001-...
  ARB-001-...
  WIREFRAMES-001-...
  planning/
    README.md
    EPIC-001-...
    STORY-001-...     # add when a story needs its own focused document
    TASK-008-...
```

Later, if an epic grows beyond roughly 5-7 planning files, split it into a folder:

```text
docs/planning/EPIC-001-durable-knowledge-workspace/
  README.md
  STORY-001-...
  STORY-002-...
  TASK-008-...
```

Until then, flat files with strong IDs are easier to search, review, and link from PRs.

## Grooming rule

Each planning document should answer three questions:

```text
1. Why does this matter to the product model?
2. What is explicitly in scope and out of scope?
3. How will we know it is done?
```

For implementation tasks, also include:

```text
- branch/base assumptions
- files or areas to inspect
- step-by-step implementation plan
- tests/validation commands
- principal-grade review checklist
```

## Relationship to GitHub Issues/Projects

These markdown docs are the durable product memory. GitHub Issues are the live execution tracker for concrete tasks.

Do not duplicate every tiny issue as a markdown file. Write markdown for durable reasoning, epic/story/task definitions, and complex implementation handoffs that need to survive context switches.

When a GitHub issue and a markdown planning document disagree, treat the issue as the fresher execution state and update the markdown docs with a short reconciliation note instead of rewriting the north-star product model.
