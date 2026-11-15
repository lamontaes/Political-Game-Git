---
id: tests-campaign-outside-donors-no-poll
title: "campaign-outside-donors.test.ts files on the opening day, before any state or federal race opens for filing"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-tests-campaign-outside-donors-no-poll
pr: #8749
blocked-on:
source: added with npm run pool -- add
after:
lead: wire-elections
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T07:58:02.759Z
branch: claude/pool-tests-campaign-outside-donors-no-poll
---

**What.** src/core2/campaign-outside-donors.test.ts fails on clean main: 'no wider race with outside gifts in 6 places' (GOLDEN_PATH_SEED=pet-run-1: Strasburg, North Dakota; Onaway, Idaho; Amsterdam, Ohio; Mountain City, Georgia; Lake Point, Utah; Big Coppitt Key, Florida). No campaign ever starts: the test files on the opening day, and no state or federal race is open for filing then. The Oct 28 symptom (a 2030 Senate campaign that bought no poll) is gone with it. Guards: a statewide campaign's outside donors and its poll, which the player sees on the campaign screen.

**Cause.** Found in code: the test (src/core2/campaign-outside-donors.test.ts lines 65 to 84) files with `fileCandidacy` for a contest from `openContests` on the opening day, and `openContests` (src/core2/modules/elections.ts line 786) returns only contests whose `filingOpens` is null or past. Measured on main d99dec8e with the test's own draws: Strasburg, North Dakota has 36 contests, none with `filingOpens` null, and its first state or federal window opens 2026-02-05 (U.S. Representative, Attorney General, Secretary of State; deadline 2026-04-06); Onaway, Idaho has 29, the first opening 2025-12-29 (U.S. Senator, U.S. Representative, Governor). On the opening day (2025-01-20) `openContests` is empty in both, so `filed` stays undefined, each draw is skipped without a log line, and the run ends in 36 seconds with the error. The file's own header already says wider races file in windows that open after the first year.

**Fix.** In the test, for each drawn place, read the contests table for the earliest state or federal contest whose `filingOpens` is within two years of the opening, advance the world to that date with `advanceCore` (the drawn-place-tests skill's draw-and-wait), then file through `fileCandidacy` as now and run the 120 turns. Log a line for each place passed over that says why (no wider contest within two years, or every filing refused, with the refusal). Keep every assertion. If the year of advancing makes the test too slow, run the turns against the contest whose window opens first and say the place's year in the log.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why: find why a funded statewide campaign buys no poll before changing the race the test picks or its turns; never weaken a test to get green. One rule, all 56 places: the test draws from all 56 places and names those it passes over.

**Done when.** A second session runs the outside donors test on three fresh GOLDEN_PATH_SEED draws in the played world (buildBenchWorld) and sees every run pass, each naming the place, the seed, the date it filed and the poll record id, or naming each place it passed over and why.

**Waits on.** Nothing.

**Files.** src/core2/campaign-outside-donors.test.ts, src/core2/modules/elections.ts, src/core2/modules/campaigns.ts

**Notes.** lead: elections. Found by the elections wire session while running the petition line's tests; identical on clean main with the vacant-seat fix.

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/campaign-outside-donors.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=pet-run-1. Still red, now at a different line than the item's description. First failing assertion as printed: `Error: no wider race with outside gifts in 6 places; Strasburg, North Dakota (3876500), seed 273562d7baee41cdcec1eb38d32cc89d442587e61b63a699457dcb3bdc5b2cf1; Onaway, Idaho (1658870); Amsterdam, Ohio (3901938); Mountain City, Georgia (1353116); Lake Point, Utah (4942010); Big Coppitt Key, Florida (1206350)` at src/core2/campaign-outside-donors.test.ts:135.

Cause found (Nov 11, 2026, cause finder for Fable B): reran the test with pet-run-1 (red in 36 s, no campaign log line) and probed the first two draws: no contest is open for filing on the opening day, and the first wider windows open 11 to 13 months later. Whether a funded campaign buys a poll could not be checked, since none starts.

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 07:57 UTC) on branch claude/pool-tests-campaign-outside-donors-no-poll.

Fixer F3 (Nov 14): Measured: the zero polls in East Charlotte, Vermont came from the test's filer (the richest adult), whose deliberation is -2: the campaign's poll share is pollSpendShare times max(0, 1 + spendTraitWeight times deliberation), exactly zero, by design. The test now files a resident whose poll share is above zero and is pinned to Cotulla, Texas (4817216, place seed 55e25c5754f41760a27bd4a36f84d3e00ad6e7e8bfdbe38fabe9b1ac5b0da972): filed 2025-10-09 for U.S. Senator, 180 outside gifts, 155 polls, 76 s. Other drawn places hit a separate defect, filed as elections-wider-race-no-outside-gifts-and-residency-refusals.
