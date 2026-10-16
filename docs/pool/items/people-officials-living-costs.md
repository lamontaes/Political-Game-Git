---
id: people-officials-living-costs
title: "Named officeholders have household living costs and cash of their own"
area: people
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Named officeholders have no household living costs or cash of their own. A governor or mayor is a named official with a salary but no household, so nothing strains them and nothing about their money can move a choice they make. Give each named official a household with living costs and cash read from the same engines as any resident, so their pay, spending and savings are real.

**Rules.** One model, two tiers: an official is a full person and a consistent member of their household group, with the same tax, rent and spending rules as any resident. Wire to the world: the costs must move money on the journal and be read by another engine such as the corruption chooser that weighs need against a month of living costs.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, each named executive has a household with monthly living costs and cash, named by person and household record id, and the treasury diversion test sees a strained executive in play.

**Files.** src/core2/modules/official-pay.ts, src/core2/modules/residents.ts, src/core2/modules/corruption.ts

**Notes.** Written from the title and the evidence on the item when the quality gate was repaired (Oct 16).
