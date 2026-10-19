---
id: jobs-no-openings-in-small-towns
title: "A small town's employers open no position in a whole year: Fort Laramie, Wyoming has 27 businesses, 7 separations and 0 openings"
area: world
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/quits-by-place-s12
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:24:23.717Z
---

**What.** In Fort Laramie, Wyoming, a played year had 27 businesses, 7 separations and 0 openings, so a small town's employers open no position at all in a whole year. Find what keeps a small employer from opening a position when someone leaves (the need and gap in the jobs engine) and make openings follow the firm's own staff, sales and the region's labor market. Check that other small towns are not stuck the same way.

**Rules.** No dice: openings come from a firm's own sales, costs and staff, never a roll to hit a rate. One rule, all 56 places: the check names the place and seed it drew and tunes no seed.

**Done when.** In a one-year run of the played world (buildBenchWorld) in Fort Laramie, Wyoming and two other drawn small towns, a firm that loses a worker opens a position when its staff falls below what its sales support, each opening cites the firm record id, and a test in src/core2 states it.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/business.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
