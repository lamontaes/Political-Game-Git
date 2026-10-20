---
id: core-remaining-port-the-opening-town-builder-population
title: "Remaining port, the opening town builder (population.ts, opening-employment.ts, opening-work.ts):"
area: core
kind: feature
priority: 2
status: dropped
claimed-by: claude/core-remaining-port-opening-builder
pr: #4498
blocked-on: core-port-world-scaffold
milestone:
source: "docs/coordination/core.md line 27 (unchecked checklist line)"
claimed-at: 2026-10-15T22:52:03.121Z
---

**What.** The opening town builder (population.ts, opening-employment.ts and opening-work.ts) still writes into an old-engine world, and porting it frees 886 old files. People (traits, upbringing, names) and jobs, pay and schedules must come out as core records instead. The player would notice nothing different at the start of a game, which is the test: the same town, built without the old engine. Build only what the golden path needs, and write fresh where that is simpler.

**Rules.** Replace, never layer: each ported piece deletes the old scaffolding in the same change. One model, two tiers: the opening fills full people only where they matter and holds the rest as counts that match the records. One rule, all 56 places: checked in a drawn place, with place facts in data. Build only what the golden path needs, per Keep it simple.

**Done when.** In a drawn place (name and seed in the PR body) the opening builds with no import from the old engine in population.ts, opening-employment.ts and opening-work.ts, and a one-year played world (buildBenchWorld) shows a job and a pay record id read by the jobs engine. The test in src/core2/population.test.ts and the golden path suite pass and the PR body counts the old files removed. The owner plays it: start a new game and the town looks the same as before.

**Files.** src/core2/population.ts, src/core2/opening-employment.ts, src/core2/opening-work.ts, docs/design/core2-porting-plan.md, docs/coordination/core.md

**Notes.** Checklist line from core.md; verify against main before starting.

**Split (Oct 15).** An L item, split by the claiming session into eight parts, each with its own done-when: `core-port-world-scaffold`, `people-port-character-history`, `people-port-traits-upbringing`, `people-port-names`, `world-port-town-employment`, `world-port-town-pay`, `world-port-work-schedules`, `core-port-town-residents`. When all eight are done, delete the old imports from the three files, and this item is done.
