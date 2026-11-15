---
id: speed-paired-guard-draws-a-different-town-every-push
title: "The paired performance guard measures a different town on every push"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "the Account lead, Nov 15: the paired guard went red on the train at 683 against 554 ms a day (1.232 against 1.2); two runs here at d82bf47e passed at 0.972 and 1.016"
claimed-at:
after:
lead: speed
model: sonnet
effort: low
root: rc5-full-detail-every-day
---

**What.** `scripts/core2-guard/paired.mjs` draws its place with `drawPlace(head, "M0-11")`, so each push to a branch is measured at a different town. A town's ms a day differs by several times between towns (Myton UT 51 s a year against Lewiston ME about 200 s), so a red can come and go by draw and say nothing about the change. Seen: the paired job's log names a place for each push, and a repeat at the same place agrees.

**Cause.** Measured: `node --import tsx scripts/core2-guard/paired.mjs --base 693479ab --head d82bf47e` twice on an idle 4-core container: Westport, IN (the place drawn for that head), 204 against 198 ms a day (ratio 0.972) and 199 against 202 (1.016), three measured pairs of 365 days each, both under the 1.2 limit. The CI red was at a different drawn place on GitHub's runner. The place comes from the head sha at `scripts/core2-guard/paired.mjs` (`drawPlace(head, "M0-11")`).

**Fix.** Measure named places with fixed seeds pinned in `scripts/core2-guard/policies.json` (two or three, one small and one large, the way the day-zero test pins Washington DC and Lewiston ME), not a draw from the head sha, and report the ratio per place. The limit of 1.2 does not change. Where the draw is wanted for coverage, the nightly run keeps it and names the place.

**Time box.** 3 hours for one Sonnet session at low effort. When it runs out, write what was read in this item and stop.

**Rules.** Speed (`AGENTS.md`): no change may make a year more than 20 percent slower than its base on the same base and machine, one process at a time; one rule, all 56 places (place facts live in data, named places are tests only); never loosen a limit to get green.

**Done when.** A second session, not the builder, runs the guard twice at a drawn place and seed it names, at the same head, and sees the same places named both times, with the same pass or fail; `scripts/core2-guard/paired.node-test.mjs` passes.

**Waits on.** Nothing.

**Files.** scripts/core2-guard/paired.mjs; scripts/core2-guard/policies.json; scripts/core2-guard/paired.node-test.mjs
