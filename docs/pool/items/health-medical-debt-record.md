---
id: health-medical-debt-record
title: "Medical debt is a background record on households' books, so the Medicaid expansion's medical-debt link moves money"
area: people
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: world-medical-spending-categories
source: added with npm run pool -- add
---

**What.** Owner ruling Oct 29 13:30 UTC (OWNER-DECISIONS.md): build the missing record as a background simulation from research, never a step the player takes, inside the engine that owns it (no system beside it). The law matrix grades the Medicaid expansion partly wired because medicaid-expansion-to-medical-debt moves only the web's finance.medical-debt-in-collections number (SG-EW-HEALTH-medical-debt-reader). Build the record: a household's medical bills (the out-of-pocket flow world-medical-spending-categories adds, priced by each member's coverage record in modules/coverage.ts) that it cannot pay from what it holds go to collections as a medical-debt record on its books, and the web's factor for finance.medical-debt-in-collections multiplies the share sent to collections where the household is uncovered. Size the record from research actually fetched (CFPB medical collections on credit reports; Hu, Kaestner, Mazumder, Miller and Wong 2018 on the expansion and unpaid bills), calibrated not hardcoded.

**Rules.** Simulate it, don't ask (owner, Oct 24 and Oct 29): background only, no player step. One model, two tiers: a counted household follows the same rule times its count. No dice: a bill goes unpaid because the household's cash and coverage say so, never a roll. The chain is the acceptance: the law, the coverage record, the bill, the debt record, the household's money.

**Done when.** In a drawn place from all 56 (place and seed named) with the expansion enacted in one world and not its twin, a named low-income household carries a smaller medical-debt record than in the twin, by record id, the journal balances, and docs/reports/law-wiring-matrix.json grades the Medicaid expansion wired (medicaid-expansion-to-medical-debt read by the new record). A test in src/core2 proves it on two seeds.

**Files.** src/core2/modules/coverage.ts; src/core2/modules/health.ts; src/core2/data/health/; data/research/outcome-web/links.json

**Notes.** TODO
