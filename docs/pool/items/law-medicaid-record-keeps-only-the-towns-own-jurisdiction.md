---
id: law-medicaid-record-keeps-only-the-towns-own-jurisdiction
title: "A Medicaid law reaches the town's own jurisdiction's bills but not the county's households billed to the same clinic"
area: world
kind: wiring
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws
model: opus
effort: medium
root: none
source: traced by the Account lead from the jurisdiction fix, Nov 16
claimed-at:
---

**What.** The law reach keeps Medicaid coverage only for residents of the town's own jurisdiction, so households elsewhere in the county that a clinic now bills meet the expansion only through the place-level debt row, never at their bill. Ending the expansion therefore moves the clinic's receipts from the town's households alone. Seen: West Union, Ohio (3984294, seed ilt-west-union), 95 days: 680 of about 35,600 billed heads are on Medicaid, all in the town's own jurisdiction, and ending the expansion lowers the clinic's sales by 11.4M in minor units whether the county's 17,069 other households bill it or not.

**Cause.** Found in code: `plans` in src/core2/medical-bills.ts sets `ownMedicaid` only where the household's place equals the town, and `coverageSpellsNow` returns spells by person id for the town's residents alone (`recordCoverage` in src/core2/law-reach/group-b-money.ts). Measured: with the county's households billed to the clinic, the plan counts at West Union were medicaid 680, employer 15,549, medicare 5,656 and none 13,739.

**Fix.** The law reach keeps Medicaid coverage records for every counted household the bills reach, by the same rule as the town's, with no second engine and no place-level exception; the place-level debt row is then left out of their collections share as it is in the town.

**Time box.** 6 hours for one session of the Opus model at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice. One rule for all 56 places. Every number is a SOURCED or ESTIMATED row with a spread. Unattended-world timing at three places, with and without, twice each side.

**Done when.** A second session draws a place at random from the 56 in buildBenchWorld, names the place and seed, ends the state's Medicaid expansion in dev mode after the first billing, and sees, by record id, county households outside the town's own jurisdiction move from Medicaid to the plan they fall to, with the clinic's receipts from them falling by the Medicaid part.

**Waits on.** The jurisdiction fix (world-medical-bills-outside-the-sellers-jurisdiction-go-outside).

**Files.** src/core2/medical-bills.ts, src/core2/law-reach/group-b-money.ts

**Notes.** TODO
