---
id: world-three-checks-still-fail-a-run-for-leaving-a-real-range
title: "Three checks still fail a run when a world leaves a real-world range (regional population change, yearly population change, turnout), and the roadmap's economy test still asks for it"
area: world
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-world-three-checks-still-fail-a-run-for-leaving-a-real-range
pr: #8615
after:
blocked-on:
model: sonnet
effort: medium
root: none
lead: money
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 1, "What still fails a run for leaving a real-world range")
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:17:12.197Z
---

**What.** The owner ruled on November 8 that real-world ranges are not targets, and no check fails a run for leaving a real band. Four of the old range checks now warn and let the run go on. Three still fail it. All three were read in the code, not run by the audit: regional population change (`src/bench/m1-13-check.ts`, near line 114), yearly population change (`src/core2/counted-moves-balance.test.ts`, near line 69) and turnout (`src/core2/electorate.test.ts`, near line 128). The roadmap's own test for the national economy still reads "keeps national figures within real historical spreads" (`docs/roadmap/features.json`, M1-02). While these stand, a world that takes a wild turn from its own causes is reported as broken, and sessions tune the simulation back toward the real figure to get a green run. Fix the class, not three lines: every check that compares a played run with a real range prints the range beside the result and warns, each keeps a check of the cause in its place (people moved for a recorded reason, ballots came from eligible voters), and the roadmap's wording matches the ruling.

**Cause.** Found in code: src/bench/m1-13-check.ts (the band check at lines 114 to 124 fails when more than a tenth of regions sit outside the 5th to 95th percentile), src/core2/counted-moves-balance.test.ts (the 1.5 percent a year assertions at lines 57 to 80) and src/core2/electorate.test.ts (the turnout tolerance at line 128) fail a run for leaving a real range; docs/roadmap/features.json M1-02 (line 161) still asks for it. Audit: docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 1.

**Fix.** Replace each failing band assertion with a cause check and print the range beside the result as a warning, in the same change (no switch); reword docs/roadmap/features.json M1-02 to a cause test with the range reported. Copy the pattern in src/core2/macro.test.ts (line 87).

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Guards: the population and turnout figures a player reads on the Metrics tab and the paper stay inside real ranges, by failing a run that leaves them.

**Rules.** Sliding scales and causes: a played world's figures follow from its causes and may take wild turns, so a check tests the cause and reports the real range beside it. Research before building: real data calibrates the opening and the parameters and never decides an outcome, and a check that fails a run outside a band makes the band decide. Replace, never layer: each failing assertion is replaced by its cause check and its report in the same change, not kept behind a switch. Owner, November 8: "ranges aren't targets. And look, that's not just for economics. It goes for everything." And: "None of the simulation should be hard-coded like that or, you know, set against a baseline. The baselines are to calibrate... a cause formula... things can take drastic turns, wild turns, or just be, you know, calm and everything in between." As recorded in OWNER-DECISIONS.md, Nov 8 morning: "no check fails a run for leaving a real band."

**Done when.** A second session, not the builder, checks it two ways. In the running game (`npm run bench`, play at `/play`, the Place field empty so the place is a drawn place, place and seed written down) they use dev mode's law control to set a tax to zero, run two years with dev mode's Run, and see on the Metrics tab that the town's and the region's figures moved and nothing stopped the run for it (a screenshot before and after). Then they run the three checks on the same drawn place and seed, and on a second seed where a figure sits outside its real range: each prints the result, the real range and the word warning, exits green, and still goes red when its cause check is broken on purpose (a move with no recorded reason, a ballot from someone not eligible). A search of `src` and `tests` for the bands' names shows no remaining assertion that fails a played run on a real range, and the PR body lists every check it changed. `docs/roadmap/features.json` M1-02 reads as a cause test with the range reported. The audit names no place or seed for this defect, so the repro is the three files as they stood on Nov 9.

**Waits on.** Nothing.

**Files.** src/bench/m1-13-check.ts (the band check at lines 114 to 124; `check`, line 28), src/core2/counted-moves-balance.test.ts (the 1.5 percent a year assertions at lines 57 to 80), src/core2/electorate.test.ts (the turnout tolerance at line 128), docs/roadmap/features.json (M1-02, line 161), src/core2/macro.test.ts (line 87, the pattern to copy)

**Notes.** From the Fable audit, Pillar 1; all four places were read in the code and none was run. Confirmed on main, Nov 10 (helper): `m1-13-check.ts` fails when more than a tenth of the regions' one-year population change sits outside the 5th to 95th percentile band; `counted-moves-balance.test.ts` expects every year's change in a town's people to be at most 1.5 percent, in Washington, D.C. over three years and in a drawn territory over one; `electorate.test.ts` expects counted turnout within `countedTurnoutTolerance` of the state's survey turnout. One point where the code differs from the audit's wording: the turnout check reads the opening's inputs, with no time played, so it is a check of the opening and not of a run. The night Coordinator's call of Nov 8 (OWNER-DECISIONS.md, "Per-world spread in the checks") lets a check hold a day-one opening value within the published figure plus or minus the world's spread; the builder applies that call to the turnout check (keep it as an opening check with the world's spread, or report it) and says which in the PR body. The same file's next test (every state's count lands near its 2024 presidential share) is the same kind and gets the same treatment. OWNER-DECISIONS.md said on Nov 8 that six checks failed runs outside real bands; the audit found four of the old checks now warn, and did not list which. The dev mode step in Done when does not prove the checks by itself; it shows a wild turn is allowed in play. Related: `world-town-net-moving-negative` (open: a town loses 3.6 to 4.7 percent of its residents a year, which the 1.5 percent assertion would hide or flag depending on the place).
