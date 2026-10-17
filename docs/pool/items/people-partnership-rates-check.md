---
id: people-partnership-rates-check
title: "A played year's partnerships, separations and leavings per thousand residents are checked against CDC and ACS rates"
area: people
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after: people-partnership-counted
source: added with npm run pool -- add
---

**What.** Check a played year's totals against the real rates: partnerships formed per thousand residents against CDC NCHS marriage rates (about six), separations against divorce rates (two to three), and young adults leaving home against ACS B09021. The check reports the totals; it never decides one person's outcome. File a pool item for any total outside its spread.

**Rules.** Research before building: the rates are sourced with citation and spread. One rule, all 56 places.

**Done when.** A script or test runs a one-year played world in six places drawn from all 56 and prints each total per thousand residents against its sourced band, naming places and seeds.

**Files.** scripts/core2-year/, src/core2/data/partnerships/

**Notes.** Last of the split of people-partnerships-form-and-end.
