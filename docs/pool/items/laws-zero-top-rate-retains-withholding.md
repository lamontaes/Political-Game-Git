---
id: laws-zero-top-rate-retains-withholding
title: "A zero top income-tax rate must stop collecting a retained graduated schedule"
area: laws
lead: laws
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A zero top income-tax rate can still withhold the old graduated schedule when an amendment retains its terms. Merger 1 reproduced this through the exported withholdingFor calculation on clean main 8abee77ef0 and on the integrated taxes PR #5649: a 100,000-minor-unit paycheck, fourteen-day period, no deduction and a single 4-percent bracket with law value 0 still produces a state income-tax line of 4,000 minor units. This is a boundary fixture, not evidence from a played world. The ordinary legislature shapedRate path already scales its brackets; the retained-terms enactLaw path used by the tax family checker and its repeal check needs the same semantics. The PR fixes positive scaling but leaves the baseline zero case; it is not a new regression.

**Rules.** An effect is a read, not a record: withholding must follow the effective law rate, with its journal naming the actual row. One model, two tiers: both named and counted payroll read the same zero-rate rule and stop collecting at that level.

**Done when.** A regression checks zero with retained nonzero brackets beside a positive scaled rate, then a buildBenchWorld run in a drawn place with its seed and law row id changes an eligible income-tax rate to zero without deleting its schedule and proves a later named and counted paycheck collect no income tax for that jurisdiction while other levels still balance. The test must fail with the prior calculation; do not merely assert the old law id disappears from applied rows. **On screen.** None by design: this is a simulation correction; later paychecks reflect the rate in force.

**Time box.** 3 hours. Model: Sonnet, no helpers.

**Files.** src/core2/tax-withholding.ts, src/core2/tax-withholding.test.ts, src/core2/law-wiring-taxes.test.ts

**Notes.** Merger 1, 2026-10-26: base and PR boundary outputs saved in merger1-state/5649-0458/zero-rate-edge.jsonl. Both collect 4,000 at value 0; PR correctly collects 4,400 at value 4.4 whereas base collects 4,000. Confirm the generated-world route before claiming player impact.
