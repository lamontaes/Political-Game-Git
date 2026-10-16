---
id: gov-officials-positions-from-views
title: "State and federal officials' positions behind votes come from the views engine"
area: gov
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/officials-stance-views
pr: #4713
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T10:59:57.704Z
---

**What.** Local members' positions read the views engine (`viewOn` in legislature.ts), but state and federal officials' positions (`officialStance` in officials.ts, read by world-legislating.ts) come from their data signature. Make them read `viewOn` too, with the data signature as their opening lean only.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a one-year run of a drawn place a state legislator's vote cites a stance from their views, with the stance record id and how they learned of the matter; a case made to them moves it (views.test.ts shows the wear-out).

**Files.** src/core2/modules/officials.ts, src/core2/modules/world-legislating.ts, src/core2/modules/views.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.
