---
id: core-long-run-transfer-ids
title: "The accounts engine keeps every transfer id ever made (Montpelier, Vermont: 208 MB of live heap at year 4)"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: memory/transfer-ids
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-09T09:27:50.187Z
---

**What.** accounts.ts keeps every transfer id in runtime.transferIds forever, only to refuse a repeated id (named in core-long-run-tables-grow-with-history's Nov 2 notes). Montpelier, Vermont (5046000, world seed mont1, fast-forward), year 4. The accounts part held 208 MB of a 3,178 MB live heap (98 MB at year 2), the largest engine part, measured by removing it and collecting (scripts/speed-years/probe-retained.ts).

**Rules.** Speed (Oct 29): memory and records kept hold over a long save, so a transfer id no play reader needs is not kept past the month after it was made. Keep it simple (Oct 11): validation runs in tests, not in play; a repeat in the current or previous month still stops a played run. A cut changes no outcome: the records proof differs only in the accounts part.

**Done when.** In play the engine holds the current and previous month's transfer ids and refuses a repeat in either; with bookkeeping on it holds all; a test shows both; speed:year --seed mont1 --place 5046000 --years 2 records proof against the same main differs only in part.core2-accounts.

**Files.** src/core2/accounts.ts, src/core2/accounts.test.ts

**Notes.** TODO
