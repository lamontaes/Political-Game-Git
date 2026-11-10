---
id: core-country-tier-agriculture-sector
title: "The country tier gets an agriculture sector, and the farm kind moves into it"
area: core
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: core-country-tier-town-joins-its-state-part-1-each-seller-has-a-sector
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: design-country-tier
source: stand-in triage T5, Nov 10, 2026 (docs/stopgaps/triage-2026-11-10/p8.md)
---

**What.** A town farm is filed under the mining and logging sector because the country tier's list of sectors has no agriculture, so a farm's state and national buyers, pay and trade are those of a mine. Add the sector and move the farm there. Closes SG-P8-farm-sector.

**Cause.** Found in code: `COUNTRY_SECTORS` (src/core2/country-model.ts line 17) lists twelve sectors with no agriculture, and the `farm` kind in src/core2/data/business-books.json (line 11, `sector: "mining-logging"`) names the nearest one in its `sectorSource` text.

**Fix.** Add `agriculture` to `COUNTRY_SECTORS` and a row for it in every per-sector table the tier reads (the `countrySector*` parameters in src/core2/data/parameters.json: labor share, pay, basket, traded share, investment goods, low pay), each SOURCED or ESTIMATED with its spread (BLS QCEW and BEA for NAICS 11), take the sector's employers out of the sectors they were counted in so the totals still close, set the farm kind's sector to `agriculture` and delete its `sectorSource` workaround text, and resolve the row. The tier stays monthly and by counts, so the cost is one more sector in each loop.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One list of sectors only. Every number carries its source and spread. Replace, never layer: the old mapping text goes in the same change. A year must not run more than 20 percent slower on `npm run speed:year`.

**Done when.** A second session runs the tier's tests and a played year in a drawn place it names with its seed, and reads that the town farm's sector is agriculture and that the national totals by sector still sum to the same total as before; in dev mode's Trace on the farm in the running game it reads its sector.

**Waits on.** core-country-tier-town-joins-its-state-part-1-each-seller-has-a-sector.

**Files.** src/core2/country-model.ts, src/core2/data/parameters.json, src/core2/data/business-books.json, src/core2/data/regional/regions.json, src/core2/data/jobs/jobs.json, src/bench/dev-why.ts, src/core2/data/stopgaps/p8.json
