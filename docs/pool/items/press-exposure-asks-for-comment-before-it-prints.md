---
id: press-exposure-asks-for-comment-before-it-prints
title: "A paper that exposes an official calls them for comment before the story runs, and prints what they said"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: scandal-call-says-what-the-paper-found
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead builder, Nov 15, found while placing the Words lead's day word for the scandal call ("the day word is read from the story's run day on the record, never fixed")
---

**What.** The scandal call says "We're running a story that says you took money from..." and closes on "It runs tomorrow.", but the story has already run: the paper printed it the day it exposed the act, and the call comes after. What the player says on the call never reaches the story. Seen: the reporter calls before the story runs, the close names the day it runs from the record, and the story prints the player's admission, denial or decline once, in the paper's words.

**Cause.** Found in code: src/core2/modules/press.ts `weighTip` emits `press.exposed` and calls `printItem` (src/core2/press-desk.ts) on the same day (`date: api.state.date`), so the printed story exists before the director stages the scandal call from the exposure (purpose-scene.ts reads `press.exposed`). Nothing writes the call's reply back to the story.

**Fix.** In press.ts, an exposure of a person the director watches holds its print for the call: the story's run day is set on the exposure's record (the next edition of the outlet), the call reads it as `{day}` (day-words `dateSaid`), and the print runs on that day with the reply the scene wrote (scene.reply with the call's ending: on-the-record, no-comment, lie-printed, caught). An exposure of anyone else prints as today. The Words lead's closes by outlet kind ("It runs {day}.", "It airs {day}.", "It's in the next issue.", "It goes up {day}.", reply-sets/oath-bribe-scandal.md) replace "It runs tomorrow.". No second print path: the one `printItem` runs, a day later.

**Time box.** 3 hours, one Opus session at medium.

**Rules.** Ask why: the run day and the printed reply cite the exposure and the call by record id. Tests pinned to Gilbert, Iowa (1930630), seed reporters-call-1, staged through the game's own path as src/director/scandal-call.test.ts does.

**Done when.** A second session takes a bribe in a drawn town with a reporter, has it leaked, and gets the call before the story runs; the close names the run day; the story on that day carries what the player said.

**Files.** src/core2/modules/press.ts, src/core2/press-desk.ts, src/director/purpose-scene.ts, data/english/parts/scene-talk.json

**Notes.**
