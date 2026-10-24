---
id: core-old-engine-tuition-prices-move
title: "Move the legacy tuition price helper beside its four old-engine consumers"
area: core
kind: cleanup
priority: 3
size: S
status: done
claimed-by:
pr: #5797
blocked-on:
source: added with npm run pool -- add
---

**What.** src/education/tuition-prices.ts is legacy tuition pricing used only by four modules inside src/simulation. This bounded change moves the single implementation beside those consumers and updates their relative imports, removing the unused src/education TypeScript include. It changes no tuition calculation, source record or gameplay; deleting the remaining old engine remains separate under core-delete-old-engine.

**Rules.** Replace, never layer: keep one canonical implementation, preserve its calculations and provenance, and leave the broad old-engine deletion task open.

**Done when.** The one tuition-prices implementation lives under src/simulation, its four consumers import that copy, no runtime import still points to the old src/education path, and the old TypeScript include is removed. The scoped typecheck and existing law-consequence regression tests pass; the PR names the moved-file count and does not complete the broader deletion.

**Files.** src/education/tuition-prices.ts, src/simulation/tuition-prices.ts, src/simulation/education-study-progression.ts, src/simulation/education-study-terms.ts, src/simulation/law-consequences/price-cost.ts, src/simulation/law-consequences/tuition-freeze-noticed.ts, tsconfig.node.json

**Notes.** Bounded by merger A for PR #5797: one file moved, no unused-file deletion or old-engine-wide completion claimed. Main parent core-delete-old-engine is reopened so this slice cannot finish the remaining importer groups.
