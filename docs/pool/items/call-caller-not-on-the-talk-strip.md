---
id: call-caller-not-on-the-talk-strip
title: "A phone call still stands the caller in the player's room, on the talk box's strip"
area: play
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/pt-carryover-n16-44-calls
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: CTO send-back 4, Nov 24 (N16-44, calls)
---

**What.** The owner's Nov 16 words: "A phone caller stands in the room." #10334 stopped the caller being staged on the scene's own strip for a call or a letter, but the reporter's call still shows the caller's bust standing in the player's kitchen: the talk box draws the speaker on its own strip by their card's face.
Seen: Nov 24, a drawn place (Lincoln, New Hampshire, seed a4661a4c-7b05-42b8-aa79-916d850892d3, a grown resident filed for a seat, Ask for an interview, then Go): William Rogers' bust stands over the kitchen table while the call plays.

**Cause.** Found in code: `drawTalkStrip` and `setWho` in src/bench/play.mjs add a speaker who is not in the room's list by their card's face (`/api/known`), and `storyScene` in src/bench/story.ts never told the talk box a scene is a call; #10334 changed only `people`.

**Fix.** `storyScene` returns `apart` (the scene's setting is `phone` or `letter`); `setWho` takes it, `drawTalkStrip` draws no speaker for it and `setWho` fetches no face. The caller stays named in the talk box and in `names`, so their lines are unchanged. No player text changes.

**Time box.** 1 hour, one Sonnet session at medium.

**Rules.** Wire to the world: the one flag covers every call and letter scene through the one story builder and the one talk strip, and adds no player text or second renderer.

**Done when.** In a drawn place at 1440x900, the reporter's call shows the player alone in the room, with the caller named in the talk box and no bust of them in the room. A second session plays Ask for an interview in the running game and sees an empty kitchen and the caller's name on the box.

**Waits on.** Nothing.

**Files.** src/bench/story.ts, src/bench/play.mjs

**Notes.**
