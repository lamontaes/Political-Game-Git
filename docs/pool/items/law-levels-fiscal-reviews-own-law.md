---
id: law-levels-fiscal-reviews-own-law
title: "Treasury reviews each government fiscal rule without reviving another level repeal"
area: laws
lead: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: astra/fiscal-reviews-own-law
pr: #7339
blocked-on:
source: Owner Nov 7 law-levels order; Astra
claimed-at: 2026-11-07T23:58:04.936Z
---

**What.** Treasury fiscal reviews use one active record per question even when several governments have that rule. The last government to repeal can remain the review target because another level still says yes, reviving the repealed budget movement. Read each government current fiscal law through the existing shared resolver and policy handler instead of using that cross-level active pointer.

**Rules.** One engine per mechanic: reuse the shared law resolver and existing budget movers. One rule, all 56 places: level is data, with no state-specific branches. Preserve the scope and amounts of each fiscal rule, and do not change campaigns, electorate, views or protected wage bars.

**Done when.** A buildBenchWorld regression in a drawn place proves that one government repeal remains undone through treasury review while another government rule remains active. Break-it, ten fresh draws and a new game pass, with place, replay and budget record ids in the PR. Actual ledger and budget readers run; controlled law and budget fixtures are identified honestly.

**Files.** src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-money.ts, src/core2/fiscal-law-level-review.test.ts

**Notes.** Astra, Nov 7; bounded two-hour unit. Existing done item laws-balanced-budget-open-after-repeal addressed open attribution after repeal; this follow-up concerns independent governments and recurring money movement. Relevant code: finish stores id=question; rerunPolicy uses any-level questionInForce and the stored last level. The shared standing-law reader already exists and reads current allowed yes levels.

Astra, Nov 8: the positive-only standing-law helper cannot undo a preempted act, so the fiscal reader must visit both yes and inactive levels through lawInForce and runPolicy. The test supplies an explicit local-power grant, withdraws and restores it, and checks the original local law plus scoped government application records. Starting balanced-budget data otherwise bars the local fixture in Hansen and Amasa; that test setup error is not a reason to change the real starting data.

Poloa, AS replay d1c8e61d9517d9f2 has no town/county treasury. The regression now uses its actual territorial/federal pair and positively checks that a state-level bar cannot preempt federal law; draws with a local treasury still require local suspension and restoration. No draw is skipped.
