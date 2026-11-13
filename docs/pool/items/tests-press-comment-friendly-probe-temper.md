---
id: tests-press-comment-friendly-probe-temper
title: "The press-comment friendly probe plays plain where the probe reporter's temper pulls against friendly (False Pass, Alaska)"
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
source: Red desk, Nov 13 (the fresh draws of PR #8983)
---

**What.** src/director/press-comment-variants.test.ts fails on clean main at GOLDEN_PATH_SEED=07df89e7e067797f in False Pass, Alaska (0224660, attempt 10): the hand-made friendly probe, five earlier on-record talks between the probe reporter and the member, plays plain (reads `answered-before` 0.83, `close` 0). It fails the same with PR #8983's change. Seen: a reporter who has talked with a member on the record five times calls them in a friendlier way, or the probe picks a reporter whose temper lets that show.

**Cause.** Measured: `GOLDEN_PATH_SEED=07df89e7e067797f npx vitest run src/director/press-comment-variants.test.ts` on clean main and on PR #8983's branch. The test picks its probe reporter with `best(...)` over the friendly, hostile and scandal pulls together (the highest of each reporter's lowest pull), and `chooseVariant` in src/director/arc-variant.ts adds the reporter's own temper to every variant's score. In this town the reporter chosen leans against friendly enough that five talks do not outweigh the plain arc's floor. Not found: the chosen reporter's friendly pull and the scores; the scandal probe already prints both, the friendly probe does not.

**Fix.** Needs cause. Print the friendly probe's scores and the reporter's pull as the scandal probe does, then pick the friendly probe's reporter by its own pull as the scandal probe picks its own, or show that the score weights are off.

**Time box.** 1 hour

**Rules.** No dice: a reporter's call follows their temper and their records with the member, never a roll, so the probe chooses a reporter whose temper lets the record show. One rule, all 56 places: the test keeps drawing places and names each one.

**Done when.** A second session runs press-comment-variants.test.ts on main at GOLDEN_PATH_SEED=07df89e7e067797f and at a fresh seed, each naming its drawn place, and the probes print plain, friendly, scandal and national as the records give.

**Waits on.** Nothing.

**Files.** src/director/press-comment-variants.test.ts, src/director/arc-variant.ts
