---
id: world-census-weight-hiring
title: "Hiring, layoffs and openings treat a counted job record as as many jobs as its household weight"
area: world
kind: wiring
priority: 1
size: M
status: claimed
claimed-by: claude/world-census-weight-hiring
pr:
blocked-on:
after: world-census-weight-headcount
source: added with npm run pool -- add
claimed-at: 2026-10-16T15:51:21.502Z
---

**What.** The jobs engine acts on a counted job record that stands for several jobs: openings, hires, quits and layoffs (`modules/jobs.ts` lines near 198, 1231, 1747, 1892, 1970) move the record's weight in jobs, and an opening a full person fills takes one job out of the record's count rather than the whole record.

**Rules.** One model, two tiers (a counted group is read by every engine with the same rule as a full person, times its count); no dice; one rule, all 56 places; an effect is a read; speed (a year under two minutes, no more than 20% slower than base); replace, never layer.

**Done when.** In a one-year run of a drawn town at scale 3, layoffs and openings at an employer are three times the scale-one counts, a full person hired into an opening leaves the counted jobs short by exactly one, and scale one is identical to base. Named by job and employer ids. The owner plays it: nothing yet; this is the base for the Census-size opening.

**Files.** src/core2/modules/jobs.ts, src/core2/residents-economy.ts

**Notes.** Split from world-census-weight-economy (claude/world-census-weight-economy) when it was claimed: the original is an L. The weight is `CountedStore.weightOf` (core-census-weight-model, merged); counted money already moves times the weight (core-census-weight-money, #4467). Test by opening a drawn town with `buildBenchWorld(..., { countScale: 3 })` against the same seed at scale one.
