---
id: core-long-run-donation-records
title: "The drives engine keeps every donation's canonical journal record forever (Montpelier, Vermont: 68 MB at year 4)"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: memory/donation-records
pr: #8052
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-09T11:01:47.082Z
---

**What.** drives.ts donate() puts a canonical source record in runtime.donations for every gift and never removes it; the cash journal reads it through the module's provider only while the entry posts (journal-state.ts postCashJournal; donations carry no required related refs, so nothing resolves them later). The accounts engine already drops its pending transfer records after posting. Montpelier, Vermont (5046000, world seed mont1, fast-forward), year 4: 22,062 records, 68 MB of live heap by removal (scripts/speed-years/probe-retained.ts).

**Rules.** Keep it simple (Oct 11): bookkeeping is a debug switch; tests and proofs keep every record. A cut changes no outcome: the records proof differs only in the drives runtime part.

**Done when.** In play a donation's record is gone once its entry posts, and money moves exactly as before; with bookkeeping on it is kept; a test shows both; speed:year --seed mont1 --place 5046000 --years 2 records proof against the same main differs only in part.core2-drives-runtime.donations.

**Files.** src/core2/modules/drives.ts, src/core2/drives.test.ts

**Notes.** TODO
