# PRD-001: Craft Agents as a Local-First AI Workspace

Status: Draft  
Branch context: `feature/dev` plus early Docs, Search, Workspace Home, and Outputs work  
Audience: product/design/implementation agents working on Craft Agents OSS  

## 1. One-line ambition

Craft Agents should become a local-first AI workspace where conversations, docs, files, context, generated outputs, tasks, and decisions can become durable project knowledge under one assistant.

Later, when Projects are fully first-class:

> Craft Agents is a local-first AI project workspace where every project has chats, docs, files, context, outputs, tasks, and decisions under one assistant.

## 2. Why this exists

The assistant should not be treated as only a chat app, only a coding agent, or only a document editor. A capable assistant is agnostic: it can reason, code, author documents, research, summarize, extract decisions, generate tasks, and organize knowledge.

The product problem is that useful work currently appears in scattered places:

- chats contain reasoning, plans, and answers;
- code work produces diffs, logs, tasks, and decisions;
- research produces notes, citations, sources, and summaries;
- document work produces pages, drafts, edits, tone rewrites, and final artifacts;
- project work needs memory, backlog, files, outputs, automations, and follow-up tasks.

The app should make the transition from transient chat to durable workspace material feel natural.

## 3. Core product insight

Chat is the command surface, not the storage model.

The assistant may start in chat, but important things should be promotable into durable objects:

```text
Assistant answer -> Output -> Doc / Task / Decision / Project memory
Research note    -> Doc -> Notebook / Project
Code change      -> Diff / Output -> Task / Decision / Project memory
Uploaded file    -> File -> Context -> Search / Chat / Project
```

This means the system should distinguish:

```text
Files       = concrete things that exist on disk or were imported
Context     = selected things the agent is allowed to use right now
Workbench   = mode where work happens
Library     = durable saved material
Search      = retrieval layer across everything
```

This distinction avoids overloading the word "source" and prevents code files from swallowing the docs/product model.

## 4. Current reality

The current codebase is still session-first, not project-first.

The current mental model is closer to:

```text
Workspace contains sessions, sources, skills, automations, statuses, labels, views, and docs/pages.
```

The desired direction is:

```text
Workspace = local operating boundary / environment
Project   = curated work object inside a workspace
Session   = chat history and provenance
Doc       = durable user-facing document, backed by PageDocument internals for now
Output    = saved assistant result that can be reviewed and promoted
WorkItem  = generic task/backlog item, separate from session status
Notebook  = collection/view over docs and references, not a hard parent folder
Search    = cross-object retrieval layer
```

Important implementation constraint: do not naively rename `Workspace` to `Project`. Workspace currently represents a local environment/root-path/config boundary. Project should be added as a curated organizing object inside that environment.

## 5. Product vocabulary

### Workspace

The local operating boundary. It may own root folders, local config, server settings, sessions, files/context, skills, automations, and local storage.

### Project

A curated work container inside a workspace. A project may link to chats, docs, files, outputs, tasks, decisions, notebooks, and automations. It should not have to map one-to-one to an app source directory.

### Chat / Session

A conversation and execution trace. Sessions remain important as provenance and history, but should not be the only primary organizing unit.

### Doc

The user-facing name for durable editable pages. Internally this can continue using `PageDocument`, `pages/*`, and `pageCanvas` until the storage model matures.

### Notebook

A collection or view over docs, outputs, files, context, and notes. It should not strictly own pages. A page may eventually appear in multiple notebooks through a relationship/index model.

### Files

Concrete files: repo files, imported PDFs, DOCX/PPTX, markdown files created outside the app, images, datasets, or any file-system object the app can inspect.

### Context

The selected subset of files, docs, chats, outputs, or project memory that the assistant is allowed to use for a task.

### Output

A saved assistant-generated result. Outputs are not automatically docs. They are reviewable/promotable objects with lifecycle actions such as promote to Doc, attach to Project, create Task, or record Decision.

### WorkItem

