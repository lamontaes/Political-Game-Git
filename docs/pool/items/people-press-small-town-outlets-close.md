---
id: people-press-small-town-outlets-close
title: "A small town opens with five local outlets and all five lose their reporters within two years, so no one prints its news"
area: people
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/press-opening-cash
pr: #4999
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T23:40:04.916Z
---

**What.** A town of 1,774 people (Cobb Island, Maryland, place 2418200, seed all56, `buildBenchWorld`) opens with one local newspaper and four local television stations, each with an owner, a head and a reporter. Advancing the world in 120-day steps, the newspaper and one station closed on March 24, 2025 (staff rows show `leftBecause: closure`, the head and reporter both leaving that day), a second and third followed by May 2026, and by September 2026 none of the five local outlets has a reporter. Midway, Louisiana (2250395, same seed) ends the same way: four stations, none with a reporter by March 2028. With no reporter, `runDesk` returns nothing (`!outlet.reporterIds.length`, `src/core2/press-desk.ts`), so a law that took effect in town is printed by no outlet and the golden path stops at step 9 in both places (28 other places that enacted a bill reached step 10). Find why the outlets are sized to open five outlets in a town this small, why they close (the outlet's revenue is a standing payment sized from its audience, `gov-press-outlet-revenue`, against its payroll), and why a closed outlet stays on the list of outlets with no reporters instead of leaving it.

**Rules.** Sliding scales and causes: an outlet closes from its books, not a chance; the number of outlets a town opens with follows the real counts per resident, with the spread marked. One rule, all 56 places: nothing names a place. An effect is a read, not a record: a closed outlet is read as closed by the desk, the audience count and the screens.

**Done when.** In the played world (`buildBenchWorld`, the drawn places Cobb Island and Midway with seed all56, and a random place a builder draws), a town's local outlets that remain open each keep a reporter through two years, a closed outlet is marked closed and not listed as covering the town, and `path-check` reaches step 10 in both places. A test in `src/core2/` names the place, seed and outlet record ids.

**Files.** src/core2/modules/press.ts, src/core2/press-desk.ts, src/core2/data/press/parameters.json

**Notes.** Found by the 56-place golden-path run, Oct 17 (claude); see docs/reports/golden-path-56-places-2026-10-17.md. The closure itself is the jobs engine ending the outlet's jobs (`closure` change), so the cause may be the outlet's revenue and payroll in the business engine rather than the press module.
