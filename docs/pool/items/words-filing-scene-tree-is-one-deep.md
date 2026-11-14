---
id: words-filing-scene-tree-is-one-deep
title: "Filing at the counter: the scene's tree is one step deep where two are needed"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: Found by the door scenes builder on train b7ed6337 (PR #9288 gate), Nov 14; the Account lead asked for an item
---

**What.** The filing scene at the clerk's counter composes a tree only one step deep. scene-talk.test reports `filing: expected 1 to be greater than or equal to 2` in 'composes a tree'. Seen: at the filing counter, no choice follows the first.

**Cause.** Measured: `npx vitest run src/director/scene-talk.test.ts` (seed scene-talk-test) is red at train 8bb1ff9d and at b7ed6337 (scene-talk.test with polling-place skipped in a scratch copy). It is not the Nov 10 red `words-scene-talk-filing-skipped-red-on-main` (done), where the scene was skipped; here it composes. No line follows the first reply under the test's facts. The filing-counter folds of Nov 14 (#9265, #9277, #9153) are the likely source, not proven.

**Fix.** Find which follow step after the filing scene's first reply has no line under the fixture's facts (a requiresFacts the fixture lacks, or a removed piece), and give it a line from the filing record or fix the arc. The filing-fee builder owns it (Account lead routed it there).

**Time box.** 1 hour, Sonnet.

**Rules.** Never skip or loosen the test to get green, and never raise tests/english-answerable-asks-baseline.json. No hand-written player text in code: a missing line is a bank piece. Builders may change bank lines.

**Done when.** scene-talk.test no longer reports filing. The run has the default seed and two drawn places named with their seeds. A second session sees the scene play in the game.

**Waits on.** Nothing.

**Files.** src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json

**Notes.** Filed by the door scenes builder on branch claude/project-thread-9d3ex7 (PR #9288). Checked in a separate checkout at clean b7ed6337, with polling-place skipped in a scratch copy of the test, because on clean that type fails first and hides these.
