---
id: world-new-homes-moves-not-reached
title: "No household moves into a new rental in a played year (five drawn places)"
area: world
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #4659
blocked-on:
source: "found by world-new-homes-finish"
claimed-at:
---

**What.** In a 365-day run of the played world (`buildBenchWorld`, two-level) in five drawn places (Greenwood, Delaware; Tuckerton, New Jersey; Millville, Delaware; Kent City, Michigan; Madisonville, Tennessee; seeds mv1 to mv5), the housing module's `moves` table stayed empty: no household moved into a new rental, so the director and the news never read a `housing.moved` event, and no rent was capped (none of the five has rent stabilization). The occupancy path and the cap are proven only by fixtures in `housing-construction.test.ts` and the controlled edge case in `housing-laws.test.ts`. Find why completed rentals are never occupied in a year (no completed project, no vacancy, or no tenant who passes the rent-savings test) and make a move fire from causes.

**Rules.** No dice: rents, income, cash and the law decide who moves. Wire to the world: a move changes a named tenant's rent and a unit's occupancy. An effect is a read: the director's ledger or the news must read the move record. One rule, all 56 places.

**Done when.** In a one-year played world in a drawn place with rent stabilization, a move record id appears in the director's ledger or the news, and a lease renewal record id carries the capped rent and its law id; housing-laws.test.ts and housing-construction.test.ts pass.

**Files.** src/core2/housing-occupancy.ts, src/core2/housing-construction.ts, src/core2/modules/housing.ts

**Notes.** Found by world-new-homes-finish. The director reads every event (`eventKinds: ["*"]`), so a watched person named on a `housing.moved` event gets a moment, but it was never exercised. Probe: build the bench world, advance 365 days, read `api.moduleState("housing").table("moves")` and the director ledger.

Sent back 2026-10-16 from PR #4659 (branch claude/new-homes-moves): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
