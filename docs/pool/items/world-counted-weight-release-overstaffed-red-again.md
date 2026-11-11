---
id: world-counted-weight-release-overstaffed-red-again
title: "counted-weight-release red on main again: at Census size employers stand far over their sales staff (Washington, D.C., seed dc-closures-a; Wichita, Kansas)"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: red-main
model: sonnet
effort: low
root: design-one-model-two-tiers
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** src/core2/counted-weight-release.test.ts fails on clean main (fa97c57fc5, Oct 29 02:20 UTC) in both cases. Washington, D.C. (1150000), fixed seed dc-closures-a: the most overstaffed employer at the Census size reads organization_df6c54e881a57ad2 50.4 staff against 12.1 its sales support (organization_4905e57ad6bcc4a1 910.1/223.2), against at most 70.0/50.6 at the sample size, so the worst ratio is about 4.17 where the test allows a tenth over the sample town's. Wichita, Kansas (2079000), base 0930f1635339f81e, fails the same way (organization_7c0d28c77eedc627 1321.3/323.1). The items world-counted-weight-release-grows-employer-staff (#5866) and world-census-scale-closures-large-cities (#5803) are done; this is their test turning red again. Found by the laws session. Guards: the staff a large city's firms show in the jobs numbers, which the counted-weight release test keeps from running far above what sales support.

**Cause.** Found in code: the jobs engine divides an employer's observed sales staff by `openingScale` a second time. In src/core2/modules/jobs.ts (the employer review, about line 1362), `observedStaff = openingStaff × salesMinor × days per year / (days × price ratio × capacityMinor × openingScale)`. `openingScale` (set in `open`, about line 1081, and copied in `registerEmployer`, about line 5064) is documented as "its books are kept at one worker per record, so receipts taken in at the town's weight are read against them divided by this". But the books are weighted now: at Census size an employer's `capacityMinor` is the town's weight times the sample size's (organization_38708aabff0a980b holds 3,069,443,517 dollars at `countScale` 69 against 44,484,689 at 1). `openingStaff` is weighted heads too. So with sales at capacity the observed staff reads `openingStaff / openingScale`, about one record's worth, and `salesStaff` slides toward it while the counted heads stay. Measured: Washington, D.C. (1150000, seed dc-closures-a, `countScale` 68.95, `buildBenchWorld`). Monroe Trucking (organization_62c301b7c927f6ee) held 69 counted heads all year while its `salesStaff` fell 68.6, 49.8, 37.2, 28.2, 21.7, 16.8 at two-month steps. Washington Campaign Works (organization_9b8c24f47e61bd76) fell from 207.8 to 55.9 on about 206 heads, and Sparks Fitness and Recreation (organization_e2a2729e26acde67) from 3,537.6 to 866.5 on about 3,100. With the `× (row.openingScale ?? 1)` factor removed in a working copy (undone), `WEIGHT_RELEASE` case "Washington, D.C. at its Census size..." in src/core2/counted-weight-release.test.ts passes. The worst Census employers were then the papers at 2.0 heads against 1.7, against none at the sample size.

**Fix.** Replace, never layer. (1) In src/core2/modules/jobs.ts, drop `* (row.openingScale ?? 1)` from `observedStaff`. (2) Delete the `openingScale` field from `EmployerRow` and its writers in `open` and `registerEmployer`, since no other reader uses it (`git grep -n openingScale -- src` lists them all). (3) Run src/core2/counted-weight-release.test.ts in both cases. The drawn case failed on Nov 11 on a different check, "the sample world's weights: expected 1327.9 to be 1" (Wichita, Kansas, base 0930f1635339f81e). If it still does, that is a separate cause (a sample-size build with weights above 1). File it as its own item with the place and seed, and do not change the test. (4) Count the removed field in the PR body.

**Time box.** 2 hours for one Sonnet session; each run of the Washington case takes about 12 minutes. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: a fill-in moves no employer's heads and an employer's counted staff follows its sales, never a fixed share. One model, two tiers: a counted group's staffing follows the same rule as a full employer's, times its count. No dice. Red main comes first.

**Done when.** A second session (not the builder) runs src/core2/counted-weight-release.test.ts on main and sees the Washington, D.C. case pass (seed dc-closures-a), and the drawn city case pass or a separate item filed for the sample-weights check with its place and seed. In dev mode it opens Monroe Trucking's card in Washington, D.C. at Census size after a played year and sees its staff and its sales-supported staff near each other, citing organization_62c301b7c927f6ee.

**Waits on.** Nothing.

**Files.** src/core2/modules/jobs.ts, src/core2/counted-weight-release.test.ts

**Notes.** TODO

**Notes (Fable's check, Nov 10).** How to find the cause: run src/core2/counted-weight-release.test.ts at the two named places on today's main; if it is still red, bisect main between the commit where it last passed and fa97c57fc5 with that one test. The fix then restores staff following sales at Census size, at the line that change touched, and never loosens the test.

**Notes (re-run, 2026-11-11, main 79d23fa596).** `WEIGHT_RELEASE_KEY=1150000 WEIGHT_RELEASE_SEED=dc-closures-a npx vitest run src/core2/counted-weight-release.test.ts` (Washington, D.C.): still red: "expected 4.482247597547775 to be less than or equal to 1.6780313630358783" (organization_62c301b7c927f6ee 55.4/12.4, organization_40122d8e46bcac2a 1354.3/334.6). `WEIGHT_RELEASE_KEY=2079000 WEIGHT_RELEASE_SEED=0930f1635339f81e` (Wichita, Kansas): the Washington case fails the same way, and the pinned case fails: "the sample world's weights: expected 1327.941996153882 to be 1". Fresh draw `GOLDEN_PATH_SEED=17d959027ccbe10f`: the Washington case fails the same way. Still red. Each run took 12 to 14 minutes.

Nov 11 (cause finder for Fable B): traced on main d64255aa with a probe that logged the worst employers' heads and `salesStaff` over a played year at Census size, then proved by removing the `openingScale` division in a working copy. The Washington case passed, and the change was undone. A first guess, the per-record `unplacedWorkers` fix from world-census-scale-foundings-above-sample, did not turn this test green on its own, so the two causes are separate.
