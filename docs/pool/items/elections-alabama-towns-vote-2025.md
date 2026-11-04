---
id: elections-alabama-towns-vote-2025
title: "Alabama's towns vote in 2025 and every fourth year after, not 2024 and 2028"
area: elections
kind: bug
priority: 1
size: S
status: claimed
claimed-by: governing/alabama-towns-2025
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T11:55:30.216Z
---

**What.** The municipal cycle row for Alabama (src/core2/data/elections/municipal-cycles.json) held the old fourth-Tuesday-in-August cycle of 2020, 2024 and 2028. Ala. Code sec. 11-46-21(a), as amended by Senate Bill 119 of the 2021 Regular Session, moved regular municipal elections to August 2025 and every fourth year after; the 2025 elections were held August 26, 2025. In the played world Haleyville's council terms ran to September 2028, so a New Game life in Haleyville had no race to enter for three and a half years (the county board is closed to the player where the town has a council).

**Rules.** One rule, all 56 places: the cycle is a data row the one election calendar reads. Research before building: the statute and the 2025 election are cited in the row.

**Done when.** The calendar test puts an Alabama town's 2025 election on 2025-08-26; in Haleyville, Alabama (0132704, replay ab5f58e9be125c95) the New Game path check files for a council seat in 2025 and reaches election night, named by contest id.

**Files.** src/core2/data/elections/municipal-cycles.json, src/core2/elections-law.test.ts

**Notes.** Lane 1, Nov 4: built on governing/alabama-towns-2025.
