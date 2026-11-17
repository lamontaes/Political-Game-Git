---
id: core-state-unemployment-fit-uses-the-stepped-people
title: "The player's own state loses its unemployed within months: the first month's hiring fit used the whole state's rate against the people left once the played county is out"
area: core
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: World B (session_01S4WSHpbFr2ZPeKGmsKQPbC)
pr: 9810
after:
blocked-on:
lead: money
model: fable
effort: high
root: none
source: CTO line on the crew's thread #9747, Nov 17, 2026, 01:01Z; found by Screens on the Metrics page and traced by World
---

**What.** The state the player lives in shows its unemployment rate falling toward zero in the first months of every game, while every other state holds steady. Metrics, the state's budget and the news all read that rate, so the player's state looks like a place where nobody is out of work.
Seen: Metrics shows the state's unemployment as 0.18 where the game opened it at 3.32.

**Cause.** Measured: at Waimanalo, Hawaii (place 1578050), seed `waimanalo-registry`, by `buildBenchWorld` played six months with a print in `stepCountry` (src/core2/country-model.ts), on main c5808caa. The played town and its county are taken out of the state before it steps (`takeOutPart`), and on day one their count holds 503,863 people at work and none looking. The rest of Hawaii, 183,152 at work, is left holding all 24,498 of the state's seekers: 11.8% against the state's 3.3%. The month-1 fit of the state's matching efficiency (`steadyHires`, about line 1665) then used `state.unemploymentMonths.at(-1)`, the whole state's rate, against the rest's people. It asked for 24,782 hires out of 31,685 seekers in one month and fixed that speed for good (`matchEfficiency` 1.22; Wyoming 0.17 and California 0.10 in the same run). The seekers left were 7,926, then 2,722, 1,515 and 1,270, and the state read 3.32, 0.23, 0.06, 0.02, 0.013.

**Fix.** In `stepCountry`, the month-1 fit reads the share looking among the people the tier steps, taken after the part comes out, and the view of recent months that `demands` reads starts from the same people. No real figure is read and nothing steers the rate. The player sees it on Metrics as a state rate that holds where it opened and then moves with the state's layoffs and hiring.

**Time box.** 4 hours for one top-model session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the fit reads the stepped people's own share in every state. No dice: nothing is drawn, the rate follows layoffs, postings and moves. Calibration only: no real percentage is read or steered toward anywhere.

**Done when.** A second session starts the bench in a drawn place, for example Shannon Colony, South Dakota (seed 5cfc73cac36a for `scripts/dev-tests/state-rate-years.ts`), plays ten years, and sees on Metrics that the state's unemployment rate does not fall toward zero and moves up and down with the state's jobs. `npx vitest run src/core2/country-model.test.ts -t "nobody is on record looking"` passes there and fails on main c5808caa.

**Waits on.** Nothing.

**Files.** src/core2/country-model.ts, src/core2/country-model.test.ts, scripts/dev-tests/state-rate-years.ts

**Notes.** A second fault stays open and is not in these files: the played county counts almost nobody as looking (0 on day 0, 960 of 597,000 adults on Feb 1), because `residentsPart` (src/core2/modules/residents.ts) reads seekers only from the jobs engine's `seekers` and `countedSeekers` rows. Posted for the CTO on #9747, comment 6934735239.
