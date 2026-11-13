---
id: tests-recalls-no-recall-started-again
title: "recalls.test fails on main again: no recall starts in six drawn places (seed 1b251a8a...55da)"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
lead: wire-elections
source: wire-office session, Oct 28 (found red on main)
after:
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
---

**What.** src/core2/recalls.test.ts fails two of six cases on clean main with GOLDEN_PATH_SEED=1b251a8aaa0f7710143adc4ff3cd45fa37ae0151be5cce350c171993b62555da: "no recall started in US-WA 5327960, US-KS 2029600, US-MT 3060450, US-WA 5322115, US-FL 1253850, US-ND 3813020". The same failure was fixed once under tests-recall-ordinance-no-recall-started (done), so something since has made recalls rarer or the draw narrower. Other seeds pass. It reproduced on main at d3ee6986bc and on the wire-office row 42 branch with the same seed. Guards: a recall petition still starts against an official the player can read about in the paper.

**Cause.** Found in code: the test draws places where an ordinance vote can never start a recall, and passes over them without saying why. Both failing cases share `countedSigners` (src/core2/recalls.test.ts lines 185 to 283). It redraws only until the state's municipal recall rule has `circulationDays` (line 192), and then expects a recall within 31 days of a divisive ordinance. But `weighOrdinance` (src/core2/modules/recalls.ts line 429) returns at once where the rule requires grounds (`rule.groundsRequired === true`, line 446): a vote on an ordinance is no ground. Measured on main (Nov 11) with GOLDEN_PATH_SEED=1b251a8aaa0f7710143adc4ff3cd45fa37ae0151be5cce350c171993b62555da, probes in working copies of the test and recalls.ts, undone after: the six places passed over were US-WA 5327960 and US-KS 2029600 (each passed an ordinance; it took effect on 2025-02-19 and `weighOrdinance` read grounds required, so no recall), US-MT 3060450, US-WA 5322115 and US-FL 1253850 (no council seat held by a person) and US-ND 3813020 (no ordinance passed in 55 tries, almost all drafts blocked). So no draw could start a recall. The file's own statute case (line 381) already reads `groundsRequired` the right way.

**Fix.** Change the test only. In `countedSigners`, redraw past a state whose `resolveMunicipalRecallRule(...)` has `groundsRequired === true` as well as one with no `circulationDays`, and push a reason to `tried` at each `continue`: 'grounds required', 'no council seat held by a person', 'no ordinance passed (n drafts)', or 'no recall in 31 days'. Raise the attempts from 6 to the number the draws need (each redraw is cheap until a world is built), so the case finds a place where a recall can start. Keep every assertion.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a recall starts from voters' anger at a member's recorded vote and the state's recall law, never a roll, so the fix finds why no voter group reached the petition threshold in these six places. One rule, all 56 places: the test draws places from all 56 and names the place and seed; a place without a recall law is passed over by name. Never weaken a test: some drawn place must start a recall.

**Done when.** A second session runs src/core2/recalls.test.ts with that seed and on ten more drawn seeds and sees every run pass. The PR body names, by record id, the vote and the petition that start the recall in at least one of the six places above, or why none of them can (no recall law, no recorded vote).

**Waits on.** Nothing.

**Files.** src/core2/recalls.test.ts, src/core2/modules/recalls.ts, src/core2/gov-rules/municipal-ballot-rules.ts

**Notes.** Reproduced on main at d3ee6986bc and on the wire-office row 42 branch with the same seed (both 2 failed, 4 passed).

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/recalls.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=1b251a8aaa0f7710143adc4ff3cd45fa37ae0151be5cce350c171993b62555da. Still red, 2 of 6. First failing assertion as printed: `AssertionError: no recall started in US-WA 5327960 seed 1b251a8aaa0f7710143adc4ff3cd45fa37ae0151be5cce350c171993b62555da:0, US-KS 2029600 ...:1, US-MT 3060450 ...:2, US-WA 5322115 ...:3, US-FL 1253850 ..., US-ND 3813020` ("counts the town's counted residents as signers and voters by the same rule" and "counts them the same when their weights are fractions").

Cause found (Nov 11, 2026, cause finder for Fable B): the probes logged each drawn place's reason; two of six were states that allow a recall only for cause, three had no council seat held by a person, and one passed no ordinance.
