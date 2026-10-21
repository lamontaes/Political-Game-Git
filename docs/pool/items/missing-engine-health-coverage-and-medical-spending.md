---
id: missing-engine-health-coverage-and-medical-spending
title: "Households pay health premiums and medical bills, and a person's coverage (employer, Medicaid, none) sets what they pay"
area: people
kind: feature
priority: 2
size: L
status: blocked
claimed-by: claude/fs11vb-health-coverage
pr:
blocked-on: people-coverage-record-monthly-pass
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:03:19.238Z
---

**What.** Core2 has no health spending: living costs carry only drugs and medical supplies, and the CE health insurance and medical services categories are not bound to any household flow. Build a coverage record per full person and per counted group (plan, from, to) and a monthly premium and out-of-pocket flow for each household that reads it, so the laws-reach-b Medicaid items have something to move. The claiming session splits this into S or M sub-items (coverage record and monthly pass, medical spending categories from the BLS Consumer Expenditure health lines, the Medicaid reader) before building.

**Rules.** An effect is a read: Medicaid eligibility records written by law reach must be read by the household medical spending flow that pays. One model, two tiers: a counted group pays and is covered with the same rule as a full person times its weight. No dice: coverage follows age, income, employment, the law in force and the state, never a roll. The chain is the acceptance: law row, eligibility, coverage record, the lower bill, the household's cash.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR) a Medicaid expansion law in force gives named and counted low-income adults a coverage record, their monthly medical out-of-pocket spending is lower than an uncovered neighbor's by record id, and the cash journal balances; the SG-GOV-REACH-B-medicaid-coverage stopgap row is closed with the reader named.

**Files.** src/core2/modules/health.ts, src/core2/reference/living-costs-data.ts, src/core2/law-reach/group-b.ts, src/core2/data/stopgaps.json

**Notes.** Split Oct 20 (claude, claude/fs11vb-health-coverage) into three items in this order: people-coverage-record-monthly-pass (coverage record and a monthly premium flow), world-medical-spending-categories (the BLS Consumer Expenditure health lines as an out-of-pocket flow; waits on the first) and gov-medicaid-coverage-reader (the Medicaid law reach reads and lowers the bill; waits on both). This item is done when all three are. Why it is not small: `living-costs-data.ts` says health premiums and medical services await separate bindings, and a premium needs a payee (an insurer in town or the outside account), a journal source and the same rule for counted groups, which runs through opening-customers.ts and the residents flows.
