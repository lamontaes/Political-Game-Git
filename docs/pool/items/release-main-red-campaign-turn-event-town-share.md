---
id: release-main-red-campaign-turn-event-town-share
title: "The rich-rival case expects every rival's event in the town, though a district or state race's events reach it by share"
area: release
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by: claude/red-main-campaign-turn-event-town-share
pr: #8985
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 13 (merger reports of campaign-turn "rich rival" on #7365, Aneth, Utah; sampled with fresh seeds)
merged-at: 2026-11-13T04:07:34.233Z
---

**What.** `src/core2/campaign-turn.test.ts`, "a rich rival holds an event on a day it is offered and a poor one does not", fails on clean main at five of six fresh seeds, among them 96a4487c4d8bc8a9 (Harlan, Indiana), 713d5cab02562c08 (Springfield, West Virginia) and c4a8a37f22dc5ee2 (Devola, Ohio): "expected null to be 'event'" at its last line. The rich rival's day does choose the event (`rivalDay` gives `act: "event"`), but the campaign turn holds none in the town. Seen: a rich rival's turn holds the event it chose, in the town or elsewhere in its race.

**Cause.** Found in code: since acddb8fb57 (Speed, Nov 8), `campaignTurn` in src/core2/modules/campaigns.ts holds a world candidate's event in the town only when `heldInTown` says so: a county, district or state race adds the town's share of its voters (`townShareOfRace`) to `townEventCredit` and holds an event here when that reaches one. The case files for the first contest open, a U.S. House or Senate seat in these places, whose town share is under a thousandth, and its last check predates that rule.

**Fix.** Test only: the turn's event is held in the town, or, for a race the town is only part of, it adds to what the town is owed (`townEventCredit` grows and stays below one); the case prints which and by how much. Every other check of the case is unchanged.

**Time box.** 0.5 hours

**Rules.** One rule, all 56 places: the case draws its place and names it, and a district race follows the same share rule in every place. No assertion is loosened: the check follows the engine's own rule for where a district event is held, and fails if a chosen event goes nowhere.

**Done when.** A second session runs campaign-turn.test.ts on main at GOLDEN_PATH_SEED=96a4487c4d8bc8a9 and at a fresh seed, each naming its drawn place, and the rich-rival case passes and prints where the event was held.

**Waits on.** Nothing.

**Files.** src/core2/campaign-turn.test.ts
