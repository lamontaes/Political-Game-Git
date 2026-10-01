# Newspapers stop advancing court cases

The newspaper's weekly sweep no longer advances prosecutions or clemency petitions. Existing court due items retain that work. Controlled fixtures check a newspaper-only boundary and a court-only boundary for the same saved case or petition. Load recovery remains a separate gap: the recovery function exists, but the checked main has no production caller.

## 1. Why-chain

The old newspaper sweep advanced cases because it called both court advancement functions before processing news. Those functions inspected saved referrals and petitions because those records supplied the case stage and deadlines. A case progressed when its saved stage was due and its existing court prerequisites permitted progression. The replacement calls the same court writers from their already-composed due-item handlers. The chain bottoms out at an actual saved stage or petition and the existing actor decision, rather than a newspaper publication date.

## 2. Research

This removes an unrelated caller; it does not introduce a court delay or sentence estimate. The existing charge and trial delays remain explicitly UNRESEARCHED. Their statutory timing replacement belongs to A107. No study coefficient, calendar interval, rate, or outcome level is added here.

## 3. Revisions

The weekly sweep still runs its existing news, disaster-reaction, spending, scrutiny, ownership, and misconduct work. Its two court imports and nested court call are removed. The court handlers, saved IDs, deadlines, actor guards, and recovery function remain intact. An unseated court still cannot decide a case.

## 4. What gets built

1. Remove court advancement from the newspaper handler.
2. Renew the existing five-place prosecution fixtures against the composed court handler. A due case reaches charging and accepts a plea without a newspaper sweep.
3. Renew the existing five-place petition fixtures against the composed clemency handler.
4. Fork each fixture through a newspaper-only due boundary and require its justice records to remain unchanged.
5. Preserve repeat and canonical save/reload checks and the original 30-second limits.

## 5. Simulated, records, world pieces, checks

SIMULATED: existing court actors and petition decisions retain their existing inputs and choices. RECORDS: canonical stage and petition due items retain the actual subject, saved activity, and date. WORLD PIECES: both court registries are composed on checked main. CHECKS: newspaper-only delivery leaves justice records unchanged; court delivery matches the existing prosecution writer and preserves repeat/reload behavior. Missing load recovery is reported rather than replaced with polling or a guessed retry.

## 6. Proof run

The fixture selection draws five places from all 56 using `team9-g10-floor-five-20260930`: Iowa, Louisiana, Texas, Connecticut, and North Dakota. Each test uses an actual generated named person. Unrelated opening commitments are canceled through the canonical writer, with their records retained; this is a controlled boundary proof, not an uninterrupted year of play.

The first run on the preserved A102 parent returned 8 passes and 2 prosecution timeouts with concurrent file workers. Its JSON receipt remains at `/tmp/team9-a10-tests.json`. The current-main renewal passed all 10 cases in 260.65 seconds using one file worker with unchanged assertions and 30-second limits. Prosecution cases took 21.89–27.80 seconds; petition cases took 18.51–27.27 seconds. Exact named records and the preserved earlier failures are recorded in `a10-independent-court-clock-proof.json`. Nationwide play, a year run, browser actions, and load recovery integration are not established by these tests.

## 7. Worked example

The prosecution fixture's saved referral for George Vance in Iowa is due on March 6, 2026. The newspaper-only branch must leave that referral without a charge. The court-only branch must save his charge on that date, permit his plea, and schedule the next stage from the saved charge. The petition fixture separately names Quentin Waller and retains his original petition through its actual due boundary. These are controlled records, not invented court payments or a claim about natural-play sentencing rates.

## Source and remaining work

The additive production/test commit is `974b3d4801a383ba64c6eedaff3f890d1d5667a2`, based on main `2e78c9c155e6dcfbf400f21cad56266c2dcfc97b`. The A102 branch and both untracked research files remain preserved. No shared composer, court schema, clock, law map, or other team's writer is edited.

Audit owns the missing opening/load recovery connection. A103 follows: its researched first-offense ranges still need an admitted grade/applicability and numeric judge-choice contract before the existing sentence writer can consume them safely. A100 follows that row.

Scoped TypeScript checked 995 files with 0 diagnostics. Changed-file lint, formatting, report check, diff check, and zero-dice passed. The release check fails on unchanged main declaration `ci-changed-tests-only.md` for the word “merge”; candidate and main both have blob `d6c9921a82b800d9c0b27d0a9da55c2feb676ff8`. The main-to-main comparison reproduces that failure. No unrelated declaration was changed.
