---
id: research-occupational-licensing-table
title: "A sourced table of which occupations need a license, by state, and how many workers hold one"
area: world
kind: research
priority: 3
size: M
status: open
claimed-by:
pr: #5802
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The jobs engine has no licensing data, so the law reduce occupational licensing reaches no one. Source, per occupation and per state, whether a license is required and the share of workers who hold one (BLS and CareerOneStop licensing data; Kleiner and Soltas 2023 on licensing and pay). Record it as SOURCED or ESTIMATED parameter rows with a spread in data, one table for all 56 places, with a reader.

**Rules.** Research before building: real data checks the simulation and never decides an outcome. Estimate, never UNKNOWN. One rule, all 56 places: state differences are table rows in data, never a state named in logic.

**Done when.** A table in data/research/ with a reader passes tests/guards/research-data-has-reader.test.ts, each row has a citation, year, URL and spread, and a test in a drawn place of the 56 (seed named) reads a licensed occupation's requirement and share through the reader.

**Files.** data/research/world/,src/core2/data/jobs/

**Notes.** TODO

Partly done Oct 21 (claude, PR #5802): the national table by 22 major occupation groups (BLS CPS 2023 Table 53) with a reader is in. Still open: a state table (Institute for Justice's 14 to 27 percent across states could not be fetched; the page returned 403; try BLS state tables, the Minneapolis Fed licensing dashboard, or the Census SIPP), and the crosswalk from the jobs data's classes to these groups.

Sent back 2026-10-23 from PR #5802 (branch claude/licensing-table): Required drawn-place reader proof is explicitly not done; production consumer or named PR, registered placeholder band, and release declaration are missing; finish on that branch, merge main into it first.
