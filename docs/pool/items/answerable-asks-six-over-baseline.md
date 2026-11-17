---
id: answerable-asks-six-over-baseline
title: "answerable-asks is red on the Train: six asking lines have no answer from a record, beyond the baseline"
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

**What.** tests/english-answerable-asks.test.ts fails "rule 108: every composed talk > has no asking line without an answer from a record beyond the baseline" on Train ef708196. Six keys are over tests/english-answerable-asks-baseline.json: scene-talk.follow-plea.i-thought-we-wanted-the-same-thing-did-i-get-that-wrong (the scene ends on the question), scene-talk.reply-agree.yes-when (the answer carries no record fact), and scene-talk.reply-ask.be-straight-with-me-what-does-it-do-to-you, close.what-would-help-you-most-right-now-first, what-brought-this-on and what-does-signing-commit-me-to (each answer carries no record fact). The fixture's seed is fixed ("scene-talk-test"), not drawn.
Seen: in the Train's changed-test runs for #9584 and on the clean Train, the same six keys.

**Cause.** Needs cause. Found in code: `buildTalks` in tests/support/scene-talk-fixture.ts composes every talk, and these six lines were placed by merges after the baseline was written. Which merge placed each one was not traced.

**Fix.** None until the cause is found.

**Time box.** 1 hour, one Opus session at medium. Answers are the Words lead's lines.

**Rules.** Ask why: each asking line needs an answer that reads a record fact (rule 108), so the fix is an answer gated on a fact or the line deleted, never a baseline entry added to turn the test green.

**Done when.** At the fixture's pinned place and fixed seed, the test passes with the baseline unchanged or smaller. A second session runs tests/english-answerable-asks.test.ts on the Train and sees it green.

**Waits on.** Nothing.

**Files.** tests/english-answerable-asks.test.ts, tests/english-answerable-asks-baseline.json, data/english/parts/scene-talk.json

**Notes.**
