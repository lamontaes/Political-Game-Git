---
id: director-after-race-turned-precinct
title: "The count saves the votes each precinct cast, so the part of town that turned can be named"
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

**What.** A count kept no split by precinct, so no one could say where in town a candidate did better or worse than last time. The count now saves the town's own votes by precinct. No line or fact ships with it: the two sentences written for it ("We lost Precinct N.", "It was ours last time.") said a precinct was won before, and in two played runs (Bountiful UT, Stoneham MA) and five more draws the player never led the precinct that moved most, so they were false and are deleted with their fact. The saved split is read by the item director-after-race-turned-precinct-more-cases. Seen: a second session finds `precinctTotals` on a played count adding up to its named plus counted votes.

**Cause.** Found in code: src/core2/modules/voting.ts `ResultRow` keeps `namedVotes`, `countedVotes`, `placeVotes` and `totals` and no precinct split, though `pollingPlaces` and `precinctOfHousehold` place every household in a precinct.

**Fix.** `holdElection` sums each named ballot at its household's precinct and each counted record's share at its run of the town's order, scaled and rounded so a candidate's precincts add up to their named plus counted votes (`precinctTotals` on `ResultRow`, kept by `keepCount`). The town has no street map (SG-GOV-ward-map), so the part of town is the polling place and its precinct.

**Time box.** 5 hours for one Sonnet session.

**Rules.** One model, two tiers: a counted record counts in its precinct as a named ballot does. No count is spoken. No stopgap added. The saved split has no reader until the more-cases item lands; the PR body says so.

**Done when.** A second session, on main at a drawn place, plays two counts for one office and sees the result row's `precinctTotals` add up to its named plus counted votes.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/precinct-totals.test.ts

**Notes.** Built in #9446 (Account lead train, thread "Build scenes after the race"). Step B, the visit to someone who backed the winner, is a separate item and waits on the visit route (#9256).
