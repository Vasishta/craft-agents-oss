# WIREFRAMES-001: Craft Agents Workspace Surfaces

Status: Draft  
Related PRD: `docs/PRD-001-craft-agents-local-first-ai-workspace.md`  
Related ARB: `docs/ARB-001-navigation-and-migration-roadmap.md`

## 1. Purpose

This document captures rough markdown wireframes for the Craft Agents product direction and keeps the UI vocabulary consistent with the rest of the docs.

It is intentionally not a visual design spec. It should guide layout, hierarchy, and product vocabulary while the UI evolves from a session-first app into a local-first AI workspace.

Related docs:

- `docs/PRD-001-craft-agents-local-first-ai-workspace.md`
- `docs/ARB-001-navigation-and-migration-roadmap.md`
- `docs/planning/EPIC-001-durable-knowledge-workspace.md`

Use this document to answer:

```text
What should the main surfaces roughly look like?
What belongs in the left sidebar?
What should live inside a workspace, doc, output, project, library, or work queue?
How should the UI evolve without prematurely exposing incomplete concepts?
```

## 2. Wireframe principles

```text
1. Keep Workspace as the local operating boundary.
2. Use Docs as the visible name for durable Pages.
3. Use Files & Context instead of Sources in user-facing navigation.
4. Treat Outputs as reviewable/promotable generated material.
5. Treat Search as a first-class retrieval surface.
6. Keep Projects, Library, Work Queue, Notebooks, and Decisions as mid-term concepts unless the model exists.
7. Do not make the sidebar a dumping ground for every object type forever.
8. Prefer contextual second columns/tabs over too many top-level items.
```

## 3. Near-term app shell

This is the practical near-term shell while the app is still workspace/session-centric.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Craft Agents                                                                │
├───────────────────┬──────────────────────────────────────────────────────────┤
│ + New Chat        │ Workspace Home                                           │
│ Home              │                                                          │
│ Search            │ What should we work on?                                  │
│ Chats             │ ┌──────────────────────────────────────────────────────┐ │
│ Docs              │ │ Ask, create, research, edit, summarize, code...       │ │
│ Outputs           │ └──────────────────────────────────────────────────────┘ │
│ Files & Context   │                                                          │
│ Automations       │ Quick actions                                            │
│ Skills            │ [New Chat] [New Doc] [Search] [Add Context] [Outputs]    │
│ Settings          │                                                          │
│                   │ Recent work                                              │
│                   │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│                   │ │ Chats       │ │ Docs        │ │ Outputs     │          │
│                   │ └─────────────┘ └─────────────┘ └─────────────┘          │
└───────────────────┴──────────────────────────────────────────────────────────┘
```

Notes:

- This should not yet show `Projects` if the Project model does not exist.
- `Outputs` is allowed as a top-level item because it is a transitional staging surface.
- `Files & Context` replaces visible source-centric language but does not require source internals to be rewritten immediately.

## 4. Workspace Home

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Workspace Home                                                               │
│ Local-first AI workspace for conversations, docs, files, and outputs.         │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ What should we work on?                                                  │ │
│ │                                                                          │ │
│ │ Ask a question, draft a doc, inspect a repo, summarize notes, or plan.    │ │
│ │                                                                          │ │
│ │ [ prompt input......................................................... ] │ │
│ │                                                                          │ │
│ │ Context: [current workspace] [selected files] [selected docs]             │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Quick actions                                                                │
│ [New Chat] [New Doc] [Search] [Add Files/Context] [Review Outputs]           │
│                                                                              │
│ Recent                                                                        │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐        │
│ │ Recent chats       │ │ Recent docs        │ │ Recent outputs     │        │
│ │ - ...              │ │ - ...              │ │ - ...              │        │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘        │
│                                                                              │
│ Available context                                                            │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Folders, imported files, repo context, and selected workspace material.   │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

No-active-workspace state:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ No active workspace                                                          │
│ Select or create a workspace to start using chats, docs, outputs, and files.  │
│                                                                              │
│ [Open Workspace] [Create Workspace]                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 5. Chat surface

The chat surface remains the command surface. The important change is that generated material can be saved/promoted.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Chat: Untitled                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ User                                                                         │
│ Please summarize this design into a durable plan.                            │
│                                                                              │
│ Assistant                                                                    │
│ Here is a structured plan...                                                 │
│                                                                              │
│ [Save as Output] [Add to Doc] [Copy] [Create Task later]                     │
│                                                                              │
│ ──────────────────────────────────────────────────────────────────────────── │
│                                                                              │
│ [ message input.......................................................... ]  │
│ Context: [doc] [repo] [file] [output]                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

Guidance:

```text
Save as Output = preserve a generated artifact for review.
Add to Doc     = append/insert into an existing durable document.
Promote to Doc = convert reviewed output into a standalone doc.
```

## 6. Docs Home

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Docs                                                        [New Doc]         │
│ Durable editable documents created manually or promoted from outputs/chats.   │
│                                                                              │
│ [Search docs..............................................................]  │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Product direction summary                                                │ │
│ │ Preview from markdown content...                                          │ │
│ │ Updated 2h ago · from output · source chat available                      │ │
│ │ [Open] [Delete]                                                           │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Notes from Codex layout review                                            │ │
│ │ Preview from markdown content...                                          │ │
│ │ Updated yesterday · manually created                                      │ │
│ │ [Open] [Delete]                                                           │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Empty state:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ No docs yet                                                                  │
│ Create a blank doc or promote useful assistant output into a durable doc.     │
│                                                                              │
│ [New Doc] [Go to Outputs]                                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 7. Doc Editor

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Doc Editor                                      Saved · Updated just now      │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ Document outline              │ Product direction summary                    │
│ - Title                       │                                              │
│ - Current reality             │ Markdown/rich editing surface                │
│ - Near-term shape             │                                              │
│ - Open questions              │ Select text -> explain / rewrite / tone      │
│                               │                                              │
│ Metadata                      │                                              │
│ Source: output/chat/manual    │                                              │
│ Workspace: active workspace   │                                              │
│ Linked outputs: ...           │                                              │
├───────────────────────────────┴──────────────────────────────────────────────┤
│ Assistant side panel                                                         │
│ [Rewrite selected] [Explain] [Change tone] [Extract tasks] [Find related]     │
└──────────────────────────────────────────────────────────────────────────────┘
```

