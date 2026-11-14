---
id: english-one-shared-facts-set-by-helper
title: "One helper carries the facts a spoken line set into the next turns of a talk, in both talk engines"
area: words
kind: cleanup
priority: 3
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
source: Account lead ruling on PR 9298, Nov 14, 2026
checked: S2 2026-11-14
---

**What.** Two talk engines each carry the facts a piece sets (`setsFacts`) into later turns of a talk with a function of the same name: `factsSetBy` in `src/english/conversation-words.ts` (the lost-job talk's second turn, PR 9298) and `factsSetBy` in `src/english/scene-talk-words.ts` (the desk talk, PR 9292). Both read the one existing `setsFacts` field on a piece; two copies of the carrying are one more than there should be. Seen: after both PRs fold, `grep factsSetBy src` shows two definitions with one job.

**Cause.** Found in code: `factsSetBy` in `src/english/conversation-words.ts` and the desk builder's in `src/english/scene-talk-words.ts`; the two builders worked in parallel and each added the carrying to its own talk engine; the field is shared, the helper is not.

**Fix.** After PR 9292 folds, make one exported helper that takes piece keys and the bank and returns the facts they set, used by both engines; delete the other copy in the same change. A piece marked `speakerKnows` (composer, PR 9298) is the rule for whether a speaker knows what it set; the helper does not change that.

**Time box.** 2 hours, Sonnet.

**Rules.** Replace, never layer: one function remains. No line is reworded.

**Done when.** At the three places pinned in `src/director/job-lost-talk-played.test.ts` the lost-job second turn answers are word for word as before, and at one drawn place the desk talk's lines are word for word as before; `grep factsSetBy src` shows one definition. A second session, on main, plays the lost-job talk to its second turn at a drawn place and sees the answers unchanged.

**Waits on.** PR 9298 and PR 9292 folded into the Train.

**Files.** src/english/conversation-words.ts, src/english/scene-talk-words.ts, src/director/conversation.ts

**Notes.** Ruled by the Account lead on PR 9298: go second, file the item in that PR.
