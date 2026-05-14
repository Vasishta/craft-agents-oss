# ARB-001: Navigation and Migration Roadmap

Status: Draft  
Related PRD: `docs/PRD-001-craft-agents-local-first-ai-workspace.md`  
Purpose: preserve the agreed product model, near/mid/long-term navigation, and implementation sequence.

## 1. Decision summary

Craft Agents should evolve from a session-first local agent shell into a local-first AI workspace. The migration should be incremental.

The agreed middle ground:

```text
Workspace remains the top-level local operating boundary.
Docs becomes the user-facing name for durable pages.
Files & Context replaces user-facing Sources language.
Search becomes first-class.
Outputs become first-class staging objects.
Project is added later as an organizing layer inside Workspace.
WorkItem eventually replaces session status/backlog semantics.
Notebook and Decision are added after the durable object model is stable.
```

## 2. Why this is not just a rename

The current app has a session-first architecture. Renaming Workspace to Project would hide the actual model and create confusion.

A workspace is an environment. A project is a work container.

```text
Workspace
  root paths
  local settings
  server/config boundary
  available files/context
  sessions
  skills
  automations
  local stores

Project
  curated work goal
  selected docs/chats/files/outputs/tasks/decisions
  optional relation to one or more local folders/repos
  project memory
```

A regular code app already has its own source directory, such as `src/`, `apps/`, `packages/`, `server/`, or `frontend/`. That source directory is not the same thing as the product-level `Files & Context` section.

The distinction:

```text
Code source directory = a folder inside a repo/app
Files & Context       = app surface for selecting files/folders/docs/chats/outputs as agent-readable context
Project               = curated work object that may reference one or more repos/folders/files/docs/chats
```

## 3. Naming decisions

### Keep

```text
Workspace
Session
Skills
Automations
Settings
```

### Use in UI now

```text
Docs            instead of Pages
Files & Context instead of Sources
Outputs         for saved assistant-generated material
Home            for workspace start surface
Search          as a first-class surface
```

### Add later

```text
Decisions
Notebooks
```

### In transition now

```text
Projects
Library
Work Queue
```

These can be exposed in navigation before their full object browsers are complete. Treat them as stable destinations for follow-up work, not proof that the internal model has become project-first.

### Avoid for now

```text
Project = Workspace
Notebook owns Docs
Source = anything the model reads
Every chat answer = Doc
Session status = long-term task model
```

## 4. Near-term sidebar

This matches the current codebase better and avoids exposing concepts before the data model exists.

```text
┌─────────────────────────────┐
│ Craft Agents                │
├─────────────────────────────┤
│ + New Chat                  │
│ Home                        │
│ Search                      │
│ Chats                       │
│ Docs                        │
│ Outputs                     │
│ Files & Context             │
│ Automations                 │
│ Skills                      │
│ Settings                    │
└─────────────────────────────┘
```

Notes:

- `Home` orients the user inside the active workspace.
- `Search` retrieves across chats/docs/outputs and later files/tasks/decisions.
- `Docs` is the durable document surface.
- `Outputs` is the review/promote staging surface.
- `Files & Context` is where concrete files and selected agent context live.

## 5. Near-term Workspace Home wireframe

```text
┌────────────────────────────────────────────────────────────────────┐
│ Workspace Home                                                     │
│ What should we work on?                                            │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Ask, create, research, edit, summarize, code...                 │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ Quick actions                                                      │
│ [New Chat] [New Doc] [Search] [Add Context] [View Outputs]          │
│                                                                    │
│ Recent                                                             │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐              │
│ │ Recent chats  │ │ Recent docs   │ │ Recent outputs│              │
│ │ ...           │ │ ...           │ │ ...           │              │
│ └───────────────┘ └───────────────┘ └───────────────┘              │
│                                                                    │
│ Available context                                                  │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ folders, imported files, repo context, selected docs            │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

## 6. Docs Home wireframe

```text
┌────────────────────────────────────────────────────────────────────┐
│ Docs                                                [New Doc]       │
│ Durable editable documents created from scratch or promoted output. │
│                                                                    │
│ Search/filter docs...                                              │
│                                                                    │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Doc title                                                       │ │
│ │ Preview line from markdown/content...                           │ │
│ │ Updated 2h ago · from chat/output/manual                         │ │
│ │ [Open] [Delete]                                                  │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ Another doc                                                      │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

