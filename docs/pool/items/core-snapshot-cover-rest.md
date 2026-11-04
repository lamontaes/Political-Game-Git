---
id: core-snapshot-cover-rest
title: "Every engine's saves load from a snapshot"
area: core
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: lane-5/snapshot-cover
pr: #5036
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-11-04T02:10:41.786Z
---

**What.** Register or confirm-as-cache each remaining per-world WeakMap and call `declareSnapshotCovered` in drives, grief, moves, people, jobs, credit, candidacy, corruption, voting, budgets, campaigns, elections, interest groups, law-reach and the director, so a save loads fast instead of replaying from the opening (`saves.ts` replays while `uncoveredModules` is non-empty). Split by pillar if it grows to L. Each registration must be proven by a restore round trip, not asserted.

**Rules.** Speed: loading a save must not replay a whole opening. Replace, never layer: a WeakMap that is only a cache says so in a comment and registers nothing.

**Done when.** `uncoveredModules(core)` is empty on the played world (buildBenchWorld, a drawn place from all 56), and `scripts/core2-guard/snapshot-roundtrip.mjs` reports no differing field after a restore, test output named in the PR.

**Files.** src/core2/snapshot.ts, src/core2/saves.ts, each engine's module file

**Notes.** core.md line 177, checked Oct 15: only renewal, health and the base set are declared covered.

Sent back 2026-10-20 from PR #5036 (branch claude/snapshot-cover-s5): Merge main conflicts require author resolution: src/core2/modules/elections.ts.; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5036 (branch claude/snapshot-cover-s5): Code conflict with main in src/core2/modules/executive.ts; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5036 (branch claude/snapshot-cover-s5): The title says a saved game restores exactly as saved, but the body explicitly leaves six engines unsaved and reports a differing candidacy field in Greenvale plus an unexplained news-day difference elsewhere. core-snapshot-cover-rest Done when requires uncoveredModules(core) empty and no differing field after restore; those proofs are not met. Finish the six engines and the named round-trip proof, or track the completed bounded snapshot repair separately while leaving the umbrella unfinished and correcting the release/title claim.; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5036 (branch claude/snapshot-cover-s5): integrating main conflicts in src/core2/grief.ts, modules/housing.ts and modules/news.ts; give the bounded repair a matching item and Done-when evidence table; finish on that branch, merge main into it first.

Sent back 2026-10-23 from PR #5036 (branch claude/snapshot-cover-s5): Code conflicts are repaired but the body still claims exact restoration while six engines and candidacy/news divergence remain; provide bounded restore-shape acceptance and a Done-when table or finish the umbrella; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5036 (branch claude/snapshot-cover-s5): the corrected evidence table still marks empty uncoveredModules and exact round-trip restoration NOT MET, with nine uncovered modules and 14/20/16 differing fields; provide a valid bounded item for the completed slice or finish the umbrella, and reconcile title six versus body nine; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: demote to p3 / hold until the early-access save work; the owner's Continue is not blocked on it (load speed only).

Lane 5, Nov 4: plan, from a trial merge of `claude/snapshot-cover-s5` (e2977127d2, 10 days old) into main. It conflicts in 19 files. Imports are mechanical, but the branch side of business.ts, past-module.ts, officials.ts, outcome-web.ts, speech.ts and voting.ts carries functions main has since deleted, and `world-races.ts` is gone from main. Do not merge it. Re-apply its intent on main: (1) the `decoder()` change in `src/core2/snapshot.ts` (the `refilled` set and the saved key order), self-contained; (2) one `declareSnapshotCovered("<module id>")` line per engine the branch covered, checking each id against main; (3) `registerWorldMapPart` for each per-world WeakMap main still has (the branch's `speech-moved` map no longer exists on main; read each engine's WeakMaps fresh). Prove each engine by `scripts/core2-guard/snapshot-roundtrip.mjs`, not by assertion. The played route that uses it is `core-played-game-saves-and-continues`.

Lane 5, Nov 4: claimed on `lane-5/snapshot-cover`. Step 1 is pushed: the decoder change (bbfde5e201), with snapshot-restore-shape.test.ts passing 3 of 3. The measure is `src/core2/snapshot-played.test.ts` on the branch: buildBenchWorld in a drawn place, 30 days, save, rebuild, restore, both run 45 more days, compare every saved field. Baseline Phoenix, Arizona, seed snapshot-1: 75 engines installed, 55 uncovered (list in the test output), and 47 of 131 saved fields differ after the restore. Core fields differ too (people, work, finance, cashJournal, organizations, durableLog, knowledgeByPerson), so per-world state outside the save changes play broadly, beyond the uncovered engines. 34 of the 55 keep no module-level WeakMap in their own file (map in Lane 5's scratch notes). Next: find which runtime parts the core fields depend on, register each, and rerun the measure after each engine.
