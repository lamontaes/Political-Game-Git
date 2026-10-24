---
id: play-first-14-budgets-hidden-until-relevant
title: "Budgets stays out of Politics until you file or hold a seat"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The owner's read of the playtest screenshots: no budgets for a 17-year-old. The v0.22.10 Politics tab showed the United States budget to the cent ("$5,234,616,386,315.43") on the first evening. This item hides Budgets until the player has filed for or holds an office, and rounds the amounts the way a reader says them.

**Rules.** This is a game, not a spreadsheet: a tab appears when the player can use it, as Your office and Campaigns already do. American English everywhere: large amounts read as "$5.2 trillion", never to the cent.

**Done when.** In a drawn place, a new life at 17 shows no Budgets tab under Politics; after filing the tab appears with amounts rounded to a readable unit, shown by a screenshot before and after filing.

**Files.** src/bench/play.mjs, src/bench/government.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). LAW.md conflict: the Oct 20 menu lists Budgets always; the Oct 24 read wins. "Relevant" as filed or holding a seat is the acting CTO's reading; the owner may overrule. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
