---
id: play-first-12-politics-screen-to-mock-b
title: "Politics → Issues shows law cards, not a list"
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

**What.** The owner rejected a plain list for Issues ("like an Excel sheet") and approved law cards grouped by subject, like Democracy 4 and Crusader Kings 3. The v0.22.10 Issues tab is four plain rows. This item builds Issues as the mock's law cards from the law in force.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §10, The owner's read of the Oct 24 screenshots. This is a game, not a spreadsheet: Issues is law cards, never a plain list. One rule, all 56 places: each card reads the law in force at its level from the place's records.

**Done when.** In a drawn place, Politics → Issues shows law cards grouped by subject with the law in force, a marker, who can change it and since when, read from the law records, shown by a screenshot beside the mock.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Politics → Issues shows each law as a card: an icon, the law in force in large type, a marker between the two extremes, who can change it and since when.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/government.ts, src/bench/play.mjs, src/bench/play.css

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Ruled (owner, Oct 24, "go ahead"): law cards per the mock, not a plain list; the register's "Issues follows this register, not its mockup" line is superseded on this point (OWNER-DECISIONS.md, Oct 24; LAW.md conflicts). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

CTO, Oct 27 12:00 UTC: the `after:` line is cleared so the lane can build it for the owner's build; the earlier part landed or is in PR, and a merged play item waits only on the owner's installed-build check.
