---
id: elections-territory-no-contest-at-18
title: "In the U.S. Virgin Islands an 18-year-old player has no contest to enter"
area: elections
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on: play-first-freeze
source: added with npm run pool -- add
---

**What.** The M2-03 command (src/bench/m2-03-check.ts) on main 4e05f49a29, in the place the runner draws for it, Christiansted, U.S. Virgin Islands (territory:VI:christiansted, seed 939fb5e2ba3a5149ded0014c2b1dde07c7689a2749a0b9a8fbfc3a09d0997679), fails: 'at 18 there is no contest the player can enter'. The ineligible half passes: the Elections System of the Virgin Islands clerk tells a 17-year-old 'You have to be 25 by election day' for the U.S. House seat. The territory has no municipal governments, and the listed offices all carry ages above 18 (Delegate to Congress 25, Governor 30, Legislature 21). The territory's elected Board of Education and Board of Elections, chosen at the same general election, do not appear as contests an 18-year-old can enter. The same may hold in other places without local elected offices.

**Rules.** One rule, all 56 places: the offices a player can file for come from each place's records (its elected boards and their filing rules), never a named territory in code. Research before building: each board's eligibility and filing rules are read from the territory's code with citations; an estimate is tagged. Wire to the world: a filed candidacy reaches the ballot through the same engines as every other contest.

**Done when.** The M2-03 command passes in Christiansted, U.S. Virgin Islands with the seed above and in two more places drawn from all 56 that have no municipal government, named with seeds; the PR names which board contests the player could enter at 18 by contest id and cites each rule's source; a check over all 56 places lists any place where an 18-year-old has no contest within the next general election cycle.

**Files.** src/core2/modules/elections.ts, src/core2/data/elections/, data/research/elections/

**Notes.** TODO

Frozen Oct 24 (play first): not claimable until the CTO lifts the freeze (play-first-freeze; docs/work-orders/play-first-2026-10-24.md).
