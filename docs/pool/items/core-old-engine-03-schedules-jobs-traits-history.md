---
id: core-old-engine-03-schedules-jobs-traits-history
title: "Work schedules, town jobs, traits and character history move into core2 and their old files go"
area: core
kind: cleanup
priority: 1
size: M
status: open
claimed-by:
pr:
after: core-old-engine-02-gov-rules-duplicates
blocked-on:
source: "docs/reports/repo-audit-2026-10-19.md section A and G2 steps 2–5"
---

**What.** This item records the October19 audit snapshot at `0104686`; its paths and counts require a current check before implementation. The audit confirmed four pieces of the opening town builder that still live only in the old core. Work patterns and schedules (`living-world/work-schedules.ts`, 714 lines, used by `src/core2/opening-work.ts`); town workplaces, employment mix, labor status and tenure tables (`living-world/town-employment.ts` plus its `.generated` file, 1,718 lines, used by `src/core2/opening-employment.ts`), with `jailTermOn` from `justice/jail-terms.ts` and `organizationProfileAt` from `life-queries.ts`, which should become reads of core2's own organization and justice records; traits, personality, upbringing and trait definitions (`trait-packs`, `trait-registry`, `people-traits`, `personality-catalogue`, `people-upbringing`, `people-trait-definitions`, used by `population.ts` and `src/bench/card.ts`); and character history (`character-history.ts`, used by `town-households.ts`). Open drafts carry most of it: #5084 and #5097 (schedules), #5093, #5100 and #5073 (jobs and jail terms), #5104 → #5108 → #5110 (traits). Finish on those branches, in that order, and add the character-history lift, which has no branch yet.

**Rules.** Replace, never layer: each lifted file deletes its original in the same PR (`work-schedules.ts`, `town-employment*.ts`, `jail-terms.ts`, the six trait files, `character-history.ts`), and the PR body counts them. No dice: schedules, jobs and traits stay reads of the person's record, never a draw. An effect is a read: a job or trait lifted into core2 is read by the same play screens that read it today. Recheck the present import graph and existing pool claims before removing or moving any path; preserve current consumers, guards and provenance.

**Done when.** `grep -rn "simulation/" src/core2/opening-work.ts src/core2/opening-employment.ts src/core2/trait-source.ts src/core2/opening-personality.ts src/bench/card.ts` returns nothing; the lifted old files no longer exist; a drawn place built by `buildBenchWorld` shows the same people with the same jobs, schedules and traits by record id before and after; `src/core2/population.test.ts` and the golden-path suite pass.

**Files.** src/core2/opening-work.ts, src/core2/opening-employment.ts, src/core2/trait-source.ts, src/core2/opening-personality.ts, src/core2/town-households.ts, src/bench/card.ts, src/simulation/living-world/work-schedules.ts, src/simulation/living-world/town-employment.ts, src/simulation/living-world/town-employment.generated.ts, src/simulation/justice/jail-terms.ts, src/simulation/life-queries.ts, src/simulation/trait-packs.ts, src/simulation/trait-registry.ts, src/simulation/people-traits.ts, src/simulation/personality-catalogue.ts, src/simulation/people-upbringing.ts, src/simulation/people-trait-definitions.ts, src/simulation/character-history.ts

**Notes.** Supersedes the priority-2 items `world-port-work-schedules`, `world-port-work-schedules-roster`, `world-port-town-employment`, `core-old-imports-opening-employment-jail-term`, `people-port-traits-upbringing` and `people-port-character-history` as the one tracked step; those items keep their branches. Parent: core-delete-old-engine.
