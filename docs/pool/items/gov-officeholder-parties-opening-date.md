---
id: gov-officeholder-parties-opening-date
title: "Officeholder parties are read as of October 2026, but the game opens January 20, 2025"
area: gov
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The 201 statewide executive rows checked on October 13 in data/research/offices/statewide-executive-parties-2026.json, and the rosters and data/research/offices/unrecorded-holder-parties-2026.json, record the holder and party current in October 2026. The game seats them at its opening on January 20, 2025. Where a holder changed in between (the Northern Mariana Islands' lieutenant governor was an independent on the opening day and a Republican by 2026; Georgia's labor commissioner was vacant on the opening day), the opening seats the wrong party. The 60 rows checked on October 23 already carry the opening-day holder.

**Rules.** Estimate, never UNKNOWN, and research before building: each seat's party at the opening comes from the holder on the opening day, read from a fetched page, the same rule in all 56 places.

**Done when.** Every statewide executive row and unrecorded-holder row names its holder on January 20, 2025 with a fetched page and quote; a played world built with buildBenchWorld in a drawn place (seed named) seats the opening-day party, by term record id.

**Files.** data/research/offices/statewide-executive-parties-2026.json, data/research/offices/unrecorded-holder-parties-2026.json, src/core2/offices-state.ts

**Notes.** Found Oct 23 by research-offices-sourced-parameters and research-gov-sourced-parameters.
