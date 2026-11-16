---
id: dev-force-every-scene-through-its-writer
title: "Dev mode forces every scene type through the engine that writes its cause"
area: play
kind: feature
priority: 2
size: L
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Words builder A, Nov 16 (owner: dev mode must "trace and force every scene to play")
claimed-at:
checked:
---

**What.** Dev mode's scene view can bring about the cause of 5 situation types at once and waits for the world to write the cause of 81 more, so a person cannot force most scenes to play and see why. Each type's cause is a record some engine writes, and the director stages the scene from that record. Seen: in the scene view, every type's force button writes its cause through its engine's own writer, marks it forced, and the scene stages on the next day.

**Cause.** Measured: at the world built from seed 8341-pin (default place), by `node --import tsx scripts/words/force-all-probe.mts`, a bare event of each type's cause kind naming the player staged the scene for 18 of 89 types and matched a cause for 41; 23 matched but became journal lines because the engine's own writer carries facts the director scores (invitedId, contestId, billId, a counterpart) that a bare event lacks, and 48 matched nothing because the type waits on a circumstance (circumstance.ts) or a tie turn that no bare event makes. The by-type table is words-lead/tie-rule/force-all-probe-8341-pin.txt.

**Fix.** Extend `DevMode.forceScene` (src/bench/dev-mode.ts) with one recipe per cause kind, each calling the module's own writer (press for interviews and debates, elections for filings and results, legislation for bills and committee holds, corruption for bribes, justice, family, health, jobs, housing, civic), grouped by module so each PR is one module's kinds; a recipe is marked `scene-forced` and never counts as played. The scene view shows the staged scene or the director's held-back reason for the type.

**Time box.** One module's recipes per session, 3 hours each, Opus at medium effort.

**Rules.** Wire to the world: every recipe writes through the engine that owns the cause record and the director stages from that record id, never from a dev-made moment.

**Done when.** In a drawn place from all 56 (name the place and seed), a second session forces each type of one module from dev mode's scene view and sees the scene stage with its cause record id, or the held-back reason, for every type of that module.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-views/scene-trace.ts, src/director/circumstance.ts

**Notes.** Nov 16, #9691: dev mode's scene view now forces the 18 types a bare record of their cause stages (src/bench/dev-views/scene-trace.ts, map in scene-force-map.json written by `scripts/words/force-all-probe.mts --write-map`), marks each `scene-forced`, and names the other 71 with why (23 journal-line, 45 circumstance or tie turn, 2 refused bare, 1 no cause). Seen at Sheridan WY, seed 7, 1440x900: words-lead/tie-rule/force-view-sheridan-7.png. This item takes the 71 one module at a time.
