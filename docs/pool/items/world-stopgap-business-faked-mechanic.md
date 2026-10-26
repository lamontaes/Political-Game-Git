---
id: world-stopgap-business-faked-mechanic
title: "Stopgaps in business (faked-mechanic): 2 open"
area: world
kind: stopgap
priority: 2
status: dropped
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/business.ts, kind faked-mechanic"
---

**What.** The stopgap row(s) SG-WORLD-business-counted-owner-choice, SG-WORLD-business-no-successor in src/core2/modules/business.ts mark a shortcut that is still live in play. Today an owner still in the wider population takes the option whose reasons sum highest instead of choosing through the shared chooser, with draws going to a pooled residents account, and a business whose owner dies has no successor. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** One model, two tiers: a counted owner decides through the shared chooser exactly as a full owner does, with their own account. No dice: succession comes from heirs and the will. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a counted owner's close, keep or sell decision goes through the chooser and a dead owner's heir takes the business, with decision and heir record ids, named by record id. The test in src/core2/business.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: see a shop owner's heir take over the shop after a death.

**Files.** src/core2/modules/business.ts, src/core2/data/stopgaps.json, src/core2/business.test.ts

**Notes.** First row: An owner still in the wider population (not yet filled in) takes the option whose reasons sum highest instead of choosing through the shared chooser, and their draws go to their place's pooled residents account.

Checked 2026-10-16 against main and dropped as already done: both its stopgaps, SG-WORLD-business-counted-owner-choice and SG-WORLD-business-no-successor, are resolved in stopgaps.json: counted owners choose through the shared chooser, and a solvent business with no successor is closed by choice through `closeBusinessByChoice` (`closeByChoice` in `src/core2/modules/business.ts`). Nothing is left to build; no PR of this item's own did the work.
