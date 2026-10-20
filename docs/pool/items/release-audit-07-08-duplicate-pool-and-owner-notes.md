---
id: release-audit-07-08-duplicate-pool-and-owner-notes
title: "Remove pasted-twice pool sections and owner and date notes from data (#5016, #4972, #5314, #5294)"
area: release
kind: bug
priority: 3
size: S
status: claimed
claimed-by: claude/political-game-pool-76ksvw
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:32:20.825Z
---

**What.** Remove the duplicated sections in world-corporate-office-staff-never-paid, world-utility-staff-never-paid and people-press-turnover-no-leavers-no-openings, and the owner and date notes added to data citations and stopgap text.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The pool check passes, no data citation or stopgap text carries an owner or date note, shown by a search test that fails on any, and the three pool items read once each.

**Files.** docs/pool/items, data, src/core2/data/stopgaps.json

**Notes.** Item 7-8 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes.
