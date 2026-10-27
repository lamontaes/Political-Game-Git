---
id: play-stop-36-opening-starts-with-the-address
title: "The opening starts with the President giving the address, with the vice president and key people pointed out behind him"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #6234
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** On v0.34.0 a new life opens on the player's living room at night with three unexplained figures and a News box saying "We begin with the inaugural address"; the address then plays as cutaways (an empty unemployment office, an empty grocery, an empty factory, the House chamber, a state capitol) with the President as a small portrait, and returns to the same living room, now in daytime. The owner: "why does it start in like your house and we begin with the inaugural? Again, there's just random people for the inaugural address," and "it's the right idea, wrong execution. Let's get it done." The ruling is the President's address first, with the vice president and key people behind him pointed out by name and office as the camera passes, then Congress, then the governor with a few state legislators, then the family, then home. This item makes the first frame the address itself and moves the player's home to after the governor and family chapters.

**Rules.** Serves LAW.md §3, The opening and speeches (OD:108 the sequence; OD:290 the key people are the president and vice president, the state's legislators, the most powerful person in each chamber and the player's own representatives; OD:233 the address is the model scene) and LAW.md §2 (Introduce people before they speak, OD:345; every figure drawn from a person's own record). Wire to the world: the people behind the President are the world's own officeholders by record id. Replace, never layer: the living-room-first frame is removed.

**Done when.** In a drawn place's new life, the first frame is the address with the President at the lectern drawn from his record and the Vice President behind him; a test over the opening stage list (src/director/opening-sequence.ts) fails if any stage at the player's home precedes the address or the governor chapter, and the people pointed out on screen are the record ids of the President, the Vice President and the key people the world lists, each named with his or her office as the camera passes, shown by screenshots of the first three frames and the first frame after the governor with the place and seed named.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** You start in front of the President giving the address, with the vice president and the others behind him named as the camera passes; your home comes later.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/opening-sequence.ts, src/bench/opening.ts, src/bench/data/opening-pictures.json, src/bench/play.mjs, src/bench/play.html

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner: "why does it start in like your house and we begin with the inaugural?" / "Again, it's the right idea, wrong execution. Let's get it done." The picture and the visible speaker of the same scene are play-opening-address-empty-waiting-room (open); one builder may take both, this item owns the order and who is pointed out. What the address says is play-first-09-opening-speech-per-world. Tags and highlights are play-stop-37. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
Sent back 2026-10-27 from PR #6234 (branch play-first/play-stop-36-opening-starts-with-the-address): typecheck fails on the merge with main (opening.ts:162, frame type has no speaker); finish on that branch, merge main into it first.
