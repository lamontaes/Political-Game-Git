---
id: scene-talk-becoming-friends-skipped
title: "scene-talk.test is red on the Train: the becoming-friends purpose is skipped instead of composed (three tests)"
area: words
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
model: opus
effort: medium
root: none
source: Account lead, Nov 16 01:26Z (a red not on the known list)
---

**What.** src/director/scene-talk.test.ts fails three tests on Train ef708196 at its fixed seed "scene-talk-test": "composes every purpose: setup, open, statement, four replies, an answer and a close, in the bank's own words", "plays every purpose in play, and never says a line the owner rejected" and "composes a tree: every reply has its branch, numbers are unique, nodes are bounded, a lie shows both outcomes". Each one fails with "becoming-friends: expected 'skipped' to be 'composed'". The seed is not drawn at run time: tests/support/scene-talk-fixture.ts fixes it unless GOLDEN_PATH_SEED is set.
Seen: in the Train's changed-test runs for #9584 and on the clean Train with the same seed.

**Cause.** Needs cause. Found in code: `purposeScene` in src/director/purpose-scene.ts returns `skipped` for the becoming-friends type at the fixture's cast. The reason it gives was not read.

**Fix.** None until the cause is found.

**Time box.** 1 hour, one Opus session at medium.

**Rules.** Ask why: read the skip's reason from the result `purposeScene` returns at the fixture's seed and fix the cause in the engine that keeps the record, never by changing the fixture or the assertion.

**Done when.** At the test's pinned place and fixed seed, built by the fixture the test uses, all three tests pass with no change to an assertion. A second session runs src/director/scene-talk.test.ts on the Train and sees it green.

**Waits on.** Nothing.

**Files.** src/director/scene-talk.test.ts, tests/support/scene-talk-fixture.ts, src/director/purpose-scene.ts

**Notes.**
