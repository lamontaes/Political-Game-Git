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

1. **Pin the place and the seed in the file.** Name two or three places with their seeds. They were found once by drawing and waiting (`drawn-place-tests` shows how); the file records the answer so the next run is the same run.
2. **Stage a rare event through the game's own path.** If the case is a recall in progress or a filing open on a day, drive the world there with the engines' own calls. Do not insert a fixture row, and do not wait for a draw to land on it.
3. **About a minute.** Over two minutes is a different kind of test. Set an explicit timeout when the run is near vitest's 30 second default.
4. **Fail by name.** When the case is missing, fail at that point with the place, the seed and what was passed over.
5. **Never loosen a test, raise a baseline or widen a number to get green** without the lead's word. If a builder respells a line or a number to slip past a check, send it back.
6. **A test that needs a rare case that does not exist is a finding**, not a license to skip: file an item.
7. **A late start changes who runs.** A test that opens a world later in the year to save time changes who files, who is in office and what is under way (the views thread, Nov 14: a moderate files on a cause from a Feb 3 board meeting at Marshfield MA, and in a world opened Aug 1 or Sep 1 only two liberals file; at Monument Beach MA opened Jun 1 the conservative never files). Check that the case still exists in the late world before moving the start date.
8. **A pinned case must fail on the old behavior.** Put the old line back once and see the test go red (the warm-up test: without the hold the played person acts 69 times in the window, with it 0) before calling the case pinned.
9. **A test that stages a death, a payment or a settlement on a record picked by state ("the richest household") must ask whether the game already acted on that record this month.** The estate test (law-wiring-taxes, Dennis MA) picked a record the game had just killed in part: its second settlement reused a transfer id (the accounts engine keeps ids for the month and the one before) and the failure looked like a game bug in the PR that happened to be on the head. Before blaming the PR on the head, run the same pinned test with that PR's change put back (`git checkout <earlier head> -- <file>`); if it fails the same, it is not that PR's.

## Checking a reported pass

Ask where it ran and at what head. A unit test that builds its own small world proves an edge case only; the played-world proof is separate.
