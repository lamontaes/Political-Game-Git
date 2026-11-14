---
id: tests-government-staffing-ward-charter-no-employer
title: "The government law test finds no employer reached by administration staffing in a ward-charter town"
area: laws
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-tests-government-staffing-ward-charter-no-employer
pr: #8790
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
checked:
claimed-at: 2026-11-11T09:43:46.932Z
branch: claude/pool-tests-government-staffing-ward-charter-no-employer
---

**What.** src/core2/law-wiring-government.test.ts fails on seed 446eaae155bdacc270446225a696c32454dda4b0 at its fifth attempt, the ward-charter fallback place 3050200: administration staffing applied to an employer, expected more than 0 and got 0. The first four drawn places had at-large councils, so the test fell back to a charter town with ward seats. Whether the town has no administration employer to staff, or the staffing reach misses one it has, is not yet known. Guards: a raised administration staffing line pays an employer in a ward-charter town, on the budget the player reads.

**Cause.** Measured: the hire comes, but only after the second monthly job-finding review, about 77 days after the change, and the test stops looking at day 35 (63 in the reverted attempt). A counted seeker applies to a local opening only once their finding progress (`regionalPull`) reaches one, and that progress is added once a month in `reviewRegionalFinds` (src/core2/modules/jobs.ts, the `pull >= one` branch near line 2186), which holds a seeker for local matching only when an opening in their place is already fillable (`fillableOpenings`, line 3030, after `vacancyDays`). Measured on main with GOLDEN_PATH_SEED=446eaae155bdacc270446225a696c32454dda4b0 in the ward-charter place 3050200, with probes in a working copy of the test (undone after): the line posted position:organization_7ed6e92cecd177b2:2025-01-23:budget-line:administration:0 on 2025-01-23; through 2025-03-26 none of 207 to 213 unemployed counted seekers there was ready (pulls: max 0.998, median 0.529 on 2025-02-26 and 0.570 after the March review); at the April review 109 were ready (median 0.830), and in the week to 2025-04-09 person_f2f2dacf390a9725 was hired into that position with a `hired-on-budget-line` row on the group, after which the test passed 3 of 3. Not traced: on the other builder's seed 9f8e7d6c5b4a3921 (place 1825000) the organization staffing row was missing too, which this cause does not explain.

**Fix.** Change the test only: after the 35 days, play on a week at a time until a `hired-on-budget-line` row appears for the administration line or 120 days have passed since the change (two monthly reviews after the longest vacancy wait), then assert as now, logging the day of the hire and the position id. Where no organization staffing row exists at all, find why for that place before passing it over (the 1825000 case); do not shorten the vacancy wait or change the finding pace for this.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why (owner, Oct 14): name the cause by record before changing the test. Never weaken a test to get green: if the place truly has no administration employer, the test draws again and names the place it passed over; if the reach misses one, fix the reach. One rule, all 56 places.

**Done when.** A second session runs src/core2/law-wiring-government.test.ts on seed 446eaae155bdacc270446225a696c32454dda4b0 and on three fresh seeds and sees every run pass, each naming its place and the employer the staffing reached by record id. The cause is named by record id in the item Notes.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-government.test.ts, src/core2/law-reach/group-a-staffing.ts, src/core2/modules/jobs.ts, src/core2/data/jobs/vacancy-duration.json

**Notes.** TODO

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/law-wiring-government.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=446eaae155bdacc270446225a696c32454dda4b0. Still red. First failing assertion as printed: `AssertionError: seed 446eaae155bdacc270446225a696c32454dda4b0, ward charter 3050200 (3050200), attempt 4: someone hired on the raised administration line: expected 0 to be greater than 0` at src/core2/law-wiring-government.test.ts:334.

Cause found (Nov 11, 2026, cause finder for Fable B): the staffing reach did reach an employer (staff-funded, 3 positions); the hire is missing only because the test looks before the opening's vacancy wait ends. The first four draws for this seed have at-large councils, so this seed always lands on the ward-charter fallback and always hits the short horizon.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 09:06 UTC) on branch claude/pool-tests-government-staffing-ward-charter-no-employer.

Released (2026-11-11): Cause does not hold: with the item's fix (play on weekly to 63 days after the change) the ward-charter draw still has no hired-on-budget-line row at day 63 on seed 446eaae155bdacc270446225a696c32454dda4b0 (place 3050200) and on fresh seeds a1b2c3d4e5f60718 (3314200) and 9f8e7d6c5b4a3921 (1825000); on the last the organization staffing row is missing too, so the reach itself misses an employer. Needs a new cause find. Continue on branch claude/pool-tests-government-staffing-ward-charter-no-employer.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 09:16 UTC) on branch claude/pool-tests-government-staffing-ward-charter-no-employer.

