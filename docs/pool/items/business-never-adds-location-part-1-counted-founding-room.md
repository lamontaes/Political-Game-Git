---
id: business-never-adds-location-part-1-counted-founding-room
title: "A counted founder weighs a market's room before founding there"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #8706
after:
blocked-on:
lead: jobs
source: split from business-never-adds-location in the pool redo, Nov 10, 2026
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-business-never-adds-location-part-1-counted-founding-room
---

**What.** In Cochituate, Massachusetts the wider-population branch of foundings (the counted founder, `strongestPulls(api, "found", rows)`) founds a business in the top market every month, in this world manufacturing, whatever its room, so foundings pile into one market. The full-person branch weighs market room; the counted branch carries a baseline and unemployed and prospect terms that ignore it. Make the counted founding weigh market room the way the full-person branch does so foundings spread across the markets that have room. Seen: the town's business list and its jobs and Metrics numbers, where every new business no longer lands in one market.

**Cause.** Measured: Cochituate, Massachusetts (2514570), world seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc, played to September 5, 2025 on the train at b22cd35098, with a temporary print in the counted branch of `foundings` (src/core2/modules/business.ts) and a list of every business opened after the first day (neither committed). The counted branch is not the one founding. In eight months it founds nothing: about 3,500 counted candidates weigh each of 20 markets, their scores run from -8.4 to -14, and the pulls add up to 0.08 of one founding a month (the carry reaches 0.30 by June). The seven businesses opened are all founded by full people, one in manufacturing on the 1st of each month from April to September and one inn in July. Each manufacturing founding's own record says how little room there was: demand 1.9 percent above capacity in April, 0.7 in May, 0.1 in June and 0.0 in July, August and September. Found in code: `gapsOf` in `foundings` is `Math.max(0, row.room * row.incumbents.length - 1)`, so a market with less than one business's worth of room gives a founder a room term of exactly zero, the same as a market with almost one. Nothing pulls against founding where there is no room, so a full person whose other reasons clear the bar (out of work, the market's prospect, capital in reach) founds anyway, and manufacturing, weighed first, takes one a month (a market founds at most once a month). The owner's expansion a few lines below reads the same room without the floor (`market.room * market.incumbents.length - 1`), so a full market does pull against a new location.

**Fix.** One room term for both: `gapsOf` returns `row.room * row.incumbents.length - 1` without the floor, so a market short of one business's room pulls against a founding by `businessFoundRoomWeight` times the shortfall, for a full person and for the counted branch alike. The title's premise (the counted branch ignores room) is not what the train does; the counted branch needs no other change.

**Time box.** 4 hours for an Opus session.

**Rules.** No dice: a business adds a location or a founder opens one because its own books, market room and owner decide it, never a yearly chance; real BDS rates check the totals only. Ranges are not targets (owner, Nov 8): nothing is pulled to the BDS range. One rule, all 56 places: the parameters live in data and the fix names no place.

**Done when.** A second session, in Cochituate, Massachusetts (a drawn place, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc), runs three years in the played world with `src/core2/tooling/m1-08-check.ts` and sees the foundings spread over several markets, listed by founding record id with each market's room, not one market every month. A test in src/core2/business.test.ts fails when the counted founder ignores room.

**Waits on.** Nothing.

**Files.** src/core2/modules/business.ts, src/core2/data/business/parameters.json, src/core2/tooling/m1-08-check.ts, src/core2/business.test.ts

**Notes.** Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:28 UTC) on branch claude/pool-business-never-adds-location-part-1-counted-founding-room. Old Fix, set aside because the room term is already there (opus-d23b, Nov 11, PR #8706): "Add the market's room to the counted founder's score by the same term the full-person branch uses. Calibrate the baseline through the parameters file as TUNABLE with its spread; add no cap. Check the totals against BDS entry only as a report."

Released (2026-11-11): The Cause differs from the code: the counted score already has the room term (business.ts:1974); the likely cause is the floored gapsOf plus summed pulls, see PR #8706. Continue on branch claude/pool-business-never-adds-location-part-1-counted-founding-room and pull request #8706.

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:34 UTC) on branch claude/pool-business-never-adds-location-part-1-counted-founding-room.

Released (2026-11-11): The Cause differs from the code (room is already in the counted score); rewritten as Needs cause, see PR #8706. Continue on branch claude/pool-business-never-adds-location-part-1-counted-founding-room and pull request #8706.

**Notes (Fable B, Nov 15).** Cause found on the train; see Cause. `strongestPulls` keeps one carry for all markets (`pulls:found`), so when the counted pulls do add up to one, the market being weighed at that moment takes the founding; at Cochituate they never add up, so that was not what happened here. Not measured: the same world after the fix.
