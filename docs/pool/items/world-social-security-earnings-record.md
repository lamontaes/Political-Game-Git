---
id: world-social-security-earnings-record
title: "Each worker's covered earnings are recorded year by year from the wages they are paid, for full people and for counted members"
area: world
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: sonnet
effort: medium
root: none
milestone:
source: Split from world-stopgap-retirement-claims-program-stand-in by pool feeder Oct 20
checked: fable 2026-11-10
---

**What.** A person's Social Security award is sized from modeled covered months (an estimate from their age and a reliability trait in `retirement-claims.ts`), because nothing records what they earned. Record it: the payroll withholding path (`onWorkPayroll` in src/core2/modules/employer-taxes.ts, where the Social Security tax is withheld) adds each covered wage to a per-person, per-year covered-earnings row for a full person, and to a per-member column for a counted resident whose group wage flow is paid. The opening seeds each adult's earlier record from their age, sex and the place's earnings (as an ESTIMATED past, consistent with their job history, marked with its source), and play adds to it. The record caps each year at the law's taxable maximum. Fill-in reads the counted member's column, so the same earnings come back.

**Cause.** Found in code: `onWorkPayroll` in src/core2/modules/employer-taxes.ts (line 142) withholds Social Security tax but nothing records the covered wages, so src/core2/modules/retirement-claims.ts estimates covered months from age and a reliability trait.

**Fix.** Add a covered-earnings row per person per year (capped at the taxable maximum from the law row in force) written from payroll, a per-member column for counted residents, and an estimated past at the opening marked with its source and spread.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the benefit formula in world-retirement-benefit-from-law-and-record must read this record when a person claims. One model, two tiers: a counted member's column is updated by the same covered-wage rule times their count, and filling them in keeps it. Wire to the world: the record grows only from wages that payroll actually paid, by journal record id. One rule, all 56 places: the taxable maximum and covered-employment rules come from the law rows in force, with territories' own rows. Estimate, never UNKNOWN: the opening past carries an ESTIMATED source and spread. Speed: a payroll day writes one number, never a scan of the town.

**Done when.** A second session, on main in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), plays a year in dev mode and reads a worker's covered-earnings row for the year: it equals the sum of the covered wages in their payroll journal records up to the taxable maximum, and a counted member's column grows by the group's wage flow and is the same after fill-in. src/core2/earnings-record.test.ts proves it.

**Waits on.** Nothing.

**Files.** src/core2/modules/employer-taxes.ts, src/core2/modules/retirement-claims.ts, src/core2/residents-economy.ts, src/core2/earnings-record.ts (new), src/core2/earnings-record.test.ts (new)

**Notes.** Split from world-stopgap-retirement-claims-program-stand-in by pool feeder Oct 20.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have recorded every worker's covered earnings by year; only the dropped benefit formula reads it.
