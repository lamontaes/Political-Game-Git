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

**Result (Oct 20).** The two energy-price rules (clean electricity standard, carbon price) now live once, in energyPriceRules() in place-prices.ts, read by readPriceLaws and by businessEnergyCostYear; the business arithmetic (other costs times the fuel share times the price change) is businessEnergyChange, which the monthly settlement divides by twelve and the year figure rounds. A test in place-prices.test.ts checks twelve months equal the year. The decision on purpose: an employer with no books has no operating costs to price, so it does not organize over an energy-price law; it will when it gets books (the business engine opens them), and nothing else is faked for it. The test does not run the month through the journal (it checks the shared rule); the played-world year was not run.
