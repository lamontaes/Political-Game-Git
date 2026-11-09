---
id: core-long-run-medical-bill-rows
title: "Medical-bill rows of households no longer billed are kept forever (Montpelier, Vermont: 46,917 rows at year 6)"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: memory/medical-bill-rows
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-09T17:01:12.873Z
---

**What.** The coverage engine's monthly billing pass (src/core2/medical-bills.ts) writes one medicalBills row per household billed and never removes one. A household that dies out, merges or moves beyond the billed places keeps its last row for the rest of the run, though the pass reads a row only for what is owed, the debt record and its seller. At Montpelier, Vermont (5046000, world seed mont1, fast-forward) the table held 32,219 rows at year 2 and 46,917 at year 6, 104 MB of live heap measured by removing it.

**Rules.** Keep results, not their history (owner, Oct 7, Nov 5, Nov 8): a household no longer billed that owes nothing and holds no debt record leaves its row, and a household billed again later is billed exactly as it would be from that row. Bookkeeping is a debug switch (Oct 11): tests and proofs keep every row.

**Done when.** In play a row of a household not billed this month, owing nothing and holding no debt record, is removed on the monthly pass, and a row that still owes stays; a test shows both, with every row kept when bookkeeping is on; speed:year --seed mont1 --place 5046000 --years 2 records proof against the same main differs only in core2-coverage-v1.medicalBills.

**Files.** src/core2/medical-bills.ts, src/core2/medical-bill-rows.test.ts

**Notes.** TODO
