# TASK-008: Output Polish and Provenance Hardening

Status: Proposed  
Base branch: `feature/dev` after PR #5 is merged  
Expected branch: `codex/output-polish-provenance`  
Related epic: `docs/planning/EPIC-001-durable-knowledge-workspace.md`  
Depends on: Outputs v0 from PR #5

## 1. Goal

Make Outputs feel like a trustworthy review/promote staging layer rather than just another saved text list.

After this task, a user should clearly understand:

```text
- what an Output is;
- where it came from;
- whether it is linked to a chat/session/message;
- what happens when it is promoted to a Doc;
- how to recover when the source chat/message is missing;
- how Outputs appear consistently in Home, Search, list/detail, and promotion flows.
```

## 2. Why now

Outputs v0 creates the model and basic surfaces. The next risk is product/architecture drift:

```text
- Outputs might look like duplicate Docs.
- Promotion might lose lineage.
- Search/Home might render Outputs differently from Docs/Chats.
- Missing source sessions/messages might produce broken UI.
- Future Project/WorkItem/Decision links may be harder if metadata is weak now.
```

This is the right time to harden semantics before building WorkItems or Projects on top.

## 3. Scope

In scope:

```text
- Review Output model fields and storage behavior.
- Ensure workspace scoping for all Output RPC operations.
- Confirm unsafe IDs cannot escape the output storage directory.
- Improve Output list/detail copy and states.
- Preserve source session/message metadata from assistant response save.
- Preserve source output metadata when promoting Output -> Doc.
- Show clear provenance hints in Outputs list/detail, Docs list/detail if available, Home, and Search.
- Add or tighten tests for storage, routes, IPC, and promotion behavior.
```

Out of scope:

```text
- Full Project linking.
- Full WorkItem/task creation from Output.
- Full Decision record object.
- Notebook membership.
- Semantic/vector search.
- Rich block editor changes.
```

## 4. Files/areas to inspect

Start by inspecting the PR #5 implementation and current `feature/dev` after merge.

Likely areas:

```text
packages/shared/src/outputs/*
packages/shared/src/pages/*
packages/shared/src/protocol/routing.ts
apps/electron/src/shared/routes.ts
apps/electron/src/shared/route-parser.ts
apps/electron/src/shared/ipc-channels.ts
apps/electron/src/main/*outputs* or storage registration code
apps/electron/src/preload/*
apps/electron/src/renderer/pages/Outputs*.tsx
apps/electron/src/renderer/pages/SearchPage.tsx
apps/electron/src/renderer/pages/WorkspaceHome*.tsx
apps/electron/src/renderer/pages/PageCanvas.tsx
apps/electron/src/renderer/components/app-shell/*
apps/electron/src/renderer/components/chat/* assistant message actions
```

Use actual repo search rather than assuming exact filenames.

## 5. Product rules

Use these rules to avoid ambiguity:

```text
Output
  A saved assistant-generated artifact for review.
  It is not automatically a Doc.
  It should preserve source chat/session/message metadata when available.

Doc
  A durable editable document.
  It may be manually created, captured from chat, or promoted from Output.

Promote to Doc
  Creates a Doc from Output content.
  Does not delete the Output unless a separate explicit action is later added.
  Preserves lineage so the Doc can say it came from an Output.

Source missing
  The Output/Doc should still open.
  UI should say source chat/message is unavailable, not crash or show broken links.
```

## 6. Implementation plan

### Step 1: Audit current Output model

Check whether the model has enough metadata:

```text
id
workspaceId
title
content/markdown
createdAt
updatedAt
sourceSessionId?
sourceMessageId?
sourceRoute?
sourceKind?
promotedPageId? / promotedDocId?   # only if already present or clearly useful
```

Do not add fields only because they sound nice. Add fields only if they support provenance, promotion, or future links.

### Step 2: Harden storage and workspace boundaries

Verify behavior equivalent to Docs hardening:

```text
- output IDs are validated;
- file paths are contained in the workspace output directory;
- writes are atomic or at least safe against partial corruption if the existing storage pattern supports it;
- index repair/rebuild behavior exists or is intentionally deferred with a test/comment;
- update/delete/read operations are scoped by active workspace/workspaceId;
- missing/corrupt index behavior is tested if Outputs use an index.
```

