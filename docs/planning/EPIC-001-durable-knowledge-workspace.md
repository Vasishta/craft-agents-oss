# EPIC-001: Durable Knowledge Workspace

Status: Proposed  
Related PRD: `docs/PRD-001-craft-agents-local-first-ai-workspace.md`  
Related ARB: `docs/ARB-001-navigation-and-migration-roadmap.md`  
Related wireframes: `docs/WIREFRAMES-001-craft-agents-workspace-surfaces.md`

## 1. Product outcome

Craft Agents should let useful work escape the chat transcript.

When the assistant produces a plan, analysis, code review, research summary, implementation checklist, or design decision, the user should be able to save it as a durable object, find it later, promote it into a doc, attach it to context, and eventually connect it to tasks, projects, notebooks, and decisions.

This epic moves the app from:

```text
session-first chat history
```

toward:

```text
workspace memory made of chats, docs, outputs, files/context, tasks, and decisions
```

without pretending the full project-first model already exists.

## 2. Why this epic matters

The app is expected to support two major modes at the same time:

```text
1. AI command surface
   - chat
   - coding help
   - repo/file inspection
   - tool/MCP/skill execution
   - task execution and review

2. Knowledge/document surface
   - durable docs
   - markdown/live-rendered pages
   - rich editing later
   - selected-text assistant actions
   - notebooks and project memory later
```

The bridge between those modes is durable knowledge capture.

If every answer remains only in chat, the product becomes another chat app. If every answer automatically becomes a doc, the product becomes noisy and cluttered. The middle ground is `Output`: a reviewable, promotable staging object.

## 3. Current repo reality

The app is still mostly session/workspace-centric.

```text
Workspace = local operating boundary
Session   = current primary unit of activity/history
Docs      = user-facing name for durable PageDocument storage
Outputs   = newly introduced staging object
Search    = early retrieval surface across workspace objects
```

This epic should respect that reality. Do not jump straight to a project-first rewrite.

## 4. Scope

In scope:

```text
- Durable Docs surface
- Reviewable Outputs surface
- Save assistant response as Output
- Promote Output to Doc
- Workspace Home as the orientation surface
- Search across Chats, Docs, and Outputs
- Honest Files & Context naming/copy
- Provenance preservation from chat -> output -> doc
- Planning toward WorkItems, Projects, Decisions, and Notebooks
```

Out of scope for this epic's near-term phase:

```text
- Full Notion/Loop-grade block editor
- Full semantic/vector search
- Full project-first navigation
- Multi-notebook membership model
- Full task engine or kanban replacement
- Background automation scheduler rewrite
- Replacing Workspace with Project
```

## 5. User stories

### STORY-001: Capture useful assistant output

As a user, I can save a valuable assistant response as an Output so that it does not disappear inside chat history.

Acceptance criteria:

```text
- Assistant messages expose a save action.
- Saved outputs are workspace-scoped.
- Outputs preserve content and creation metadata.
- Output list/detail surfaces are available from navigation.
- Empty, missing, and no-active-workspace states are clear.
```

Related tasks:

```text
TASK-007 Outputs v0              # implemented in PR #5
TASK-008 Output polish/provenance # next hardening task
```

### STORY-002: Promote reviewed output into durable docs

As a user, I can turn a reviewed output into a Doc when I decide it should become durable authored material.

Acceptance criteria:

```text
- Output detail has Promote to Doc.
- Promotion preserves original output and source chat/message provenance where available.
- The new doc can be opened, edited, searched, and listed under Docs.
```

Related tasks:

```text
TASK-008 Output polish and provenance hardening
```

### STORY-003: Find previous work

As a user, I can search across chats, docs, and outputs inside the active workspace.

Acceptance criteria:

```text
- Search is first-class in the sidebar.
- Results are grouped by object type.
- Search scope copy is honest.
- Expensive reads are debounced/bounded.
- Result rendering is generic enough to add new object types later.
```

Related tasks:

```text
TASK-004 Search v0                       # implemented
TASK-004A Search v0 polish               # implemented
TASK-009 Search result model cleanup     # candidate next
```

### STORY-004: Understand files versus context

As a user, I can distinguish between files that exist and context the assistant is allowed to use.

Acceptance criteria:

```text
- The UI says Files & Context instead of Sources where user-facing.
- Header/empty copy explains the distinction.
- The app does not imply full semantic indexing or project memory before implemented.
```

Related tasks:

```text
TASK-005 Sources -> Files & Context visible rename # implemented
TASK-010 Files & Context v0 clarification          # candidate next
```

### STORY-005: Track work independent of chat sessions

