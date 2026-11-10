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
after:
blocked-on:
source: added with npm run pool -- add
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** Lane 3 measured path 4 (src/director/campaign-months.test.ts on branch lane3/campaign-months). In seed 6dcbf05d1596da71 a passive player's race is silent from July 12 to August 8, 2025: their one volunteer worked July 4 and August 9, and nothing of their own campaign was recorded in between. Real campaigns file finance reports on the state's schedule (what was raised and spent, from whom). The campaigns engine keeps gifts and spending but emits no report record, so no scene, Journal line or story can tell a campaign's month.

**Cause.** Measured: seed 6dcbf05d1596da71, a passive player's race is silent from July 12 to August 8, 2025 (src/director/campaign-months.test.ts on branch lane3/campaign-months). `recordGift` in src/core2/modules/campaigns.ts keeps each gift as a public record, but nothing in the engine emits a periodic report record.

**Fix.** Emit a dated report record on the place's filing calendar (from data, one rule for all 56 places) naming the sums raised and spent from the campaign's own rows. The Journal and the paper read it.

**Time box.** 6 hours for an Opus session.

**Rules.** Simulate it, don't ask: the report schedule comes from each state's filing calendar in data, one rule for all 56 places. An effect is a read: the Journal (Lane 3) and the paper read the report record.

**Done when.** A second session, in a drawn place with its seed printed, plays a filed candidate's campaign through a filing date and sees a dated report record on that place's schedule naming the raised and spent sums from the campaign's own rows, by record id. The Journal shows the report and a test fails when the campaign emits none.

**Waits on.** A per-state filing-calendar table in data (a researcher item if none exists).

**Files.** src/core2/modules/campaigns.ts, src/director/campaign-months.test.ts

**Notes.** TODO
