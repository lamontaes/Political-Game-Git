---
id: people-parties-deliberation-threshold
title: "Party affiliation splits no-party and independent at a hard deliberation cut"
area: people
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/party-delib
pr: #5722
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T15:12:13.363Z
---

**What.** src/core2/modules/parties.ts reads deliberation <= 0 at two sites to split people with no party from independents; replace it with a sliding scale.

**Rules.** TODO

**Done when.** TODO

**Files.** src/core2/modules/parties.ts

**Notes.** TODO
