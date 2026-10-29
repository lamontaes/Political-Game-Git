---
id: words-scene-desk-visit-sponsor-or-opponent
title: "A bill on the executive's desk brings the sponsor, or the group that lobbied against it, to argue before the decision"
area: words
kind: feature
priority: 2
size: S
status: done
claimed-by: words/helper-d-desk-visit
pr: #6250
blocked-on:
source: owner, Oct 27 (executive scenes, signing or vetoing with the sponsor in the room); scenes-from-life episode desk-decision-both-sides
lead: words
claimed-at: 2026-10-27T06:09:21.000Z
---

**What.** Scene builder D's second episode, from a governor who had five days to decide a contested bill while its backers and its business opponents each pressed her, and from a governor and a mayor who each held a bill back to ask for a fix. When a bill is presented to the player's executive desk, the bill's sponsor comes to the office and asks them to sign it; where the sponsor cannot be cast, the lobbyist of the group that argued against it comes and asks for a veto. The visitor names the bill, how it passed and the day the decision is due, and the lobbyist says what it costs the businesses they speak for. The executive answers one of four ways: go the visitor's way, go the other way, ask for a fix first, or ask what is behind it; every ending opens the desk.

**Rules.** No dice: who comes is the sponsor on the bill record, or the lobbyist of the group whose recorded meetings on the bill are against it, never a roll. Wire to the world: the presentment, the vote roll and the lobbying meeting are read by the director and each is cited by record id in the scene. No hand-written player text in code: every word is a bank piece in data/english/parts/scene-talk.json, worded by the English engine, with versions by who is asking and by what the record holds.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a bill presented to the player's desk composes the desk-visit scene with the bill's sponsor in the chair, citing the presentment and the vote roll by record id; with the sponsor absent and a recorded meeting against the bill it casts that group's lobbyist and says the recorded cost; two trait profiles of the visitor say it differently; the four root replies are four moves; src/director/desk-visit-scene.test.ts checks each and fails when the presentment record is absent.

**Files.** src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/director/civic-roles.ts, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/desk-visit-scene.test.ts, docs/design/scenes/from-life/desk-decision-both-sides.md

**Notes.** Branch words/helper-d-desk-visit. The presentment record names both the executive and the sponsor today, so this scene fires in play. It stages before the existing desk-bill scene (the aide with the file), which still plays when no visitor can be cast. Lead: words.
