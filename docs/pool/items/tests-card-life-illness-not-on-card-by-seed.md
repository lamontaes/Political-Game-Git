---
id: tests-card-life-illness-not-on-card-by-seed
title: "card-life is red by seed: an illness from play is not told on a household member's card"
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

**What.** In `src/bench/card-life.test.ts`, the case "a household member's card tells a job lost and an illness from play, and every line opens a record" fails on the clean Train b22cd350 at LIFE_SEED=2bd0d1a5cff6b17f. It fails in Ivanhoe, Virginia (5140216) with "the illness, health.serious-illness:person_d66d3691aa994a45:2025-03-21: expected false to be true". It also failed at LIFE_SEED=076d26934df4c0cc in Rodey, New Mexico. The case "three or more jobs are one sentence naming every employer" failed there too. Seen: a relative falls seriously ill in play and their card says nothing of it.

**Cause.** Needs cause. Measured: the case in What fails the same way on the clean Train 892427ec at the place and seed named there; the cause is not yet traced.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Opus.

**Rules.** Ask why: the missing line must be traced to the record the card skipped and the rule that skipped it.

**Done when.** A second session runs the case at both seeds above and in a drawn place of its own, and sees the illness told on the card with its record.

**Waits on.** Nothing.

**Files.** src/bench/card-life.test.ts, src/bench/card.ts

**Notes.** Filed by hand by the civic roles builder, Nov 15. The same seed is red with and without #9538. Also red on the clean Train 892427ec at LIFE_SEED=ea63444896c8caa3 (Vaitogi, American Samoa), both cases.
