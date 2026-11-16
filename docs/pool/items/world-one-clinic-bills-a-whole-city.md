---
id: world-one-clinic-bills-a-whole-city
title: "A city's whole care is billed through the one clinic planned for a fraction of it"
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

**What.** Every town gets exactly one clinic whatever its size, so a city's clinic bills for the whole town. Its receipts then dwarf its plan. Seen: Lewiston, Maine (2338740, seed 23142a27) clinic receipts run 3.4M, 5.1M and 4.8M in months 1 to 3 against 1.26M planned a month.

**Cause.** Found in code: `outlets` in src/core2/town-workplaces.ts gives one clinic per town. Measured: Lewiston's clinic received 2.3M a month in patient and Medicaid shares alone on the Train, and 3.4M to 5.1M with the insurer and Medicare parts paid per bill (pool item for the payer parts); Danville, PA (4218136, seed ilt-danville) gets 42 percent of its plan and West Union, OH (3984294, seed ilt-west-union) 100 to 120 percent.

**Fix.** The count of clinics follows the town's care cost (the bill model's all-payer cost) and the planned size of one clinic, by the same engine that writes the other town employers; no cap on a clinic's receipts. The renters thread's large-establishment split (I5) is where a big establishment becomes several.

**Time box.** 6 hours for one session of the Opus model at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the sizes come from the record, never a roll. Every number is an ESTIMATED or SOURCED row with a spread. One rule for all 56 places. Unattended-world timing at three places, with and without, twice each side.

**Done when.** A second session builds Lewiston (place 2338740) through buildBenchWorld in a played world, sees its clinics' receipts a month against their plans within a spread, and names each clinic by record id.

**Waits on.** Nothing.

**Files.** src/core2/town-workplaces.ts, src/core2/opening-town-jobs.ts

**Notes.** TODO
