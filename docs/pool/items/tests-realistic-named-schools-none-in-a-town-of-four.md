---
id: tests-realistic-named-schools-none-in-a-town-of-four
title: "The realistic-not-real guard fails by draw at Lost Springs, Wyoming: nobody there has a named school"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: world
model: sonnet
effort: low
root: none
source: Fable B, Nov 15, 2026, from the gate of #9488 (`npm run guards`, guard two-seeds-differ)
---

**What.** `npm run guards` draws a place for `src/core2/realistic-not-real.test.ts`, and at Lost Springs, Wyoming (5647805), seed b83c42ea232ab544, the case "the schools people went to are their world's own (audit row 37)" fails: "named schools: expected 0 to be greater than 0". The guard is one of CI's twenty, so any pull request can go red on this draw. Seen: `npm run guards`, guard two-seeds-differ.

**Cause.** Needs cause. Measured: `REALISTIC_SEED=b83c42ea232ab544 npx vitest run src/core2/realistic-not-real.test.ts` fails the same way on the clean train at 53e4b29fe8, 1 failed of 17. Lost Springs is one of the smallest places in the country. Not traced: whether none of its full people has a school record with a name (a real fault: a person's history names no school), or the town simply holds too few full people for the case to find one, in which case the test should pass over the draw by name.

**Fix.** None until the cause is found.

**Time box.** 1 hour to find the cause.

**Rules.** Estimate, never unknown: a person's school has a name. Never loosen a test to get green; a draw with no case is passed over by name, not skipped silently.

**Done when.** A second session runs `REALISTIC_SEED=b83c42ea232ab544 npx vitest run src/core2/realistic-not-real.test.ts` on the train and sees it pass or pass over the draw by name, and in the running game, at Lost Springs with that seed or in a drawn place it names with its seed, opens a resident's card and reads the school they went to.

**Waits on.** Nothing.

**Files.** src/core2/realistic-not-real.test.ts
