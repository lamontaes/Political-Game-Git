---
id: laws-player-bill-reaches-the-floor
title: "A player's bill in a legislature or Congress reaches a floor vote: scheduled, members file all session, the vote and the whip on screen"
area: laws
lead: laws-effects
kind: wiring
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on: play-legislature-floor-date-and-whip
source: CTO's relay of the owner's Oct 26 playtest (MERGE-FIRST.md, Oct 26, 23:05 UTC)
claimed-at:
---

**What.** In the owner's Oct 26 playtest his H.R. 1 sat drafted for a year. src/bench/legislature.ts (around lines 215-219, since c53327dea, Oct 17) places a bill on an agenda only when its body has a regular meeting, so a bill in a chamber that votes on its floor calendar is kept drafted and never handed to scheduleVote (src/core2/modules/legislature.ts:4546). The weekly floor in src/core2/modules/world-legislating.ts takes up only the bills filed when the sitting opened, so a bill filed later is never on the floor leader's calendar, and its header still says Congress votes at year end. Every player bill gets a floor date through the same floor leader's calendar the members' bills use, members file through the whole sitting, and the floor vote and the whip count show on the legislature screen.

**Rules.** Wire to the world and the chain is the acceptance (owner, Oct 13 and 14): the vote's record is read by the law in force and the screen. One rule, all 56 places: the floor calendar comes from each legislature's records. Replace, never layer: the drafted-only branch and the stale header go. No hand-written player text: the screen shows record data and control names. Relayed by the CTO in MERGE-FIRST.md, Oct 26 ("wired is not seen", wiring-audit).

**Done when.** In a played world (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, named in the PR body), a bill the player drafts in a state legislature and one in Congress each get a floor date, reach a recorded floor vote within the sitting with each member's vote and the whip count by record id, and the legislature screen shows the scheduled date, the whip count and the result; a member's bill filed after the sitting opened also reaches the calendar; and the law matrix row of a law passed this way names the screen it shows on.

**Time box.** 4 hours, Opus lead with one Sonnet helper; builds against the floor calendar's registered stopgaps and waits on nothing.

**Files.** src/bench/legislature.ts, src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts, src/core2/office-day-state.ts, docs/reports/law-wiring-matrix.json

**Notes.** Filed by the laws-and-effects lead, Oct 26, from the CTO's relay of the Oct 26 playtest. Taken after the family PRs (#5669, #6026, #6011) land. src/bench is the play-first lane's (AGENTS.md), so the lead builds the calendar in src/core2 and the lane changes src/bench/legislature.ts and the screen, with a `Needs from others:` line in the channel. Read Oct 27 by the laws-and-effects lead: `floorWeek` (src/core2/modules/world-legislating.ts:1022) takes up only `row.filings`, which `openSession` fixes when the session opens (members' filings spread over `sessionFilingShare` of it); a bill drafted later in one of the session's chambers is never on the floor leader's calendar. Plan: the floor week also takes up drafted bills of the session's chambers that are not in its filings, ordered by the same backing, and members re-weigh their filings on each floor week; the bench half then shows the floor date. Split Oct 27 by the laws-and-effects lead: the core half (the floor takes up every chamber bill, `floorDateOf`, the agenda the day before, `whipCount`) is `laws-floor-takes-every-chamber-bill`; the screen half is the lane's `play-legislature-floor-date-and-whip`; this item closes with the law matrix row naming the screen once both are on main.

Oct 29 (CTO, second account): claim released; the session that held it ended with the Oct 19 to 29 crews. Branch `claude/laws-player-bill-floor` is kept; claiming this item takes it over.
