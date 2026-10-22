---
id: world-trip-resident-from-place-counts
title: "A person met on a trip to another place takes an age, a job and a wage from that place's counts"
area: world
kind: feature
priority: 3
size: S
status: claimed
claimed-by: claude/other-places-coarse
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-22T02:05:17.144Z
---

**What.** PR 5555's first slice: a place other than the player's keeps a coarse population (src/core2/coarse-place.ts), and a person met there on a trip is drawn from its counts (an age from the county's employed by age, a job from the place's industry mix, the wage its occupation pays there), kept as the identity:work fact. No employer, payroll or household exists for them there yet (SG-WORLD-coarse-place-no-payroll), and SG-OFFICE-FED-trip-residents stays open; world-other-places-coarse-population keeps the played-year trip with household, job and pay.

**Rules.** One rule, all 56 places: the counts come from each place's data; no dice beyond seeded generation of who exists.

**Done when.** coarse-place.test.ts and office-day-federal.test.ts, in places drawn from all 56 (seed named), show a met person whose age, job and wage come from that place's counts by record id.

**Files.** src/core2/coarse-place.ts, src/core2/office-day-federal-president.ts, src/core2/coarse-place.test.ts

**Notes.** TODO
