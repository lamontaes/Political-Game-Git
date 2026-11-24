---
id: world-opening-world-has-no-special-elections-under-way
title: "An opening world carries no vacancies or special elections already under way, at the state or any other level"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: wire-office
model: opus
effort: medium
root: none
source: found while pinning the rival-campaign-day test, Nov 14, 2026; owner, Nov 14 19:27Z: "And not just town, but country and state. Remember, it's all one simulation."
---

**What.** The world must be in motion on its first day (owner's standing ruling, and Nov 14: town, state and country, one simulation). At Kirby, Wyoming a statewide special for Secretary of State (`contest:seat:US-WY:secretary-of-state:2025-08-02:special`) exists in a world played from the game start, with five filings by 2025-05-05. A world built to start on a later day has no such contest: a player, or a test, who begins in May sees a state with no vacancy and no special election under way. Seen: build the Kirby world (place seed e2c89bdf506a144e1bc3624d1a5dbedb86f7911e4a6df969adb7e1f0c28e73a8, place key 5642730) with `buildBenchWorld(seed, start, { twoLevel: true, placeKey: "5642730" })` and read the elections module's `contests` table for the contest id above.

**Cause.** Measured: the contest and its filings were read at three start dates for the same seed. Started 2025-01-20 and played, none at 2025-02-19 and the contest with five filings at 2025-05-05. Started 2025-04-28, none at the build and none 30 days later (2025-05-28). Started 2025-05-12, none at the build and none 30 days later (2025-06-11). A world's start date does not fill in the vacancies that played days before it would have created, so special elections, appointments to fill a seat and the filings for them exist only in a world played through the days that create them. Which engine creates the special (the vacancy path) was not traced here.

**Fix.** Design: at build, for every seat whose term or vacancy would have an election under way on the start date at any level (town, state, federal), carry the vacancy and the contest through the same engine that creates them when played, seeded from the world, so a world begun on any day shows the same specials and filing windows a played one shows that day. The vacancy path is read first; no second engine.

**Time box.** 3 hours for one Opus session. When it runs out, push what is measured, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a vacancy comes from a cause the world holds (a death, a resignation, a law, a recall record), not a chance at build. One rule, all 56 places. One engine per mechanic. Never loosen a test to get green.

**Done when.** A second session builds the Kirby, Wyoming world at 2025-05-12 and at 2025-01-20 and sees the same special contest and its filings on 2025-05-12 in both, and does the same at two places and seeds it did not choose, each place and seed named.

**Waits on.** Nothing.

**Files.** src/bench/world.ts, src/core2/modules/elections.ts

**Notes.** Filed by hand on the branch of the rival-day pin PR, as the thread rule says. The pinned Kirby case in `src/core2/rival-campaign-day-played.test.ts` starts at game start for this reason and waits up to 120 days; when this item lands it can start at 2025-05-12.
