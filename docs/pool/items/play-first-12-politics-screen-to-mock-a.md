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
after:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
---

**What.** The owner's read of the playtest screenshots: menus look like a real game, not a spreadsheet, per the mocks. The v0.22.10 Government tab is lists of names and codes. The Oct 14 mock (pass 2, approved "good") draws each body with a chamber picture, a party split bar, members with party, recent votes as bars, what is coming up and the executive. This item builds the Government tab to that mock.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §10, The owner's read of the Oct 24 screenshots. This is a game, not a spreadsheet: the Government tab is drawn as the approved mock, never a list. Replace, never layer: the list layout and its styles are deleted.

**Done when.** In a drawn place, Politics → Government matches docs/ui/mocks/screens-2026-10-14/shots for Government in layout, read from that world's records, shown by a screenshot beside the mock for the owner's yes.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Politics → Government shows each body as a chamber picture with a party split bar, its members, recent votes as yes and no bars, what is coming up and the executive.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/play.css

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Ruled (owner, Oct 24, "go ahead"): the Politics screens follow the mocks; Issues (the -b item) is law cards, not a list (OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Playtest Oct 26 sitting 1 (installed v0.34.0): Owner: "Why is everything being printed on the menu like a spreadsheet? Why is everything not in the UI?" The item waits on 05-b, which waits on 05-a: ungate it.

CTO, Oct 27 12:00 UTC: the `after:` line is cleared so the lane can build it for the owner's build; the earlier part landed or is in PR, and a merged play item waits only on the owner's installed-build check.
