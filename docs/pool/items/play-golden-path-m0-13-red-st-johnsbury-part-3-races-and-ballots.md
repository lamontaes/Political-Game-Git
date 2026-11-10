---
id: play-golden-path-m0-13-red-st-johnsbury-part-3-races-and-ballots
title: "No race in a drawn place's year is left with no one on the ballot"
area: core
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-3-races-and-ballots
pr:
after: play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: rc2-done-from-records
source: split from play-golden-path-m0-13-red-st-johnsbury in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-10T22:56:11.886Z
branch: claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-3-races-and-ballots
---

**What.** In the played year of St. Johnsbury, Vermont, one of the three Selectboard races of March 4, 2025 has no one on the ballot, and a challenger who decided to run in another is not on it. Both filed and both petitions came up short of the 30 signatures the law asks for. Each had gathered 25 or more on the one day their campaign worked, and then did nothing for the five days left.

**Cause.** Found in code: `campaignWork` in src/core2/modules/campaigns.ts (line 6521) gives a race a campaign turn only when the days since its last turn are at least `every` (lines 6568 to 6572), and `every` is the turn interval times one plus the days left over the ramp (`campaignTurnDays` 3, `campaignRampDays` 60). For any day before the deadline that is more than 3, while the town's turns are scheduled exactly 3 days apart (`scheduleTurn`, line 612). So a race is worked at most every second scheduled turn, 6 days apart, even in the last days before its filing deadline or its election. Measured on main cb25bfa5c8 with GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125: the three contests (contest:seat:gus2025:114412:board:0, 1 and 2, election 2025-03-04) opened filing on 2024-11-28, before the world begins on 2025-01-20, and close on 2025-01-27. Four people decided to run on 2025-01-21 and filed. Each petition needs 30 signatures (17 V.S.A. 2681, read). All their signatures were gathered on one day, by the morning of 2025-01-23: 34, 32, 27 and 25. None was added on the next five days. On 2025-01-28 the clerk's check (`keepPetitionCheck`, src/core2/modules/elections.ts line 1470) put the first two on the ballot and left person_9f5ed9b7840b5e4d (seat 0, the challenger, 27) and person_84acc9b87903d9c7 (seat 1, the sitting member, 25) short. Seat 1 then had no one on its ballot.

**Fix.** In `campaignWork`, count the wait in whole scheduled turns: a race is worked when the scheduled turns since its last one are at least `every` divided by the turn interval, rounded to the nearest whole turn and never less than one. Near a filing deadline or an election that is every scheduled turn; far out it is every second or third, as now. Change no parameter. Then replay the seed: the two short petitions get a second day of doors before 2025-01-27. If either is still short with days left and doors unknocked, say so in the pull request with the day's door hours from `rivalDay` (line 6026), and do not add a rule that forces a signature.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every check M0-13 makes must hold in every drawn place's played year, so the failure is fixed at its engine, never by loosening the check. One rule, all 56 places: the repro place is a repro, not a rule; no place is named in logic. Red main comes first (owner, Oct 15). Ask why: the PR names the cause by file and line.

**Done when.** A second session runs the command in the Cause on main and sees all three St. Johnsbury Selectboard races of 2025-03-04 with someone on the ballot and the check "a named challenger runs" passing, then runs the played-world check in two more drawn places (names and seeds recorded) and sees no race left with no one on the ballot. A test in src/core2 names a drawn place and seed, and fails when a race with a petition out gets no campaign turn in the three days before its filing deadline.

**Waits on.** Nothing. The re-run its first part was to make is done (Nov 10, main cb25bfa5c8) and is in the Cause.

**Files.** src/core2/modules/campaigns.ts, tests/golden-path/played-world.node-test.ts, src/core2/campaign-turn.test.ts

**Notes.** Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 22:49 UTC) on branch claude/pool-play-golden-path-m0-13-red-st-johnsbury-part-3-races-and-ballots.
