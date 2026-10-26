---
id: core-all-places-year-speed-oct16
title: "A 56-place year: four places run past 100 seconds, and four parallel workers run out of memory"
area: core
kind: bug
priority: 2
size: M
status: done
claimed-by:
pr: #4648
blocked-on:
milestone:
source: "found by a session running npm run all-places on Oct 15-16, 2026 (run seed 23072baac0b7207c)"
claimed-at:
---

**What.** The 56-place one-year run (`npm run all-places -- --years 1`, seed 23072baac0b7207c, main at the Oct 15 evening head, a 4-core 15 GB machine) finished with no crash and every check passing, but the speed and memory rules are not met everywhere. With two workers, seconds per game year were 135 in Lewiston, Maine, 121.5 in Washington, D.C., 107.1 in McPherson, Kansas and 102.2 in Forest, Virginia; the AGENTS.md rule is under 120 seconds for a town's year. The largest heap was 3.69 GB (Frederiksted, U.S. Virgin Islands, 51 seconds). With four workers the same run was killed after 21 places when one node process reached 13.6 GB resident and the container ran out of memory, so the default worker count in `all-places.mjs` is not safe on 15 GB. Profile Lewiston and D.C. with `scripts/core2-year/profile-top.mjs`, find what the year spends its time on there, and cap the worker count by memory.

**Rules.** Speed: a town's year runs under two minutes and no change makes it more than 20 percent slower; never scan the whole world or a history every day; measure before and after on the same machine, one process at a time. One rule, all 56 places.

**Done when.** In a one-year run of the played world (buildBenchWorld) in Lewiston, Maine and Washington, D.C. with the same seeds as the run above, the year takes under 120 seconds measured one process at a time, and `all-places.mjs` picks a default worker count from free memory and the largest heap seen so a 15 GB machine does not run out. The owner plays it: a game year in a big town finishes before he looks away.

**Files.** scripts/core2-year/all-places.mjs, scripts/core2-year/profile-top.mjs, src/core2/

**Notes.** Overlaps `core-year-over-120s` (Garden City, Idaho 131 s and Exeter, New Hampshire 146 s, in a PR) and `core-year-speed-remaining`: read both first. The timings here ran two at a time on a shared box, so they may be high; the first step is to re-measure each place alone. `all-places.mjs` draws each place and its world seed from the run seed, so `--seed 23072baac0b7207c --only US-ME,US-DC` repeats these two.

Split 2026-10-16: the worker-count half (default worker count from free memory) is PR #4648. The speed half, with a CPU profile of Lewiston, Maine and the timings of both places measured alone on a slower container, is the new item `core-year-speed-activate-and-gc`. This item is done when #4648 merges.

Sent back 2026-10-16 from PR #4648 (branch claude/core-all-places-year-speed): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
