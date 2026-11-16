---
id: health-payers-pay-the-seller-per-bill
title: "A clinic is paid only the patient's share and Medicaid's part of a bill: Medicare's part and the insurer's part never reach it"
area: world
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9603
blocked-on:
after:
lead: money
model: opus
effort: medium
root: none
source: traced by the Account lead from the stores, health and services tracer, Nov 15
claimed-at:
---

**What.** A town's clinic is paid only the patient's share of each bill and Medicaid's part. Medicare's part and an employer plan's insurer's part are paid to nobody, so the clinic sells about 28 percent of its planned month. Seen: Danville, Pennsylvania's clinic sold 97k, 395k and 426k in months 1 to 3 against 1.39M planned.

**Cause.** Found in code: `billMedicalCare` in src/core2/medical-bills.ts prices each member's care at its all-payer cost and bills the member their plan's share, and pays only Medicaid's part (`payMedicaidCare`) and a raised Medicare line's addition (`payMedicareLinePart`) to the seller. Measured: Danville, PA (4218136, seed ilt-danville), clinic funded in a probe so it survives: patient 297k, Medicaid 14k a month, Medicare 0, insurer 0.

**Fix.** Each bill carries Medicare's whole part at the line in force and the employer plan's insurer's part; the first is paid by the existing federal payer, the second by one new function from the outside account where premiums go. Done on branch claude/project-thread-0a6w76-payer-parts.

**Time box.** 4 hours for one session of the Opus model at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: each part is the member's plan and the cost of their care, never a roll. One model, two tiers: a counted household's parts stand for its weight. One rule for all 56 places. Unattended-world timing at three places, with and without, twice each side.

**Done when.** A second session builds a drawn place and West Union, Ohio (place 3984294, seed ilt-west-union) through buildBenchWorld in a played world, sees the clinic's receipts by payer for three months by record id, and sees a state Medicaid cut lower them in dev mode.

**Waits on.** Nothing.

**Files.** src/core2/medical-bills.ts, src/core2/medical-payer-parts.test.ts

**Notes.** Danville's clinic reaches about 42 percent of plan after this, West Union's 100 to 120 percent, Lewiston's 270 to 400 percent (items world-one-clinic-bills-a-whole-city and health-residential-care-paid-per-resident). The care home's flat outside-sales row stays until residential care has its own payer.
