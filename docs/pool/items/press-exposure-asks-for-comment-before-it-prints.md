---
id: press-exposure-asks-for-comment-before-it-prints
title: "A paper that exposes an official calls them for comment before the story runs, and prints what they said"
area: words
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: Account lead builder (reporter's call thread)
pr: 9463
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead builder, Nov 15, found while placing the Words lead's day word for the scandal call ("the day word is read from the story's run day on the record, never fixed")
---

**What.** The scandal call says "We're running a story that says you took money from..." and closes on "It runs tomorrow.", but the story has already run: the paper printed it the day it exposed the act, and the call comes after. What the player says on the call never reaches the story. Seen: the reporter calls before the story runs, and the story prints the official's admission, denial or decline once, in the paper's words.

**Cause.** Found in code: src/core2/modules/press.ts `weighTip` emits `press.exposed` and calls `printItem` (src/core2/press-desk.ts) on the same day (`date: api.state.date`), so the printed story exists before the director stages the scandal call from the exposure (purpose-scene.ts reads `press.exposed`). Nothing writes the call's reply back to the story.

**Fix.** A class, not one case (Account lead, Nov 15): every person the paper exposes is asked for comment before it prints. In press.ts `weighTip` keeps the exposure on the tips row (`exposedId`, `runsOn`) and schedules calendar work `press-run` on the outlet's next print day (`exposureCommentDays`, ESTIMATED from the SPJ code's "seek comment before publication", spread 1 to 7; never a tuned hold). `runExposure` prints it then through the one `printItem`, with the comment: the scandal call's ending when the official had the call (`keepComment`: on-the-record admitted; no-comment, left-there, source-fight declined; lie-printed, caught denied), "declined" for a player who never took the call, and for an unattended official their own lean on the `scene-talk.move` decision (confess or lie over refuse). The Words lead's closes by outlet kind ("It runs {day}." and the rest) replace "It runs tomorrow." in the scandal call's own pull request (scandal-call-says-what-the-paper-found), which builds on this one.

**Time box.** 3 hours, one Opus session at medium.

**Rules.** Ask why: the run day and the printed comment cite the exposure and the call by record id. Tests pinned to named places and seeds (src/core2/press-owners.test.ts, src/core2/press-conflict-exposed.test.ts).

**Done when.** A second session has a bribe leaked in a drawn town with a reporter: the exposure is on the record the day it is found and the story is not; the story prints on the run day with the official's comment; an unattended official's comment follows their own lean.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/core2/data/press/parameters.json, src/core2/press-owners.test.ts, src/core2/press-conflict-exposed.test.ts, src/core2/press-exposure-held.test.ts, src/core2/press-exposure-comment.test.ts

**Notes.**

- Nov 15: split from the scandal call at the coordinator's ruling; the call is pushed after this folds.
- Nov 15: the call's answer now reaches print for every ending. A printed denial (`denial-printed`) was read as a decline and an admission (`on-the-record`) lost its quote; both fixed and played in press-exposure-comment.test.ts.
