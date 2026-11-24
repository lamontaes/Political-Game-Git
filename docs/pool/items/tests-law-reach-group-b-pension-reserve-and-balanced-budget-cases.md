---
id: tests-law-reach-group-b-pension-reserve-and-balanced-budget-cases
title: "Three group B cases that read treasury money fail on their own: pension funding, the minimum reserve and the balanced-budget rule"
area: laws
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by:
pr: #9339
blocked-on:
source: "asked for by the Account lead on the group B test setup fix, Nov 14"
claimed-at:
after:
lead: account-lead
model: opus
effort: medium
root: rc2-done-from-records
checked: sonnet 2026-11-14
---

**What.** In `src/core2/law-reach-group-b.test.ts` three cases fail once the file's setup runs: `funding pensions to schedule adds the contribution and reaches public employers and workers` (contribution 0, expected 16,381,477,000), `a minimum reserve sets the treasury's cash aside up to its target; repeal releases it`, and `a balanced-budget rule cuts spending to revenue` (spending 2,101,497,765,163 above revenue 2,071,777,654,790). Each is a policy changing the law and reaching a treasury. Seen: all three green with the assertions kept.

**Cause.** Measured: `GOLDEN_PATH_SEED=0123 npx vitest run src/core2/law-reach-group-b.test.ts` at Vashon WA (place 5374305), governments federal/state/county, on the clean train after the setup fix (sittingExecutiveOf tolerates a world without offices): the three cases above fail with the numbers given. Found in code: the test acts at the county (`LOCAL`) and Washington preempts local pension funding (Wash. Rev. Code 41.45.060, `preempts: true` in `POLICY_QUESTIONS`), so the county's act is void: `yesLevels(api, key)` is empty after the act and no budget line moves. The reserve and balanced-budget cases share it. The engine is right; the test must act where the state allows (`localPowerBarred`).

**Fix.** The three cases act at the state where the state bars its places (`actLevel`), and read that government's budget; assertions unchanged.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** Wire to the world: the fix goes through the engines a played world uses and a case that fails for its own reason stays failing until fixed, never loosened or skipped; one rule, all 56 places: the cases keep drawing places and name each place and seed.

**Done when.** A second session, not the builder, runs `npx vitest run src/core2/law-reach-group-b.test.ts` on main in a drawn place and seed it names (buildBenchWorld not needed, the test builds the world) and sees the named cases pass with their assertions unchanged, with the record ids each case writes named.

**Waits on.** The group B setup fix folding.

**Files.** src/core2/law-reach-group-b.test.ts; src/core2/law-reach/group-b-money.ts

**Notes.** Found while fixing tests-law-reach-group-b-fails-in-setup.
