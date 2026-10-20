---
id: release-audit-19-stale-text
title: "Fix the stale text the audit found (#5254, #5322, #5032, #5040, #5334, #5101)"
area: docs
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/political-game-pool-76ksvw
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:32:12.345Z
---

**What.** Update SG-WORLD-credit-island-deposits and add a territory test, fix the SG-CORE-territory-places replacement text, remove references to the deleted build-place-lookup-data.ts, unblock people-partnership-rates-check from the empty shell, set #5334's item blocked on a design call, and restore the #5101 pr link.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The stopgap tripwire and the pool check pass, no file names build-place-lookup-data.ts, and the territory test fails when an island carries no county code in a drawn place and seed.

**Files.** src/core2/data/stopgaps.json, docs/pool/items

**Notes.** Item 19 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.

**Result (Oct 20).** SG-WORLD-credit-island-deposits and SG-CORE-territory-places now say what the data holds (island villages carry Census county codes the FDIC table does not number; only Guam finds its county row); src/core2/territory-deposits.test.ts records it for every village. References to the deleted generator are gone from .prettierignore, the retirement map, the keeps list, core.md and two pool items. people-partnership-rates-check names its real dependency (people-partnership-counted); #5334 item people-views-opening-stance-per-question was already blocked on research; people-port-traits-upbringing has its pr link (#5101).
