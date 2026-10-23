---
id: research-occupational-licensing-shares
title: "Research: the share of workers licensed by occupation and state, from fetched pages"
area: world
kind: research
priority: 3
size: M
status: open
claimed-by:
pr: #5823
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The jobs engine has no licensing field, so a repeal of an occupational license reaches no one's pay (world-licensing-reform-jobs). Fetch and quote the share of workers who hold a state license by occupation group and by state (BLS Current Population Survey certification and licensing tables, CareerOneStop, Kleiner and Soltas 2023). Turn it into a data table with SOURCED rows and an ESTIMATED fallback with spread where a state has no row, so a builder can give each licensed occupation a requirement row.

**Rules.** Research before building: every figure is quoted from a page actually fetched, with its URL. Estimate, never UNKNOWN: a state with no row gets the national share with a spread. One rule, all 56 places: the table is data keyed by place, no place named in logic.

**Done when.** A data file under data/research/ holds licensed share by occupation group and by state with a quoted source for each SOURCED row and a labeled estimate for the rest, a test reads it for a drawn place from all 56 and names the place, seed and rows used, and world-licensing-reform-jobs names it as its input.

**Files.** data/research/labor/occupational-licensing-shares.json,docs/research/occupational-licensing.md

**Notes.** TODO

Sent back 2026-10-21 from PR #5823 (branch claude/licensing-shares): The body table and the added Notes in docs/pool/items/research-occupational-licensing-shares.md explicitly leave the state/input work unfinished, but the first-line pool marker would mark that whole item done on merge. Track the completed national-table slice under a bounded item or finish the linked acceptance, keeping the remaining work open. The claimed drawn-place reader proof is also missing: src/core2/occupational-licensing.test.ts:16-21 draws a place only to put its name in assertion messages; licensedShare receives only the occupation and never reads the drawn place. Known occupations always return SOURCED in occupational-licensing.ts, so this does not prove the labeled ESTIMATED state/place fallback described by the body. Supply an actual place-aware fallback/read proof and the named place, full seed and rows used; a labeled national fallback is acceptable where state data are unavailable, and I am not asking for invented sourced state figures. Finally the third Done when row says world-licensing-reform-jobs must name this table as input, but that item is not changed and the body says it is not edited. Match the real research scope and completion routing before merge. No local standard gate pass is claimed for this source review.; finish on that branch, merge main into it first.
