---
id: world-stopgap-place-prices-faked-mechanic
title: "Stopgaps in place-prices (faked-mechanic): 2 open"
area: world
kind: stopgap
priority: 2
status: in-pr
claimed-by: claude/place-prices-stopgaps
pr: #5190
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/place-prices.ts, kind faked-mechanic"
claimed-at: 2026-10-19T22:06:25.470Z
---

**What.** The stopgap row(s) SG-GOV-REACH-B-retail-price, SG-WORLD-prices-household-shares in src/core2/modules/place-prices.ts mark a shortcut that is still live in play. Today the price engine charges container deposits to households under the live law, but container use and redemption still use household estimates rather than each person's purchases and returns, and a retail price law uses a stand-in. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** One model, two tiers: each person's purchases and counted groups' purchases are priced by the same rule. No dice: returns come from the person's own choice. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a container deposit law charges a named person at purchase and refunds them at return, with purchase, deposit and refund record ids, named by record id. The test in src/core2/place-prices.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: pass a bottle deposit law and get your nickel back.

**Files.** src/core2/modules/place-prices.ts, src/core2/data/stopgaps.json, src/core2/place-prices.test.ts

**Notes.** First row: The price engine charges container deposits to full and counted households under the live law. Container use and redemption still use household estimates rather than each person's purchases and return decision.
