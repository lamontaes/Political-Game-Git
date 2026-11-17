---
id: words-press-comment-rewritten-with-inserts
title: "The reporter's call says what just happened, asks one thing, and the player answers with a reason the record backs"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9794
after:
blocked-on:
root: rc4-hand-written-words
lead: words
model: sonnet
effort: medium
source: owner, Nov 14, on the reporter's call, and Nov 16, "No. Count them again and rewrite them with inserts", "either that or remove them and start fresh"
---

**What.** The reporter's call opened on "The roll on the free fares ordinance is recorded", asked "why" and offered replies that told the reporter how to write ("Put this down"), refused in a hallway and denied a vote the player cast. Its lines were placed by nothing: 527 fixed lines said the same thing in every town about every vote. The scene now opens on the vote, asks one thing, and offers only replies the record backs.
Seen: a reporter stops the player after a vote in a drawn place and the talk says what the council did, asks why, and offers replies that give a reason the record holds.

**Cause.** Found in code: `excusedAs` in tests/guards/english/line-inserts.test.ts counts a line as placed when its use names any fact, so the 527 press-comment lines of data/english/parts/scene-talk.json that carried only `excludesFacts`, or no condition at all, were never counted as fixed text, and the lines the reporter's call drew were shared "routine" replies no record placed. No pool item rewrote them with inserts.

**Fix.** Delete the press-comment lines placed by nothing and the ones that state what no record holds, keep what a vote, stance or story places and that carries a slot, and write the question and reply families the spec names. Add three reads beside `voteStandFacts` in src/director/vote-stand-facts.ts, `billReadsForPress`, which `composeBinding` in src/director/purpose-scene.ts calls for the reporter's call: `stand` (the views engine's stance), `sponsor` (the bill's sponsor) and `bill-purpose` (the bill catalog's clause for the first section). Lower scene-talk's count in tests/guards/english/line-inserts-baseline.json.

**Time box.** 5 hours, Sonnet at medium effort.

**Rules.** No hand-written player text: every line is a bank piece placed by a fact the packet sets, and none is typed in code. Wire to the world: each fact a line needs is read from the legislature's roll, the views engine or the bill catalog, so a line plays only where its record holds.

**Done when.** In a drawn place, Town, State (seed nobody chose), a second session stages a press interview after a vote in dev mode, presses every reply, and finds the opening names the vote, the asked question is answered with a reason or a plain decline, and no reply contradicts the roll. The line-inserts count for scene-talk is lower than before and the many-report lists the thin press-comment spots.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/vote-stand-facts.ts, src/director/purpose-scene.ts, tests/guards/english/line-inserts-baseline.json, data/english/pulled.json

**Notes.**
- 2026-11-17 (Story lead): built on #9794. 614 pieces deleted, 70 kept, 159 new. Played through dev mode's Hold the vote at Riverdale, North Dakota (a no vote) and Enterprise, Oklahoma (a yes vote); 2,952 reply pairs judged by fresh reviewers, two bad. The scene-talk insert count stays at main's until #9757 (the recount) merges, because the excuse still hides these lines from the count on main.
