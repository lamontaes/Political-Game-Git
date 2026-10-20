---
id: world-stopgap-credit-missing-record
title: "Stopgaps in credit (missing-record): 1 open"
area: world
kind: stopgap
priority: 2
status: claimed
claimed-by: claude/mortgage-funding
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/credit.ts, kind missing-record"
claimed-at: 2026-10-19T22:11:14.322Z
---

**What.** The stopgap row(s) SG-WORLD-opening-mortgage-funding in src/core2/modules/credit.ts mark a shortcut that is still live in play. Today the bank holds opening mortgages whose original funding is an unmatched opening liability instead of named customer deposits. The row stays open until the real mechanic replaces the fake, or the feature that needs the fake is deleted. This item replaces it and clears the row in src/core2/data/stopgaps.json.

**Rules.** Estimate, never UNKNOWN: until named depositors exist the funding starts from the real deposit-to-loan average with a spread and a source. Wire to the world: the bank's books must balance. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, the seed and place named in the PR body), the bank's opening mortgages are funded by deposit records of named and counted households and the balance sheet balances, by deposit record ids, named by record id. The test in src/core2/housing-mortgages.test.ts and the stopgap tripwire test show the row resolved in stopgaps.json. The owner plays it: open the bank's books and see mortgages backed by neighbors' savings.

**Files.** src/core2/modules/credit.ts, src/core2/data/stopgaps.json, src/core2/housing-mortgages.test.ts

**Notes.** First row: The bank holds opening mortgages whose original funding is an unmatched opening liability, not named customer deposits. New savings deposits are actual journal transfers and are accounted for separately.
