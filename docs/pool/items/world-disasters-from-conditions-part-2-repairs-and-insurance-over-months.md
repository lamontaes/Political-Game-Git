---
id: world-disasters-from-conditions-part-2-repairs-and-insurance-over-months
title: "Repairs and insurance payments post over months after damage"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-disasters-from-conditions-part-1-damage-to-named-buildings
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: rc1-world-outside-town
source: split from world-disasters-from-conditions in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Damage to named homes and businesses (part 1) must turn into money over time: repair bills paid to builders and trades, and insurance paying out to the insured, month by month, not in one lump. Each payment is a journal entry between a named payer and payee, and the households and businesses damaged pay and receive according to their own records.

**Cause.** Design: the owner's Oct 16, 2026 ruling recorded in world-disasters-from-conditions and the replacement named in SG-CORE-disasters-from-records (src/core2/data/stopgaps/core.json): household aid and repairs reaching named households, with insurance and repairs over time.

**Fix.** In src/core2/modules/disasters.ts, schedule repair payments to builders and insurance payouts over months from the damage records, through the accounts API and the existing insurance in the coverage engine, each by journal record id.

**Time box.** 8 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the insurance payment and repair bills in a household's own money after a disaster.

**Rules.** Wire to the world: damage moves money to builders and insurers, and every dollar balances on the journal. No dice: repair pace follows builders' capacity and the payer's means. One model, two tiers: counted households repair and claim by the same rule as full ones, times their count. An effect is a read: the builders' books and the insurers' books read these payments.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, drawn place and seed named) with a hazard-caused disaster and sees repair payments post over several months to named builders and insurance payouts to named insureds, by journal record id, with the journal balanced.

**Waits on.** world-disasters-from-conditions-part-1-damage-to-named-buildings.

**Files.** src/core2/modules/disasters.ts, src/core2/modules/business.ts, src/core2/modules/coverage.ts, src/core2/disaster-weather.test.ts
