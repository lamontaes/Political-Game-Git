---
id: words-desk-visit-governor-sponsor-uncast
title: "A governor's desk visit casts no sponsor for some presented bills, so the desk-visit test fails on some seeds"
area: words
kind: bug
priority: 2
size: S
lead: words
status: done
claimed-by:
pr: #6735
blocked-on:
source: added with npm run pool -- add
---

**What.** On main at d64e6bd168, GOLDEN_PATH_SEED=d7843021c1984928e541b8e0ec8b7e5bf063419a npx vitest run src/director/desk-visit-scene.test.ts -t governor fails: Lake City, Kansas (2037875), bill-presented:bill:office:US-KS:legislature-lower:2025-01-25:official:term:seat:US-KS:lower:105:0:2025-01-20:8 brought no sponsor (src/director/desk-visit-scene.test.ts:393). The moment is staged but its sponsor role is empty. Find why the sponsor of that presented bill is not cast (not a full person, a husk, or a cast rule) and fix the cast or the test's reading of who is living.

**Rules.** One cast, decided once, in the director. No dice. One rule, all 56 places.

**Done when.** The governor desk-visit test passes with GOLDEN_PATH_SEED=d7843021c1984928e541b8e0ec8b7e5bf063419a and on three fresh seeds, each naming the place, seed and the presented bill's record id with its cast sponsor.

**Files.** src/director/desk-visit-scene.test.ts, src/director/purpose-scene.ts, src/director/scheduling.ts

**Notes.** TODO

Oct 29 (CTO): set done; PR #6735 merged (the done flip failed while branch protection refused the flip job's push).
