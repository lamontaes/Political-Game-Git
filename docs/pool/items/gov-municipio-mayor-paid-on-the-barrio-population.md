---
id: gov-municipio-mayor-paid-on-the-barrio-population
title: 'A Puerto Rico municipio''s mayor is paid $1,200 a year: office pay and meeting rules read the played barrio''s population, not the government''s'
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
checked: fable
source: Playtester P2, Nov 13 (Búfalo, Puerto Rico, seed 605e5368-d7fa-4c7a-a2cb-d27b5406d997)
---

**What.** On main 596d5127, an Advanced start in Búfalo, Puerto Rico (seed 605e5368-d7fa-4c7a-a2cb-d27b5406d997) as Mayor Cassandra Preston, who heads Barceloneta Municipio and its 14-seat Municipal Legislature. Politics → Your office reads "Office / Mayor / Pay / $1,200.00 a year" in both 2025 and 2026. A municipio is a county-level government of tens of thousands of people, and its mayor's job is full time, so the figure is a small village's pay. Seen: Your office and Jobs and study for the mayor of any government larger than the played place (a Puerto Rico municipio, a consolidated city-county).

**Cause.** Found in code: `reviewOfficeJobs` in `src/core2/modules/office-day.ts` (line 1056) prices a seat with `seatPay({ population: bodyPopulation(api, office.kind, countyGeoid) })`. `bodyPopulation` (`src/core2/office-day-calendar.ts`, line 63) returns the county's people only when the kind starts with `county-`, and otherwise `placeMetadata.referencePopulation`, the played place's own count. A municipio's mayor (kind `mayor`) is therefore banded by Búfalo's population, the smallest band, and `meetingRule` reads the same number for the Municipal Legislature.

**Fix.** `bodyPopulation` reads the population of the government the office belongs to. Where that government is a county-level one (an id `county:<code>`, as `budgets.ts` keys a municipio), it returns `COUNTY_PEOPLE` for that county, as it already does for `county-` kinds. Nothing else changes. The test draws a Puerto Rico place and checks that the mayor's pay band is the municipio's.

**Time box.** 2 hours

**Rules.** One rule, all 56 places: a government's size is read from its own record, never a per-territory branch. Estimate, never UNKNOWN: the band is the research table's spread for the government's own population.

**Done when.** A test in src/core2 draws a place in Puerto Rico and a place in a state, and finds each mayor's pay band is the one for its government's population, not the barrio's. A second session then sees, on the bench on main, a drawn Puerto Rico Advanced start as mayor whose Your office pay sits in the municipio's band (screenshot with the place and seed).

**Waits on.** Nothing.

**Files.** src/core2/office-day-calendar.ts, src/core2/modules/office-day.ts, src/core2/office-day-pay.ts

**Notes.** The same mayor's Jobs and study reads "Works outside the town, Buyers and sellers outside the town" (rule 20, with Fable A).
