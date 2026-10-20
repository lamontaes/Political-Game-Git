---
id: world-units-missing-incorporated-places
title: "Incorporated places missing from the Census government listing have no town government (Manley Hot Springs, Alaska has none of its council seats)"
area: world
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/units-place-matches
pr: #5053
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T15:22:42.076Z
---

**What.** Counted over the 19,483 incorporated places in the Census population file (`data/research/places/roadmap-r11-population-v2025-*.csv`, geography kind incorporated-place), only 19 have no government unit in the 2025 Census government listing the game reads (`governmentUnitsForPlace` and the township units): eight consolidated or balance governments (Athens-Clarke County and Echols County, Georgia; Greeley County, Kansas; Louisville/Jefferson County, Kentucky; Butte-Silver Bow, Montana; Nashville-Davidson, Tennessee; Urban Honolulu), whose government is the county's, and eleven cities and towns: Howard, Kansas; Tribune, Kansas; Blandville, Keene, Poplar Hills, St. Mary, South Park View and Vicco, Kentucky; Easthampton, Massachusetts; Minnetonka Beach, Minnesota; Plantersville and Poetry, Texas. Manley Hot Springs, Alaska, which started this, is not in the incorporated list at all (the Census file treats it as a statistical place), so the missing town government there follows the Census's own classification. Match the eleven to their governments in the listing, or record why none exists.

**Rules.** Research before building: the Census listing and population file decide who exists; no place is named in code. One rule, all 56 places: the check is a test over every state. Estimate, never UNKNOWN: a place with no unit is on a named exception list with its reason, not given a guessed government.

**Done when.** A test in src/core2 states that every incorporated place in the population file either has a government unit or is on a named exception list with its reason (the eight consolidated governments are one reason; each of the eleven is resolved or listed), and the PR body gives the counts by state.

**Files.** src/core2/reference/government-units.ts, src/core2/gov-rules/local-governments.ts

**Notes.** Found Oct 18 (claude/eligible-on-date) from the headless path check, seed pc6, and sized by a script over the population file. A town with no unit gets no council and no mayor in the game, so a player there has nothing local to run for. This is a small data fix (eleven places), not a gap in how towns are built.
