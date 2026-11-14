---
id: words-test-printed-words-unworded-birth-stories-on-drawn-seed
title: "Birth stories print without words in a drawn town, and the test that finds them is not pinned"
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
model: sonnet
effort: medium
root: none
source: found by the layoff-in-the-paper thread, Nov 14, 2026, running the changed-file tests on PR 9304
---

**What.** Seen: the paper prints a story the news screen cannot word: five unworded birth stories in one year at Alexandria, Virginia. A reader of the paper would see a blank or a bare record there, and a merger cannot tell this break from the draw.

**Cause.** Measured: Nov 14, `GOLDEN_PATH_SEED=6f15c6ad827663a7f5c2e6f1e039c1410580b053 npx vitest run src/bench/printed-words.test.ts -t "words every story the press prints"` fails the same on the Train head 8bb1ff9d and on PR 9304's head: Alexandria, Virginia (5101000), `unworded` is `person_76f51afcf84d2403:birth` five times (src/bench/printed-words.test.ts line 194). The test draws its place from a seed at run time, so it passes on other draws.

**Fix.** Find which birth fact the birth builder in `src/bench/printed-words.ts` lacks for that record (read the record `person_76f51afcf84d2403`), give the story the fact or have the desk not print a birth the paper cannot word, and pin the test to named places with fixed seeds, Alexandria first, as the `pinned-tests` skill says. A line written for it goes to the Words lead.

**Time box.** 2 hours

**Rules.** No dice. Every number lives in a parameter table, and the test is never loosened to get green.

**Done when.** A second session plays a year in a drawn place, Alexandria, Virginia (seed 6f15c6ad827663a7f5c2e6f1e039c1410580b053), and finds every printed birth worded, with the test passing three times in a row.

**Waits on.** Nothing

**Files.** src/bench/printed-words.ts, src/bench/printed-words.test.ts
