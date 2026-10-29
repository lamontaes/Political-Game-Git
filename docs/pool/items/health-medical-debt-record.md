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
lead: laws
blocked-on:
after: world-medical-spending-categories
source: added with npm run pool -- add
---

**What.** Owner ruling Oct 29 13:30 UTC (OWNER-DECISIONS.md): build the missing record as a background simulation from research, never a step the player takes, inside the engine that owns it (no system beside it). The law matrix grades the Medicaid expansion partly wired because medicaid-expansion-to-medical-debt moves only the web's finance.medical-debt-in-collections number (SG-EW-HEALTH-medical-debt-reader). Build the record: a household's medical bills (the out-of-pocket flow world-medical-spending-categories adds, priced by each member's coverage record in modules/coverage.ts) that it cannot pay from what it holds go to collections as a medical-debt record on its books, and the web's factor for finance.medical-debt-in-collections multiplies the share sent to collections where the household is uncovered. Size the record from research actually fetched (CFPB medical collections on credit reports; Hu, Kaestner, Mazumder, Miller and Wong 2018 on the expansion and unpaid bills), calibrated not hardcoded.

**Rules.** Simulate it, don't ask (owner, Oct 24 and Oct 29): background only, no player step. One model, two tiers: a counted household follows the same rule times its count. No dice: a bill goes unpaid because the household's cash and coverage say so, never a roll. The chain is the acceptance: the law, the coverage record, the bill, the debt record, the household's money.

**Done when.** In a drawn place from all 56 (place and seed named) with the expansion enacted in one world and not its twin, a named low-income household carries a smaller medical-debt record than in the twin, by record id, the journal balances, and docs/reports/law-wiring-matrix.json grades the Medicaid expansion wired (medicaid-expansion-to-medical-debt read by the new record). A test in src/core2 proves it on two seeds.

**Files.** src/core2/modules/coverage.ts; src/core2/modules/health.ts; src/core2/data/health/; data/research/outcome-web/links.json

**Notes.** Built Oct 29 (laws lead helper, branch claude/laws-medical-debt): a bill unpaid 120 days after billing (26 CFR 1.501(r)-6) goes to collections at the hospitals' bad-debt share (ESTIMATED 40.5%, Missouri Hospital Association 2019) times webReach for finance.medical-debt-in-collections, as one medical-debt record per household in the credit engine's loans (kind medical, recordMedicalDebt), which the bank reads as a charge-off after the NCAP 180 days (creditMedicalReportDays, CFPB 2022). One path per cause: a full household whose Medicaid coverage is modeled meets the expansion through its own bills at Medicaid's share, so medicaid-expansion-to-medical-debt is left out of its share; counted households read the place row. Proof: src/core2/law-wiring-medical-debt.test.ts part (b); Sunset, Utah (US-UT, 4974480), MEDICAL_DEBT_SEED=first-seed-a1: household_abf1b8c34fed1b5e carries medical-debt:household_abf1b8c34fed1b5e of 44588 with the expansion against 162385 in the repealed twin; counted rows read the place row at share 0.5427. Law matrix: the expansion is wired (Prescott, Michigan, seed a91c03e7d2b84f10; Uehling, Nebraska, seed 5e27b0c4196fd3a8). SG-EW-HEALTH-medical-debt-reader resolved. Open: SG-HEALTH-medical-debt-collections (never paid down or sold), SG-HEALTH-medical-bill-shape (no age profile; counted care need), SG-GOV-REACH-B-medicaid-coverage reworded (the Medicaid payment still lands in the adult's account as well as the smaller bill).
