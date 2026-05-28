# TASK-010: Legacy Transition Cleanup Batch

Status: Proposed
Base branch: `feature/dev`
Expected branch: `codex/legacy-transition-cleanup`
Related epic/story: `docs/planning/EPIC-001-durable-knowledge-workspace.md` / `docs/ARB-001-navigation-and-migration-roadmap.md`

This task batch stays intentionally repo-native and migration-shaped. It is the umbrella for the remaining cleanup seams that still read as transitional instead of durable: session-first terminology, legacy navigation buckets, deprecated hooks, markdown editor legacy paths, and compatibility code that should only survive while migration is still in flight.

For current-state context, see `docs/planning/CURRENT-STATE.md`.

## Goal

Create a focused follow-on batch for the next cleanup pass so the repo can keep shrinking migration debt without confusing users about the product model.

## Why now

The main workspace surfaces already reflect the durable model. The remaining risk is drift: old names and compatibility code can linger in UI copy, navigation structure, and shared hooks long after the migration intent is clear. This batch keeps those seams moving in small, safe follow-on slices.

## Scope

In scope:

- Session-first terminology that still appears in user-facing copy or doc prose.
- Legacy navigation buckets such as Work Queue and Files & Context transitions.
- Deprecated hooks and alias exports that are still carried for compatibility.
- Markdown editor legacy paths and fallback behaviors.
- Migration-only compatibility code that should be documented, isolated, or retired.

Out of scope:

- New product entities.
- Broad navigation redesign.
- Editor feature expansion.
- Storage model rewrites.

## Likely areas

Start by inspecting the current UI and shared code paths that still carry migration language:

- `docs/README.md`
- `docs/planning/README.md`
- `docs/planning/CURRENT-STATE.md`
- `docs/ARB-001-navigation-and-migration-roadmap.md`
- `apps/electron/src/renderer/components/app-shell/*`
- `apps/electron/src/renderer/hooks/*`
- `apps/electron/src/renderer/pages/*`
- `apps/electron/src/renderer/lib/*`
- `apps/electron/src/shared/route-parser.ts`
- `apps/electron/src/shared/routes.ts`
- `packages/shared/src/*`

## Batch plan

1. Audit user-facing `session-first` language in `docs/` and the renderer shell, then replace it where the durable workspace model already exists.
2. Tighten any `session status` phrasing that now really means `WorkItem` or `Work Queue`, while preserving explicit migration notes where the old meaning still matters.
3. Review the app shell's legacy navigation buckets so transitional groupings are clearly labeled as migration shell behavior instead of canonical product structure.
4. Check `Work Queue` copy, helper text, and empty states for any wording that still describes it as a direct session-status view.
5. Verify `Files & Context` labels, helper text, and learn-more text no longer imply the older `Sources` framing except where a migration note is still required.
6. Inventory deprecated or alias hooks in the renderer layer, especially `useSession`-style compatibility paths, and mark which ones still have live call sites.
7. Remove or narrow any hook aliases that only exist for backward compatibility and are no longer needed by current code paths.
8. Trace markdown editor legacy paths, including old editor wrappers, fallback render paths, and compatibility re-exports, and split them from the primary editing surface.
9. Confirm markdown editor legacy paths are labeled as migration shims when they must remain, rather than looking like first-class APIs.
10. Review compatibility code in shared packages for comments or exports that still claim migration-only status and either document the removal trigger or delete the dead branch.
11. Audit route-parser and route-model tests for legacy route forms that are still intentionally supported, and make the compatibility window explicit in the test names or comments.
12. Check nav/sidebar tests and adjacent docs for assumptions that still treat the old bucket structure as canonical instead of transitional.
13. Add or tighten doc links between this batch, `CURRENT-STATE.md`, `docs/README.md`, and `ARB-001` so future agents can tell which compatibility seams are deliberate.
14. Make sure any remaining backward-compatibility helpers have a clear removal trigger tied to the current migration state rather than an open-ended comment.

## Next task slices

These slices are intentionally small enough to map to separate issues or PRs. Parallelizable slices are marked so they can be scheduled safely around concurrent edits.

1. `nav:legacySessions` cleanup in the sidebar and its tests.
   - Scope: `apps/electron/src/renderer/components/app-shell/sidebar-links.tsx`, `apps/electron/src/renderer/components/app-shell/__tests__/sidebar-links.test.ts`, `apps/electron/src/renderer/components/app-shell/__tests__/sidebar-focus-order.test.ts`.
   - Thinking: low.
   - Parallel-safe: yes, after hook removal is decoupled from sidebar rendering.

