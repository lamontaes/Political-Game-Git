---
id: play-stop-05-politics-lists-wrong-officials-b
title: "Politics shows the mayor, council terms that make sense and every party holding seats"
area: gov
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

**What.** The v0.22.10 local view showed five council members and no mayor, with terms of 28 years (1999 to 2027) and 16 years (2013 to 2029). Parties showed only the Republican party. This part shows the town's executive, terms read from the place's records (or estimated from the real pattern), and every party holding a seat.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §11, The world on screen makes sense. One rule, all 56 places: the town's offices and terms come from the place's data the same way everywhere. Estimate, never UNKNOWN: a missing term or mayor starts from the real pattern, marked as an estimate.

**Done when.** In a drawn place, Politics → Government shows the town's executive where it has one, council terms within the place's recorded or estimated term length, and Parties shows every party holding a seat in the player's state.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Politics shows your mayor, a council whose terms run a normal number of years, and Parties lists every party that holds seats.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/government.ts, src/core2/modules/offices.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-05-politics-lists-wrong-officials (Oct 24, lane). Engine changes in offices.ts are the laws lead's (`needs-from: laws`). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Playtest Oct 26 sitting 1 (installed v0.34.0): Council terms Tammy May 2016-2028 (12 years) and George Williamson 2014-2026; the mayor (Brian Duncan) only on page 2; no party per member.

CTO, Oct 27 12:00 UTC: the `after:` line is cleared so the lane can build it for the owner's build; the earlier part landed or is in PR, and a merged play item waits only on the owner's installed-build check.
