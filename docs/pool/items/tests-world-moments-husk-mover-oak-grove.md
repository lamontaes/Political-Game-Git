---
id: tests-world-moments-husk-mover-oak-grove
title: "World-moments test finds no kept moment for a moved-away actor now a husk"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: words
---

**What.** Fresh root 7e53bd5ea7be7333 makes world-moments.test.ts draw Oak Grove, Tennessee and record person.moved-away:person_ae64f4784a9311d3:2025-05-28. At the end of the year, its general named-event delivery check finds no kept moment for person_ae64f4784a9311d3, now tier=husk, and no same-day moments. This fails identically on clean main e5c370fafa9bcba53a9a4440b1d298e4f077b261 and main-integrated PR #6113 e424fce935a449fb1d62f94798c20a1d522984bb. That assertion is unchanged by the PR; its separate relative-summary repair removes another baseline failure, so this missing actor moment remains independent.

**Rules.** Ask why: trace the actual move record through tier transition, director delivery and memory compaction before deciding whether the producer or the assertion is wrong. One model, two tiers: preserve the real retention rule for a person who becomes a husk, without excluding the case or pretending that every old moment must remain forever.

**Done when.** On the named root and a fresh drawn place named with seed, the played-world test passes with positive real move coverage and record ids before and after tier transition. If compaction is intended, prove delivery before it or the correct person and event in the kept summary; do not skip husks, return early, or accept an unrelated monthly summary.

**Files.** src/director/world-moments.test.ts, src/director/ledger.ts, src/core2/life.ts

**Notes.** Merger 1, Oct26 04:50 UTC: both PR and clean-main logs list exactly person.moved-away:person_ae64f4784a9311d3:2025-05-28, actor person_ae64f4784a9311d3 tier=husk same-day=; tests-world-moments general delivery assertion at line122. Named2803root passes23/23 on #6113; fresh root21pass/2fail, clean main20pass/3fail. The raise failure is tracked by tests-journal-red-on-seed-3d7f-linganore.