2. Remove the legacy tuple `useSession()` compatibility hook or reduce it to a thin adapter with a clear expiry path.
   - Scope: `apps/electron/src/renderer/hooks/useSession.ts`, plus the current call sites in `apps/electron/src/renderer/App.tsx`, `apps/electron/src/renderer/components/app-shell/AppShell.tsx`, and `apps/electron/src/renderer/contexts/NavigationContext.tsx`.
   - Thinking: medium.
   - Parallel-safe: partly. The hook can be adjusted separately from call-site updates, but not while those same imports are being rewritten elsewhere.

3. Replace the navigation context's remaining legacy session-setting bridge with the current selection API.
   - Scope: `apps/electron/src/renderer/contexts/NavigationContext.tsx`.
   - Thinking: medium.
   - Parallel-safe: no, keep it serialized with the hook-removal slice to avoid churn in the same call path.

4. Split or relabel transition-only copy in the session list playground registry.
   - Scope: `apps/electron/src/renderer/playground/registry/session-list.tsx`.
   - Thinking: low.
   - Parallel-safe: yes.

5. Audit session-list migration glue around collapsed-group storage fallback.
   - Scope: `apps/electron/src/renderer/components/app-shell/SessionList.tsx` and any shared storage helper if the fallback is removed or documented.
   - Thinking: medium.
   - Parallel-safe: yes, as long as storage-key cleanup stays isolated from nav/hook edits.

6. Remove or rewrite transition-only comments in the renderer shell where the durable model is already established.
   - Scope: `apps/electron/src/renderer/components/app-shell/AppShell.tsx`, `apps/electron/src/renderer/hooks/useSession.ts`, `apps/electron/src/renderer/components/app-shell/sidebar-links.tsx`.
   - Thinking: low.
   - Parallel-safe: yes, but avoid overlapping with slices 1-3 because the same files are involved.

7. Refresh planning references after the code slices land.
   - Scope: `docs/planning/CURRENT-STATE.md`, this task file, and `docs/ARB-001-navigation-and-migration-roadmap.md`.
   - Thinking: low.
   - Parallel-safe: yes, and best done after the code slices settle.

Follow-on issue flow:

- Treat this file as the umbrella handoff for the remaining legacy-transition cleanup work.
- Open new child issues or PRs for individual slices when they are ready to be executed.
- Keep `CURRENT-STATE.md` and `ARB-001` aligned when a slice materially changes what is still transitional.

## Markdown engine follow-up note

The remaining markdown-engine seam is concentrated in `packages/ui/src/components/markdown/TiptapMarkdownEditor.tsx` and is now mostly a wrapper-level compatibility branch rather than a live product choice. The exact removable branches are:

- the `markdownEngine` default of `'legacy'`
- the `LegacyMarkdown` import and configuration path
- `getLegacyMarkdown(...)`
- the legacy `onUpdate` and content-sync branches that read from `editor.storage.markdown`
- the `MarkdownEngine` export in `packages/ui/src/components/markdown/index.ts` and `packages/ui/src/index.ts` once no callers need the switch

Before removing those branches, land coverage that proves the official path is stable and that the wrapper still behaves correctly under the chosen engine:

- an editor-level test for `TiptapMarkdownEditor` in official mode that verifies `onUpdate` round-trips through `preprocessMarkdownForOfficial(...)` and `postprocessMarkdownFromOfficial(...)`
- a regression test that exercises the current legacy branch directly, so removal can be paired with a deliberate test deletion instead of an unguarded code drop
- a call-site audit for `apps/electron/src/renderer/pages/PageCanvas.tsx` and `apps/electron/src/renderer/playground/registry/planner.tsx`, which are the only live app consumers I found and both already opt into `markdownEngine="official"`

Safest next cleanup steps:

1. Add the missing wrapper-level tests first, then remove the legacy branch only after they pass.
2. Flip the wrapper default from legacy to official only if there is no remaining external consumer relying on implicit legacy behavior.
3. Remove `LegacyMarkdown` and the `editor.storage.markdown` sync path after the tests prove official mode is the only supported runtime path.
4. Delete the compatibility export once the two Electron call sites remain the only in-repo consumers and both stay pinned to official mode.
5. Keep the migration helper functions only as long as the official parser still needs the currency/math preprocessing shim.

## Implementation notes

- Prefer small copy or alias removals that can land without changing the underlying migration model.
- If a compatibility path must stay, document why in the same file near the shim.
- Treat any code path that is only there for older routes or old terminology as a follow-on removal candidate unless there is a current test proving it still matters.

## Definition of done

- The next cleanup slice is broken into bounded, repo-native tasks.
- The doc names real transitional seams instead of abstract cleanup themes.
- Cross-links point future agents at the current-state snapshot and migration rationale.
- The batch is narrow enough to execute in follow-on PRs without pulling in unrelated product work.
