---
id: press-comment-national-arc-unplayed
title: "The national reporter's call is never played by presses in any test"
area: words
kind: wiring
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: press-comment-why-answered-by-the-roll
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead, Nov 16 00:41Z (composed is not played)
---

**What.** The national arc of the reporter's call (`press-comment.national`) was checked only by wording it with `composeSceneTalk` and the purpose swapped. That check is deleted from src/director/press-comment-context.test.ts, so no test plays the national arc by presses, and its lines (the opening that names the story, "I'll hold the paragraph", "That's a big claim", "Then it says you were asked and didn't say") are unproven in play.
Seen: on #9584 at bee3f973, where the Account lead ruled the composed section out.

**Cause.** Found in code: `readOf` in src/director/arc-variant.ts (its `national-outlet` read, line 600) gives the national arc only when the asker writes for an outlet whose tier is national. A town member's call after a council vote at a drawn place comes from a local outlet's reporter, so play never reaches it there.

**Fix.** Find by script, outside the test and capped at one hour, a pinned place and seed where a national outlet's reporter calls the player after their vote. That might be a state or federal member, or a vote the national desk covers. Play that call with `purposeScene`, `replyInScene` and `playedNode`, and check its opening names `story` and that no line leans on an unintroduced paragraph or claim. Any national line no pressed call reaches goes to the Words lead to delete.

**Time box.** 2 hours, one Opus session at medium.

**Rules.** Ask why: the reporter is cast by the game from the outlet's own staff row, never set by the test, and the place and seed are found by a script outside the test.

**Done when.** In a played world built by `buildBenchWorld` at a pinned place and seed, the game stages a reporter's call from a national outlet after the player's vote, and a pinned test taps it by presses and sees the opening name the story. A second session plays the same call and sees the national lines said.

**Waits on.** Nothing.

**Files.** src/director/press-comment-context.test.ts, a new pinned test under src/director/ (new)

**Notes.**
