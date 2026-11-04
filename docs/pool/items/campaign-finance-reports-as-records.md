---
id: campaign-finance-reports-as-records
title: "A campaign's periodic finance report is a dated record the candidate and the paper can read"
area: elections
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Lane 3 measured path 4 (src/director/campaign-months.test.ts on branch lane3/campaign-months). In seed 6dcbf05d1596da71 a passive player's race is silent from July 12 to August 8, 2025: their one volunteer worked July 4 and August 9, and nothing of their own campaign was recorded in between. Real campaigns file finance reports on the state's schedule (what was raised and spent, from whom). The campaigns engine keeps gifts and spending but emits no report record, so no scene, Journal line or story can tell a campaign's month.

**Rules.** Simulate it, don't ask: the report schedule comes from each state's filing calendar in data, one rule for all 56 places. An effect is a read: the Journal (Lane 3) and the paper read the report record.

**Done when.** In a drawn place, a filed candidate's campaign emits a dated report record on the place's schedule naming raised and spent sums from its own rows; Lane 3's Journal reads it.

**Files.** src/core2/modules/campaigns.ts

**Notes.** TODO
