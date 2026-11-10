---
id: play-day-starts-at-own-wake-time
title: "A controlled person's day starts at their own wake time, not one 7:00 AM for everyone"
area: play
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
standard: 2
lead: play-first
model: sonnet
effort: medium
root: rc2-done-from-records
source: Stand-in triage, Nov 10, 2026 (SG-PLAY-day-start-minute)
---

**What.** Every controlled person's day starts at 7:00 AM (`playerDayStartMinute`, 420). Day, Week and a calendar jump land on it, and the director's home scenes wait for it. A night-shift nurse and a retiree both wake at 7. This closes stand-in SG-PLAY-day-start-minute.

**Cause.** Found in code: src/bench/player.ts line 217 (`dayStartMinute()` returns one parameter) and src/director/ledger.ts line 1618 (`opens` falls back to the same parameter). The core keeps no wake time per person.

**Fix.** Add a wake-minute read in src/bench/player.ts `dayStartMinute(personId)`: the minute before the person's first work span of the day from `workSpansOf` (src/bench/places.ts), else a default by age band from a table of American Time Use Survey waking hours by age and employment (source it, tag SOURCED or ESTIMATED with spread, in src/core2/data/parameters.json beside `playerDayStartMinute`). Read it in the day driver and in src/director/ledger.ts line 1618 for the controlled person only (monthly cost: none, one read per Day press). Keep `playerDayStartMinute` as the fallback for a person with no work record, and say so in the stopgap row.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: wake time comes from work spans, age and employment. Estimate, never UNKNOWN: the fallback is the sourced average, marked an estimate. One rule, all 56 places. Speed: one read per Day press, no scan.

**Done when.** A second session, on main in a drawn place (place and seed named), makes a person with a night shift (or a school-age teen) the controlled person, presses Day, and sees the day land on that person's own wake minute, different from 7:00 AM, with the home scene opening then. A test in src/bench/player-day-morning.test.ts covers a shift worker and a person with no work record; SG-PLAY-day-start-minute is resolved or rewritten to the fallback only.

**Waits on.** Nothing.

**Files.** src/bench/player.ts, src/director/ledger.ts, src/core2/data/parameters.json, src/bench/player-day-morning.test.ts, src/core2/data/stopgaps/play.json
