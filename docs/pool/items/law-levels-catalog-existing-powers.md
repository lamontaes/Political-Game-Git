---
id: law-levels-catalog-existing-powers
title: "Bill catalog exposes the levels already authorized to amend tax and policy laws"
area: laws
kind: bug
priority: 2
size: S
status: done
claimed-by: astra/repeal-coverage
pr: #7321
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-07T19:41:16.956Z
---

**What.** The bill catalog hides federal and state income tax and state sales tax despite the existing authority data allowing those bodies to amend them. It also assigns every state policy question the same three levels, hiding Congress from two work requirements. Generate those catalog levels from the existing authority records so the bill paper exposes the same powers the draft validator uses.

**Rules.** One engine per mechanic: catalog levels come from the existing authority records and all bodies use the existing bill machinery. No dice: this changes available provisions, never how a member votes.

**Done when.** In a buildBenchWorld at a drawn place, a test finds federal and state income tax, state sales tax, and both federal work requirements in the appropriate bill catalog, with allowed authority and repeal or lower provisions. Print place and replay number.

**Files.** scripts/research/build-bill-catalog.py,src/core2/data/legislature/bill-catalog.json,src/core2/bill-catalog-existing-powers.test.ts

**Notes.** TODO
