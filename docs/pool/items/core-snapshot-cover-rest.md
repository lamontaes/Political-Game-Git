---
id: core-snapshot-cover-rest
title: "Every engine's saves load from a snapshot"
area: core
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/snapshot-cover-s5
pr: #5036
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-20T03:56:05.987Z
---

**What.** Register or confirm-as-cache each remaining per-world WeakMap and call `declareSnapshotCovered` in drives, grief, moves, people, jobs, credit, candidacy, corruption, voting, budgets, campaigns, elections, interest groups, law-reach and the director, so a save loads fast instead of replaying from the opening (`saves.ts` replays while `uncoveredModules` is non-empty). Split by pillar if it grows to L. Each registration must be proven by a restore round trip, not asserted.

**Rules.** Speed: loading a save must not replay a whole opening. Replace, never layer: a WeakMap that is only a cache says so in a comment and registers nothing.

**Done when.** `uncoveredModules(core)` is empty on the played world (buildBenchWorld, a drawn place from all 56), and `scripts/core2-guard/snapshot-roundtrip.mjs` reports no differing field after a restore, test output named in the PR.

**Files.** src/core2/snapshot.ts, src/core2/saves.ts, each engine's module file

**Notes.** core.md line 177, checked Oct 15: only renewal, health and the base set are declared covered.

Sent back 2026-10-20 from PR #5036 (branch claude/snapshot-cover-s5): Merge main conflicts require author resolution: src/core2/modules/elections.ts.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5036 (branch claude/snapshot-cover-s5): Code conflict with main in src/core2/modules/executive.ts; finish on that branch, merge main into it first.
