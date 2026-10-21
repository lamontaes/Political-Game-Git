---
id: research-occupational-licensing-shares
title: "Research: the share of workers licensed by occupation and state, from fetched pages"
area: world
kind: research
priority: 3
size: M
status: claimed
claimed-by: claude/licensing-shares
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T17:25:31.761Z
---

**What.** The jobs engine has no licensing field, so a repeal of an occupational license reaches no one's pay (world-licensing-reform-jobs). Fetch and quote the share of workers who hold a state license by occupation group and by state (BLS Current Population Survey certification and licensing tables, CareerOneStop, Kleiner and Soltas 2023). Turn it into a data table with SOURCED rows and an ESTIMATED fallback with spread where a state has no row, so a builder can give each licensed occupation a requirement row.

**Rules.** Research before building: every figure is quoted from a page actually fetched, with its URL. Estimate, never UNKNOWN: a state with no row gets the national share with a spread. One rule, all 56 places: the table is data keyed by place, no place named in logic.

**Done when.** A data file under data/research/ holds licensed share by occupation group and by state with a quoted source for each SOURCED row and a labeled estimate for the rest, a test reads it for a drawn place from all 56 and names the place, seed and rows used, and world-licensing-reform-jobs names it as its input.

**Files.** data/research/labor/occupational-licensing-shares.json,docs/research/occupational-licensing.md

**Notes.** TODO

Oct 21 (claude, claude/licensing-shares): done for the national table, not the state one. `data/research/jobs/occupational-licensing-shares.json` holds BLS CPS Table 53 (2025 annual averages, https://www.bls.gov/cps/cpsaat53.htm) as SOURCED rows: percent with a license by occupation group (all workers 21.6, healthcare practitioners 71.3, legal 59.8, education 48.3, food service 7.1). `src/core2/occupational-licensing.ts` reads it (`licensedShare`, `licensedShareSpread`), tested beside it in a drawn place. No fetchable state table exists: BLS publishes the national table only; Brookings' state chart (Harris poll, first half of 2013) is an image, and Institute for Justice and Minneapolis Fed state figures were not available as text. So every place starts from the national share (ESTIMATED), checked against the 14 to 33.3 percent state spread from Brookings; a state table from the Minneapolis Fed dashboard's IPUMS-CPS extracts would replace it row by row. Item stays open for that.
