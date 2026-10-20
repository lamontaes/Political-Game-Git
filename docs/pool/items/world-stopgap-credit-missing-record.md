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

Measured Oct 19 (claude/mortgage-funding, not built): Ingram, Texas, seed bank-probe-7a1, 40 days in. Bank deposits $0.95M; opening mortgage funding (the unmatched liability) $12.30M; mortgages held $12.26M; bank cash $6.15M; the 1,856 people hold $31.7M in cash between them. So the money to back the mortgages is in the town (39 percent of its cash), but moving it into deposit records takes it out of people's cash with nothing to offset it on the bank's side: the bank's cash does not rise because the mortgages were paid out long ago. Doing it needs a decision on the opening offset (the ledger's opening-balance entry, or a one-time cut to every household's opening cash in proportion to its savings, a deposit-to-loan ratio from FDIC data with a spread) before the code, and every test that sums opening cash will move. Suggested first step: the ratio, sourced, as an ESTIMATED parameter; then deposit records at the opening taken from households in proportion to their savings.