Released (2026-11-11): Cause does not hold: weekly play to 63 days after the change still leaves no hired-on-budget-line row on seeds 446eaae155bdacc270446225a696c32454dda4b0 (place 3050200), a1b2c3d4e5f60718 (3314200), 9f8e7d6c5b4a3921 (1825000); on the last the organization staffing row is missing too. Test change reverted; needs a new cause find. Continue on branch claude/pool-tests-government-staffing-ward-charter-no-employer.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 09:16 UTC) on branch claude/pool-tests-government-staffing-ward-charter-no-employer.

Released (2026-11-11): Cause does not hold (see earlier release note: no hire after 63 days on three seeds); needs a new cause find, not another build attempt. Continue on branch claude/pool-tests-government-staffing-ward-charter-no-employer.

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 09:21 UTC) on branch claude/pool-tests-government-staffing-ward-charter-no-employer.

Released (2026-11-11): The Cause does not hold (three releases say so); rewritten as Needs cause on pool/notes-2026-11-11-10 (31523b368aa9), not rebuilt. Continue on branch claude/pool-tests-government-staffing-ward-charter-no-employer.

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 09:23 UTC) on branch claude/pool-tests-government-staffing-ward-charter-no-employer.

Released (2026-11-11): Cause found by probe (the hire comes after the April job-finding review, about 77 days after the change); written on pool/notes-2026-11-11-10 (0806785e43f1) with checked cleared for Fable's check; not built. Continue on branch claude/pool-tests-government-staffing-ward-charter-no-employer.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 09:43 UTC) on branch claude/pool-tests-government-staffing-ward-charter-no-employer.

Set to Needs cause (opus-d23b, Nov 11): `next` handed this out four times in 20 minutes after three releases saying the cause does not hold. The old Cause read: "Found in code: the opening is posted and simply cannot be filled before the test looks. The test (src/core2/law-wiring-government.test.ts lines 247 to 334) raises the city's administration line and then plays 35 days. The staffing round runs the next day and posts the funded opening (src/core2/law-reach/group-a-staffing.ts lines 311 to 321, `postFundedOpenings`). The weekly matching takes an opening only once it has waited its vacancy time (src/core2/modules/jobs.ts `fillableOpenings`, line 3030, and `vacancyDays`, line 3060): the JOLTS openings-to-hires months of the employer's industry, and a city government has no industry row, so it takes `total-private`, 1.17 to 1.62 months, 36 to 49 days (src/core2/data/jobs/vacancy-duration.json). Measured on main (Nov 11) with the item's seed, probes in working copies of the test, the staffing reach and jobs.ts, all undone after: in the ward-charter place 3050200 the line funded 3 positions at organization_7ed6e92cecd177b2 against 2 named staff, the round posted position:organization_7ed6e92cecd177b2:2025-01-23:budget-line:administration:0 (a municipal clerk) on 2025-01-23, 207 counted seekers lived in its place, and on 2025-02-26 (34 days later) it was still open and had never entered the weekly matching." The old Fix read: "Change the test only: after the 35 days, keep playing a week at a time, up to 63 days after the change (the longest vacancy wait plus two weekly rounds), until a `hired-on-budget-line` row appears for the administration line, then assert as now; log the day the hire came and the position id. Do not shorten the vacancy wait."

Cause found (opus-d23b, Nov 11, 09:35 UTC): the probe above; the test was not changed on any branch. Left for Fable's check before anyone builds it.

**Notes (opus-5234, Nov 11).** The item's 63-day wait was tried (commit 3374f848dfc) and still failed. The cause is one step further, found with a probe in `runWeek` (src/core2/modules/jobs.ts), undone after. Opening position:organization_7ed6e92cecd177b2:2025-01-23:budget-line:administration:0 (place jurisdiction_6c6513e992a009d9) became fillable on 2025-03-03. At the weekly rounds of 2025-03-03, 03-17 and 03-24, 214 seekers lived in its place and none was ready (finding progress at one), and the only applicant was the player. A seeker is held for local matching only when, at the monthly jobs review on the 1st (`reviewRegionalFinds`), an opening near them is already fillable; otherwise a seeker reaching one takes a regional job at once. The March review (2025-03-01) came two days before the opening's wait ended, so the first seekers held for it come at the April review (2025-04-01), 68 days after the change. The test now plays on to 98 days (the longest wait, a month to the next review, two weekly rounds) and names the hire.
