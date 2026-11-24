---
id: words-silence-after-line-kept-as-heard
title: "What a person says after the player stays silent is kept as heard today and picked with what was heard held back"
area: words
kind: bug
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/talk-silence-heard
pr: #9553
after:
blocked-on:
lead: words
model: sonnet
effort: low
root: none
source: acting CTO's read of the frozen Train 892427ec (fault 4), Nov 15; confirmed by Words builder A
claimed-at:
checked: words builder A 2026-11-15
---

**What.** After the player says nothing, the line the other person says next is picked with an empty heard-today list and is not kept as heard, so a later talk the same day can say it again. Seen: in a talk where the player presses Say nothing, the line the person says next is not said again in a second talk the same day.

**Cause.** Found in code: `say` in src/director/conversation.ts runs the step inside `withHeard` and then calls `noteHeard`; `sayNothing` called `carryOn` directly and did neither. The route `/api/talk/silent` (src/bench/handler.ts) calls `sayNothing` alone.

**Fix.** `sayNothing` runs `carryOn` inside `withHeard` and calls `noteHeard` after, as `say` does. A sitting's silence (declining the question put) is unchanged.

**Time box.** 1 hour for one Sonnet session at low effort.

**Rules.** One engine per mechanic: silence and speech keep what was heard the same way. Pinned test, no draws.

**Done when.** At Sheridan WY, seed 7, every line said after silence in six talks is kept as heard today (src/director/talk-silence-heard.test.ts), red on the unfixed code (7 lines missing), green after. A second session (not the builder) opens a talk in the running game at a drawn place from all 56 (place and seed named), says nothing, lets the person carry on, and sees that a second talk the same day does not say it again.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/talk-silence-heard.test.ts
