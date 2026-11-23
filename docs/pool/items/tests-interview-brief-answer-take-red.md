---
id: tests-interview-brief-answer-take-red
title: "The interview words test is red on the train: a brief answer is not taken in as a pass"
area: words
kind: bug
priority: 2
size: S
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
source: "Interview check thread, Nov 15, 2026, gating the outlet-of-record change on train c43bf7e0"
root: none
---

**What.** `src/director/interview-sitting-words.test.ts` (removed), "takes a brief answer in as a pass, never as undecided, whether or not the record holds a stand", fails with "interview-take- stance-for m1: expected 'Then your record will have to speak f...' to be 'No comment, then.'". It is a unit test with no draw, red on the clean train c43bf7e0 and on the outlet-of-record branch, so every gate that runs it is red. Seen: a builder's or the train's gate goes red on a test nobody's change touched.

**Cause.** Measured: run with `npx vitest run --dir . src/director/interview-sitting-words.test.ts` on the clean train c43bf7e0 (no seed; the test builds no world): the reporter's take after a brief answer, case stance-for m1, is the record-will-have-to-speak line where the test expects "No comment, then.". Which fold changed it is not yet bisected.

**Fix.** Bisect the train's folds with this test alone (red-main skill, bisect by folds) to the fold that changed the reporter's take after a brief answer, and say whether the bank or the test is right; fix whichever is wrong with the Words lead's stamp on any line.

**Time box.** 2 hours.

**Rules.** No dice: the reporter's take follows the answer given and the record, never a roll.

**Done when.** The fold and the code or bank line that changed the take are named here, the test passes on the train, and a second session sits an interview in a drawn place on main, names its seed, gives a brief answer in the running game, and sees the reporter take it as a pass.

**Waits on.** Nothing.

**Files.** `docs/current.json` (the replaced row for the deleted test).

**Notes.** Nov 18 (Story): dropped; the test it would fix was deleted on #10063 with the interview sitting's lines (owner, Nov 17: delete everything the engine did not write).
