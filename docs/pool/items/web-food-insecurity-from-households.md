---
id: web-food-insecurity-from-households
title: "The share of residents on SNAP and the share of food-insecure households are counted from households, not held as a place number"
area: core
kind: stopgap
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage, Nov 10 (SG-WEB-snap-receipt-ledger, SG-WEB-food-insecurity-ledger)
lead: laws-effects
standard: 2
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** Two outcome-web numbers are place numbers in the web's monthly ledger, started at the USDA state level: the share of residents receiving SNAP (program.snap-receipt) and the share of households that are food insecure (household.food-insecurity). No household's own SNAP receipt or food shortfall decides either. Close both stand-ins together: SG-WEB-snap-receipt-ledger and SG-WEB-food-insecurity-ledger.

**Cause.** Found in code: src/core2/modules/outcome-web.ts:660 and :661 call `api.stopgap` for both ids ("No field counts the SNAP benefit's recipients into SNAP receipt, and no engine keeps food insecurity"). Neither measure is in `engineMeasures` in src/core2/data/outcome-web/outcome-web.json (that list ends at household.income and its neighbors), so the web reads no record for them. The benefit's households are payment obligations in src/core2/law-reach/group-b-food-aid.ts (`runFoodAid`, line 137), and what a household cannot buy of its everyday plan is `unpaidMinor` on its credit month row (src/core2/modules/credit.ts:777 and :827), with no food line of its own.

**Fix.** (1) In src/core2/modules/world-metrics.ts add two month fields per place: `snapRecipientShare` (households with a SNAP allotment paid or owed this month, by weight, over resident households) and `foodShortfallShare` (households whose everyday plan went partly unbought this month, by weight, over resident households; read `unpaidMinor` on the credit month row and the household's own plan lines in src/core2/cost-of-living.ts, counting only the food lines of the plan). (2) Add both to `engineMeasures` in src/core2/data/outcome-web/outcome-web.json with `owner`, `record`, `field` and `unitScale` like household.income, so the web reads the engine record and the ledger start becomes the engine's first reading. (3) Delete the two `api.stopgap` calls at outcome-web.ts:660 and :661 and mark both register rows resolved in src/core2/data/stopgaps/web.json. Counted households count by weight with the same rule as full ones. Compute once a month from the rows already written that month, never by scanning people.

**Time box.** 4 hours for a Sonnet session.

**Rules.** An effect is a read, not a record: the new fields must be read by the web, which a law (the SNAP work requirement) already moves. One model, two tiers: counted households count by weight. No dice: the shortfall is each household's own unbought food, never a rate. One rule, all 56 places.

**Done when.** A second session plays a drawn place and seed it did not choose for 12 months in the bench with dev mode, changes the SNAP work requirement law, and sees (1) the SNAP recipient share move because named households lost their allotment (record ids in the PR body) and (2) the food-insecure share move for the households that went short, with the counts matching the credit month rows; and the two stand-in rows are resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-metrics.ts, src/core2/data/outcome-web/outcome-web.json, src/core2/modules/outcome-web.ts, src/core2/data/stopgaps/web.json, src/core2/law-reach/group-b-food-aid.ts, src/core2/cost-of-living.ts