### Step 3: Save from assistant response with provenance

When saving an assistant response:

```text
- pass source session ID if available;
- pass source message ID if available;
- create a useful default title;
- do not save empty/whitespace-only content;
- show success/failure toast/copy;
- avoid duplicate accidental saves if button is clicked repeatedly quickly, if reasonable.
```

### Step 4: Promotion behavior

When promoting Output -> Doc:

```text
- create a Doc with content from the Output;
- title should be derived safely from Output title/content;
- Doc metadata should preserve sourceOutputId if the PageDocument model supports output links;
- sourceSessionId/sourceMessageId should be carried over if supported;
- after promotion, user should be able to open the new Doc;
- repeated promotion should either be allowed clearly or handled intentionally.
```

Document the chosen repeated-promotion behavior in code/tests.

### Step 5: UI polish

Outputs list:

```text
- clear page title and description;
- created/updated time;
- provenance hint: From chat, From assistant response, Source unavailable, Manual/unknown if needed;
- actions: Open, Promote to Doc, Delete.
```

Output detail:

```text
- title;
- source metadata block;
- markdown content;
- actions at top and/or bottom;
- missing output state;
- no-active-workspace state.
```

Home/Search:

```text
- output results/cards use the same vocabulary as Outputs list;
- no overclaiming beyond workspace-local search;
- routes open correct detail pages.
```

### Step 6: Tests

Add/tighten tests for:

```text
- create/list/read/update/delete output storage;
- unsafe output IDs rejected;
- workspace isolation;
- save output IPC channel shape if applicable;
- promote output to doc preserving source metadata;
- output routes parse correctly;
- search route still works with outputs;
- missing output route/detail is safe;
- no-active-workspace state if testable at logic level.
```

## 7. Definition of done

This task is done when:

```text
- Outputs have clear product semantics in UI copy.
- Output provenance is preserved from assistant response save.
- Promotion to Doc preserves output/source lineage where current models support it.
- Missing source chat/message is handled gracefully.
- Output storage and RPC operations are workspace-scoped and ID-safe.
- Home and Search render Outputs consistently.
- Tests cover storage, route, IPC/promotion, and key edge cases.
- No Projects/WorkItems/Decisions/Notebooks are introduced prematurely.
```

## 8. Validation

Run at minimum:

```text
bun run typecheck:electron
bun test packages/shared/src/outputs/storage.test.ts
bun test packages/shared/src/pages/storage.test.ts
bun test apps/electron/src/shared/__tests__/route-parser-output*.test.ts apps/electron/src/shared/__tests__/route-parser-search.test.ts apps/electron/src/shared/__tests__/route-parser-home.test.ts
git diff --check
```

Adjust exact test paths to match the repository.

If possible, also run a manual Electron smoke test:

```text
1. Open workspace.
2. Send chat message.
3. Save assistant response as Output.
4. Open Outputs list.
5. Open Output detail.
6. Promote to Doc.
7. Open promoted Doc.
8. Search for text from Output/Doc.
9. Delete Output and confirm safe state.
```

## 9. Principal-grade review checklist

Product coherence:

```text
- Does Output still mean reviewable generated material, not Doc?
- Does promotion feel intentional?
- Does UI avoid adding too many new concepts?
```

Architecture:

```text
- Are Output APIs workspace-scoped?
- Are route IDs validated?
- Are storage writes and index behavior safe enough for local-first use?
- Does promotion avoid tight coupling that blocks future Project/WorkItem links?
```

Provenance:

```text
- Can a user tell where the Output came from?
- Can a user tell when the source is unavailable?
- Does a promoted Doc retain useful lineage?
```

UX:

```text
- Are empty/loading/error states specific?
- Are destructive actions clear?
- Are repeated saves/promotions handled intentionally?
```

Performance:

```text
- Does Search avoid loading too much on empty query?
- Are output reads bounded if added to search body matching?
```

Tests:

```text
- Do tests cover happy path and failure path?
- Are workspace isolation and unsafe ID cases included?
```
