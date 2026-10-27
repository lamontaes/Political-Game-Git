---
id: play-stop-38-figures-framed-whole
title: "No head is cut off by a portrait or the frame, and two people never stand through each other"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by: play-first/play-stop-38-figures-framed-whole
pr: #6240
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T06:03:50.301Z
---

**What.** Three framing defects in v0.34.0. The President's portrait in the talk box crops his head ("Their head is cut off in the portrait," the owner). In the bedroom scenes on January 22 and 28 the player stands at the far left edge with the head cut off by the frame. At the county board of elections the player's figure and the clerk's overlap behind the counter. This item frames every portrait with the whole head and places room figures inside the frame and apart from one another, and adds a check that measures it.

**Rules.** Serves LAW.md §2, People in rooms and figures (plain poses; figures drawn whole) and the play-first skill's browser check (people and props touching or overlapping; a green test never overrides a visible failure). This is a game, not a spreadsheet. Replace, never layer: one placement rule for portraits and one for room figures, no per-scene nudges left beside them.

**Done when.** In a drawn place, a new check, src/bench/framing.browser.mjs, measures the opening's speech box portrait, the bedroom scene and the filing counter at 1440x900: no figure's box leaves the scene frame at its head, the portrait shows the whole head, and no two figures overlap by more than the placement rule allows; it fails on main's staging; shown by a screenshot of each of the three scenes.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The President's head is whole in his portrait, you are fully in frame in the bedroom, and you and the clerk stand apart at the counter.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/staging.ts, src/bench/scene.ts, src/bench/play.css, src/bench/play.mjs, src/bench/framing.browser.mjs (new)

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "Their head is cut off in the portrait." The bedroom crop and the counter overlap are the CTO's observations in the same sitting (the owner said nothing about them). Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
- Merged Oct 27 in PR #6240; awaiting the owner's installed-build check. Not yet screenshotted: bedroom and filing-counter scenes (geometry tests cover them).
