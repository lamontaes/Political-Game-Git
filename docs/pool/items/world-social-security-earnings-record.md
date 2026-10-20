---
id: world-social-security-earnings-record
title: "Each worker's covered earnings are recorded year by year from the wages they are paid, for full people and for counted members"
area: world
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
after: 
blocked-on:
milestone:
source: Split from world-stopgap-retirement-claims-program-stand-in by pool feeder Oct 20
---

**What.** A person's Social Security award is sized from modeled covered months (an estimate from their age and a reliability trait in `retirement-claims.ts`), because nothing records what they earned. Record it: the payroll withholding path (`onWorkPayroll` in the employer-taxes and income-tax modules, where the Social Security tax is withheld) adds each covered wage to a per-person, per-year covered-earnings row for a full person, and to a per-member column for a counted resident whose group wage flow is paid. The opening seeds each adult's earlier record from their age, sex and the place's earnings (as an ESTIMATED past, consistent with their job history, marked with its source), and play adds to it. The record caps each year at the law's taxable maximum. Fill-in reads the counted member's column, so the same earnings come back.

**Rules.** An effect is a read, not a record: the benefit formula in world-retirement-benefit-from-law-and-record must read this record when a person claims. One model, two tiers: a counted member's column is updated by the same covered-wage rule times their count, and filling them in keeps it. Wire to the world: the record grows only from wages that payroll actually paid, by journal record id. One rule, all 56 places: the taxable maximum and covered-employment rules come from the law rows in force, with territories' own rows. Estimate, never UNKNOWN: the opening past carries an ESTIMATED source and spread. Speed: a payroll day writes one number, never a scan of the town.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), a worker's covered-earnings row for the year equals the sum of the covered wages in their payroll journal records up to the taxable maximum, a counted member's column grows by the group's wage flow and is the same after fill-in, and src/core2/earnings-record.test.ts proves it.

**Files.** src/core2/modules/employer-taxes.ts, src/core2/modules/retirement-claims.ts, src/core2/residents-economy.ts, src/core2/earnings-record.ts, src/core2/earnings-record.test.ts

**Notes.** Split from world-stopgap-retirement-claims-program-stand-in by pool feeder Oct 20.
