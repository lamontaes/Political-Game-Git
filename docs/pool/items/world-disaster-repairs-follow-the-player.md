---
id: world-disaster-repairs-follow-the-player
title: "A disaster's assistance and repairs go to whatever town the player lives in, not the town whose damage FEMA recorded"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The disasters engine reads FEMA's damage figures for the town the world opened in, whose name it fixes when it first runs (src/core2/modules/disasters.ts:140), but pays the household assistance and charges the repairs to the residents of the town where the player lives on the declaration day (src/core2/modules/disasters.ts:270). When the player has moved, the new town's households receive the assistance and pay for repairs to homes in the old one, and the old town's builders get nothing. Measured in Guthrie, Oklahoma (place 4031700, seed 35f504a41ec4764f52666b6c5ccd1992aa077e83, salt stories-from-engines) with the player moved to another town of the world on the eve of disaster 4866: 42 damaged homes recorded under Guthrie, and no repair paid to Guthrie's 3 open builders.

**Rules.** Wire to the world: the assistance and the repairs move between the damaged town's own households and builders, the town whose FEMA row it is, wherever the player lives that day. One rule, all 56 places: the damaged town is found from the world's records, never by a place name in code.

**Done when.** In a generated world where the player moves out of the opened town before a damaging disaster is declared, the opened town's residents account receives the assistance and pays its own builders, named by journal entry id, and the town the player moved to pays nothing for it. The no-payee regression in src/core2/disasters-no-market.test.ts stays reachable, its forced step changed if it must be.

**Files.** src/core2/modules/disasters.ts, src/core2/disasters-no-market.test.ts

**Notes.** TODO
