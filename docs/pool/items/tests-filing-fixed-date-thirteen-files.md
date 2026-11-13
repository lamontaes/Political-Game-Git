---
id: tests-filing-fixed-date-thirteen-files
title: "Thirteen tests file for a race on the start date in a drawn place, and fail by draw wherever the filing window opens later"
area: elections
kind: bug
priority: 3
size: M
status: claimed
standard: 2
claimed-by: claude/red-main-filing-fixed-date-core2
pr:
blocked-on:
source: fixer of tests-door-pledge-turnout-race-open-by-draw (PR #8902), Nov 12, from the coordinator's order
after:
lead: governing
model: sonnet
effort: medium
root: none
checked: fable 2026-11-12
claimed-at: 2026-11-13T01:19:11.304Z
---

**What.** Thirteen test files build a world in a drawn place, read `openContests` on the start date and file for what is open, without moving the clock to the day a window opens. Each is a red by draw waiting for a seed whose drawn place has no window open on that day; `src/core2/door-pledge.test.ts` was the first (eleven of twelve places, seed f26db0f13c6bffec4a68430111c0bdb5), and race-told-scene was another on Nov 12. The files and the line where each files:

- src/core2/campaign-calibration.test.ts:87
- src/core2/record.test.ts:164
- src/core2/donor-meeting.test.ts:97
- src/core2/campaign-day.test.ts:102
- src/core2/ballot-order.test.ts:171
- src/core2/parties.test.ts:142
- src/core2/campaign-door-balance.test.ts:74
- src/core2/campaign-money-calibration.test.ts:114
- src/core2/door-fill-in.test.ts:56
- src/bench/player-day-morning.test.ts:58
- src/bench/scene-hours.test.ts:51
- src/bench/campaign-mail.test.ts:84
- src/bench/donor-calls.test.ts:63

Seen: no player screen; these tests guard the filing, campaign and scene paths a player walks.

**Cause.** Measured: on clean main, `GOLDEN_PATH_SEED=f26db0f13c6bffec4a68430111c0bdb5 npx vitest run src/core2/door-pledge.test.ts` draws twelve places of which eleven (3427030, 1207375, 4079800, 0265800, territory:GU:tamuning and six more) have no open contest on 2026-01-05. Each contest's `filingOpens` comes from the nomination calendar's own dates (src/core2/elections-calendar.ts:462) or an estimate (src/core2/modules/elections.ts:632), and `openContests` (src/core2/modules/elections.ts:786) lists only contests whose window has opened and whose deadline has not passed on the world's date. A world opens on the start date (2026-01-05), when most places have no window open (Alabama's was; eleven of twelve drawn places in the door-pledge case were not). The files above read that date and, where a loop over `openContests` finds nothing, skip or fail ("no open race"). The engine is right; `advanceToFilingOpen(core)` (src/core2/gov-test-clock.ts:12) exists to move the clock to the first window and is used by `campaigns.test.ts`, `campaign-turn.test.ts` and `elections-filing.test.ts` (items `tests-filing-starts-where-filing-opens`, `campaigns-test-waits-for-filing-window`). The thirteen were not covered by them. Found by a grep for files that call `fileCandidacy` and draw places with no `advanceToFilingOpen`, `filingOpens` or clock advance in the file.

**Fix.** In each file, call `advanceToFilingOpen(core)` after the world is opened and before the first `openContests` (or wait week by week as `src/bench/election-day.test.ts` does where the file already plays on), keep every assertion, keep the draws from all 56, and name each place passed over. A file whose later dates depend on the start date (an election-day or age check read from `START`) reads `core.date` after the move instead. One run per file at a seed of the failing kind (a drawn place whose first window opens after January 5; `GOLDEN_PATH_SEED=f26db0f13c6bffec4a68430111c0bdb5` draws such places for the door-pledge file) and one fresh seed, `--maxWorkers=1`, a file at a time. One pull request per area (core2 files, bench files) is fine.

**Time box.** 3 hours.

**Rules.** One rule, all 56 places: a test that needs a race draws, waits for the window, and names each place and seed (`drawn-place-tests`). Never pin a place or seed, never weaken or skip an assertion. No dice.

**Done when.** A second session runs each of the thirteen files at a seed whose drawn place has no window open on January 5 and at a fresh seed, in a drawn place it names, and sees every file pass with the place and seed in its output.

**Waits on.** Nothing.

**Files.** src/core2/campaign-calibration.test.ts, src/core2/record.test.ts, src/core2/donor-meeting.test.ts, src/core2/campaign-day.test.ts, src/core2/ballot-order.test.ts, src/core2/parties.test.ts, src/core2/campaign-door-balance.test.ts, src/core2/campaign-money-calibration.test.ts, src/core2/door-fill-in.test.ts, src/bench/player-day-morning.test.ts, src/bench/scene-hours.test.ts, src/bench/campaign-mail.test.ts, src/bench/donor-calls.test.ts

**Notes.** Twins searched Nov 12: `tests-filing-starts-where-filing-opens` and `campaigns-test-waits-for-filing-window` (done, other files), `elections-filing-test-waits-for-filing-window` (dropped), `tests-door-pledge-turnout-race-open-by-draw` (door-pledge only, PR #8902). Not run: none of the thirteen was run; the list is from a grep and the line numbers are where each first calls `openContests` or `fileCandidacy` on main e298200245 plus the merge of 3fba4132b9.

**Notes (Red desk opus-red, Nov 13).** Built on `claude/red-main-filing-fixed-date-core2`, one pull request for both areas, because the clock helper changed with them. Each file waits with `advanceToFilingOpen` before its first `openContests`. `record.test.ts` waits for its own contest's `filingOpens`. Two changes beyond the plan. (1) `advanceToFilingOpen` takes `{ wanted, by }`: `donor-calls` and `campaign-money-calibration` wait only for a town or county race and at most 120 days, and they pass a place over by name otherwise. Waiting for any race cost Brandywine, Maryland (2409325) eleven months of played days (322 s), and donor-calls timed out at f26db0f1… (726 s, against 214 s on main). (2) `parties` and `ballot-order` now open laws: once the clock moves, the stand-in filing (`fileRunners` in src/core2/modules/candidacy.ts) reads the laws chain through `contestPositions`, and both threw "Module has no registered state." Reds that are main's own and fail the same on clean main 0fe39561: `campaign-mail` (a composed donation id resolves through `findRecord`; Horn Hill, Alabama 34c05193691935ba, Modena, Utah 2c89147eae23b180), `record` "no ballot cites the rival's attack ad" (5462764, 2c89147eae23b180), and `campaign-calibration` niche speech (Nebraska 3108640, b3fdabddcededcbb). One red is new because the test now gets past filing: `campaign-money-calibration` at 2c89147eae23b180 has 32 of 32 places, and the bands pass ($142 an hour, mean $155, median $105, 881 gifts), but Remerton, Georgia (1364596) gets no gift: 290 of 294 asked answered `not-warm`. On main the same seed fails earlier (26 of 32 places with a race). That one is for the campaigns lead.
