---
id: play-stop-37-opening-tags-and-highlights-match-the-figure
title: "In the opening, a name tag, the person drawn and the highlight are the same person, in the right place"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by: play-first/play-stop-37-opening-tags-and-highlights-match-the-figure
pr: #6243
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T06:06:58.515Z
---

**What.** In the opening's cutaways the tags and the pictures disagree. The House chamber tag reads "Ronald McPherson · U.S. Representative · Pennsylvania" but the figure standing in the aisle is a woman; the seated figures have glowing outlines that mean nothing to the player; over the Pennsylvania capitol a tag reads "George Williamson · Council member" with no town named; and the President's tag reads "President · Michigan", his home state, which the owner took for where the player is. The owner: "I don't know why they're being highlighted like that" and "What state is on here right now? Is it Michigan, maybe? I was in Pennsylvania. That doesn't make any sense." This item makes the figure the tag names the person drawn, highlights only the one person pointed out, puts a tag only over a picture of that person's own place, and drops the President's home state from his tag.

**Rules.** Serves LAW.md §2, People in rooms and figures (every figure drawn from the person's own appearance record) and LAW.md §3 (OD:108: key people pointed out by name and office; cutaways follow the sentence's subject). Ask why: every tag cites the record it names. Wire to the world: sex, office and place come from the person's record. This is a game, not a spreadsheet.

**Done when.** In a drawn place's opening, a test over the opening stage list and its pictures checks every tag shown: the figure drawn for the tag has the tagged person's recorded sex; a council or mayor tag appears only over a picture of that body's own building; at most one figure per frame is highlighted and it is the tagged one; the President's tag carries his office and no state; record ids named; shown by screenshots of the House frame, a capitol frame and the President's frame with the place and seed named.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The name on the tag is the person you are looking at, only that person is lit, and the President's tag says President, not a state.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/opening.ts, src/director/opening-sequence.ts, src/bench/data/opening-pictures.json, src/bench/staging.ts, src/bench/play.mjs, src/bench/play.css

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "What state is on here right now? Is it Michigan, maybe? I was in Pennsylvania. That doesn't make any sense." (The CTO told him Michigan was the President's home state and the capitol shown was Pennsylvania's.) The glow may be the point-out highlight of OD:108 drawn on every seated figure; if the owner wants no glow at all he has not said so. Order of the opening is play-stop-36. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
