---
id: director-conversation-test-sparse-town
title: "The conversation test's two counted checks fail in a town where the player knows few full people with anything left to say"
area: words
lead: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Red main, relaying Merger 0's draws fn-1 and fn-2, Nov 1
---

**What.** On draws fn-1 and fn-2 (Lavalette, West Virginia) src/director/conversation.test.ts fails 'offers four distinct replies' (8 turns, needs more than 8) and 'never parts with a word the talk already said' (no talk ended in a goodbye), on main before and after #7012. The engine is right by its rulings: a relative with nothing on record says nothing, and nobody says goodbye right after their own question was answered. The player the test picks knows 23 people, 5 of them full; the opening records list only 1 to 4 of them as known, since the rest are added when the world starts, so a pick from the opening records can't see the shortfall.

**Rules.** One rule, all 56 places: the test draws its place at random, so it must hold in a small town whose player knows few full people as well as in a big one. Choose the player and the people talked to from records, never by watching a talk's output, and never redraw after a result (director-conversation-drawn-fixture-lacks-subjects). Keep every assertion. Talking to the reserve strangers in the first test uses up what the lie tests need; meeting more strangers in the shared world broke the lie tests and the default draw.

**Done when.** `src/director/conversation.test.ts` passes on fn-1, fn-2, the default seed and three more drawn places named with their seeds in the PR, with each counted check exercising its subject: more than eight turns of replies checked, and at least one talk that parts with a goodbye.

**Files.** src/director/conversation.test.ts

**Notes.** Diagnosed by Words, Nov 1 20:10 (red main relayed Merger 0). Tried and reverted: counting full peers or known full people in the opening records (too few known there), picking the fitting player who knows the most full people (fn-2's best knows 4), redrawing on the opening records' count (six redraws found none), and talking to the reserve or extra strangers (breaks the lie tests). Next idea: count the people known once the world starts (the core's knownIds) before the tests run, which is a record, not a talk's output.
