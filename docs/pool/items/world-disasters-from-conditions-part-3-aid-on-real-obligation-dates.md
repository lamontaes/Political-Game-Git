---
id: world-disasters-from-conditions-part-3-aid-on-real-obligation-dates
title: "Federal and state disaster aid pays on its real obligation dates from its own account"
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

**What.** Assistance for a disaster is paid in full on the declaration day from the Treasury outside account the game already keeps. Pay it over its real obligation dates to every kind of applicant (households, the county and town governments, businesses) from a federal disaster account of its own, so aid arrives when the rules say and not in one lump.

**Cause.** Design: the replacement named in SG-CORE-disasters-from-records (src/core2/data/stopgaps/core.json): assistance paid over its real obligation dates to every applicant, and a federal FEMA account of its own; the owner's Oct 16, 2026 ruling is recorded in world-disasters-from-conditions.

**Fix.** In src/core2/modules/disasters.ts, give federal disaster aid its own account and pay each applicant kind on its obligation dates through the accounts API.

**Time box.** 6 hours for one session of the Opus model. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Feeds: world-disasters-from-conditions (which waits on it); the aid a town's budget receives after a disaster.

**Rules.** Wire to the world: aid moves between named accounts by journal record id and every dollar balances. One rule, all 56 places: dates and amounts come from data. No dice. An effect is a read: the receiving governments' and households' books read the aid.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, drawn place and seed named) with a disaster and sees federal and state aid pay on its dates to each applicant kind from the disaster account, by journal record id, with the FEMA account its own and the journal balanced.

**Waits on.** world-disasters-from-conditions-part-1-damage-to-named-buildings.

**Files.** src/core2/modules/disasters.ts, src/core2/disaster-weather.test.ts
