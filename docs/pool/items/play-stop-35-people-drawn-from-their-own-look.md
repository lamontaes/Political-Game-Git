---
id: play-stop-35-people-drawn-from-their-own-look
title: "Each person in a room is drawn from their own look, so neighbors differ and one person looks the same everywhere"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by: play-first/play-stop-35-people-drawn-from-their-own-look
pr: #6236
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T05:55:10.434Z
---

**What.** In v0.34.0 the people the player sees all look alike: the first evening's living room shows three bald figures with the same skin and the same gray clothes (the player in a vest, a man in a t-shirt and shorts on the couch, a man in a shirt by the kitchen), the House chamber shows two bald men from behind, and the door-knocking street has about nine identical gray figures. The owner, about the street: "Who the hell are all these people ... It just throws you into a location." The ruling is that every figure is drawn from that person's own appearance record. This item gives each staged person a look read from their own record (sex, build, outfit, and hair, skin and clothes color as those fields exist) so two neighbors differ and the same person is drawn the same in every scene.

**Rules.** Serves LAW.md §2, People in rooms and figures ("Every figure in a scene must be drawn from that person's own appearance record"; plain poses; the person in the room has a reason to be there). Wire to the world: the look comes from the person's record, not from a stage default. No dice: a person's look is a stored field set once, never rolled when a scene is drawn. This is a game, not a spreadsheet. Replace, never layer: the fallback look is deleted, not kept beside the record's.

**Done when.** In a drawn place's first evening and in a door-knocking street built with buildBenchWorld, a test over src/bench/staging.ts passes: no figure is drawn from a fallback look, two different people share a look only where their records do, and one person gets the same look in two different scenes (record ids named); screenshots of the living room and the street show people who differ by sex, build, outfit and, where play-stop-33 and play-stop-34 have landed, hair and color. Where the core record has no look fields, the item adds a needs-from line and a pool item for the core's people lead and builds the screen side against what the record gives today.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The people in your living room and on the street look like different people, and the person on the couch looks the same when you see them again elsewhere.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/staging.ts, src/bench/scene.ts, src/bench/appearance.ts, src/bench/whole-figures.ts, src/bench/data/whole-figures.json

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "Who the hell are all these people." Wildermyth grade of the opening room (CTO read): people, no variety, everyone identical gray: fail. play-first-06-created-look-in-every-scene (open) covers the player's own look; this item covers everyone else and does not wait on hair and colors, which play-stop-33 and play-stop-34 add. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).

CTO root-cause report, Oct 27 (docs/reports/opening-root-cause-2026-10-27.md): in Iowa City, Iowa, seed 28c0b8150290, Representative Saunders (official:term:seat:US-IA:us-house:01:2025-01-20) wears figure v2-38 on the House floor and v2-02 in the next opening picture. Cause: pickLook hashes the id among looks still free in that picture (src/bench/whole-figures.ts:263-269; the no-twins set at src/bench/scene.ts:600 rerolls it). Residents carry looks.appearanceSeed that no bench code reads; officials get gender only (src/core2/state.ts:2664, now core-officials-appearance-and-home-past, lead m0-m2).
- Merged Oct 27 in PR #6236; awaiting the owner's installed-build check. Still owed: the played-world street test by record id (buildBenchWorld, a door-knocking street), flagged in the PR body.
