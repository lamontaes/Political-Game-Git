---
id: director-after-race-turned-precinct
title: "On race night the people around the player name the part of town that turned, from the votes each precinct cast at the count"
area: director
kind: feature
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/project-thread-p37c46
pr: #9446
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: owner Nov 15 02:23Z, scene P33 (race lost) graded good, "build it out"; scene-buildout brief 10.2
claimed-at: 2026-11-15T05:30:00.000Z
---

**What.** A count kept no split by precinct, so no one could say where in town the player did better or worse than last time. The count now saves the town's own votes by precinct, and the director hands the race scenes a fact naming the precinct that turned and which way.

**Cause.** Found in code: src/core2/modules/voting.ts `ResultRow` keeps `namedVotes`, `countedVotes`, `placeVotes` and `totals` and no precinct split, though `pollingPlaces` and `precinctOfHousehold` place every household in a precinct; src/director/race-turnout-facts.ts `best-place` reads only the wider places.

**Fix.** `holdElection` sums each named ballot at its household's precinct and each counted record's share at its run of the town's order, scaled and rounded so a candidate's precincts add up to their named plus counted votes (`precinctTotals` on `ResultRow`). `turnedPrecinct` in race-turnout-facts.ts sets the player's share per precinct against their last count for the office (or their party's candidates where it is their first), and `raceTurnoutFacts` adds `turned-precinct`, `turned-for` or `turned-against`, and `turned-building`. The player sees it in the race-lost and victory-night scenes once the Words lead writes the lines. A town with one precinct has no fact. The town has no street map (SG-GOV-ward-map), so the part of town is the polling place and its precinct.

**Time box.** 5 hours for one Sonnet session.

**Rules.** One model, two tiers: a counted record counts in its precinct as a named ballot does. No count is spoken. No stopgap added.

**Done when.** A second session, on main at a drawn place, plays a race the player runs for the same office two counts running and sees the result row's `precinctTotals` add up to its named plus counted votes and the race scene carry `turned-precinct` naming a polling place by record id.

**Waits on.** Lines for the facts from the Words lead.

**Files.** src/core2/modules/voting.ts, src/director/race-turnout-facts.ts, src/director/purpose-scene.ts, src/director/turned-precinct.test.ts

**Notes.** Built in #9446 (Account lead train, thread "Build scenes after the race"). Step B, the visit to someone who backed the winner, is a separate item and waits on the visit route (#9256).
