---
id: core-snapshot-cover-rest
title: "Every engine's saves load from a snapshot"
area: core
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
---

**What.** Register or confirm-as-cache each remaining per-world WeakMap and call `declareSnapshotCovered` in drives, grief, moves, people, jobs, credit, candidacy, corruption, voting, budgets, campaigns, elections, interest groups, law-reach and the director, so a save loads fast instead of replaying from the opening (`saves.ts` replays while `uncoveredModules` is non-empty). Split by pillar if it grows to L. Each registration must be proven by a restore round trip, not asserted.

**Rules.** Speed: loading a save must not replay a whole opening. Replace, never layer: a WeakMap that is only a cache says so in a comment and registers nothing.

**Done when.** `uncoveredModules(core)` is empty on the played world (buildBenchWorld, a drawn place from all 56), and `scripts/core2-guard/snapshot-roundtrip.mjs` reports no differing field after a restore, test output named in the PR.

**Files.** src/core2/snapshot.ts, src/core2/saves.ts, each engine's module file

**Notes.** core.md line 177, checked Oct 15: only renewal, health and the base set are declared covered.

**Worked Oct 17 (claude, claude/snapshot-cover-s5).** Found with `scripts/core2-guard/snapshot-roundtrip.mjs`, which restores a month-45 snapshot into a fresh build and compares every field after more play. Before: 53 engines uncovered and a restored world diverged on `core.people`, `core.households`, the cash journal and others. Two causes were in the restore itself (`decoder` in `src/core2/snapshot.ts`): it refilled a rebuilt object in place even when the rebuilt world shared that one object between records the saved world keeps apart (every person's opening source), so a later record's source overwrote all of them; and it left refilled objects' keys in the rebuilt order, not the saved order. Both fixed, with `src/core2/snapshot-restore-shape.test.ts`. Then the runtime state kept outside the tables was registered (drives, corruption, speech, credit, moves, official pay, office-day seen terms, candidacy pending and queues, campaigns, justice, grief, voting decisions, the news recent-heard and counts, the press audience caches) and 47 engines declared covered. Round trip, 45 to 60 days, no differing field: seeds `sn2` (Winona, Mississippi), `sn5` (Edwards, Mississippi) and `sn6` (Tafuna, American Samoa); `sn1` (Greenvale, New York) differs only in `table.candidacy/weighed`. Still open, so these stay uncovered: `jobs` and the three office-day engines (they hold live stop tokens from the Core stop registry, `src/core2/player-stops-v1.ts`, which does not save); `candidacy` (the yearly `countedBases` cache holds counted-voter objects with class-instance traits, so a restore recomputes a different `countedWeighed`: seed `sn3`, Innovation, Virginia, `table.candidacy/weighed`); and `news` (seed `sn4`, Port Vincent, Louisiana: on 2025-03-22 the restored world has one more telling than the live one, a new relationship and `news/heard` row, with every saved field equal the day before; the cause is not found). Two independent runs of seed `sn4` agree day by day, so it is a save gap, not nondeterminism.
