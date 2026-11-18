---
id: words-scene-tree-depth-one
title: "Three scenes compose a tree only one step deep: the filing petition, the party welcome and the moving goodbye"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: words
source: S6 (PR #9324), Nov 14 2026
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** src/director/scene-talk.test.ts fails "composes a tree: every reply has its branch, numbers are unique, nodes are bounded, a lie shows both outcomes" with "expected 1 to be greater than or equal to 2" (`talk.depth`, line 220). Three scenes end after the player's first reply, with no second turn. The test is red on the Train, and it is not on the Train's known list. Seen: the talk after filing petition papers, after being welcomed into a party, and when someone moving away says goodbye; each ends after one exchange.

**Cause.** Measured: `npx vitest run src/director/scene-talk.test.ts` (the fixture's seed `scene-talk-test`) on the Train's head 8b6c8903fb77b98e19c1397858c0d26b65fdfe1e, the test fixture (tests/support/scene-talk-fixture.ts, with the facts and the source the test adds) composes three types with depth 1:

- filing (purpose filing-petition)
- party-welcome (purpose party-welcome)
- moving-goodbye (purpose moving-goodbye)

serve-sought was the fourth, and #9324 fixes it. The test stops at the first type that fails, so only one "1 ≥ 2" shows. Why each tree ends after one step is not yet traced. Read each purpose's arc in src/director/data/purpose-arcs.json (`replies`, `again`) and the bank lines that answer it in data/english/parts/scene-talk.json.

**Fix.** Needs cause.

**Time box.** 2 hours for one sonnet session to trace; the fix is sized after.

**Rules.** No hand-written player text: a missing turn is filled by an arc row or bank lines the Words lead reads first, never typed in code. Never loosen the test. A missing branch is either an arc row or bank lines that the Words lead reads first; never a filler line.

**Done when.** On the Train's head, each of the three composes with depth 2 or more in the fixture, and the tree test passes for them. Then a second session, in a place it draws from all 56 with a seed it did not choose, plays each of the three scenes in the running game: filing petition papers, being welcomed into a party, and saying goodbye to someone moving away. Each talk offers the player a second turn after their first reply.

**Waits on.** Nothing.

**Files.** src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json, tests/support/scene-talk-fixture.ts
