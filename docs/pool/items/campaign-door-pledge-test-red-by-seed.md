---
id: campaign-door-pledge-test-red-by-seed
title: "The door-yes test passes in every drawn place: a voter whose yes was taken back is not read as still pledged"
area: elections
kind: bug
priority: 2
size: S
status: done
claimed-by: governing/door-pledge-test-by-seed
pr: #7073
blocked-on:
lead: governing
source: governing lead, Nov 1 (rerun for campaign-incumbent-hears-the-race)
claimed-at: 2026-11-01T18:34:52.069Z
---

**What.** src/core2/door-pledge.test.ts fails on seed 856c9d9e90f14b97 with main's own campaigns code: the first test throws "Cannot read properties of null (reading 'candidateId')" in pledgeDoubt (src/core2/modules/voting.ts:731), called from door-pledge.test.ts:265 with `pledgeOf(api, b.voterId, mine.personId, contest.id)!`. A voter the test counted as pledged at the knock holds no yes to that candidate by election day and no yes to anyone else in the race, so the test hands pledgeDoubt a null row. A later knock that ends in a no takes a yes back (answerAtDoor), so the test's own record of who was pledged goes stale; the test should read the pledge the voter holds on election day and expect no pledge part on the ballot where none is held.

**Rules.** No dice: the voter's yes is kept or taken back by the door's own answer rule, never by chance, so the test reads the kept record, not its own list. One rule, all 56 places: the test draws its place from all 56 by seed and must pass on every seed, naming the place it played.

**Done when.** door-pledge.test.ts passes on seed 856c9d9e90f14b97 and on three fresh seeds, each run printing the drawn place and seed; a voter whose yes was taken back before election day is shown with no pledge part on their ballot row in the played race; and the test fails again when the stale-pledge handling is removed.

**Files.** src/core2/door-pledge.test.ts

**Notes.** Seen on governing/incumbent-hears-the-race (0076b7273c) and reproduced with main's campaigns.ts (dc11218c5a) swapped in on the same seed: 1 failed, 1 passed, 168 s. The test does not print its drawn place on this failure; the seed's first draw is place 3919008 (Ohio).

Nov 1 (governing lead, branch governing/door-pledge-test-by-seed): the engine was right and the test was stale. Seed 856c9d9e90f14b97, Ohio (3919008), governor race contest:seat:US-OH:governor:2026-11-03: person_c926bb4c4c385e40 and person_878bdf365f8e87b2 each said yes to person_04e34713c16510ce on 2026-01-05 (pledge ids `<voter>|<contest>|person_04e34713c16510ce`, firmness 0). Their pledge rows were gone on 2026-08-03 (first voter) and 2026-10-11 (second), the day the candidate's own doors asked again (the candidate's and two volunteers' on 2026-08-03, causes `door` and `volunteer-door`; the same two volunteers' on 2026-10-11). By then the field held the two party nominees, each voter's own appeal chose official:nominee:Republican:contest:seat:US-OH:governor:2026-11-03, and answerAtDoor took the yes back. Both voted for the Republican nominee on a ballot row whose pledge parts are all 0. The test now reads the kept pledge and checks that row. Found while there, test-only: the weighted-household test took the first yes to the candidate in any contest (a world official in Lyndon, Illinois, 1745278, seed dp-fresh-2:0, was running for governor too) and now takes the yes in its own contest; the first test's group comparison of pledged against other turnout read a list of ids as rows and never ran (live it reads 0.17 of 18 against 0.19 of 36 in 1717939, seed dp-fresh-1), so it checks each voter's own turnout reasons instead.

Separate engine defect, not this item's: the weighted-household test on seed dp-fresh-1 draw 0 (Oak Hills, Iowa, 1958048) throws "Payroll enrollment is duplicate or follows an already settled work mode" from work-attendance.ts admitWorkPayrollCalendar via jobs.ts hire in runWeek. It reproduces with no campaign at all: buildBenchWorld(drawPlace("dp-fresh-1:0", "door-pledge-weighted").seed, gameStartDate(), { twoLevel: true, placeKey: "1958048", countScale: 3 }) then advanceCore to 2026-06-03 throws on 2026-02-02. Needs a jobs-lead item.
