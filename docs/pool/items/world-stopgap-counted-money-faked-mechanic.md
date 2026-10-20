---
id: world-stopgap-counted-money-faked-mechanic
title: "Stopgaps in counted-money (faked-mechanic): 1 open"
area: world
kind: stopgap
priority: 2
status: in-pr
claimed-by: claude/political-game-pool-udtiwn
pr: #5217
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/counted-money.ts, kind faked-mechanic"
claimed-at: 2026-10-19T23:24:48.245Z
---

**What.** The stopgap row(s) SG-CORE-counted-unkeyed-money in src/core2/counted-money.ts mark a shortcut that is still live in play. Today money an engine pays to or takes from a place's counted residents as a whole (an owner's draw, a pooled property tax bill, a price change on counted households) lands in an unkeyed pool instead of group accounts. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** One model, two tiers: a counted group pays and receives the same dollars as a full person, times its count, through keyed accounts. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), a pooled property tax bill and an owner's draw settle through keyed group accounts and the ledger balances, with group account record ids, named by record id. The test in src/core2/counted-money.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: see the town's tax revenue match what its households paid.

**Files.** src/core2/counted-money.ts, src/core2/accounts.ts, src/core2/data/stopgaps.json

**Notes.** Audited Oct 19 (see the three world-counted-*-keyed items for the sources and measured amounts); split by source rather than built here: world-counted-unemployment-unplaced-keyed, world-counted-law-payouts-keyed, world-counted-return-and-withdrawal-keyed. Close this row when all three are done.

**Original notes.** First row: Money an engine pays to or takes from a place's counted residents as a whole (an owner's draw to owners who are counted, a pooled property tax bill, a price change on counted households, money left in the place's residen
