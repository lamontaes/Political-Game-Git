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
standard: 2
model: sonnet
effort: medium
lead: governing
root: rc9-place-facts-one-default
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** The 201 statewide executive rows checked on October 13 in data/research/offices/statewide-executive-parties-2026.json, and the rosters and data/research/offices/unrecorded-holder-parties-2026.json, record the holder and party current in October 2026. The game seats them at its opening on January 20, 2025. Where a holder changed in between (the Northern Mariana Islands' lieutenant governor was an independent on the opening day and a Republican by 2026; Georgia's labor commissioner was vacant on the opening day), the opening seats the wrong party. The 60 rows checked on October 23 already carry the opening-day holder. Seen: the party shown beside each statewide officeholder on the Government screen at the January 20, 2025 opening.

**Cause.** Found in code: data/research/offices/statewide-executive-parties-2026.json and data/research/offices/unrecorded-holder-parties-2026.json record holders as of October 2026, while src/core2/game-start.ts function gameStartDate (line 14) opens the game on January 20, 2025 in every place.

**Fix.** Research each row's holder and party on January 20, 2025 from a fetched page with a quote, replace the rows, and check that a played world seats the opening-day party.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN, and research before building: each seat's party at the opening comes from the holder on the opening day, read from a fetched page, the same rule in all 56 places.

**Done when.** A second session finds every statewide executive row and unrecorded-holder row naming its holder on January 20, 2025 with a fetched page and quote, and a played world built with buildBenchWorld in a drawn place (seed named) seating the opening-day party, by term record id.

**Waits on.** Nothing.

**Files.** data/research/offices/statewide-executive-parties-2026.json, data/research/offices/unrecorded-holder-parties-2026.json, src/core2/offices-state.ts

**Notes.** Found Oct 23 by research-offices-sourced-parameters and research-gov-sourced-parameters.
