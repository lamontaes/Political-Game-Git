---
id: research-occupational-licensing-table
title: "A sourced table of which occupations need a license, by state, and how many workers hold one"
area: world
kind: research
priority: 3
size: M
status: in-pr
claimed-by: claude/licensing-table
pr: #5802
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T12:35:44.978Z
---

**What.** The jobs engine has no licensing data, so the law reduce occupational licensing reaches no one. Source, per occupation and per state, whether a license is required and the share of workers who hold one (BLS and CareerOneStop licensing data; Kleiner and Soltas 2023 on licensing and pay). Record it as SOURCED or ESTIMATED parameter rows with a spread in data, one table for all 56 places, with a reader.

**Rules.** Research before building: real data checks the simulation and never decides an outcome. Estimate, never UNKNOWN. One rule, all 56 places: state differences are table rows in data, never a state named in logic.

**Done when.** A table in data/research/ with a reader passes tests/guards/research-data-has-reader.test.ts, each row has a citation, year, URL and spread, and a test in a drawn place of the 56 (seed named) reads a licensed occupation's requirement and share through the reader.

**Files.** data/research/world/,src/core2/data/jobs/

**Notes.** TODO
