---
id: health-residential-care-paid-per-resident
title: "Care homes have no per-resident payer: their sales are one flat row that no law reaches"
area: world
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: money
model: opus
effort: medium
root: none
source: traced by the Account lead from the stores, health and services tracer, Nov 15
claimed-at:
---

**What.** A care home's receipts are a flat outside-sales row (0.91 of its plan, from outside-market.json), so a Medicaid cut or expansion cannot reach the care home. A town's residential care is therefore the one health seller no law touches. Seen: Danville, PA (4218136, seed ilt-danville), Liu Care Home gets 572k a month, all of it the flat row, and none from any bill.

**Cause.** Found in code: the bill model (`billMedicalCare` in src/core2/medical-bills.ts) bills households for visits; a care home's residents are not billed per visit, so it has no per-resident record of who pays. The flat row's note names Medicaid 46.6 percent, Medicare 28.1 percent and private insurance 9.4 percent (Census 2017 type of payer, NAICS 6231).

**Fix.** Pay a care home per resident from the coverage record: each resident's plan decides who pays their day, Medicaid and Medicare through the same payers as the bills, and the flat row comes out. The player sees it when a Medicaid cut shrinks the town's care home.

**Time box.** 6 hours for one session of the Opus model at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the sizes come from the record, never a roll. Every number is an ESTIMATED or SOURCED row with a spread. One rule for all 56 places. Unattended-world timing at three places, with and without, twice each side.

**Done when.** A second session builds a drawn place and Danville through buildBenchWorld in a played world, sees the care home's receipts by payer for three months, and sees a state Medicaid cut lower them by record id.

**Waits on.** Nothing.

**Files.** src/core2/data/outside-market.json, src/core2/medical-bills.ts, src/core2/opening-outside-market.ts

**Notes.** TODO
