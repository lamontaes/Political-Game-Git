---
id: laws-grocery-exemption-local-base-research
title: "Which states' grocery exemption also spares local sales taxes: a sourced per-state field"
area: laws
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
lead: laws-effects
source: stand-in triage of the laws register, Nov 10, 2026
after:
model: sonnet
effort: low
root: rc9-place-facts-one-default
---

**What.** When a state exempts groceries, the game spares groceries from every level's sales tax in the town, as if every state's local sales taxes followed the state's base. In real life most do, some do not (a few states let each city or county decide). Add one researched yes-or-no field per state saying whether local sales taxes follow the state's grocery exemption, and read it where the exemption is applied, so a state exemption spares only the levels its base covers. Closes SG-LAWS-grocery-exemption-local-base.

**Cause.** Found in code: src/core2/modules/budgets.ts:1067-1080 (`exemptionFor` returns the state's exemption for every level before looking at a county's or city's own); the starting-law research (data/research/laws/local-starting-law/sales-tax.json) carries no such field, and its README lists local sales tax samples as not researched.

**Fix.** For all 56 places, read each state revenue department's sales-tax guide on the local base, record `localFollowsStateGroceryExemption` (true, false, or ESTIMATED from the majority with its spread where a place has no local sales tax or the guide is silent), each with a fetched and quoted source and the year, in sales-tax.json. Then in `exemptionFor` return the state's exemption for a level only when the field is true. Delete the stand-in's marker and resolve the row (never delete it). No state is named in code.

**Time box.** 3 hours for one Sonnet session. When it runs out, push the states done, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: the field checks the base and never decides one town's outcome. One rule, all 56 places. Estimate, never UNKNOWN: a place with no answer starts from the national majority, marked ESTIMATED. Replace, never layer: the unconditional state-first lookup is replaced.

**Done when.** A second session, not the builder, replays this on main: in a one-year played world (buildBenchWorld, a place from all 56 whose state has the field false and a local sales tax, place and seed named) with the state grocery exemption enacted through dev mode, the county's or city's sales-tax receipt record ids still count grocery sales, against a twin place whose field is true where they do not; every field cites its source.

**Waits on.** Nothing.

**Files.** data/research/laws/local-starting-law/sales-tax.json, src/core2/modules/budgets.ts, src/core2/data/stopgaps/laws.json, src/core2/budgets.test.ts
