---
id: health-clinic-outside-patients-sized-at-opening
title: "A clinic has no patients from outside its town: it sells only what the town's own care makes"
area: world
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9617
blocked-on:
after:
lead: money
model: opus
effort: medium
root: none
source: traced by the Account lead from the stores, health and services tracer, Nov 15
claimed-at:
---

**What.** A town's clinic is paid only by the town's own households, though a clinic's books plan more receipts than one town's care makes. Every other kind of seller has outside buyers; the clinic has none, so a state Medicaid cut moves only the town's share of its receipts. Seen: Danville, Pennsylvania (4218136, seed ilt-danville), whose clinic's own jurisdiction made 64M of care a month against 139M planned, and which sold 296k, 571k and 608k in months 1 to 3 against 1.39M planned.

**Cause.** Found in code: `addOutsideMarket` in src/core2/opening-outside-market.ts writes an outside-sales flow only for a kind with a row in src/core2/data/outside-market.json, and there is no row for the clinic kind. Measured: Danville's clinic had no outside-sales flow in a played world at 40 days.

**Fix.** The clinic's outside patients are sized once, at the first billing, as the sellers' planned month less the town's own care then, never below zero, in `outsidePatients` in src/core2/medical-bills.ts. Their Medicaid part (an ESTIMATED share) follows the town's own Medicaid coverage over its coverage at the opening, a proxy a state-level coverage record would replace. Each seller's latest month of receipts by payer is kept for dev mode's trace.

**Time box.** 4 hours for one session of the Opus model at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the size comes from the record, never a roll. The Medicaid share is an ESTIMATED row with a spread, labeled from memory. One rule for all 56 places. Unattended-world timing at three places, with and without, twice each side.

**Done when.** A second session builds Danville (place 4218136, seed ilt-danville) through buildBenchWorld in a played world, sees its clinic's receipts by payer in dev mode's trace, ends the state's Medicaid expansion after the first billing, and sees the clinic's outside receipts fall by more than the town's own Medicaid share alone.

**Waits on.** Nothing.

**Files.** src/core2/medical-bills.ts, src/core2/residents-economy.ts, src/core2/data/health/medical-bills.json

**Notes.** TODO
