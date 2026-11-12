---
id: business-never-adds-location-part-2-all-markets
title: "One founding in a month no longer ends the evaluation of the other markets"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-business-never-adds-location-part-2-all-markets
pr: #8667
after:
blocked-on:
lead: jobs
source: split from business-never-adds-location in the pool redo, Nov 10, 2026
standard: 2
model: sonnet
effort: medium
root: none
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:37:01.387Z
---

**What.** The monthly founding pass sorts the markets by score and returns out of the function on the first founding, so a market that wins every month keeps every other market from being evaluated. In Cochituate, Massachusetts that left no market but manufacturing ever tried from April on. Evaluate every market each month, so a founding in one does not stop a founding in another. Seen: the town's business list, where one founding in a month no longer blocks every other market from getting a new business.

**Cause.** Found in code: src/core2/modules/business.ts `foundings` (line 1721) returns on the first founding ("a founding returns out of this function" in its own comment), so later markets in the sorted list are never evaluated that month.

**Fix.** Replace the early return with a loop that evaluates every market for the month and founds in each that clears its own score. Keep the per-market founder pool so one person does not found twice.

**Time box.** 3 hours for a Sonnet session.

**Rules.** No dice: a business adds a location or a founder opens one because its own books, market room and owner decide it, never a yearly chance; real BDS rates check the totals only. Ranges are not targets (owner, Nov 8): nothing is pulled to the BDS range. One rule, all 56 places: the parameters live in data and the fix names no place.

**Done when.** A second session, in Cochituate, Massachusetts (a drawn place, seed 93a558a5898ee167fd5c49b69a4183c546da870c3754f7688faeb29392d6d4dc), plays months in the played world and sees a month in which two different markets each have a founding row, by founding record id. A test in src/core2/business.test.ts shows two markets founding in one month and fails with the early return back.

**Waits on.** Nothing.

**Files.** src/core2/modules/business.ts, src/core2/business.test.ts

**Notes (Fable, Nov 10).** A second place shows the same pattern. In St. Johnsbury, Vermont (5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4, one played year on main cb25bfa5c8) exactly one business was founded on the first of each month from 2025-03-01 to 2026-01-01, and all eleven are manufacturing (organization:founded:manufacturing:person_3af1a494d4504b3b:2025-03-01 is the first).
