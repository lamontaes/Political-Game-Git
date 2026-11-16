---
id: people-birth-outside-state-counted-twice
title: "A birth outside the state is counted twice against growing up in the county"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by: civic-roles-builder
pr:
after:
blocked-on:
lead: m0-m2
source: "Civic roles builder, Nov 16, tracing shared-school-give-back red since #9538's fold (Train a62a2fda)"
model: opus
effort: medium
---

**What.** Too few of a town's grown residents grew up in its county. At Dortches, North Carolina (3717520), seed 7952d3f3e3253ee4, 51 of 175 adults (29%) were born in the town or its county, and 91 (52%) in the state, against a census share of 54% born in the state. Seneca Falls, New York and Bynum, Texas show the same. Seen: few schoolmates in town for anyone to remember a school with.

**Cause.** Found in code: `buildOpeningKin` in src/core2/opening-kin.ts set `parentsNear = !outside && stayed(...)`. `stayed` is the departure rates' chance of having stayed in the county since childhood, which already covers everyone who came from elsewhere, out of state included. Multiplying it by the born-in-state draw (`bornOutside`, src/core2/person-birthplace.ts) counts a birth outside the state twice.

**Fix.** Among the residents born in the state, the chance of staying is the departure rates' chance over the born-in-state share. `bornInStateShare` (person-birthplace.ts) computes the share by the same shares and citizenship `birthOrigin` draws from, and population.ts passes it to opening-kin.ts. Overall, the chance of having grown up in the county is then the departure rates' chance, as before #9538.

**Time box.** 2 hours, Opus.

**Rules.** No dice: seeded generation of who exists, read from the survey shares. One rule, all 56 places: the share is each state's own row.

**Done when.** At three named places, the born-in-county share rises and the born-in-state share still matches the census row. person-birthplace and opening-kin tests pass. A second session sees, at a drawn place it names with its seed, a resident's card that says where they were born.

**Waits on.** Nothing.

**Files.** src/core2/opening-kin.ts, src/core2/person-birthplace.ts, src/core2/population.ts

**Notes.** Filed by hand by the civic roles builder, Nov 16.
