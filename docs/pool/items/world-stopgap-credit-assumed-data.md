---
id: world-stopgap-credit-assumed-data
title: "Stopgaps in credit (assumed-data): 1 open"
area: world
kind: stopgap
priority: 3
status: done
claimed-by: claude/territory-deposits
pr: #5254
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/credit.ts, kind assumed-data"
claimed-at: 2026-10-19T23:14:27.332Z
---

**What.** Replace or clear the 1 open assumed-data stopgap row(s) in src/core2/modules/credit.ts: SG-WORLD-credit-island-deposits. Each fake is replaced by the mechanic, or the feature that needs it is deleted.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** Rows resolved in stopgaps.json; the engine's replacement read by another engine in a one-year played-world run, by record id.

**Files.** src/core2/modules/credit.ts

**Notes.** First row: Where no county deposit row covers a place (American Samoa, the Virgin Islands, places without a county), the town bank's deposits are the territory's FDIC deposits per resident (Guam, Northern Marianas) or the nation's,

Checked Oct 19 (claude/territory-deposits): only American Samoa is still on the nation's deposits per resident. The FDIC Summary of Deposits for June 30, 2026 (fetched from api.fdic.gov/banks/sod, keyless) lists 16 branches in Guam, 6 in the Northern Mariana Islands, 260 in Puerto Rico and 20 in the U.S. Virgin Islands, and those counties are already in `data/tables/town-deposits.json` (83 rows, same figures as a fresh fetch). American Samoa has no branch in it. The row now names American Samoa only; its replacement is the territorial banking regulator's or the banks' own report, which is not reachable from here. `src/core2/territory-deposits.test.ts` holds the split.
