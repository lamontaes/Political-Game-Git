---
id: core-state-unemployment-fit-uses-the-stepped-people
title: "The player's own state loses its unemployed within months: the played county is counted with everyone at work and no government jobs, and the rest of the state is fitted to the wrong rate"
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

**Cause.** Measured: at Waimanalo, Hawaii (place 1578050), seed `waimanalo-registry`, by `buildBenchWorld` played ten months with prints in `stepCountry` (src/core2/country-model.ts) and `residentsPart` (src/core2/modules/residents.ts), on main c5808caa. The played town and its county are taken out of the state before it steps and the tier steps the rest. Four faults stack.

1. `residentsPart` counts a sampled county's workers twice: each sampled worker is named by a county employer (`h.employment`, 369,000 people) and the record's `unplacedWorkers` (361,000) already counts the same workers. Every working-age adult of the county is at work (108,367 of 108,367, 219,055 of 219,055 and 159,631 of 159,631 by age band), so `resolveCountryPart` has no room for anyone looking and the rest of Hawaii is left with a third of its adults at work and all 24,498 of the state's seekers.
2. The county sample sorts its workers by Census County Business Patterns (`countySectorEmployment`, src/core2/town-employment-mix.ts), a survey of private employers. The played county holds no government jobs; the rest holds them all: 133,719 against 60,443 needed, 11,000 ended a month.
3. The rest's jobs are not in the state's proportions (24,389 jobs in education and health against 70,314 its people want staffed), so the rest hires and lays off until they meet.
4. The month-1 fit of the hiring speed (`steadyHires` in `stepCountry`) reads `state.unemploymentMonths.at(-1)`, the whole state's rate, against the rest's people: 24,782 hires asked of 31,685 seekers in one month, fixed for good (`matchEfficiency` 1.22; Wyoming 0.17 and California 0.10 in the same run). The state reads 3.32, 0.23, 0.06, 0.02, 0.013.

A record that stands for 2,380 households also had its one seeker counted as 2,380 people looking when half a worker in each had lost away work.

**Fix.** In `residentsPart`, a household's unplaced workers are its workers outside a recorded job, the count the world moves; the members a county employer names take them first and give their sector, and a seeker of a record that stands for many stands for the people without work. In `resolveCountryPart`, workers sorted by the private survey take the state's own government share (stopgap `SG-NATION-county-sample-no-government`). In `stepCountry`'s first month, a state with a part out reads the rest's own share looking, and each sector of the rest is balanced by the opening's rule (stopgap `SG-NATION-rest-buys-from-the-part-fixed-share`). No real figure is read and nothing steers the rate. The player sees it on Metrics as a state rate that holds where it opened and then moves with the state's layoffs and hiring.

**Time box.** 8 hours for one top-model session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: every state with a played part is read by the same four rules. No dice: nothing is drawn, the rate follows layoffs, postings and moves. One model, two tiers: a record that stands for many is counted times what it stands for.

**Done when.** A second session starts the bench in a drawn place, for example Shannon Colony, South Dakota (seed 5cfc73cac36a for `scripts/dev-tests/state-rate-years.ts`), plays ten years, and sees on Metrics that the state's unemployment rate does not fall toward zero and moves up and down with the state's jobs. `npx vitest run src/core2/country-model.test.ts src/core2/country-part-counts.test.ts` passes there and five of its tests fail on main c5808caa.

**Waits on.** Nothing.

**Files.** src/core2/country-model.ts, src/core2/country-model.test.ts, src/core2/country-part-counts.test.ts, src/core2/modules/residents.ts, src/core2/modules/macro.ts, src/core2/data/stopgaps/nation.json, scripts/dev-tests/state-rate-years.ts

**Notes.** Still open, for its own pull request: the opening's count of a sampled county's seekers. `openCountedSeekers` (src/core2/modules/jobs.ts, lines 944 to 1012) counts workers one per record and takes no county-named worker as at work, so the played county opens with about 300 people looking (Waimanalo: 296 of 582,521 adults) and climbs to about 5,000 over the first year as away work is lost. Posted on the crew's thread #9747, comments 6935090630 and 6935972874.
