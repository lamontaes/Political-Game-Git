---
id: gov-press-conflict-withdrawn
title: "Press staff may run and hold office (owner Oct 16): remove the press bar and resolve SG-GOV-press-office-owner-confirmation"
area: gov
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/gov-press-conflict-withdrawn
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:21:09.092Z
---

**What.** This item duplicates gov-press-ban-withdrawn, which is in PR #5131: that PR removes the press-employment ban from the eligibility check, the candidacy chooser and the candidate pool, resolves SG-GOV-press-office-owner-confirmation with the Oct 16 ruling cited, and keeps a seat from being filled by press staff alone. Nothing further is left to build here. When #5131 merges, this item should be dropped as a duplicate by the CTO.

**Rules.** Look before you ask: the ruling is in OWNER-DECISIONS (Oct 16) and the code follows it. No dice: who fills an empty seat comes from the place's vacancy rule in data.

**Done when.** PR #5131 merges and the elections and gov tests it names pass on a drawn place (`press.test.ts`, `vacancy-press-staff.test.ts`); then this item is dropped by the CTO as a duplicate of gov-press-ban-withdrawn.

**Files.** src/core2/press-conflict.ts, src/core2/modules/candidacy.ts, src/core2/modules/elections.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (claude/gov-press-conflict-withdrawn): read PR #5131, still an open draft on branch claude/press-ban-withdrawn. Released without building.
