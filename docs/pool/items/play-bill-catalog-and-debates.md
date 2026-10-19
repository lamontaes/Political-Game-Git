---
id: play-bill-catalog-and-debates
title: "The bench uses the bill catalog and lets the player answer a debate"
area: play
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/bill-catalog-debates
pr: #4788
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T17:05:57.660Z
---

**What.** `billCatalog(api, bodyOfficeId)` and `provisionFor` (bill-catalog.ts) are called by nothing but tests; the bench's bill menu reads the raw JSON (`catalogMenus` in legislature.ts) with no amount in force or whether the body may act. `answerDebate` and `debatesIn` are called only inside the meetings engine, so no route lets the player answer one. Wire both.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn place a council member drafting a bill sees each provision's amount in force and whether the body may act, and answers a debate through a route in handler.ts, by bill and debate record ids.

**Files.** src/bench/legislature.ts, src/bench/handler.ts, src/core2/bill-catalog.ts, src/core2/modules/meetings.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.
