---
id: world-disasters-from-conditions-part-4-close-the-stopgap
title: "Close SG-CORE-disasters-from-records and state the chain in the weather test"
area: world
kind: cleanup
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: world-disasters-from-conditions-part-1-damage-to-named-buildings, world-disasters-from-conditions-part-2-repairs-and-insurance-over-months, world-disasters-from-conditions-part-3-aid-on-real-obligation-dates
blocked-on:
lead: laws-effects
model: sonnet
effort: low
root: rc1-world-outside-town
source: split from world-disasters-from-conditions in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** When damage, repairs and aid are built, the stopgap SG-CORE-disasters-from-records no longer describes the code. Mark it resolved with what replaced it, and make the disaster-weather test state the whole chain by record id: hazard record, disaster, damaged homes and businesses, repairs and insurance over months, aid on its dates.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, Nov 8, about 7:15 p.m. (weather is basic climate change through the effect map) and the open row SG-CORE-disasters-from-records in src/core2/data/stopgaps/core.json.

**Fix.** Resolve the stopgap row with the resolving change named, and extend src/core2/disaster-weather.test.ts to follow the chain by record id.

**Time box.** 2 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Feeds: world-disasters-from-conditions (which waits on it); the disaster chain the weather test states.

**Rules.** Every cut corner is a registered stopgap and a closed one says what closed it. The chain is the acceptance: the record, the damage, the payment and the person it reached, by record id.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, drawn place and seed named) and reads the disaster-weather test's chain from hazard record to payments by record id; the stopgap row shows resolved with its resolution.

**Waits on.** world-disasters-from-conditions-part-1-damage-to-named-buildings, world-disasters-from-conditions-part-2-repairs-and-insurance-over-months, world-disasters-from-conditions-part-3-aid-on-real-obligation-dates.

**Files.** src/core2/data/stopgaps/core.json, src/core2/disaster-weather.test.ts
