---
id: gov-counted-owner-profit-tax
title: "A business a counted resident owns passes its profit to the owner group's income, taxed by the law in force"
area: gov
kind: wiring
priority: 2
size: M
status: done
claimed-by: claude/gov-counted-owner-profit-tax
pr: #4807
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T19:14:11.036Z
---

**What.** A business a counted resident owns pays no tax on its profit. Under the law that profit is the owner's income, but a counted owner has no cash account of their own: their income is a group flow. Pass the profit to the owner group's income and tax it by the income tax law in force where they live, as the owners who are full people already pay it as estimated payments each quarter.

**Rules.** One model, two tiers: a counted owner group is taxed by the same rule as a full owner, times its count. An effect is a read, not a record: the income tax engine reads the business's books at the quarter's end. Replace, never layer: the stopgap and its marker are deleted when the group is taxed.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a business a counted resident owns shows a quarter's profit taxed through the owner group's flow to named treasuries by journal record id, balanced, and the stopgap SG-WORLD-business-profit-pass-through is resolved. A test in src/core2 proves it.

**Files.** src/core2/modules/employer-taxes.ts, src/core2/counted-money.ts, src/core2/modules/residents.ts, src/core2/data/stopgaps.json

**Notes.** Split from gov-town-payers-vehicle-and-owner-tax. The full-person owners are taxed in PR #4798 (passThrough in employer-taxes.ts).