As a user, I can eventually manage tasks/backlog/review items across chats, docs, outputs, files, and projects.

Acceptance criteria:

```text
- WorkItem becomes a first-class object.
- Session status is no longer the long-term task model.
- WorkItems can link to sessions, docs, outputs, files, decisions, or projects.
```

Related tasks:

```text
TASK-011 WorkItem v0 model separate from session status
```

### STORY-006: Organize related work into projects later

As a user, I can collect related chats, docs, outputs, files, tasks, and decisions under a project without confusing Project with Workspace.

Acceptance criteria:

```text
- Project is optional and lives inside Workspace.
- Existing workspace/session storage remains compatible.
- Objects can be linked to projects without requiring immediate migration.
```

Related tasks:

```text
TASK-012 Project v0 model with optional links
TASK-013 Project Home and project-scoped filters
```

## 6. Milestone sequence

Completed:

```text
1. Rename Pages -> Docs in visible UI
2. Harden Docs persistence/autosave
3. Add Docs Home / Library seed
4. Add Search v0
5. Rename Sources -> Files & Context in visible UI
6. Add Workspace Home
7. Add Outputs v0
8. Output polish and provenance hardening (#8)
9. Search result model cleanup (#16)
10. Files & Context clarification (#17)
11. WorkItem v0 model separate from session status (#18)
12. Project v0 model with optional links (#19)
13. Project Home and project filters (#20)
14. Decision v0 model (#26)
15. Notebook v0 model (#27)
16. Serialized local index mutation helper (#28)
```

Completed since the original recommendation:

```text
17. Decision and Notebook UI surfaces (#29)
18. Workspace navigation IA consolidation (#35)
19. Library v0 durable-object surface (#30)
20. Work Queue v0 backed by WorkItems (#31)
21. Workspace shell polish for Library, Work Queue, and Home (#38)
22. Decision and Notebook editing completion plus shell/i18n polish follow-through (#29)
```

Recommended next:

```text
23. Renderer performance and recompute hardening (#41)
24. Navigation and sidebar infrastructure hardening (#42)
25. Project linked-object navigation polish (#32)
26. Cross-object Search expansion (#33)
27. Explicit cross-object linking actions (#34)
28. Consolidate remaining durable entity UI scaffolds (#39)
```

Note: this epic is durable product memory. GitHub Issues on `Vasishta/craft-agents-oss` are the live execution tracker and may be ahead of older prose in this file.

## 7. Success criteria

Near-term success:

```text
- User can chat, save useful output, find it, promote it to a doc, and continue editing.
- Navigation feels coherent even though the app remains workspace/session-centric internally.
- Docs, Outputs, Search, and Files & Context use honest language.
- All durable objects are workspace-scoped and safe against unsafe IDs/path traversal.
```

Mid-term success:

```text
- Work Queue is backed by WorkItem rather than session status.
- Library becomes a calm durable-object view over Docs, Outputs, Decisions, and Notebooks.
- Projects become optional work containers with linked objects and scoped filters.
```

Long-term success:

```text
- The app feels like one fluid workspace for coding, research, notes, docs, generated artifacts, tasks, and project memory.
- Chat remains the command surface, but not the only place where work lives.
```

## 8. Risks

```text
Risk: Sidebar becomes too cluttered.
Mitigation: Keep near-term nav honest, then collapse durable objects into Library once models mature.

Risk: Project is introduced too early and duplicates Workspace.
Mitigation: Keep Project optional and relationship-based.

Risk: Outputs become another junk drawer.
Mitigation: Preserve provenance, provide promote/delete flows, and later support attach-to-project/create-task/record-decision actions.

Risk: Search promises more than it does.
Mitigation: Keep scope copy explicit until indexing exists.

Risk: Docs become over-engineered before storage/editing is stable.
Mitigation: Stay markdown-first, add richer block editing later.
```

## 9. Principal-grade review standard

Every PR under this epic should be reviewed for:

```text
Product coherence:
- Does this make the mental model clearer?
- Is the feature named according to the agreed vocabulary?

Architecture:
- Is the object first-class where needed?
- Is workspace scoping enforced?
- Are route/storage/IPC boundaries explicit?

Provenance:
- Can the user understand where this object came from?
- Is chat -> output -> doc lineage preserved where available?

UX:
- Are empty/loading/error states explicit?
- Are actions reviewable and reversible where reasonable?

Performance:
- Are expensive reads bounded/debounced/lazy?

Migration safety:
- Does the PR avoid breaking session-first internals prematurely?
- Does it keep future Project/Library/WorkItem/Notebook concepts possible?
```
