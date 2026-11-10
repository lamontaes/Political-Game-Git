---
id: tests-world-moments-husk-mover-oak-grove
title: "World-moments test finds no kept moment for a moved-away actor now a husk"
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
model: opus
effort: high
root: design-life-record
source: added with npm run pool -- add
lead: words
checked: fable 2026-11-10
---

**What.** Fresh root 7e53bd5ea7be7333 makes world-moments.test.ts draw Oak Grove, Tennessee and record person.moved-away:person_ae64f4784a9311d3:2025-05-28. At the end of the year, its general named-event delivery check finds no kept moment for person_ae64f4784a9311d3, now tier=husk, and no same-day moments. This fails identically on clean main e5c370fafa9bcba53a9a4440b1d298e4f077b261 and main-integrated PR #6113 e424fce935a449fb1d62f94798c20a1d522984bb. That assertion is unchanged by the PR; its separate relative-summary repair removes another baseline failure, so this missing actor moment remains independent.

**Cause.** Needs cause. Looked at: the item; src/director/world-moments.test.ts (the delivery assertion near line 122), src/director/ledger.ts and src/core2/life.ts exist. Fresh root 7e53bd5ea7be7333 draws Oak Grove, Tennessee and the move record person.moved-away:person_ae64f4784a9311d3:2025-05-28; the actor is tier=husk with no kept moment and no same-day moment. Not yet known whether a moment was written before the person became a husk and then folded by compaction, or the test looks up the wrong actor. To find it: follow that one move record: was a moment written before the person became a husk, was it folded by compaction, or is the test's actor lookup wrong.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Opus session, which finds the cause and rewrites this item with it.

**Rules.** Ask why: trace the actual move record through tier transition, director delivery and memory compaction before deciding whether the producer or the assertion is wrong. One model, two tiers: preserve the real retention rule for a person who becomes a husk, without excluding the case or pretending that every old moment must remain forever.

**Done when.** A second session sees the cause written in this item by record id (follow person.moved-away:person_ae64f4784a9311d3:2025-05-28 through the tier change, the director's delivery and memory compaction), then runs src/director/world-moments.test.ts on root 7e53bd5ea7be7333 and on a fresh drawn place (named with its seed); the played-world test passes with real move coverage and the record ids before and after the tier change.

**Waits on.** Nothing.

**Files.** src/director/world-moments.test.ts, src/director/ledger.ts, src/core2/life.ts

**Notes.** Merger 1, Oct26 04:50 UTC: both PR and clean-main logs list exactly person.moved-away:person_ae64f4784a9311d3:2025-05-28, actor person_ae64f4784a9311d3 tier=husk same-day=; tests-world-moments general delivery assertion at line122. Named2803root passes23/23 on #6113; fresh root21pass/2fail, clean main20pass/3fail. The raise failure is tracked by tests-journal-red-on-seed-3d7f-linganore.
