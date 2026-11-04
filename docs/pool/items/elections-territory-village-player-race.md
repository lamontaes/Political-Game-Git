---
id: elections-territory-village-player-race
title: "A New Game life in an American Samoa village finds no local race to enter in six years"
area: elections
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** In Malaeimi, American Samoa (territory:AS:malaeimi, replay f857db7436bf7449, the fixed town list's Cabo Rojo number), the path check on main listed no contest the player could enter from 2025 to 2031: no local office the player may run for exists or comes up. The golden path starts with a local race in every one of the 56 places; American Samoa's own elected local government (village and county offices, or the Fono's House districts) has no race the player is offered.

**Rules.** One rule, all 56 places: a territory's offices are data rows the one election engine reads; no per-place code path. Research before building: what American Samoa elects locally and when, cited.

**Done when.** In a drawn American Samoa place (named with its seed), the path check files the player for a race within two years of turning 18, named by contest id; the offices and calendar rows cite their source.

**Files.** src/core2/modules/elections.ts, src/core2/modules/offices.ts, data under src/core2/data/elections

**Notes.** Filed by Lane 1, Nov 4, from the fixed-town measure.
