---
id: play-room-talkable-after-story
title: "After a story scene ends, the people still in the room can be clicked to talk"
area: play
kind: bug
priority: 1
size: S
status: claimed
claimed-by: play-first/play-room-talkable-after-story
pr:
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-30T02:14:52.866Z
---

**What.** On the opening evening the household is drawn talkable for a moment (renderScene, src/bench/play.mjs), then the opening's story scene redraws the same people without a click (showStory draws story.people with no onClick), and when the story ends nothing draws them talkable again: after the address and every Continue, the family sits on the couch and cannot be clicked (Keno, Oregon, seed ccb6f0a8-dd00-4598-81a2-404d4a74f63d: talkable 1 at load, 0 from five seconds on; Elaine, Arkansas, Grand Meadow, Minnesota and Kent Acres, Delaware the same). panels.browser.mjs passes its talk step only because it clicks in that first moment. The owner's rule is that a person in the room is talked to by clicking them (Oct 27, the card has no Talk button).

**Rules.** One screen renderer per menu type: the room is drawn by the one drawPeople, and a story's end hands the room back to renderScene rather than a second drawing path; Replace, never layer; Done means it works in play.

**Done when.** In three drawn places from all 56 (name each place and seed), a browser check plays the opening through its last Continue, then finds a housemate marked talkable in the room, clicks them and the talk opens; it fails on main and passes on the branch, with a screenshot of the open talk in the PR body.

**Files.** src/bench/play.mjs, src/bench/person-card.browser.mjs

**Notes.** Fix: a story or talk ending hands the room back to `renderScene`, so the people are drawn talkable again. On main today nobody is drawn at all in a non-plated room (the staging side, People v4 #6856); the check passes on branch plus #6856 in nine draws and fails without the fix on the same base (Lenora, Kansas, seed 916d1276-32aa-4c93-813b-ad82106fbebb: 1 talkable at load, 0 after). It needs #6856 merged first. One click timed out once in about twelve draws, not reproduced.
