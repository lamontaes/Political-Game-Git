---
id: release-audit-07-08-duplicate-pool-and-owner-notes
title: "Remove pasted-twice pool sections and owner and date notes from data (#5016, #4972, #5314, #5294)"
area: release
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Remove the duplicated sections in world-corporate-office-staff-never-paid, world-utility-staff-never-paid and people-press-turnover-no-leavers-no-openings, and the owner and date notes added to data citations and stopgap text.

**Rules.** Replace, never layer: the fix replaces the faulty code, text or note in the same change, and a test asserts the feature and fails when nothing is found.

**Done when.** The pool check passes, no data citation or stopgap text carries an owner or date note, shown by a search test that fails on any, and the three pool items read once each.

**Files.** docs/pool/items, data, src/core2/data/stopgaps.json

**Notes.** Item 7-8 of docs/reports/merge-audit-2026-10-20.md, split from release-merge-audit-oct20-fixes. Released from idle draft #5180 by the CTO, Oct 26.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/political-game-pool-76ksvw` (2026-10-20). Cleared from the front matter and kept here.

Lane 5, Nov 3: two findings, and one question for the CTO. (1) The three items read once each on main (one What, Rules, Done when, Files and Notes each), so that half is done. (2) Stripping owner and date notes is not done: 29 stopgap rows across the family files and 24 files under `src/core2/data` cite rulings as "(owner, Oct 28)" or "(CTO, Nov 1)", and AGENTS.md (Look before you ask; Placeholders) now asks every session to quote the ruling with its date. A search test that fails on any such note would forbid that. Question for the CTO, with the reading line: does "owner notes must not ship" (merge audit, Oct 20, item 8) still hold for stopgap text and parameter citations, which only developer screens show and which the release check already refuses while open? If yes, the test should cover only text a player sees. Read: OWNER-DECISIONS (Nov 3 rulings), DECISION-REGISTER, prior-rulings, LAW; searched: "owner notes", "owner and date", "must not ship".