Near-term note:

```text
The editor may be markdown-first initially. Rich block editing can arrive later.
The important product behavior is durable storage, provenance, search, and safe editing.
```

## 8. Outputs List

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Outputs                                                                      │
│ Reviewable assistant-generated material. Promote good outputs into Docs.      │
│                                                                              │
│ [Search outputs...........................................................]  │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Output title                                                             │ │
│ │ Preview of generated content...                                           │ │
│ │ Created 15m ago · from chat: Workspace navigation review                  │ │
│ │ [Open] [Promote to Doc] [Delete]                                          │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Another output                                                           │ │
│ │ Preview...                                                               │ │
│ │ Created yesterday · from assistant response                               │ │
│ │ [Open] [Promote to Doc] [Delete]                                          │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 9. Output Detail

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Output title                                                  [Promote Doc]   │
│ Created from Chat: Workspace navigation review                              │
│ Source message: available / unavailable                                     │
│ Created: 2026-04-30 · Updated: 2026-04-30                                   │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Markdown content                                                         │ │
│ │                                                                          │ │
│ │ This is the generated output exactly as saved from chat.                  │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Actions                                                                      │
│ [Promote to Doc] [Copy] [Delete]                                             │
│                                                                              │
│ Later                                                                        │
│ [Create Task] [Record Decision] [Attach to Project]                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 10. Search

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Search                                                                       │
│ Search this workspace across chats, docs, outputs, and available context.     │
│                                                                              │
│ [ query................................................................... ] │
│                                                                              │
│ Docs                                                                         │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Product direction summary · updated 2h ago                                │ │
│ │ Matching preview line...                                                  │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Outputs                                                                      │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Saved output title · created 15m ago                                      │ │
│ │ Matching preview line...                                                  │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Chats                                                                        │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Chat title · last active today                                            │ │
│ │ Matching preview line...                                                  │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Scope copy should stay honest:

```text
Near term: active workspace chats, docs, and outputs.
Later: files, tasks, decisions, notebooks, project memory, semantic index.
```

## 11. Files & Context

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Files & Context                                                              │
│ Files are concrete things available to this workspace. Context is what the    │
│ assistant is allowed to use for the current task.                             │
│                                                                              │
│ Available files and folders                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ /repo/craft-agents-oss                                                    │ │
│ │ /notes/research                                                           │ │
│ │ imported-design-doc.md                                                    │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Selected context                                                             │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ [x] current repo                                                          │ │
│ │ [x] PRD-001                                                               │ │
│ │ [ ] archived chats                                                        │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ [Add folder] [Add file] [Manage selection]                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Important distinction:

```text
A code app's src/ directory is a file tree inside a repository.
Files & Context is the Craft Agents control surface for what the assistant can see/use.
```

## 12. Mid-term app shell

