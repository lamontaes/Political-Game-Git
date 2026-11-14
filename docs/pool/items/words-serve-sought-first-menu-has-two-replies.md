---
id: words-serve-sought-first-menu-has-two-replies
title: "Asked to serve: the first menu offers two replies where the scene needs three"
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

**What.** The scene where the player is sought to serve offers only two first replies. scene-talk.test reports `serve-sought: expected 2 to be greater than or equal to 3` in 'composes every purpose'. Seen: when someone asks the player to serve, the player gets two choices.

**Cause.** Measured: `npx vitest run src/director/scene-talk.test.ts` (seed scene-talk-test) is red at train 8bb1ff9d and at b7ed6337 (scene-talk.test with polling-place skipped in a scratch copy). Before 8bb1ff9d, move-in and then polling-place failed first and hid it, so the fold that brought it is not found. The serve-sought arc's first menu has words for only two of its reply moves under the test's facts. The S6 (asking someone to serve) folds of Nov 14 are the likely source, not proven.

**Fix.** Find which serve-sought reply move has no line under the fixture's facts, and give it a line from a fact the scene holds, or correct the arc's reply list. S6's builder owns it (Account lead routed it there).

**Time box.** 1 hour, Sonnet.

**Rules.** Never skip or loosen the test to get green, and never raise tests/english-answerable-asks-baseline.json. No hand-written player text in code: a missing line is a bank piece. Builders may change bank lines.

**Done when.** scene-talk.test no longer reports serve-sought. The run has the default seed and two drawn places named with their seeds. A second session sees the scene play in the game.

**Waits on.** Nothing.

**Files.** src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json

**Notes.** Filed by the door scenes builder on branch claude/project-thread-9d3ex7 (PR #9288). Checked in a separate checkout at clean b7ed6337, with polling-place skipped in a scratch copy of the test, because on clean that type fails first and hides these.
