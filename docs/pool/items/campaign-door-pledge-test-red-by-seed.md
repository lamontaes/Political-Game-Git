---
id: campaign-door-pledge-test-red-by-seed
title: "The door-yes test passes in every drawn place: a voter whose yes was taken back is not read as still pledged"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
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