After Project, Library, Output, and WorkItem are stable enough, the top-level navigation can become calmer.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Craft Agents                                                                │
├───────────────────┬──────────────────────────────────────────────────────────┤
│ + New             │ Main content                                             │
│ Search            │                                                          │
│ Projects          │                                                          │
│ Library           │                                                          │
│ Work Queue        │                                                          │
│ Files & Context   │                                                          │
│ Automations       │                                                          │
│ Skills            │                                                          │
│ Settings          │                                                          │
└───────────────────┴──────────────────────────────────────────────────────────┘
```

Library contains durable things. Work Queue contains actionable things. Projects collect related things.

## 13. Projects List

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Projects                                                     [New Project]    │
│ Curated work containers inside this workspace.                               │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ craft-agents-oss product redesign                                         │ │
│ │ Local-first AI workspace with docs, outputs, context, and project memory.  │ │
│ │ 12 docs · 8 chats · 4 outputs · 6 tasks                                    │ │
│ │ [Open]                                                                    │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Resume modernization                                                      │ │
│ │ Notes, drafts, screenshots, versions, and feedback.                       │ │
│ │ 5 docs · 3 chats · 2 outputs · 4 tasks                                     │ │
│ │ [Open]                                                                    │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 14. Project Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Project: craft-agents-oss product redesign                                  │
│ Local-first AI workspace evolution                                           │
│                                                                              │
│ Tabs                                                                         │
│ [Overview] [Chat] [Docs] [Files] [Context] [Outputs] [Tasks] [Decisions]     │
│                                                                              │
│ Overview                                                                     │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐        │
│ │ Active tasks       │ │ Recent docs        │ │ Recent outputs     │        │
│ │ - Task 8           │ │ - PRD-001          │ │ - Output plan      │        │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘        │
│                                                                              │
│ Project memory                                                               │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Decisions: Workspace != Project; Outputs are staging objects.             │ │
│ │ Open questions: When to collapse Docs/Outputs into Library?               │ │
│ │ Pinned context: PRD-001, ARB-001, WIREFRAMES-001                          │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 15. Library

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Library                                                                      │
│ Durable saved material across this workspace.                                │
│                                                                              │
│ [Docs] [Outputs] [Notebooks] [Decisions]                                     │
│                                                                              │
│ Docs                                                                         │
│ - Product direction summary                                                  │
│ - Navigation migration roadmap                                               │
│                                                                              │
│ Outputs                                                                      │
│ - Saved review response                                                      │
│ - Draft implementation plan                                                  │
│                                                                              │
│ Notebooks later                                                              │
│ - AI workspace design notebook                                               │
│                                                                              │
│ Decisions later                                                              │
│ - Workspace remains environment boundary                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

Guidance:

```text
Library is a view over durable objects.
It should not become a hard parent that owns every object.
```

## 16. Work Queue

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Work Queue                                                                   │
│ Tasks across chats, docs, outputs, files, and projects.                       │
│                                                                              │
│ [Backlog] [Todo] [In Progress] [Needs Review] [Done]                         │
│                                                                              │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐        │
│ │ Todo               │ │ In Progress        │ │ Needs Review       │        │
│ │ - Task 8           │ │ - PR #5 review     │ │ - Output polish    │        │
│ │ - Search cleanup   │ │                    │ │                    │        │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘        │
└──────────────────────────────────────────────────────────────────────────────┘
```

Important migration point:

```text
Current session status is not the final task model.
WorkItem should eventually own task/backlog/review status.
A WorkItem can link to a session, doc, output, file, project, or decision.
```

## 17. Notebook

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Notebook: AI Workspace Design                                                │
│ Collection/view over docs, outputs, chats, files, and notes.                 │
│                                                                              │
│ Sections                                                                     │
│ 1. Product principles                                                        │
│ 2. Navigation                                                                │
│ 3. Wireframes                                                                │
│ 4. Open questions                                                            │
│                                                                              │
│ Items                                                                        │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ Doc: PRD-001                                                              │ │
│ │ Output: Codex layout synthesis                                            │ │
│ │ Chat: Workspace/project naming discussion                                 │ │
│ │ File: app shell screenshot                                                │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

Notebook should not hard-own docs. A doc may appear in multiple notebooks later through relationship records.

## 18. Decision Record

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Decision: Keep Workspace separate from Project                               │
│ Status: Accepted                                                             │
│                                                                              │
│ Context                                                                      │
│ The current codebase uses Workspace as a local operating boundary.            │
│                                                                              │
│ Decision                                                                     │
│ Add Project as an optional organizing object inside Workspace.                │
│                                                                              │
│ Consequences                                                                 │
│ - Avoids risky rename/migration.                                             │
│ - Lets Project become curated project memory over time.                      │
│ - Keeps existing session/source/workspace internals stable.                  │
│                                                                              │
│ Links                                                                        │
│ - PRD-001                                                                    │
│ - ARB-001                                                                    │
│ - related output/chat                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 19. End-state mental model

```text
Workspace
  Home
  Search
  Projects
    Project
      Overview
      Chat
      Docs
      Files
      Context
      Outputs
      Tasks
      Decisions
  Library
    Docs
    Outputs
    Notebooks
    Decisions
  Work Queue
  Files & Context
  Automations
  Skills
  Settings
```

The product should feel like one continuous loop:

```text
chat -> research -> code -> generate -> save output -> promote doc -> attach context -> create task -> record decision -> search/reuse
```

## 20. What not to overbuild yet

```text
- Do not implement full Notion-style block editing before Docs persistence is solid.
- Do not expose Projects before optional project links exist.
- Do not create Notebooks as hard parent folders for Docs.
- Do not claim semantic/full-file search until indexing exists.
- Do not keep adding top-level sidebar items after Library and Projects are mature.
- Do not let Work Queue depend only on Session status long term.
```
