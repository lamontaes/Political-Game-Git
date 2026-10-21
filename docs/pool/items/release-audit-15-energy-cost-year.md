---
id: release-audit-15-energy-cost-year
title: "Share one rule between businessEnergyCostYear and the price-law table (#5278)"
area: world
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/political-game-pool-76ksvw
pr: #5180
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:32:33.775Z
---

**What.** Make businessEnergyCostYear use the price-law table rule and test it equals twelve months of the settlement; decide on purpose that employers without books never organize.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** A test in a drawn place and seed shows the year cost equals twelve months of the settlement, and the decision on employers without books is written in the item notes.

**Files.** src/core2

**Notes.** Item 15 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
