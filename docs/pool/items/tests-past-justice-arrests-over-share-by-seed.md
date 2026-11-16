---
id: tests-past-justice-arrests-over-share-by-seed
title: "past-justice is red by seed: a town's past holds more arrests than the share allows"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
root: none
claimed-by:
pr:
after:
blocked-on:
lead: lives
source: "Civic roles builder, Nov 15, comparing #9538's reds against the clean Train"
model: opus
effort: medium
---

**What.** In `src/core2/past-justice.test.ts`, the case "a past can hold an arrest, a conviction and a prison term" fails on the clean Train 892427ec at LIFE_SEED=d60bc7ee5c919774. It fails in Adams, Illinois (1700191) with "arrests against the share: expected 12.37 to be less than or equal to 12.10". It fails the same way with #9538. The check compares the past's arrests against the share it is drawn from, and the count is over the bound by about 2%. Seen: nowhere a player looks yet; the life record of a town holds a few more past arrests than the rate allows.

**Cause.** Needs cause. Measured: the case in What fails the same way on the clean Train 892427ec at the place and seed named there; the cause is not yet traced.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Opus.

**Rules.** Ask why: the extra arrests must be named by record and the rule that wrote them, before the bound or the draw is touched.

**Done when.** A second session runs the case at the seed above and two seeds of its own, each in a drawn place it names, and sees the arrests within the bound.

**Waits on.** Nothing.

**Files.** src/core2/past-justice.test.ts

**Notes.** Filed by hand by the civic roles builder, Nov 15. Red with and without #9538 at the same seed.
