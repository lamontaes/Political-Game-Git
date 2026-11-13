---
id: elections-out-party-fields-district-seats
title: "The out-party fields a candidate for the town's House and legislative seats, from candidacy, not a stand-in"
area: elections
lead: elections
kind: bug
priority: 2
size: M
status: open
blocked-on:
source: Elections, Nov 8 replay (PR #7649)
after:
standard: 2
model: opus
effort: high
root: none
checked: fable 2026-11-10
---

**What.** The out-party does not field a candidate for the town's House and legislative district seats. At Castanea, Pennsylvania (seed t5) 7 people filed for the U.S. House seat and all 7 were Democrats; 6 lost the primary and the general ballot had one name. The same shape appeared at Royal Hawaiian Estates HI (y1) and North Haverhill NH (x9). Across 15 drawn places 5 of 15 House generals had one major party (Ballotpedia: 0.087 of House seats with no major-party competition, in `benchmarks.json`, a figure to report beside the result and not a target). Statewide races get a stand-in nominee for each major party, but a district seat does not. Seen: the general ballot for the House and legislative seats shows the other party's candidate, not one name.

**Cause.** Found in code: `src/core2/modules/voting.ts` `fileStandingCandidates` (line 1859) returns early at the `contest.district ||` test (line 1918), so district seats get no stand-in nominee (stopgap `SG-GOV-who-runs-stand-in`); `src/core2/modules/candidacy.ts` `partyProspects` (line 1324) draws only from the town's own named members.

**Fix.** Let candidacy's party ask draw the out-party's candidate for a district seat from the state's pool of people with standing (`standingPool`, by the same chooser), each filing carrying its recorded reasons. Leave the early return in `fileStandingCandidates` in place, with no stand-in for district seats.

**Time box.** 8 hours for one opus session.

**Rules.** No dice and one engine: the out-party's candidate comes from candidacy's own reasons (a party ask drawing on the state's pool of people with standing, by the same chooser), never a widened stand-in for district seats. Ranges are checked against, never steered to (owner, Nov 8). One model, two tiers: the pool is read by the same rule for full people and counted groups.

**Done when.** A second session plays years at five places drawn from all 56 (names and seeds printed) and sees a House seat's general ballot with both major parties wherever the state's pool holds a member of the out-party who clears the chooser, each filing's recorded reasons and party ask named by record id. The House no-competition share is reported next to 0.087 with the cause of any gap, as a report and not a pass or fail.

**Waits on.** Nothing to start. core-race-candidates-who-runs replaces the stand-in pair for the same out-of-town seats with a decision to run: read it first, and if it has merged, draw the out-party's candidate through its chooser, not a second one.

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/voting.ts, scripts/dev-tests/zero-general.ts

**Notes.** Elections, Nov 8: probe `scripts/dev-tests/zero-general.ts <seed> 2` prints every filing's party and status on a one-name ballot.

**Notes (Fable, Nov 10, one more place).** Machias, Washington (5341470, `GOLDEN_PATH_SEED=c3 npx vitest run src/core2/two-level-elections.test.ts`): the U.S. House seat and both state House seats on November 3, 2026 have one Democrat and one or two runners with no party, and no Republican, because a district race's field is only the town's own runners.
