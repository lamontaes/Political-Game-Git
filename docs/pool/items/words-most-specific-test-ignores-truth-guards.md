---
id: words-most-specific-test-ignores-truth-guards
title: "The most-specific-line test asks a guarded tied line without its guard, so it reads a correct pick as wrong"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-jwna62
pr: 9365
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: found by M5 on the train at 2190669e, Nov 14, 2026
---

**What.** `src/english/most-specific-line-wins.test.ts` fails on the train at the spot press-comment.scandal / state / confront: with `outlet` on record it says the generic "I have a question I'd rather ask you than print without you. May I?" instead of "{outlet} is running a story about you. Is it true?". Guards: the rule that the most specific fitting line is said stays checked on every run.

**Cause.** Found in code: the tied line, added by #9315 (ae9e3768), carries `onlyWhen: ["read-scandal"]`, a truth guard that `useFit` in src/english/scene-talk-words.ts filters on (e0eae0e5) and does not rank. The test filled the spot's slots and the tied fact but not its guards, so the guarded line could not fit, and the composer rightly said the generic one. The engine's choice and the line's conditions are both right; the test did not know the guard field.

**Fix.** The test holds each row's `onlyWhen` facts like its slots, on both sides, so a guarded tied line is asked with its guard on record. No assertion changes, and none is loosened: 242 spots checked, none passed over.

**Time box.** 1 hour for one Opus session.

**Rules.** Never loosen a test to get green: the fix teaches the test a field it did not read, and every assertion stays as it was. Ask why: the red was traced to the guard field and the fold that added the guarded line before anything changed.

**Done when.** A second session runs `npx vitest run src/english/most-specific-line-wins.test.ts` on the train and sees it pass with the six tests unchanged in what they assert, and fail again if the guard lines are taken out. In the running game, in a drawn place it names with its seed, a scandal press call where the outlet and the reported scandal are on record opens with "{outlet} is running a story about you. Is it true?" as one of its picks, and never when no scandal has been read.

**Waits on.** Nothing.

**Files.** src/english/most-specific-line-wins.test.ts

**Notes.** Not the same as the stages builder's piece-pick fix in scene-talk-words.ts (a said piece left out before the closest fit is chosen); this test passes `said: new Set()`.
