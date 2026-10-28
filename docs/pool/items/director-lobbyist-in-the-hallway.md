---
id: director-lobbyist-in-the-hallway
title: "An interest group's lobbyist who made the group's case to a sitting member catches them in the hallway, as a scene"
area: director
kind: feature
priority: 1
size: S
status: done
claimed-by: claude/director-lobbyist-hallway
pr: #6269
blocked-on:
lead: director
source: added with npm run pool -- add
claimed-at: 2026-10-27T08:57:34.801Z
---

**What.** The owner named lobbyists in hallways (Oct 27, 01:30 Eastern). The interest-group engine already sends a named lobbyist to every member who will vote on a bill that costs its employers, and records the visit as a case made (case.made, id case:lobby:…) with the member as its listener: 116 to 150 a year in each of three drawn towns. No scene was ever staged from it. A circumstance row (lobbyist-hallway) casts that lobbyist when the player is the listener, at the seat of government or the body's venue, through the hallway type, so the talk opens with the lobbyist.

**Time box.** 2 hours, Opus (director lead), no helpers.

**Rules.** Owner, Oct 27: any record can call a scene when the circumstances fit. No dice: the lobbyist is the one the record names. The chain is the acceptance: the conversation writes its record back.

**Done when.** src/director/circumstance.test.ts asserts a lobbyist-in-the-hallway family; with GOLDEN_PATH_SEED=director-circ-1 it stages at least one, citing its case:lobby record id, in a drawn place as a sitting member of a body.

**Files.** src/director/circumstance.ts, src/director/data/circumstances.json, src/director/data/situation-types.json, src/director/circumstance.test.ts

**Notes.** TODO
