---
id: director-talk-offers-at-most-four-replies-one-rule
title: "Some talks offer the player five replies; the owner's limit is four"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: words-paper-reader-accusation-gives-the-record-reason
blocked-on:
lead: words
model: opus
effort: medium
root: design-life-record
source: Found by the short-replies builder in the complaint over a taken bribe at Bryant IL (seed c0ffee13), Nov 15, 2026; the Account lead asked for one rule for every arc
---

**What.** The owner ruled replies are up to four, never more (OWNER-DECISIONS, Nov 10, about 7:50 p.m.: "So just up to 4."). A talk whose arc lists five reply moves offers five, and the paper's accusation reached five the moment a fifth piece fit (the follow-up PR's test caught it with `expectUpToFourDifferent`). Seen: in the accusation over a taken bribe at Bryant IL, the first menu offers tell, apologize, deny, confront and leave.

**Cause.** Found in code: `src/director/scene-talk.ts` takes `fresh.slice(0, maxReplies)` and then lets one extra option in up to `maxReplies + 1`. `maxReplies` is 5 in `src/director/data/scene-talk-rules.json` (tree), checked against "the lie, which he asked for as a fifth reply" (Oct 15), which the Nov 10 ruling replaced. The director's own limit is `directorChoicesPerTurn` (4, `src/director/data/director.json`), read by conversation.ts, speech-builder.ts and the test helper `reply-set-check.ts`, but not by scene-talk.ts. Measured: 13 of 77 purpose arcs and 9 arc variants list five replies. M1's placement guards (#9357, #9360, #9362) count lines, not menu size, so none covers this.

**Fix.** scene-talk.ts reads `directorChoicesPerTurn` for the menu, and the `maxReplies` row is deleted. The extra option is offered only while the menu holds fewer than four. When more moves fit than four, the ones kept are chosen by the existing order (the player's traits through `lean`, then the stable hash), and they are shown in arc order. Arcs keep their move lists. A guard over every purpose and variant at the fixture packets checks that no node offers more than four.

**Time box.** 1 hour, Opus.

**Rules.** One rule, one place: the limit is the director's one parameter. No dice: the kept replies follow the player's traits.

**Done when.** At Bryant IL (seed c0ffee13) and one place drawn from all 56 (named with its seed), the taken accusation offers at most four replies at every node. The guard is green for all 77 purposes and the variants. A second session sees it in the running game.

**Waits on.** Nothing.

**Files.** src/director/scene-talk.ts, src/director/data/scene-talk-rules.json, src/director/scene-talk.test.ts

**Notes.** Filed by hand on the conflict-accuse follow-up branch, Nov 15.
