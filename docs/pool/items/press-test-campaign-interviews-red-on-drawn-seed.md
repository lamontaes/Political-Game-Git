---
id: press-test-campaign-interviews-red-on-drawn-seed
title: "The campaign-interviews press test fails on a drawn seed and is not pinned"
area: core
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: press
model: sonnet
effort: medium
root: none
source: found by the layoff-in-the-paper thread, Nov 14, 2026, running the changed-file press tests on PR 9304
---

**What.** Seen: a test that checks a candidate's interview questions is red on some draws, so a merger cannot tell a real break from the draw. It also has a second test in the same file, "a reporter who runs files and is on the ballot", that failed once under load ("no town with a local paper whose reporter could enter an open contest") and passed alone.

**Cause.** Measured: Nov 14 on the Train head 8bb1ff9d and on PR 9304's head, `npx vitest run src/core2/press.test.ts`: "campaign interviews > outlets from real counts, an interview on the record, and outlets seeking out candidates" fails at seed 3cdf914b12d0b4ce622fe67672a675fd25d79615cd8249a81abcde0f7cd93407, US-SD place 4630980: `expected [...3] to include 'us-policy-positions:government-operat…'` (src/core2/press.test.ts line 179). The test draws its places at run time instead of naming them.

**Fix.** Pin the test to named places and fixed seeds in the test file, as the `pinned-tests` skill says, naming the place that holds the case (a candidate pair that differs on a platform question), and find why the asked questions in the failing draw lack the differing platform question before choosing the pins; if it is a real defect, fix it by what the interview asks for, not by loosening the test.

**Time box.** 2 hours

**Rules.** No dice. Never loosen the test to pass.

**Done when.** A second session, in a drawn place, US-SD place 4630980 (seed 3cdf914b12d0b4ce622fe67672a675fd25d79615cd8249a81abcde0f7cd93407), runs `src/core2/press.test.ts` three times on the head with no change in the result, in about a minute per test.

**Waits on.** Nothing

**Files.** src/core2/press.test.ts, src/core2/modules/press.ts