## 7. Output lifecycle wireframe

```text
Assistant message
  [Save as Output]

Output detail
┌────────────────────────────────────────────────────────────────────┐
│ Output title                                                       │
│ Created from Chat: session title / message                         │
│                                                                    │
│ Markdown content                                                   │
│                                                                    │
│ Actions                                                            │
│ [Promote to Doc] [Create Task] [Record Decision] [Attach Project]   │
└────────────────────────────────────────────────────────────────────┘
```

Near term only needs `Save as Output` and `Promote to Doc`. The other actions are placeholders for the model direction.

## 8. Search surface wireframe

```text
┌────────────────────────────────────────────────────────────────────┐
│ Search                                                             │
│ Search this workspace across chats, docs, outputs, and context.     │
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │ query...                                                        │ │
│ └────────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ Docs                                                               │
│ - Doc result title · preview · open                                │
│                                                                    │
│ Outputs                                                            │
│ - Output title · preview · open/promote                            │
│                                                                    │
│ Chats                                                              │
│ - Session title · preview · open                                   │
│                                                                    │
│ Later                                                              │
│ - Files · Tasks · Decisions · Notebook entries                     │
└────────────────────────────────────────────────────────────────────┘
```

Search should be honest about scope. If it only searches active-workspace docs/chats/outputs, say that. Do not imply full filesystem semantic search until implemented.

## 9. Mid-term sidebar

Once Project, Library, Output, and WorkItem models are real enough, the sidebar can become calmer and more noun-based.

```text
┌─────────────────────────────┐
│ Craft Agents                │
├─────────────────────────────┤
│ + New                       │
│ Search                      │
│ Projects                    │
│ Library                     │
│ Work Queue                  │
│ Files & Context             │
│ Automations                 │
│ Skills                      │
│ Settings                    │
└─────────────────────────────┘
```

`Library` can contain:

```text
Library
  Docs
  Outputs
  Notebooks
  Decisions
  Saved prompts / snippets later
```

## 10. Project view wireframe

```text
┌────────────────────────────────────────────────────────────────────┐
│ Project: craft-agents-oss                                          │
│ Local-first AI workspace redesign                                  │
│                                                                    │
│ Tabs                                                               │
│ [Overview] [Chat] [Docs] [Files] [Context] [Outputs] [Tasks]        │
│                                                                    │
│ Overview                                                           │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐              │
│ │ Active tasks  │ │ Recent docs   │ │ Recent output │              │
│ └───────────────┘ └───────────────┘ └───────────────┘              │
│                                                                    │
│ Project memory                                                     │
│ - decisions                                                        │
│ - pinned context                                                   │
│ - open questions                                                   │
│ - recent agent runs                                                │
└────────────────────────────────────────────────────────────────────┘
```

Project should collect work. It should not replace the file tree.

## 11. Long-term shape

```text
Workspace
  Search
  Projects
    Project A
      Overview
      Chat
      Docs
      Files
      Context
      Outputs
      Tasks
      Decisions
      Automations
  Library
    Docs
    Outputs
    Notebooks
    Decisions
  Work Queue
  Files & Context
  Skills
  Automations
  Settings
```

The long-term experience should feel like a fluid surface where the user can move between:

```text
chatting -> coding -> researching -> drafting -> saving -> organizing -> searching -> reusing
```

without treating these as separate apps.

## 12. Migration sequence

Completed:

```text
1. Rename user-facing Pages -> Docs
2. Harden Docs persistence/autosave
3. Add Docs Home / Library seed
4. Add Search v0
5. Rename Sources -> Files & Context in UI
6. Add Workspace Home
7. Add Outputs v0
8. Output polish and provenance hardening (#8)
9. Search result model cleanup (#16)
10. Files & Context v0 clarification (#17)
11. WorkItem v0 model separate from session status (#18)
12. Project v0 model with optional links (#19)
13. Project Home and project-scoped filters (#20)
14. Decision v0 model (#26)
15. Notebook v0 model (#27)
16. Serialized local index mutation helper (#28)
```

