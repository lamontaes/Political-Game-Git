---
id: core-memory-withholding-rows
title: "Trim pay withholding rows that grow memory about 5 MiB a month"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A three-year played run in Juliaetta (seed memremeasure1) grew 19.7 MiB a month, not 5. The `core2-budgets-v1/withholding` table is the largest single table: about 1,100 rows a month (every paid official and worker), each about 4 KB once copied in, nearly 5 MiB a month, and nothing but tests reads the rows after the journal entry posts. Keep only what an engine reads (the year's pay to date and the journal entry), or only the current and previous year of rows, or store the lines compactly.

**Rules.** An effect is a read: if the rows are the 'why' a person can be asked, keep them for the player and the people they deal with, not for every payer (Keep it simple, bookkeeping). The journal must still balance to the cent.

**Done when.** The same three-year Juliaetta run (`CORE2_BOOKKEEPING=0 node --expose-gc --import tsx scripts/core2-guard/memory.mjs --months 36`) shows the withholding table's share of growth gone or under 1 MiB a month, and the tests that read `withholdingOf` still pass.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/official-pay.ts

**Notes.** Found in core-memory-remeasure. Its slot cache was released after posting; that was a small part. Live-allocation sampling showed the table's copied rows (module put and plainCopy) at about 57 MB over twelve months.
