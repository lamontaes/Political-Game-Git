---
id: tests-pin-closure-credit-line
title: "Pin the closed-credit-line test to a place and seed where a business holds a line"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: money
model: sonnet
effort: medium
root: none
source: "layoffs-read-law-costs thread, Nov 16"
claimed-at:
---

**What.** The closed-credit-line test draws its seed at run time and fails before it tests anything when no business holds an active credit line after four months. A test that draws its seed at run time cannot be a known red. Pin it to a named place and seed where a line is approved, found by a script outside the test.
Seen: seed 3841f765fbcc0362626a2825f0b04182 fails at its first assertion on Train ef708196 and on PR 9629 alike.

**Cause.** Measured: at a drawn place, seed 3841f765fbcc0362626a2825f0b04182, by `GOLDEN_PATH_SEED=3841f765fbcc0362626a2825f0b04182 npx vitest run src/core2/closure-credit-line.test.ts`, "a business with an approved credit line: expected undefined to be defined" at line 38, on the base and on the branch.

**Fix.** Replace the run-time seed in src/core2/closure-credit-line.test.ts with a named place and fixed seed where a business holds an active line by month four, picked by a script outside the test capped at one hour, with the limit near twice the slower run. The player sees it nowhere; it guards the closing a player sees in the paper and dev mode's Why for a business.

**Time box.** 2 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a test pinned to a place and seed is never red by the luck of a draw.

**Done when.** A second session runs the pinned test twice in a drawn place it names in the test (the pinned place) and sees it pass both times, and sees it fail when the credit line settlement at closing is removed.

**Waits on.** Nothing.

**Files.** src/core2/closure-credit-line.test.ts
