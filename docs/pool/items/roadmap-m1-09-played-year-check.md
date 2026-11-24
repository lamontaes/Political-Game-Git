---
id: roadmap-m1-09-played-year-check
title: "M1-09's command checks a played year's births, moves and population change against real rates"
area: people
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: m0-m2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-roadmap-m1-09-played-year-check
---

**What.** M1-09 reads "A year's births and moves in a random place stay within that place's real rates; the town's population changes the way real towns do instead of winding down." Its command, src/core2/moves.test.ts, passes 10 of 10 on main ca0db23749 in the runner's drawn place, Naukati Bay, Alaska (0252845, seed 052879284d40f970a292f8a5eae6a23dcd9a28861d722c0b4843f100d2b0250e). But it plays half a year in a 700-person world holding only the moves and renewal engines, not a year of the world the player gets, and nothing checks the town's population change. The flag stays false until the whole spec is checked. Seen: the town's population on the Metrics tab year to year, which should not wind down.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, the Nov 8 entries "Ranges are not targets, for everything; baselines only calibrate" and "Per-world spread in the checks"; the spec text is docs/roadmap/features.json M1-09. The helper that builds a full played year already exists as buildPlayedWorld and playYear in src/core2/tooling/m1-played-year.ts, and no M1-09 script uses it.

**Fix.** Add src/core2/tooling/m1-09-check.ts, built on buildPlayedWorld and playYear, that plays one year of buildBenchWorld (two-level, every module) in the runner's drawn place and prints the year's births, departures by age and the town's net population change, each with the record ids that wrote it, next to the sourced figures of research-regional-population-change-range (done). The run exits nonzero when a birth has no parent record, a departure has no reason record, or births are switched off and the check does not say so; a real figure the world leaves is reported, not failed. Then make M1-09's command in docs/roadmap/features.json run the script after moves.test.ts. Do not edit moves.test.ts.

**Time box.** 5 hours.

**Rules.** Research before building: the population-change figures are SOURCED from Census population estimates for places of that size in that state, and real rates check the town's totals, never one person's outcome. Ranges are not targets (owner, Nov 8): the real figures are reported beside the world's and never decide pass or fail. A slow check is a script under src/core2/tooling/, not a unit test. One rule, all 56 places: the place is the runner's draw and is named with its key and full seed.

**Done when.** A second session runs the M1-09 command in the runner's drawn place and in two more drawn places and sees one year of the played world print births, departures and the town's population change with the place, key, full seed and record ids, with the sourced figure beside each. A test shows the script exits nonzero when births are switched off and names that no birth was written. features.json then reads passes true for M1-09 only after that run.

**Waits on.** Nothing.

**Files.** src/core2/tooling/m1-09-check.ts (new), src/core2/tooling/m1-played-year.ts, src/core2/moves.test.ts, docs/roadmap/features.json

**Notes.** TODO

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: M1-09 'stay within that place's real rates' conflicts with OD:558 / OD:12 (calibration ranges only); re-word the check.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:25 UTC) on branch claude/pool-roadmap-m1-09-played-year-check.

Released (2026-11-11): Held by my own next loop while walking the queue; not worked (see the item's own size and Fix: M-sized or needs Story/Words lines, not started this pass). Continue on branch claude/pool-roadmap-m1-09-played-year-check.
