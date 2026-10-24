---
id: play-first-12-politics-screen-to-mock-a
title: "Politics → Government looks like the mock: chamber picture, party split bar, votes as bars"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: play-stop-05-politics-lists-wrong-officials-b
source: added with npm run pool -- add
---

**What.** The owner's read of the playtest screenshots: menus look like a real game, not a spreadsheet, per the mocks. The v0.22.10 Government tab is lists of names and codes. The Oct 14 mock (pass 2, approved "good") draws each body with a chamber picture, a party split bar, members with party, recent votes as bars, what is coming up and the executive. This item builds the Government tab to that mock.

**Rules.** This is a game, not a spreadsheet: the Government tab is drawn as the approved mock, never a list. Replace, never layer: the list layout and its styles are deleted.

**Done when.** In a drawn place, Politics → Government matches docs/ui/mocks/screens-2026-10-14/shots for Government in layout, read from that world's records, shown by a screenshot beside the mock for the owner's yes.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/play.css

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
