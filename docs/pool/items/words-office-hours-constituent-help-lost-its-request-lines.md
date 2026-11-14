---
id: words-office-hours-constituent-help-lost-its-request-lines
title: "Office hours: the constituent's request lines went out with the case-help carry, so the scene can't open"
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

**What.** At office hours, the constituent-help scene and the office-hours scene no longer compose. The arc-variant test reports `constituent-help/plain`: "the request that states constituent-help cannot be worded from the records given". scene-talk.test reports `office-hours: expected 'skipped' to be 'composed'`. Rule 108 also lists a new key, `scene-talk.reply-ask.close.what-would-help-you-most-right-now-first` (the answer carries no record fact). Seen: a constituent who comes to office hours opens no talk.

**Cause.** Measured: `npx vitest run src/director/arc-variant.test.ts src/director/scene-talk.test.ts` shows it at b7ed6337. The 37 constituent-help `state` lines at train 8bb1ff9d ("I lost my job, and I don't know where else to go.", "We're being evicted, and I need help." and the rest) are gone at b7ed6337. `git log -S` puts their removal in the train's fold of #9199 (61ecb138d7), from #9199's own commit 1b4ab3e449, "Carry #8956 office hours: the case-help move set". The fold's parent still holds them, and #9199's head feb097ae does not. The 24 `state` lines left ("I want to know where you stand on {issue}...") need an `issue` fact that the plain variant's packet does not carry. The rule-108 key's answers changed in the same fold. That it is the same cause is likely, not proven.

**Fix.** Restore the constituent-help request lines that #9199's carry removed, or move them onto the case-help move set the carry introduced, so that the plain variant's request has words for its facts (`problem-job`, `problem-eviction`, `problem-illness`, or the bare request). Then give `close.what-would-help-you-most-right-now-first` an answer from the case record, or take it out. #9199's builder (carry old story) owns it.

**Time box.** 1 hour, Sonnet.

**Rules.** Never skip or loosen the test to get green, and never raise tests/english-answerable-asks-baseline.json. No hand-written player text in code: a missing line is a bank piece. Builders may change bank lines.

**Done when.** `npx vitest run src/director/arc-variant.test.ts src/director/scene-talk.test.ts tests/english-answerable-asks.test.ts` no longer lists constituent-help, office-hours or that key. The run has the default seed and two drawn places named with their seeds. A second session sees the scene play in the game.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, data/english/scene-move-sets.json, src/director/data/arc-variants.json

**Notes.** Filed by the door scenes builder on branch claude/project-thread-9d3ex7 (PR #9288). Checked in a separate checkout at clean b7ed6337, with polling-place skipped in a scratch copy of the test, because on clean that type fails first and hides these.
