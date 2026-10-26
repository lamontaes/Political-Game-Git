---
id: core-old-import-official-pay
title: "The official-pay module reads the sourced salary facts, not the old engine's generated file"
area: core
kind: cleanup
priority: 2
size: S
status: done
claimed-by: claude/official-pay-no-old-import
pr: #4940
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T16:03:57.373Z
---

**What.** `src/core2/modules/official-pay.ts` imported `OFFICE_PAY_META` from the old engine's `src/simulation/office-pay.generated.ts` to cite each sourced salary. Those 122 citations are the facts in `data/source/official-office-pay/facts.json` word for word, so the module now reads that file and imports nothing from `src/simulation`.

**Rules.** Replace, never layer: the module keeps one source of the citations. The old engine's own reader (`src/simulation/office-pay.ts`) keeps the generated file until the old engine is deleted (core-delete-old-engine).

**Done when.** `src/core2/modules/official-pay.ts` has no import from `src/simulation`, the citations it uses equal the facts file (checked: 122 of 122), and src/core2/official-pay-withholding.test.ts passes.

**Files.** src/core2/modules/official-pay.ts

**Notes.** One of the remaining new-code importers of the old engine counted for core-delete-old-engine: official-pay.ts, opening-work.ts, opening-employment.ts, town-households.ts, population.ts, the tooling files, bench/world.ts, card.ts, creator.ts, appearance.ts and education/tuition-prices.ts.
