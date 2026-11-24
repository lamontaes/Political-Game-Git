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
standard: 2
model: sonnet
effort: medium
root: none
lead: researcher
after:
checked: fable 2026-11-10
---

**What.** The jobs engine has no licensing data, so the law reduce occupational licensing reaches no one. Source, per occupation and per state, whether a license is required and the share of workers who hold one (BLS and CareerOneStop licensing data; Kleiner and Soltas 2023 on licensing and pay). The Notes record that an earlier pull request built the national table by 22 major occupation groups (BLS CPS 2023 Table 53) with a reader and left the state table (the Institute for Justice's 14 to 27 percent across states could not be fetched, the page returned 403; try BLS state tables, the Minneapolis Fed licensing dashboard or Census SIPP) and the crosswalk from the jobs data's classes to those groups; but a search of data, src and scripts on main finds no such national table, so check what is actually on main first. Record the result as SOURCED or ESTIMATED parameter rows with a spread in data, one table for all 56 places, with a reader. Feeds: world-license-held-on-worker, which waits on it; drop it if the lead drops that item.

**Cause.** Found in code: src/core2/data/jobs/jobs.json (keys `kindSector`, `traits`, `actions` and the rest) holds no licensing field (a search for 'licens' in it finds nothing), and a search of data/research, src and scripts finds no licensed-share table, although the item Notes say an earlier pull request added the national one.

**Fix.** Build the licensing table in data/research/world/: the national licensed share by the 22 occupation groups (BLS CPS 2023 Table 53) if it is not on main, the state licensed-share table, and the crosswalk from the jobs data's classes to those groups, each row with citation, year, URL and spread, with a reader in src/core2/data/jobs/. Branch claude/licensing-shares holds a start.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: real data checks the simulation and never decides an outcome. Estimate, never UNKNOWN: a state the source lacks takes the national share, marked ESTIMATED. One rule, all 56 places: state differences are table rows in data, never a state named in logic.

**Done when.** A second session, in a drawn place of the 56 (seed named in the PR), reads a licensed occupation's requirement and its licensed share through the reader, by data row, in a test that names the place and seed, and tests/guards/research-data-has-reader.test.ts passes with every row carrying a citation, year, URL and spread.

**Waits on.** Nothing.

**Files.** data/research/world, src/core2/data/jobs/jobs.json, tests/guards/research-data-has-reader.test.ts

**Notes.** TODO

Partly done Oct 21 (claude, PR #5802): the national table by 22 major occupation groups (BLS CPS 2023 Table 53) with a reader is in. Still open: a state table (Institute for Justice's 14 to 27 percent across states could not be fetched; the page returned 403; try BLS state tables, the Minneapolis Fed licensing dashboard, or the Census SIPP), and the crosswalk from the jobs data's classes to these groups.

Sent back 2026-10-23 from PR #5802 (branch claude/licensing-table): Required drawn-place reader proof is explicitly not done; production consumer or named PR and registered placeholder band are missing; release declaration is present (initial missing-declaration claim corrected); finish on that branch, merge main into it first.

Oct 25 audit: From the dropped research-occupational-licensing-shares: the state table (licensed share by state) is the open half; branch claude/licensing-shares holds a start.
