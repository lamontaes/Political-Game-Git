---
id: core-speed-law-effects-records-growth
title: "Year 1 keeps 404k records on main against 179k on Nov 4; most are law-effects rows"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Four years of Upper Witter Gulch (key 0879800, seed 5a1c0de7a11ce5e1, speed:year --exclusive) on Nov 8 main: year 1 keeps 404,109 records (most in core2-law-effects-v1.applied), year 4 takes 118.8 to 128 s with 962,745 records and 4.5 GB process. The Nov 4 code kept 178,878 records in year 1 and ran year 4 in 95.2 s with 745,850 records. Find which commit added the rows and what reads them.

**Rules.** Replace, never layer: the rows dropped are deleted, not left beside a new copy. An effect is a read, not a record: a row no other engine reads at the moment it decides or pays is dropped once it posts. One run, one number: the records proof must stay identical in every table but the one dropped.

**Done when.** In Upper Witter Gulch (key 0879800, seed 5a1c0de7a11ce5e1) a played world run of speed:year with --exclusive keeps year 1 near Nov 4's 179,000 records with the records proof identical outside the dropped table, naming the table and the commit that added its rows by record id; year 4 of Upper Witter Gulch and Montpelier are measured before and after on the same machine.

**Files.** src/core2/modules/law-effects.ts

**Notes.** Measured by State Sessions Nov 8; the garbage collector is 25% of year 4, and Montpelier's year-4 memory shares the cause.

Nov 8 (State Sessions), first measurement, year 1 of Upper Witter Gulch (seed 5a1c0de7a11ce5e1, `speed:year --years 1 --exclusive`) on main against release 0.85.0 (Nov 4): the growth is not one table. The largest gaps are `core2-law-effects-v1.applied` 30,475 against 9,442, `core2-budgets-v1.yearToDate` 16,594 against 1,591, `credit.applications` 12,704 against 29, `core.relationships` 20,830 against 8,293, and the cash journal's account tables about 8,900 against 1,300 each. The credit and cash-journal gaps mean the world itself holds more accounts and loans than it did on Nov 4, which points to more people or businesses being filled in at the start, not one engine keeping a row too long. Next: find which commit changed what the world builds at day 1 before folding any table.
