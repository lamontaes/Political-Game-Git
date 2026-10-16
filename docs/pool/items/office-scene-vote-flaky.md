---
id: office-scene-vote-flaky
title: "Office scene test: target's recorded vote is missing in some random places"
area: people
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/office-scene-vote
pr: #4763
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T15:28:59.801Z
---

**What.** The office scene test sometimes finds no recorded vote for the target: "moves the target's stance by the player's case, and the vote reads it" fails with the vote undefined in some randomly drawn places. The case moves the stance but the body may not vote on the bill in the window the test runs. Find whether the bill is never taken up, or taken up on a later day, and make the test wait for the vote record or fix the engine that skips it.

**Rules.** Ask why: the PR body names why the target had no vote in the failing place and seed, by bill and vote record id. One rule, all 56 places: the fix does not name a place, and the test keeps drawing a random place.

**Done when.** src/director/office-scene.test.ts passes in at least ten consecutive runs in drawn places and seeds the builder did not choose, and when it fails the message names the place, seed, bill and record id.

**Files.** src/director/office-scene.test.ts, src/director/office-scene.ts, src/core2/modules/legislature.ts

**Notes.** Written from the title and the evidence on the item when the quality gate was repaired (Oct 16).
