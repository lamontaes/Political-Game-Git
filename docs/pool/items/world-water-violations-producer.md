---
id: world-water-violations-producer
title: "A water-system engine writes drinking-water violations from the system's own condition, so the sized water link has a cause that moves"
area: world
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "found while sizing water-violations-to-infant-health (world-outcome-links-sizes)"
---

**What.** The link from drinking-water violations to low birth weight now has a researched size, but nothing in the played world writes the violations: the measure `env.drinking-water-violations` is a kept outcome held at its opening level (SG-WEB-outcome-drift), so the link adds exactly zero every month. Build a small producer that writes a place's health-based violations per community water system from the system's own condition (its age, its lead lines, its budget and what the town spends on it), so a town that stops paying for its water system sees violations rise and low birth weight follow. Counted and full people read the same measure, times their count.

**Rules.** No dice: violations come from the system's recorded condition and spending, never a monthly chance. An effect is a read, not a record: the producer counts only once the outcome web reads its violations and low birth weight moves by the sized link. One model, two tiers: the same rate reaches every counted birth group and every full pregnancy.

**Done when.** In a one-year run of the played world (`buildBenchWorld`) in a drawn place and a seed the builder did not choose, a place whose water spending falls shows violations above its opening level in a web month record, and that month's `effects["water-violations-to-infant-health"]` is the sized 0.06 times the rise; the test in `src/core2/outcome-web.test.ts` names the web month record id and the engine record the violations stand on.

**Files.** src/core2/modules/outcome-web.ts, src/core2/outcome-web-model.ts, src/core2/data/outcome-web/coverage.json

**Notes.** Sized in the PR for world-outcome-links-sizes (Currie et al. 2013, Table 3). The other kept outcomes with sized links and no producing engine share this gap; see SG-WEB-outcome-drift.
