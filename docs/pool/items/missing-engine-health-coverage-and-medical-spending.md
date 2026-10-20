---
id: missing-engine-health-coverage-and-medical-spending
title: "Households pay health premiums and medical bills, and a person's coverage (employer, Medicaid, none) sets what they pay"
area: people
kind: feature
priority: 2
size: L
status: open
claimed-by:
pr:
blocked-on:
after: people-coverage-record-monthly-pass,people-coverage-counted,world-medical-spending-categories,gov-medicaid-coverage-reader
source: added with npm run pool -- add
claimed-at:
---

**What.** This is the roll-up for health spending in core2, which had none: living costs carried only drugs and medical supplies. It is built by four items: a coverage record for each person with a monthly premium flow (people-coverage-record-monthly-pass), the same coverage share for counted households (people-coverage-counted), the BLS Consumer Expenditure health insurance and medical services lines bound to household flows (world-medical-spending-categories), and the Medicaid expansion reader that gives eligible adults a coverage record and a lower bill (gov-medicaid-coverage-reader). When all four are done, this item is closed by checking the whole chain once in the played world: law row, eligibility, coverage record, premium and out-of-pocket flow, and the household's cash.

**Rules.** The chain is the acceptance: the roll-up closes only when one Medicaid law is followed to a named person's lower bill and cash. One model, two tiers: counted groups pay and are covered by the same rule as full people times their weight. An effect is a read: the household medical flow in src/core2/modules/health.ts must read the coverage record that the law reach wrote. No dice: coverage follows age, income, job, the law in force and the state.

**Done when.** After the four items are done, a one-year run of the played world (buildBenchWorld, a drawn place from all 56, a seed the builder did not choose) with a Medicaid expansion law in force shows a named low-income adult and a counted group with a coverage record, a medical out-of-pocket line below an uncovered neighbor's by record id, and a balanced cash journal. A test in src/core2/modules/health.test.ts proves it, and SG-GOV-REACH-B-medicaid-coverage is closed with the reader named.

**Files.** src/core2/modules/health.ts, src/core2/reference/living-costs-data.ts, src/core2/law-reach/group-b.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): spec written as a roll-up; the four children already exist as pool items. laws-reach-b-medicaid-coverage looks like a duplicate of gov-medicaid-coverage-reader (same Medicaid reader) and is itself blocked on this item, so it is left out of after: to avoid a cycle; the lead should drop or re-point it.