Completed since the shell consolidation milestone:

```text
17. Workspace navigation IA consolidation (#35)
18. Library v0 durable-object surface (#30)
19. Work Queue v0 backed by WorkItems (#31)
20. Decision and Notebook UI surfaces plus editing completion (#29)
21. Workspace shell polish for Library, Work Queue, and Home (#38)
22. Panel-local chrome isolation and shared resource-hook consolidation groundwork (#39)
```

Recommended next tasks:

```text
23. Renderer performance and recompute hardening (#41)
24. Navigation and sidebar infrastructure hardening (#42)
25. Project linked-object navigation polish (#32)
26. Cross-object Search expansion (#33)
27. Explicit cross-object linking actions (#34)
28. Consolidate remaining durable entity UI scaffolds (#39)
```

Current-state rule: GitHub Issues on `Vasishta/craft-agents-oss` are the live execution tracker. This ARB captures the migration rationale and should be updated when issue execution materially changes the product posture.

## 13. Task 8 candidate: Output polish and provenance hardening

Goal: make Outputs reliable enough to serve as the staging object between chat and durable docs.

Definition of done:

```text
- Output creation captures stable provenance:
  - sourceSessionId
  - sourceMessageId if available
  - source route/context if available
  - createdAt/updatedAt
- Output detail clearly shows origin and available actions.
- Promote to Doc preserves provenance from Output and original chat/message.
- Delete behavior is safe and workspace-scoped.
- Search result previews for Outputs are consistent with Docs/Chats.
- Empty/no-active-workspace/error states are explicit.
- Tests cover unsafe IDs, workspace isolation, promote-to-doc provenance, and missing output route handling.
```

Non-goals:

```text
- Full WorkItem creation
- Full Decision creation
- Project linking
- Semantic embeddings
- Cross-workspace search
```

## 14. Task 9 candidate: Search result model cleanup

Goal: prevent Search from becoming a page-specific implementation blob as object types grow.

Definition of done:

```text
- Introduce a small shared SearchResult type for UI grouping.
- Keep object-specific loading/adapters separate from rendering.
- Results have stable fields:
  - id
  - type
  - title
  - preview
  - route
  - updatedAt/createdAt
  - provenance label when useful
- Search page renders groups generically.
- Existing Docs/Chats/Outputs behavior remains unchanged.
```

## 15. Task 10 candidate: Files & Context v0 clarification

Goal: make `Files & Context` understandable without rewriting source internals.

Definition of done:

```text
- Rename visible copy from source-centric language where safe.
- Add explanatory empty/header copy:
  Files are concrete things available to the workspace.
  Context is what the assistant is allowed to use for the current task.
- Show selected/available context separately if existing data allows.
- Avoid promising full project memory or semantic indexing unless implemented.
```

## 16. Architectural guardrails

1. Do not force all objects into Project before optional links exist.
2. Do not make Notebook a hard parent of Docs.
3. Do not overload Files & Context with task/status semantics.
4. Do not keep adding permanent top-level sidebar items forever; collapse into Library/Projects when models mature.
5. Preserve provenance for every promoted object.
6. Keep local-first persistence simple, inspectable, and recoverable.
7. Keep Search scope honest.
8. Prefer small object models and relationship indexes over deep ownership trees.

## 17. Principal-level review checklist for future PRs

For every PR in this migration, check:

```text
Product coherence:
- Does the change clarify or confuse the mental model?
- Is it exposing a future concept before the model exists?

Data model:
- Is the object first-class or just UI decoration?
- Are IDs validated and workspace-scoped?
- Is provenance preserved?

UX:
- Are empty/loading/error states honest?
- Does navigation remain calm?
- Are actions reversible or reviewable where needed?

Performance:
- Does the feature avoid eager reads on empty views?
- Are expensive operations debounced/bounded?

Migration safety:
- Does it preserve existing routes/storage?
- Does it avoid breaking session-first internals prematurely?

Tests:
- Route parsing
- Storage isolation
- Unsafe ID rejection
- Missing/corrupt index recovery where relevant
- IPC/channel mapping where relevant
```
