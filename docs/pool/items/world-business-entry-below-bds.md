---
id: world-business-entry-below-bds
title: "Businesses open at a third of the Census rate in a played year (5 opened against about 16 in eight drawn towns); closures match"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/business-entry-below-bds
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T17:23:16.200Z
---

**What.** In eight drawn towns a played year opened about 5 businesses where the Census Business Dynamics Statistics rate gives about 16, a third of the real rate, and closures match, so a town's business count drifts down. Find what limits entry in the business engine (who may start a firm, with what cash, and when) and make entry follow the founders' cash, skills and the place's conditions instead. Real rates check the total over many towns and never pick which firm opens.

**Rules.** No dice: a firm opens because a person with cash, skills and a market starts it, never a roll to hit a rate. Wire to the world: a new firm moves its founder's money, hires people and sells to households, shown in a generated world.

**Done when.** In a one-year run of the played world (buildBenchWorld) in eight drawn places and seeds the builder did not choose, openings land within the sourced spread of the Census rate for each place's size, each opening is shown by business record id with its founder and starting cash, and closures stay within their own band. A test in src/core2/business.test.ts states the rate check.

**Files.** src/core2/modules/business.ts, src/core2/business.test.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
