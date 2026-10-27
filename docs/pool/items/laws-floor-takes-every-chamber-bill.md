---
id: laws-floor-takes-every-chamber-bill
title: "A legislature's weekly floor takes up every bill in its chambers, gives each a floor date and puts it on the agenda the day before with a whip count"
area: laws
lead: laws-effects
kind: wiring
priority: 1
size: M
status: done
claimed-by: claude/laws-player-bill-floor
pr: #6226
blocked-on:
source: The core half of laws-player-bill-reaches-the-floor (laws-and-effects lead, Oct 27)
claimed-at: 2026-10-27T05:07:57.486Z
---

**What.** The weekly floor in `src/core2/modules/world-legislating.ts` takes up only the bills filed when a session opens, so a bill drafted later in a state chamber or in Congress (the player's, a member's carried ask) sits drafted until the session ends. The floor takes up the chamber's other drafted bills after the leader's filings, oldest first, as many a week as it sits; `floorDateOf` gives the floor week a drafted bill is on; `floorAgendaOn` names the weekly floor's bills the day before, so a federal member's whip ask and eve-of-vote stop see them; `whipCount` gives each chamber's members for, against and undecided. The stale "year-end votes" header goes.

**Rules.** Wire to the world and the chain is the acceptance (owner, Oct 13 and 14): the floor's vote is the record the law in force and the roll call read. One rule, all 56 places: the floor's weeks come from each session's own dates. Replace, never layer: the filings-only floor and its header are replaced, not kept beside.

**Done when.** In a played world (buildBenchWorld, a place drawn from all 56 on a seed the builder did not choose, named in the PR body), after the session opened, a bill the player drafts in the state legislature, one a U.S. House member drafts and one another state member files each get a floor date before adjournment, are on the floor's agenda the day before with a whip count covering every member, and are taken up by the weekly floor on or before that date, on the session's record: every member's floor vote by record id, or the committee's recorded vote where the committee kept the bill from the floor.

**Time box.** 3 hours, the laws-and-effects lead.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts, src/core2/floor-every-bill.test.ts

**Notes.** Split from laws-player-bill-reaches-the-floor on Oct 27, which keeps the screen half (the lane's `src/bench`) and the matrix row naming the screen.
