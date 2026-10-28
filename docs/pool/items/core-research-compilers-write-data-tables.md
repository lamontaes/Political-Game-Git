---
id: core-research-compilers-write-data-tables
title: "The two FDIC compilers write the data tables the core reads, not the old engine's modules"
area: core
kind: cleanup
priority: 2
size: S
status: in-pr
claimed-by: claude/fdic-compilers-tables
pr: #6658
blocked-on:
lead: researcher
source: added with npm run pool -- add
claimed-at: 2026-10-28T17:23:33.672Z
---

**What.** scripts/research/compile-fdic-county-deposits.py and scripts/research/compile-fdic-town-banks.py still write src/simulation/living-world/town-deposits.generated.ts and town-bank-shapes.generated.ts, which only the old engine reads. The core reads data/tables/town-deposits.json (src/core2/modules/credit.ts); town-bank-shapes.json has no game reader yet. The snapshot exporter that turned those modules into JSON was deleted with the old engine's scripts (core-old-engine-06). Make each compiler write its data/tables JSON directly, in the same shape: the module's export names as top-level keys, formatted with the repository's Prettier JSON parser.

**Rules.** Replace, never layer: the compilers' old output paths go in the same PR. Data calibrates; nothing here decides an outcome. Rerun each compiler against its committed source and show the JSON is byte for byte unchanged.

**Done when.** Each compiler, run against its committed inputs, writes data/tables/town-deposits.json and data/tables/town-bank-shapes.json byte for byte equal to the committed tables (diff empty); grep -n src/simulation over both compilers prints nothing; src/core2 credit tests pass; a drawn place built by buildBenchWorld opens with the same deposits by record id.

**Files.** scripts/research/compile-fdic-county-deposits.py, scripts/research/compile-fdic-town-banks.py, data/tables/town-deposits.json, data/tables/town-bank-shapes.json, data/tables/README.md

**Notes.** Filed by the old engine session, Oct 28, from core-old-engine-06 (branch claude/old-engine-scripts). The compilers download FDIC data, so they could not be rerun in that session's container.
