---
name: pinned-tests
description: >
  How a test for Our Civic Duty is written so it is never red by draw: named
  places with fixed seeds pinned in the test file, a run of about a minute, an
  explicit timeout near vitest's 30 second default, a rare event staged
  through the game's own path instead of waited for, and never loosening a
  test to get green. Use when writing or fixing any test that builds a played
  world, when a test is red "by seed", and when a builder proposes a looser
  assertion or a retry over fresh seeds. Pairs with
  drawn-place-tests, which covers tests that hunt faults across places.
---

# Pinned tests

Lead ruling, Nov 13 to 14: a test is pinned in the test file to named places with seeds, and is never red by draw. An env seed, or a retry over fresh seeds, is still a draw and counts as unpinned. (`drawn-place-tests` says never to pin a place to get green; it covers tests that hunt faults across places, this skill covers tests that gate a PR, and the CTO reconciles the two. Drawing places is still how a feature is proved in play: `played-world-proof`.)

## The rules

- **Pin the place and the seed in the file.** Name two or three places with their seeds. They were found once by drawing and waiting (`drawn-place-tests` shows how); the file records the answer so the next run is the same run.
- **Stage a rare event through the game's own path.** If the case is a recall in progress or a filing open on a day, drive the world there with the engines' own calls. Do not insert a fixture row, and do not wait for a draw to land on it.
- **About a minute.** Over two minutes is a different kind of test. Set an explicit timeout when the run is near vitest's 30 second default.
- **Fail by name.** When the case is missing, fail at that point with the place, the seed and what was passed over.
- **Never loosen a test, raise a baseline or widen a number to get green** without the lead's word. If a builder respells a line or a number to slip past a check, send it back.
- **A test that needs a rare case that does not exist is a finding**, not a license to skip: file an item.
- **A late start changes who runs.** A test that opens a world later in the year to save time changes who files, who is in office and what is under way (the views thread, Nov 14: a moderate files on a cause from a Feb 3 board meeting at Marshfield MA, and in a world opened Aug 1 or Sep 1 only two liberals file; at Monument Beach MA opened Jun 1 the conservative never files). Check that the case still exists in the late world before moving the start date.
- **A pinned case must fail on the old behavior.** Put the old line back once and see the test go red (the warm-up test: without the hold the played person acts 69 times in the window, with it 0) before calling the case pinned.
- **A test that files for office stages the filing fee's cash, and sizes the place by its vote date** (campaign events builder, Nov 15). The player starts with $0 and a place that charges a filing fee refuses the filing (`filing-fee`, `status: "refused"`), so set the player's `liquidMinor` before `fileForOffice` and assert the filing was not refused. A big place whose vote is nine months out takes about 190 seconds of played days after a 38 second build; pin a small place where the vote follows the filing window by weeks, and measure its build time, days to the vote and the debate or other event it needs before pinning it (a place with a council race can still hold no debate).
- **A test that takes "the first ask" breaks when an ask moves earlier (Nov 15).** Moving a party's ask before the day's weighing made the first ask an ask to a member who weighs the seat, so the player's-answer test registered the wrong person. Pick the case by what the records say (the ask came after the contest's weighed row had `filedOn` set), never by order, and say why in a comment. Narrowing which case a test stages is not loosening it; removing or weakening an assertion is, and goes to the lead.
- **Check that a break-it edit changed the file (Nov 15).** A `sed` that matches nothing leaves the code intact and the test green. Print the changed line, or count matches, before reading the result.
- **A test's played days are a cost; say why in a comment and use the smallest named place.** A test that plays months must say what the months are for (the federal income tax test plays 40 days, then 62 after each law change, because a law reaches the tier at its next month step and the treasury at the close after that), and it runs at the smallest place that holds the case (Roy, Montana is about 28 seconds a year; Klamath Falls and Delta City about 190). A first version at Klamath Falls took 152 seconds and was sent back; at Roy it takes 23. The explicit limit is near twice the measured test time.
- **A test that stages a death, a payment or a settlement on a record picked by state ("the richest household") must ask whether the game already acted on that record this month.** The estate test (law-wiring-taxes, Dennis MA) picked a record the game had just killed in part: its second settlement reused a transfer id (the accounts engine keeps ids for the month and the one before) and the failure looked like a game bug in the PR that happened to be on the head. Before blaming the PR on the head, run the same pinned test with that PR's change put back (`git checkout <earlier head> -- <file>`); if it fails the same, it is not that PR's.
- **A test that waits out a game timeline is slow by the game's own days, and says so (estate heirs, Nov 15).** Probate is 270 played days, so a played-world case that kills a person and runs to the close takes about 190 s at Dennis, Massachusetts (key 2516740, seed 9b87fa9d713b54ecc27f071016da6e4ecd4f220b5f459bbd5c86bc14e9fc9f97); give it a limit near twice (420 s) and a comment that names the timeline. Stage the deaths through `api.updatePerson(id, { alive: false })` and `settleEstate`, never by waiting for a death. Read anything that keeps only the living (`willOf`, `heirsOf`) before the death you stage, not after: after it, the dead are gone from the answer.
- **A world opened late has none of the causes lived before its opening** (no campaign under way, no speech, no rival's platform built from a season of events; item `opening-world-holds-causes-lived-before-its-start`). Until that is built, a case that comes out of a campaign plays from the game's start (Jan 20) to the month it comes, and the comment says the time is the game's own played days (Nov 14: the pledge and rivals tests).
- **Typecheck does not read most test files** (item `tests-typecheck-covers-src-test-files`). After changing a function's arguments, run its tests: on Nov 14 a test calling `speechAct` the old way threw at every seed with typecheck green.
- **Count how many cases an assertion rests on (Nov 15).** A counted-buyers test at Bastrop passed for weeks because one July renter in 125 had the down payment; a Train fold that regrouped counted households removed that one, and the test went red with no change on its branch. Print how many cases pass the condition (not only that one does); if it is one or two, the test is luck, so stage a named case through the game's own path instead, and tell the lead before re-pinning.

- **Look for the story the game already tells before staging one** (Nov 15, the paper's looking-for-work line): probe the pinned place month by month and word each record the game wrote (`wordPrintedStory`); Washington, Kansas told its jobless every month from February to June, so nothing needed setting. Only if no month does, move the earlier reading the story compares against, say why in the test comment, and assert that the printed figure comes from the game's own row, never the one set by hand. A record the game wrote proves the route; a hand-built one proves only the wording.
- **A screen that shows "now" reads the latest kept month, not the live count.** Compare the Metrics tab with the kept month row on its own day, never with a fresh read after the month closed (Washington, Kansas, July 21: 35 live against the tab's 28 from July 2).

13. **To play a different person than the world's player, finish the day first.** A test that needs an eligible entrant (a housemate with a race open) plays to a whole day (`minuteOfDay` 0) with the world's player, calls `retirePlayerV1(core)`, sets `core.playerId`, calls `director.watch` and `core.focusPersonIds.add`, then plays on with the new person; retiring mid-evening throws "Finish the controlled day before retiring its clock". `advanceCore` alone never feeds the director's ledger, so a home-talk test must play through `advancePlayerV1` (`src/director/home-talk-own-race-only.test.ts`).

## Checking a reported pass

Ask where it ran and at what head. A unit test that builds its own small world proves an edge case only; the played-world proof is separate. 7. **Stage a law by the game's own enactment and start from the row the game reads (Nov 15).** A test that waits played days for a bill to pass took 352 seconds and was red on a tie. Pin the place, take the starting amount from `billValueInForce` (the floor doctrine keeps the federal row on a tie, so "the local row" is the wrong start), and enact through `enactLaw`. Say in the comment why no played days are needed.

Ask where it ran and at what head. A unit test that builds its own small world proves an edge case only; the played-world proof is separate.

## Debugging a test (Nov 15, Visit/Call thread)

`console.log` is swallowed by vitest here. A throwaway debug test writes its tally to a file and the file is deleted when the answer is found.
