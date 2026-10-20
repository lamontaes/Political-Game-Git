---
id: laws-territory-powers-research
title: "Read each territory's own act or constitution for the powers catalog's unread territory cells"
area: laws
kind: research
priority: 3
size: M
status: in-pr
claimed-by: claude/territory-powers
pr: #5195
blocked-on:
source: "core-stopgap-policy-authority-missing-record, Oct 15"
claimed-at: 2026-10-19T22:13:57.958Z
---

**What.** The powers catalog leaves 58 of its territory cells UNKNOWN, so the authority reader now gives a territorial legislature its state cell's power as an estimate (`data/research/powers-catalog/territory-grant.json`). Read each territory's own organic act, covenant or constitution (Guam, the Virgin Islands, American Samoa, the Northern Mariana Islands, Puerto Rico) and replace the estimate cell by cell with a sourced cell, marking where federal law reserves the subject.

**Rules.** Research before building: real law calibrates the grant and never decides one office's act. One rule, all 56 places: each territory's grants live in the catalog data, never in logic naming a territory.

**Done when.** In a played world (buildBenchWorld) in each of the five territories, drawn by seed, a question whose territory cell was read gets a sourced grant or a recorded restriction with the catalog cell as its source, shown by authority record id, and the UNKNOWN count in the catalog's territory column falls from 58; the test in src/core2/policy-authority.test.ts passes.

**Files.** data/research/powers-catalog/catalog.json, data/research/powers-catalog/territory-grant.json, src/core2/policy-authority.ts

**Notes.** From the policy-authority stopgap work. The two citations in territory-grant.json (48 U.S.C. 1423a and 1574(a)) cover Guam and the Virgin Islands; the other three are listed there as still to be read.