A generic task/backlog/kanban item. It should eventually replace session-level status as the primary task tracking model. A WorkItem can link to a session, doc, output, file, code diff, decision, or project.

### Decision

A lightweight durable record of an architectural/product/design decision, usually created from a chat or output. Decisions should be searchable and project-linkable.

## 6. Near-term target

Near term should reduce naming confusion without forcing a risky architecture migration.

```text
Keep Workspace as the top-level local environment.
Keep Session as provenance/history.
Rename user-facing Pages to Docs.
Replace user-facing Sources with Files & Context.
Add Library surfaces gradually, starting with Docs.
Add Search as a first-class surface across chats/docs/outputs/files.
Add Outputs as first-class saved assistant results.
```

Near-term sidebar can be pragmatic:

```text
Home
Search
Chats
Docs
Outputs
Files & Context
Automations
Skills
Settings
```

This is not the final ideal information architecture. It is the safest bridge from the current codebase.

## 7. Mid-term target

Mid term should introduce project organization without breaking existing workspace/session flows.

```text
Workspace
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

Projects should initially be optional links, not mandatory parents:

```text
Session.projectId?
Doc.projectIds? or project relation index
Output.projectId?
FileContext.projectId?
WorkItem.projectId?
Decision.projectId?
```

The important shift is that the UI becomes less session-first, while the internals migrate safely.

## 8. Long-term target

Long term, the product should feel like a coherent local AI operating surface:

```text
Global command surface: chat / ask / create / run
Durable knowledge: docs / notebooks / decisions / outputs
Execution: code / tools / automations / tasks
Context: files / repos / uploads / selected memory
Organization: workspace / projects / library / search
```

The assistant should be able to:

- write and edit rich docs;
- explain or rewrite selected text;
- save high-value chat answers as outputs;
- promote outputs into docs, tasks, and decisions;
- search across everything locally;
- operate on code with permissions and reviewable diffs;
- organize research into notebooks and projects;
- preserve provenance from every generated artifact back to chat/session/context.

## 9. Non-goals for the next few tasks

Do not immediately:

- rename internal `PageDocument` to `DocDocument`;
- rename all `pages/*` folders and routes internally;
- make Project mandatory for every object;
- delete session status before WorkItem exists;
- build a full Notion clone;
- build a full IDE inside the shell;
- make Notebooks own Docs as hard parents;
- turn every assistant message into a saved document automatically.

## 10. Guiding principles

1. Chat starts work; durable objects preserve work.
2. Files are concrete; context is selected.
3. Workspace is the local environment; Project is the curated work container.
4. Sessions are provenance, not the whole product model.
5. Outputs are reviewable staging objects, not final docs by default.
6. Search must become a core surface, not a sidebar filter.
7. Docs should be rich and editable, but backed by simple local-first persistence first.
8. Every promoted artifact should preserve provenance.
9. The UI should avoid exposing every future concept before the model exists.
10. Prefer incremental migrations that align with the current repo reality.

## 11. Success criteria

The product direction is working when a user can naturally move through this loop:

```text
Ask in chat
  -> get useful answer
  -> save as Output
  -> promote to Doc or Task or Decision
  -> attach to Project or Notebook
  -> find it later through Search
  -> reuse it as Context
  -> continue work in chat or workbench
```

For code work:

```text
Ask agent to inspect repo
  -> agent reads selected context
  -> proposes plan/tasks
  -> edits code with reviewable diffs
  -> saves summary/output
  -> records decisions and follow-ups
  -> keeps everything linked to the project
```

For knowledge work:

```text
Research topic
  -> collect files/context
  -> create notes/docs
  -> save outputs
  -> organize into notebook/project
  -> search and reuse later
```

## 12. Implementation posture

This document is the product north star. It should not be interpreted as a request to force a project-first rewrite immediately.

The safe posture is:

```text
First: make current session-first app feel less session-only.
Then: add durable docs, outputs, search, and home surfaces.
Then: add optional project links.
Then: add WorkItems and Decisions.
Then: make Project and Library first-class navigation.
```
