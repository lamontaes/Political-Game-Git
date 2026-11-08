---
id: law-levels-county-menu-level
title: "Law levels: counties are their own level on the bill paper"
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: law-levels-county-menu
pr: #7318
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-06T17:25:35.978Z
---

**What.** The bill catalog had no county level, so a county board's menu used the town's authority answers while the draft check used the county's (docs/reports/law-levels-2026-11-05.md, Part B item 5).

**Rules.** One list of who may act, county included; the same check for every body; the build script is the source.

**Done when.** The catalog lists county beside city for every law the research gives to places; a county body's menu shows policyAuthority at county; a drawn-place test shows the menu and the draft check agree for every county-level policy question.

**Files.** scripts/research/build-bill-catalog.py,src/core2/data/legislature/bill-catalog.json,src/core2/bill-catalog.ts,src/bench/legislature.ts,src/core2/past-laws.ts

**Notes.** TODO
